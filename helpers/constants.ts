export const RUSTC_VERSION = "1.65.0"
export const SHUTTLE_VERSION = "0.10.0"

export const SHUTTLE_DOWNLOAD_URL = `https://github.com/shuttle-hq/shuttle/releases/download/v${SHUTTLE_VERSION}/`
export const SHUTTLE_TAG = "v0.10.0-8-gf75c2e9"

// TODO: update to the 0.10 released bin
const CURRENT_BIN = `cargo-shuttle-${SHUTTLE_TAG}`

export const SHUTTLE_LINUX_BIN = `${CURRENT_BIN}-x86_64-unknown-linux-gnu.tar.gz`
export const SHUTTLE_MAC_BIN = `${CURRENT_BIN}-x86_64-apple-darwin.tar.gz`
export const SHUTTLE_WINDOWS_BIN = `${CURRENT_BIN}-x86_64-pc-windows-msvc.tar.gz`

export const SHUTTLE_EXAMPLE_URL =
    "https://github.com/shuttle-hq/examples/axum/static-next-server"
