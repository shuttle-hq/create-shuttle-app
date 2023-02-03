import { readFileSync, writeFileSync } from "fs"
import path from "path"
import ts from "typescript"
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

/**
 * Fixup `next.config.js` to correctly build static files
 */
export function patchNextConfig(projectPath: string) {
    let configPath = path.join(projectPath, "next.config.js")
    let source = ts.createSourceFile("next.config.js", readFileSync(configPath).toString(), ts.ScriptTarget.ES5)
    let result = ts.transform(source, [transformer])
    let newSource = ts.createPrinter().printFile(result.transformed[0])
    writeFileSync(configPath, newSource)
}

const transformer = (context: ts.TransformationContext) => (rootNode: ts.SourceFile) => {
    function visit_file(node: ts.Node): ts.Node {
        return ts.visitEachChild(node, visit_statement, context)
    }
    function visit_statement(node: ts.Node): ts.Node {

        if (ts.isVariableStatement(node)) {
            node = ts.visitEachChild(node, visit_variable_declaration_list, context)
        }

        return node
    }
    function visit_variable_declaration_list(node: ts.Node): ts.Node {
        return ts.visitEachChild(node, visit_variable_declaration, context)
    }
    function visit_variable_declaration(node: ts.Node): ts.Node {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.escapedText === "nextConfig") {
            node = ts.visitEachChild(node, visit_object_literal, context)
        }

        return node
    }
    function visit_object_literal(node: ts.Node): ts.Node {
        if (ts.isObjectLiteralExpression(node)) {
            node = ts.factory.updateObjectLiteralExpression(node, node.properties.concat(get_images_property()))
        }

        return node
    }

    return ts.visitNode(rootNode, visit_file)
}

function get_images_property(): ts.PropertyAssignment {
    let unoptimizedProperty = ts.factory.createPropertyAssignment("unoptimized", ts.factory.createTrue())
    return ts.factory.createPropertyAssignment(
        "images",
        ts.factory.createObjectLiteralExpression([unoptimizedProperty], true)
    )
}
