import { readFileSync, writeFileSync } from "fs"
import path from "path"

/**
 * Fixup `package.json` with some scripts for easier development
 */
export function patchPackage(projectPath: string) {
    let packagesPath = path.join(projectPath, "package.json")
    let data = readFileSync(packagesPath)
    let packages = JSON.parse(data.toString())

    packages["scripts"]["build"] = "next build && next export -o ./backend/static"
    packages["scripts"]["deploy"] = "build && cargo shuttle deploy --working-directory ./backend/"

    let newData = JSON.stringify(packages, null, 4)
    writeFileSync(packagesPath, newData)
}