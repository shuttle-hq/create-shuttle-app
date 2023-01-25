import crypto from "crypto"

type ValidationResult = {
    valid: boolean,
    problems: string[]
}

export function validateShuttleName(name: string): ValidationResult {
    return {
        valid: true,
        problems: ["must contain only alphanumeric characters or - or _"]
    }
}

export function appendUniqueSuffix(projectName: string): string {
    const randomSuffix = crypto.randomBytes(3).toString("hex")
    return `${projectName}-${randomSuffix}`
}