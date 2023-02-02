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
import { patchPackage } from "./helpers/package"
import { RUSTC_VERSION, SHUTTLE_VERSION } from "./helpers/constants"

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

    execSync(
        path.join(__dirname, "create-next-app"),
        [!program.javascript ? "--ts" : "--js", resolvedProjectPath],
        {
            shell: false,
            stdio: ["inherit", "inherit", "pipe"],
        }
    )

    const shuttleProjectPath = path.join(resolvedProjectPath, "backend/")
    await cloneExample({
        repository: "https://github.com/shuttle-hq/examples.git",
        relativePath: "axum/static-next-server",
        path: shuttleProjectPath,
    })

    createShuttleToml(shuttleProjectName, resolvedProjectPath)

    patchPackage(resolvedProjectPath)

    // TODO: do we need a `cargo shuttle project new` here?

    console.log(`
     ____  _           _   _   _
    / ___|| |__  _   _| |_| |_| | ___
    \\___ \\| '_ \\| | | | __| __| |/ _ \\
     ___) | | | | |_| | |_| |_| |  __/
    |____/|_| |_|\\__,_|\\__|\\__|_|\\___|
    `)
    console.log(`
When you're ready to deploy your application to production,
all you need to do is run: ${chalk.bold("cargo shuttle deploy")}`)
}

run().catch(async ({ error, problems = [] }) => {
    // TODO: print expand on `reason`
    console.log()
    console.log(`${chalk.bold(chalk.red(error))}`)
    problems.forEach((problem: string) => console.log(`  ${problem}`))
    process.exit(1)
})
