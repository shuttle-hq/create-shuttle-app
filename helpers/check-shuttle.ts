import { execSync } from "child_process"
import os from "os"
import path from "path"
import { sync as commandExists } from "command-exists"
import chalk from "chalk"
import {
    SHUTTLE_DOWNLOAD_URL,
    SHUTTLE_LINUX_BIN,
    SHUTTLE_MAC_BIN,
    SHUTTLE_WINDOWS_BIN,
} from "./constants"

export function isRustInstalled(semver: string): boolean {
    return commandExists("rustc")
}

export function isShuttleInstalled(): boolean {
    return commandExists("cargo-shuttle")
}

export function installShuttle() {
    const homedir = os.homedir()
    const cargoBinDir = path.join(homedir, ".cargo", "bin")

    const installBin = (bin: string, suffix?: string) => {
        return `curl -s -OL ${SHUTTLE_DOWNLOAD_URL + bin} &&\
            tar -xzf ${bin} shuttle/cargo-shuttle${suffix && suffix} &&\
            mv shuttle/cargo-shuttle${suffix && suffix} ${cargoBinDir} &&\
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

export function installRust() {
    switch (process.platform) {
        case "linux":
        case "darwin":
            execSync(
                `curl --proto '=https' --tlsv1.3 https://sh.rustup.rs -sSf | bash -s -- -y`
            )
            break
        case "win32":
            execSync(
                `wget -OutFile "C:\rustup-init.exe" 
                https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe
                C:\rustup-init.exe -y --default-toolchain 1.65.0 --target x86_64-pc-windows-msvc`
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
