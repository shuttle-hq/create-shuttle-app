import os from "os"
import path from "path"
import { sync as commandExists } from "command-exists"
import chalk from "chalk"
import {
    RUSTC_VERSION,
    SHUTTLE_DOWNLOAD_URL,
    SHUTTLE_LINUX_TARGET,
    SHUTTLE_MAC_TARGET,
    SHUTTLE_TAG,
    SHUTTLE_VERSION,
    SHUTTLE_WINDOWS_TARGET,
} from "./constants"
import satisfies from "semver/functions/satisfies"
import { existsSync } from "fs"
import { execSync } from "./process"

/**
 * Checks if native dependency is installed using the `<dependency> --version`
 * command, and checks if the installed version satisfies the passed in version
 * requirement.
 * @arg dependency The name of the dependency to check.
 * @arg semver The required version as a semver string.
 */
export function checkInstalled(dependency: string, semver: string): boolean {
    if (!commandExists(dependency)) {
        return false
    }

    let installedVersion = execSync(`${dependency} --version`)
        .toString()
        .split(" ")[1]

    return satisfies(installedVersion, semver)
}

/**
 * Installs cargo-shuttle by downloading a binary for the users platform
 * from the github release binaries and moving it to their `$CARGO_HOME/bin`
 * directory.
 * @throws Will throw an error if the users platform is not windows, mac or linux.
 */
export function installShuttle() {
    switch (process.platform) {
        case "linux":
            installShuttleBin(SHUTTLE_LINUX_TARGET)
            break
        case "darwin":
            installShuttleBin(SHUTTLE_MAC_TARGET)
            break
        case "win32":
            // Check if the user has the coreutils commands needed for the installShuttleBin
            // function. If not, run cargo install.
            if (commandExists("mv") && commandExists("rm")) {
                installShuttleBin(SHUTTLE_WINDOWS_TARGET, ".exe")
            } else {
                execSync(
                    "cargo",
                    ["install", "cargo-shuttle", "--version", SHUTTLE_VERSION],
                    {
                        shell: false,
                        stdio: ["ignore", "inherit", "pipe"],
                    }
                )
            }
            break
        default:
            throw {
                error: `create-shuttle-app can't install cargo-shuttle automatically 
                    on: ${chalk.red(process.platform)}\n Refer to 
                    "https://docs.shuttle.rs/introduction/installation" for instructions 
                    on installing cargo-shuttle manually. After installing cargo-shuttle, 
                    please run create-shuttle-app again`,
            }
    }
}

/**
 * Install the cargo-shuttle binary from the release distributions.
 */
function installShuttleBin(target: string, suffix?: string) {
    const cargoBinDir = findCargoBinDir()

    const archive = `cargo-shuttle-${SHUTTLE_TAG}-${target}.tar.gz`
    const curlUrl = `${SHUTTLE_DOWNLOAD_URL}${archive}`
    const shuttleBinDir = `cargo-shuttle-${target}-${SHUTTLE_TAG}`
    const shuttleBin = `cargo-shuttle${suffix ?? ""}`

    const cmd = `curl -s -OL ${curlUrl} &&\
    tar -xzf ${archive} ${shuttleBinDir}/${shuttleBin} &&\
    mv ${shuttleBinDir}/${shuttleBin} ${cargoBinDir}/cargo-shuttle${
        suffix ?? ""
    } &&\
    rm -rf ${archive} ${shuttleBinDir}`

    execSync(cmd, undefined, {
        shell: false,
        stdio: ["ignore", "inherit", "pipe"],
    })
}

/**
 * Looks for the cargo home directory in the default location, and if it's not there
 * try the `CARGO_HOME` environment variable.
 * @throws If cargo home can't be found.
 */
function findCargoBinDir(): string {
    const homedir = os.homedir()
    let cargoHome = path.join(homedir, ".cargo")

    if (!existsSync(cargoHome)) {
        if (!process.env.CARGO_HOME) {
            throw {
                error: `Failed to find the cargo home directory`,
            }
        } else {
            cargoHome = process.env.CARGO_HOME
        }
    }

    return path.join(cargoHome, "bin")
}

/**
 * Installs rust.
 * @throws Will throw an error if the users platform is not windows, mac or linux.
 */
export function installRust() {
    // We need the homedir for installing rust on windows
    const homeDir = os.homedir()
    const windowsRmCommand = commandExists("rm") ? "rm -r" : "rd /s /q"

    switch (process.platform) {
        case "linux":
            execSync(
                `curl --proto '=https' --tlsv1.3 https://sh.rustup.rs -sSf | bash -s -- -y --default-toolchain ${RUSTC_VERSION}`
            )
            break
        case "darwin":
            execSync(
                `curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | bash -s -- -y --default-toolchain ${RUSTC_VERSION}`
            )
            break
        case "win32":
            execSync(
                `curl -s --create-dirs -O --output-dir ${path.join(
                    homeDir,
                    "tmprustup"
                )} https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe &&\
                ${path.join(
                    homeDir,
                    "tmprustup",
                    "rustup-init.exe"
                )} --default-toolchain ${RUSTC_VERSION} &&\
                ${windowsRmCommand} ${path.join(homeDir, "tmprustup")}`,
                undefined,
                {
                    shell: false,
                    stdio: ["inherit", "inherit", "pipe"],
                }
            )

            break
        default:
            throw {
                error: `create-shuttle-app can't install Rust automatically 
                    on: ${chalk.red(process.platform)} \n
                    Refer to "https://www.rust-lang.org/tools/install" for instructions 
                    on installing rust for your operating system. After installing Rust, please run create-shuttle-app again`,
            }
    }
}

