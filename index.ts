#!/usr/bin/env node

import chalk from "chalk"
import prompts from "prompts"
import Commander from "commander"
import packageJson from "./package.json"
import path from "path"
import {
    installRust,
    installShuttle,
    checkInstalled,
} from "./helpers/check-shuttle"
import {
    appendUniqueSuffix,
    createShuttleToml,
    validateShuttleName,
} from "./helpers/shuttle"
import { isPathSafe } from "./helpers/is-path-safe"
import { cloneExample } from "./helpers/git"
import { execSync } from "./helpers/process"
import { patchNextConfig, patchPackage } from "./helpers/package"
import {
    RUSTC_VERSION,
    SHUTTLE_VERSION,
    SHUTTLE_EXAMPLE_URL,
} from "./helpers/constants"

let projectPath = ""

const handleSigTerm = () => process.exit(0)

process.on("SIGINT", handleSigTerm)
process.on("SIGTERM", handleSigTerm)

const onPromptState = (state: any) => {
    if (state.aborted) {
        // If we don"t re-enable the terminal cursor before exiting
        // the program, the cursor will remain hidden
        process.stdout.write("\x1B[?25h")
        process.stdout.write("\n")
        process.exit(1)
    }
}

const program = new Commander.Command(packageJson.name)
    .version(packageJson.version)
    .arguments("<project-directory>")
    .usage(`${chalk.green("<project-directory>")} [options]`)
    .action((name: string) => {
        projectPath = name
    })
    .option(
        "--ts, --typescript",
        `
  Initialize as a TypeScript project. (default)
`
    )
    .option(
        "--js, --javascript",
        `
  Initialize as a JavaScript project.
`
    )
    .option(
        "--eslint",
        `
  Initialize with eslint config.
`
    )
    .option(
        "-e, --example [name]|[github-url]",
        `
  An example to bootstrap the app with. You can use an example name
  from the official Next.js repo or a GitHub URL. The URL can use
  any branch and/or subdirectory
`
    )
    .option(
        "--shuttle-example <github-url>",
        `
  A GitHub URL to use to bootstrap the shuttle backend with.
`
    )
    .allowUnknownOption(false)
    .parse(process.argv)

async function run(): Promise<void> {
    if (!checkInstalled("rustc", `>=${RUSTC_VERSION}`)) {
        const res = await prompts({
            type: "confirm",
            name: "installRustup",
            initial: true,
            message: `create-shuttle-app requires a Rust version greater than or equal to ${RUSTC_VERSION}, 
            do you wish to install it now?`,
        })

        if (res.installRustup) {
            installRust()
        } else {
            throw {
                error: "rustup is required",
            }
        }
    }

    if (!checkInstalled("cargo-shuttle", SHUTTLE_VERSION)) {
        const res = await prompts({
            type: "confirm",
            name: "installShuttle",
            initial: true,
            message: `create-shuttle-app requires cargo-shuttle v${SHUTTLE_VERSION}, do you wish to install it now?`,
        })

        if (res.installShuttle) {
            installShuttle()
        } else {
            throw {
                error: "shuttle is required",
            }
        }
    }

    if (!projectPath) {
        const res = await prompts({
            name: "path",
            type: "text",
            message: "What is your project named?",
            initial: "my-app",
            validate: (name) => {
                const validation = validateShuttleName(
                    path.basename(path.resolve(name))
                )
                if (validation.valid) {
                    return true
                } else {
                    return "Invalid project name: " + validation.problems[0]
                }
            },
        })
        if (typeof res.path == "string") {
            projectPath = res.path.trim()
        }
    }

    if (!projectPath) {
        throw {
            error:
                "Please specify the project directory:\n" +
                `  ${chalk.cyan(program.name())} ${chalk.green(
                    "<project-directory>"
                )}`,
        }
    }

    const resolvedProjectPath = path.resolve(projectPath)
    const projectName = path.basename(resolvedProjectPath)
    const shuttleProjectName = appendUniqueSuffix(projectName)

    const { safe, problems } = isPathSafe(resolvedProjectPath)
    if (!safe) {
        throw {
            error: `Cannot create project at path ${resolvedProjectPath}`,
            problems,
        }
    }

    const args = []

    if (program.javascript) {
        args.push("--js")
    }

    if (program.typescript) {
        args.push("--ts")
    }

    if (program.example) {
        args.push("--example", program.example)
    }

    if (program.eslint) {
        args.push("--eslint")
    }

    args.push(resolvedProjectPath)

    // If the user is on windows, we need to prefix the create-next-app cmd with node
    const createNextAppCmd = `${
        process.platform === "win32" ? "node " : ""
    }${path.join(__dirname, "create-next-app")}`

    execSync(createNextAppCmd, args, {
        shell: false,
        stdio: ["inherit", "inherit", "pipe"],
    })

    const repository = program.shuttleExample || SHUTTLE_EXAMPLE_URL
    const shuttleProjectPath = path.join(resolvedProjectPath, "backend/")
    await cloneExample({
        repository,
        projectPath: shuttleProjectPath,
    })

    createShuttleToml(shuttleProjectName, resolvedProjectPath)

    patchPackage(resolvedProjectPath)
    patchNextConfig(resolvedProjectPath)

    const shuttleOrange = chalk.hex("#ff8a3f")
    console.log(
        shuttleOrange(`
     ____  _           _   _   _
    / ___|| |__  _   _| |_| |_| | ___
    \\___ \\| '_ \\| | | | __| __| |/ _ \\
     ___) | | | | |_| | |_| |_| |  __/
    |____/|_| |_|\\__,_|\\__|\\__|_|\\___|
    `)
    )
    console.log(`
To deploy your application to the cloud, you need to run the following commands:

First, login: ${chalk.bold(`npm run shuttle-login`)}

Start your project container: ${chalk.bold(`npm run start`)} 

And that's it! When you're ready to deploy: ${chalk.bold(`npm run deploy`)}

If you'd like to develop locally, you can start a next.js dev server as well as your
shuttle backend with the ${chalk.bold("npm run dev")} command.`)
}

run().catch(async ({ error, problems = [] }) => {
    // TODO: print expand on `reason`
    console.log()
    console.log(`${chalk.bold(chalk.red(error))}`)
    problems.forEach((problem: string) => console.log(`  ${problem}`))
    process.exit(1)
})
