import { readFileSync, writeFileSync } from "fs"
import path from "path"
import ts from "typescript"

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
