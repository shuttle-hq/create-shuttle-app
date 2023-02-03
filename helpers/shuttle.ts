import crypto from "crypto"
import { profanity } from "@2toad/profanity"
import { writeFileSync } from "fs"
import path from "path"

type ValidationResult = {
    valid: boolean
    problems: string[]
}

export function validateShuttleName(name: string): ValidationResult {
    const validationResult: ValidationResult = {
        valid: true,
        problems: [],
    }

    if (!/^[a-zA-Z0-9-]+$/.test(name)) {
        validationResult.valid = false
        validationResult.problems.push(
            `Project name can only contain characters inside of the alphanumeric range, except for '-'`
        )
    }

    if (profanity.exists(name)) {
        validationResult.valid = false
        validationResult.problems.push(
            `Project name must not include profanity`
        )
    }

    if (["shuttleapp", "shuttle"].some((reserved) => name === reserved)) {
        validationResult.valid = false
        validationResult.problems.push(
            `Project name must not be a reserved word`
        )
    }

    if (name.startsWith("-") || name.endsWith("-")) {
        validationResult.valid = false
        validationResult.problems.push(
            `Project name must not start or end with '-'`
        )
    }

    return validationResult
}

export function appendUniqueSuffix(projectName: string): string {
    const randomSuffix = crypto.randomBytes(3).toString("hex")
    return `${projectName}-${randomSuffix}`
}

export function createShuttleToml(name: string, projectPath: string) {
    writeFileSync(
        path.join(projectPath, "backend", "Shuttle.toml"),
        `name = "${name}"`
    )
}
