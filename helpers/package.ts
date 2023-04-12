import { existsSync, readFileSync, writeFileSync } from "fs"
import path from "path"
import ts from "typescript"
import { execSync } from "./process"

/**
 * Fixup `package.json` with some scripts for easier development
 */
export function patchPackage(projectPath: string) {
    const packagesPath = path.join(projectPath, "package.json")
    const data = readFileSync(packagesPath)
    const packages = JSON.parse(data.toString())

    packages["scripts"]["build"] =
        "next build && next export -o ./backend/static && cargo build --manifest-path ./backend/Cargo.toml"
    packages["scripts"]["shuttle-login"] =
        "cargo shuttle login --working-directory ./backend/"
    packages["scripts"]["start"] =
        "cargo shuttle project start --working-directory ./backend/"
    packages["scripts"]["deploy"] =
        "npm run build && cargo shuttle deploy --working-directory ./backend/ --allow-dirty"
    packages["scripts"]["dev"] =
        'npm run build && concurrently --names "next, shuttle" --kill-others "next dev" "cargo shuttle run --working-directory ./backend/"'
    packages["scripts"]["stop"] =
        "cargo shuttle project stop --working-directory ./backend/"

    const newData = JSON.stringify(packages, null, 4)
    writeFileSync(packagesPath, newData)

    // Install using native package manager
    const packageManager = getPkgManager()
    const args = []

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
type PackageManager = "npm" | "pnpm" | "yarn"

function getPkgManager(): PackageManager {
    const userAgent = process.env.npm_config_user_agent

    if (userAgent) {
        if (userAgent.startsWith("yarn")) {
            return "yarn"
        } else if (userAgent.startsWith("pnpm")) {
            return "pnpm"
        } else {
            return "npm"
        }
    } else {
        return "npm"
    }
}

/**
 * Fixup `next.config.js` to correctly build static files
 */
export function patchNextConfig(projectPath: string) {
    const configPath = path.join(projectPath, "next.config.js")

    if (existsSync(configPath)) {
        const source = ts.createSourceFile(
            "next.config.js",
            readFileSync(configPath).toString(),
            ts.ScriptTarget.ES5
        )
        const result = ts.transform(source, [transformer])
        const newSource = ts.createPrinter().printFile(result.transformed[0])
        writeFileSync(configPath, newSource)
    } else {
        writeFileSync(
            configPath,
            `
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
`
        )
    }
}

const transformer =
    (context: ts.TransformationContext) => (rootNode: ts.SourceFile) => {
        let foundUnoptimized = false
        let foundImages = false
        let foundTrailingSlash = false

        // This is where things start, we are basically visiting a file with the following statements
        //
        // @type {import('next').NextConfig} */
        // const nextConfig = { // <-- This is a variable statement we want to go deeper into
        //   images: {
        //     unoptimized: false,
        //     other: false
        //   },
        //   more: true
        // }
        //
        // module.exports = nextConfig
        function visit_statement(node: ts.Node): ts.Node {
            if (ts.isVariableStatement(node)) {
                node = ts.visitEachChild(
                    node,
                    visit_variable_declaration_list,
                    context
                )
            }

            return node
        }
        function visit_variable_declaration_list(node: ts.Node): ts.Node {
            return ts.visitEachChild(node, visit_variable_declaration, context)
        }
        // We are now visiting a variable declaration. However, we hope that the example used nextJS conventions and has a
        // variable named "nextConfig" so that we can visit each of its properties
        function visit_variable_declaration(node: ts.Node): ts.Node {
            if (
                ts.isVariableDeclaration(node) &&
                ts.isIdentifier(node.name) &&
                node.name.escapedText === "nextConfig"
            ) {
                node = ts.visitEachChild(node, visit_next_config, context)
            }

            return node
        }
        // We are now in the config object - aka the following bit
        //
        // {
        //   images: {
        //     unoptimized: false,
        //     other: false
        //   },
        //   more: true
        // }
        function visit_next_config(node: ts.Node): ts.Node {
            node = ts.visitEachChild(node, visit_next_config_property, context)

            // Add images if it is missing after going through all the properties
            if (!foundImages && ts.isObjectLiteralExpression(node)) {
                node = ts.factory.updateObjectLiteralExpression(
                    node,
                    node.properties.concat(get_images_property())
                )
            }

            // Add trailingSlash if it is missing after going through all the properties
            if (!foundTrailingSlash && ts.isObjectLiteralExpression(node)) {
                node = ts.factory.updateObjectLiteralExpression(
                    node,
                    node.properties.concat(get_trailing_slash_property())
                )
                foundTrailingSlash = true
            }

            return node
        }
        // We are now on every single key-value in the config - aka the following
        //
        // images: {
        //   unoptimized: false,
        //   other: false
        // }
        function visit_next_config_property(node: ts.Node): ts.Node {
            if (
                ts.isPropertyAssignment(node) &&
                ts.isIdentifier(node.name) &&
                node.name.escapedText === "images"
            ) {
                node = ts.visitEachChild(node, visit_images_property, context)
                foundImages = true
            }

            return node
        }
        // And we are finally inside the images property - aka this bit
        //
        // {
        //   unoptimized: false,
        //   other: false
        // }
        function visit_images_property(node: ts.Node): ts.Node {
            node = ts.visitEachChild(node, visit_images_properties, context)

            // Add unoptimized if it is not in `images` after visiting all its properties
            if (!foundUnoptimized && ts.isObjectLiteralExpression(node)) {
                node = ts.factory.updateObjectLiteralExpression(
                    node,
                    node.properties.concat(get_unoptimized_property())
                )
            }

            return node
        }
        // And we a looking at every single property in images - aka
        //
        // unoptimized: false,
        // other: false
        function visit_images_properties(node: ts.Node): ts.Node {
            if (
                ts.isPropertyAssignment(node) &&
                ts.isIdentifier(node.name) &&
                node.name.escapedText === "unoptimized"
            ) {
                // Make sure its always true
                node = ts.factory.updatePropertyAssignment(
                    node,
                    ts.factory.createIdentifier("unoptimized"),
                    ts.factory.createTrue()
                )
                foundUnoptimized = true
            }

            return node
        }

        return ts.visitEachChild(rootNode, visit_statement, context)
    }

function get_unoptimized_property(): ts.PropertyAssignment {
    return ts.factory.createPropertyAssignment(
        "unoptimized",
        ts.factory.createTrue()
    )
}

function get_images_property(): ts.PropertyAssignment {
    return ts.factory.createPropertyAssignment(
        "images",
        ts.factory.createObjectLiteralExpression(
            [get_unoptimized_property()],
            true
        )
    )
}

function get_trailing_slash_property(): ts.PropertyAssignment {
    return ts.factory.createPropertyAssignment(
        "trailingSlash",
        ts.factory.createTrue()
    )
}
