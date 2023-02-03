import fetch from "node-fetch"
import AdmZip from "adm-zip"
import { Stream } from "stream"

/**
 * Clone a repository example into the path given. Can also extract only a relative path from the repository if given
 */
export async function cloneExample({
    repository,
    path,
}: {
    repository: string
    path: string
}) {
    let parts = repository.split("/")
    repository = parts.splice(0, 5).join("/")
    let relativePath = parts.join("/")

    // Strip ".git" suffix if it exists
    repository = repository.replace(/\.git$/, '')

    repository += "/archive/refs/heads/main.zip"

    let response = await fetch(repository).catch(error => {
        throw {
            error: `Failed to clone shuttle example from "${repository}"`,
            problems: [error]
        }
    })

    if (response.status !== 200) {
        throw {
            error: `Failed to download template from "${repository}"`,
            problems: [response.statusText]
        }
    }

    try {
        let body = await stream2buffer(response.body as Stream)
        let zip = new AdmZip(body)

        let entries = zip.getEntries()

        // Default to all
        var zipEntry = entries[0]

        if (relativePath) {
            let tmpEntry = entries.find(entry => {
                // Shafe off archive folder
                let name = entry.entryName.split("/").filter(s => s !== "")
                name.shift()

                return name.join("/") === relativePath
            })

            if (tmpEntry) {
                zipEntry = tmpEntry
            } else {
                throw {
                    error: `Could not find "${relativePath}" in specified template archive`
                }
            }
        }

        zip.extractEntryTo(zipEntry, path, false, true)
    } catch (error) {
        throw {
            error: "Failed to extract template",
            problems: [error]
        }
    }
}

// Shamelessly copied from https://stackoverflow.com/a/67729663
async function stream2buffer(stream: Stream): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const _buf = Array<any>();

        stream.on("data", chunk => _buf.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(_buf)));
        stream.on("error", err => reject(`error converting stream - ${err}`));

    });
}
