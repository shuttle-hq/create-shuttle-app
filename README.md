## Maintenance Status

With recent improvements to `cargo shuttle init`, `init` can now be used to easily initialize projects from any template. Since `init` can do what create-shuttle-app does, and more, we have decided to deprecate create-shuttle-app. Consequently, the repository will be archived. 

We encourage any create-shuttle-app users to test out the recent updates to cargo shuttle init, and let us know if there is any functionality you feel is missing!

<p align="center">
    <img width="300" src="https://raw.githubusercontent.com/shuttle-hq/shuttle/master/assets/logo-rectangle-transparent.png"/>
</p>

## create-shuttle-app

The `create-shuttle-app` node CLI is a utility designed to make deploying a next.js web-app with a Rust backend easier.
The CLI will initialize a `create-next-app` project and export it to a `static` directory in a rust webserver project
based on the [axum](https://github.com/tokio-rs/axum) web framework. The rust server will serve the next.js app in the 
`static` directory, and it can easily be extended with API-routes. 

The rust server also uses shuttle. Shuttle uses annotations to deploy a webserver written in rust to the cloud, and it
can also provision databases like Postgres and MongoDB via annotations.

For more information on shuttle check out our website: https://www.shuttle.rs/

This is the first iteration of this CLI so you may encounter some issues at first. Feel free to report this to us on
[github](https://github.com/shuttle-hq/shuttle), or reach out to us on [Discord](https://discord.gg/shuttle)

## Usage

To install and run the latest version of the `create-shuttle-app` CLI, run this command:

```
npx create-shuttle-app
```

The command also takes some optional args:

```
--ts                               # Initialize the Next.js app as a typescript project.
--eslint                           # Initialize with eslint config.
-e, --example [name]|[github-url]  # An example to bootstrap the app with. You can use an example name
                                    from the official Next.js repo or a GitHub URL. The URL can use
                                    any branch and/or subdirectory
--shuttle-example <github-url>     # A GitHub URL to use to bootstrap the shuttle backend with.
--fullstack-example                # Initialise using a provided full-stack Shuttle template (current supported values: "saas")
```

## Commands

After initializing your app, you're ready to deploy it or run it locally.

To deploy your application to the cloud, you need to run the following commands:

First, login: `npm run shuttle-login`

Start your project container: `npm run start`

And that's it! When you're ready to deploy: `npm run deploy`

If you'd like to develop locally, you can start a next.js dev server as well as your
shuttle backend with the `npm run dev`

If you wish to stop your deployment: `npm run stop`

## Contributing

If you're looking to contribute, you can quickly test any changes you've made by running the following:

```yarn release
yarn build
yarn copy-assets
node dist/index.js 
```

This builds a local release of the package, copies the required assets to be able to run it locally and then runs it locally.

## Windows troubleshooting

`create-shuttle-app` will install Rust and the `cargo-shuttle` crate with install scripts.
It will try to do this automatically, but it may fail, and you might want to do this yourself.
The install scripts may also cause PowerShell to not be able to run `create-shuttle-app`, since
it disallows scripts by default. To override this, run the `set-executionpolicy remotesigned`
command in a PowerShell started in administrator mode. Or use Git Bash, which doesn't restrict
this.

If you want to install dependencies for `create-shuttle-app` manually, these are the required 
native dependencies:

- Rust version 1.68: https://www.rust-lang.org/tools/install
- cargo-shuttle latest version: https://docs.shuttle.rs/introduction/installation
