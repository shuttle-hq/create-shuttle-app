import { readFileSync, writeFileSync } from "fs"
import path from "path"
import { execSync } from "./process"

/**
 * Fixup `package.json` with some scripts for easier development
 */
export function patchPackage(projectPath: string) {
    let packagesPath = path.join(projectPath, "package.json")
    let data = readFileSync(packagesPath)
    let packages = JSON.parse(data.toString())

    packages["scripts"]["build"] =
        "next build && next export -o ./backend/static"
    packages["scripts"]["login"] =
        "cargo shuttle login --working-directory ./backend/"
    packages["scripts"]["start"] =
        "cargo shuttle project new --working-directory ./backend/"
    packages["scripts"]["deploy"] =
        "build && cargo shuttle deploy --working-directory ./backend/"
    packages["scripts"]["dev"] =
        "concurrently --names \"next, shuttle\" --kill-others \"next dev\" \"cargo shuttle run --working-directory ./backend/\""

    let newData = JSON.stringify(packages, null, 4)
    writeFileSync(packagesPath, newData)

    // Install using native package manager
    let packageManager = getPkgManager()
    let args = []

    if (packageManager === "yarn") {
        args.push("add", "--dev")
    } else {
        args.push("install", "--save-dev")
    }

    args.push("concurrently")
    execSync(packageManager, args, { cwd: projectPath })
}

// Shamelessly copied, because ncc means I cannot access it from create-next-app even though it's a dev dependency, from
// https://github.com/vercel/next.js/blob/fe2d26fcf41de7a749b8e8d2d89e3a5924f327bf/packages/create-next-app/helpers/get-pkg-manager.ts
type PackageManager = 'npm' | 'pnpm' | 'yarn'

function getPkgManager(): PackageManager {
    const userAgent = process.env.npm_config_user_agent

    if (userAgent) {
        if (userAgent.startsWith('yarn')) {
            return 'yarn'
        } else if (userAgent.startsWith('pnpm')) {
            return 'pnpm'
        } else {
            return 'npm'
        }
    } else {
        return 'npm'
    }
}
