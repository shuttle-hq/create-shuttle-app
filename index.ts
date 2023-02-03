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
import { appendUniqueSuffix, validateShuttleName } from "./helpers/shuttle"
import { isPathSafe } from "./helpers/is-path-safe"
import { cloneExample } from "./helpers/git"
import { execSync } from "./helpers/process"
import { patchNextConfig, patchPackage } from "./helpers/package"
import {
    RUSTC_VERSION,
    SHUTTLE_VERSION,
    SHUTTLE_EXAMPLE_URL,
} from "./helpers/constants"

type Error = {
    error: string
    problems?: string[]
}

let projectPath: string = ""

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
    if (!checkInstalled("rustc", RUSTC_VERSION)) {
        const res = await prompts({
            type: "confirm",
            name: "installRustup",
            initial: true,
            message: `create-shuttle-app requires Rust v${RUSTC_VERSION}, do you wish to install it now?`,
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
                    return "Invalid project name: " + validation.problems![0]
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

    let args = []

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

    execSync(path.join(__dirname, "create-next-app"), args, {
        shell: false,
        stdio: ["inherit", "inherit", "pipe"],
    })

    const repository = program.shuttleExample || SHUTTLE_EXAMPLE_URL
    const shuttleProjectPath = path.join(resolvedProjectPath, "backend/")
    await cloneExample({
        repository,
        path: shuttleProjectPath,
    })

    // TODO: create Shuttle.toml and set project name to "shuttleProjectName"

    patchPackage(resolvedProjectPath)
    patchNextConfig(resolvedProjectPath)

    // TODO: do we need a `cargo shuttle project new` here?

    // TODO: print great success and next esteps
    //   encourage users to run `npm run deploy`
}

run().catch(async ({ error, problems = [] }) => {
    // TODO: print expand on `reason`
    console.log()
    console.log(`${chalk.bold(chalk.red(error))}`)
    problems.forEach((problem: string) => console.log(`  ${problem}`))
    process.exit(1)
})
