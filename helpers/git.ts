import { execSync } from "child_process"

export function cloneExample({
    repository,
    relativePath,
    path
}: {
    repository: string,
    relativePath?: string,
    path: string
}) {
    // TODO: clone to temp and move the state of the tree over (without git)
    // TODO: if relativePath !== undefined, move only a subdirectory (relativePath)
}