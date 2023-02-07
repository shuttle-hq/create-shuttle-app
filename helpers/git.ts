import fetch from "node-fetch"
import AdmZip from "adm-zip"
import { Stream } from "stream"
import path from "path"
import fs from "fs"

/**
 * Clone a repository example into the path given. Can also extract only a relative path from the repository if given
 */
export async function cloneExample({
    repository,
    projectPath,
}: {
    repository: string
    projectPath: string
}) {
    const parts = repository.split("/")
    repository = parts.splice(0, 5).join("/")
    const relativePath = parts.join("/")

    // Strip ".git" suffix if it exists
    repository = repository.replace(/\.git$/, "")

    repository += "/archive/refs/heads/main.zip"

    const response = await fetch(repository).catch((error) => {
        throw {
            error: `Failed to clone shuttle example from "${repository}"`,
            problems: [error],
        }
    })

    if (response.status !== 200) {
        throw {
            error: `Failed to download template from "${repository}"`,
            problems: [response.statusText],
        }
    }

    try {
        const body = await stream2buffer(response.body as Stream)
        const zip = new AdmZip(body)

        const entries = zip.getEntries()

        // Default to all
        let zipEntry = entries[0]
        const examplesRootDir = zipEntry.entryName

        if (relativePath) {
            const tmpEntry = entries.find((entry) => {
                // Shave off archive folder
                const name = entry.entryName.split("/").filter((s) => s !== "")
                name.shift()

                return name.join("/") === relativePath
            })

            if (tmpEntry) {
                zipEntry = tmpEntry
            } else {
                throw {
                    error: `Could not find "${relativePath}" in specified template archive`,
                }
            }
        }

        const entryDir = zipEntry.entryName

        zip.extractEntryTo(zipEntry, projectPath, true, true)

        const files = fs.readdirSync(path.join(projectPath, entryDir))

        // Move the files from the extracted repo directory into the ./backend/ directory
        for (const file of files) {
            // node.js way of moving a file
            // https://stackoverflow.com/a/41562625
            fs.renameSync(
                path.join(projectPath, entryDir, file),
                path.join(projectPath, file)
            )
        }

        // Remove the now empty repo directory
        fs.rmSync(path.join(projectPath, examplesRootDir), {
            recursive: true,
            force: true,
        })
    } catch (error) {
        throw {
            error: "Failed to extract template",
            problems: [error],
        }
    }
}

// Shamelessly copied from https://stackoverflow.com/a/67729663
async function stream2buffer(stream: Stream): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const _buf = Array<any>()

        stream.on("data", (chunk) => _buf.push(chunk))
        stream.on("end", () => resolve(Buffer.concat(_buf)))
        stream.on("error", (err) => reject(`error converting stream - ${err}`))
    })
}
