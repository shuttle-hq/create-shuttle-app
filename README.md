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

## Commands

To deploy your application to the cloud, you need to run the following commands:

First, login: `npm run shuttle-login`

Start your project container: `npm run start`

And that's it! When you're ready to deploy: `npm run deploy`

If you'd like to develop locally, you can start a next.js dev server as well as your
shuttle backend with the `npm run dev`

If you wish to stop your deployment: `npm run stop`
