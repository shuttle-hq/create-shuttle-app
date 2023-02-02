import { spawnSync as _spawnSync, SpawnSyncOptions } from "child_process"

// The error type returned from spawnSync has some extra fields we want to read
interface SpawnError extends Error {
    code: string
}

/**
 *  Wrapper around `child_process.spawnSync` to safely handle any errors
 */
export function execSync(
    command: string,
    args?: ReadonlyArray<string>,
    options?: SpawnSyncOptions
): string | Buffer {
    // Capture stderr (pipe) to handle errors
    options = {
        ...options,
        shell: true,
        stdio: options?.stdio ?? ["inherit", "pipe", "pipe"],
    }
    let result = _spawnSync(command, args, options)

    if (result.error) {
        let error = result.error as SpawnError

        if (error.code == "ENOENT") {
            throw {
                error: `Could not find command "${command}"`,
            }
        } else {
            throw {
                error,
            }
        }
    }

    if (result.status != 0) {
        let problems = []

        if (result.stderr) {
            problems.push(result.stderr)
        }

        throw {
            error: `Failed to execute command "${command}"`,
            problems,
        }
    }

    return result.stdout
}
