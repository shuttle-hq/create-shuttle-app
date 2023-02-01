import { execSync } from "child_process"
import os from "os"
import path from "path"
import { sync as commandExists } from "command-exists"
import chalk from "chalk"
import {
    RUSTC_VERSION,
    SHUTTLE_DOWNLOAD_URL,
    SHUTTLE_LINUX_BIN,
    SHUTTLE_MAC_BIN,
    SHUTTLE_WINDOWS_BIN,
} from "./constants"
import satisfies from "semver/functions/satisfies"
import { existsSync } from "fs"

/**
 * Checks if native dependency is installed using the `<dependency> --version`
 * command, and checks if the installed version satisfies the passed in version
 * requirement.
 * @arg dependency The name of the dependency to check.
 * @arg semver The required rust version as a semver string.
 */
export function checkInstalled(dependency: string, semver: string): boolean {
    if (!commandExists(dependency)) {
        return false
    }

    const installedVersion = execSync(`${dependency} --version`)
        .toString()
        .split(" ")[1]

    return satisfies(semver, installedVersion)
}

/**
 * Installs cargo-shuttle by downloading a binary for the users platform
 * from the github release binaries and moving it to their `$CARGO_HOME/bin`
 * directory.
 * @throws Will throw an error if the users platform is not windows, mac or linux.
 */
export function installShuttle() {
    let cargoBinDir = findCargoBinDir()

    const installBin = (bin: string, suffix?: string) => {
        return `curl -s -OL ${SHUTTLE_DOWNLOAD_URL + bin} &&\
            tar -xzf ${bin} shuttle/cargo-shuttle${suffix ?? ""} &&\
            mv shuttle/cargo-shuttle${suffix ?? ""} ${cargoBinDir} &&\
            rm -rf ${bin} shuttle`
    }

    switch (process.platform) {
        case "linux":
            execSync(installBin(SHUTTLE_LINUX_BIN))
            break
        case "darwin":
            execSync(installBin(SHUTTLE_MAC_BIN))
            break
        case "win32":
            execSync(installBin(SHUTTLE_WINDOWS_BIN, ".exe"))
            break
        default:
            throw {
                error: `create-shuttle-app can't install cargo-shuttle automatically 
                    on: ${chalk.red(process.platform)}\n Refer to 
                    "https://docs.shuttle.rs/introduction/installation" for instructions 
                    on installing cargo-shuttle manually.`,
            }
    }
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
    switch (process.platform) {
        case "linux":
        case "darwin":
            execSync(
                `curl --proto '=https' --tlsv1.3 https://sh.rustup.rs -sSf | bash -s -- -y --default-toolchain ${RUSTC_VERSION}`
            )
            break
        case "win32":
            const rustupPath = path.join(__dirname, "..", "rustup-init.exe")
            execSync(
                `curl -s -OL https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe &&\
                 ${rustupPath} -y --default-toolchain ${RUSTC_VERSION} --target x86_64-pc-windows-msvc &&\
                 rm -r ${rustupPath}`
            )
            break
        default:
            throw {
                error: `create-shuttle-app can't install Rust automatically 
                    on: ${chalk.red(process.platform)} \n
                    Refer to "https://www.rust-lang.org/tools/install" for instructions 
                    on installing rust for your operating system.`,
            }
    }
}
