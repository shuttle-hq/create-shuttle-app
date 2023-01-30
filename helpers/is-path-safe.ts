type PathCheckResult = {
    safe: boolean
    problems: string[]
}

export function isPathSafe(path: string): PathCheckResult {
    return {
        safe: true,
        problems: [],
    }
}
