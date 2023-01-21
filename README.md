# What is LiveState?

The goal of LiveState is to make building highly interactive web applications easier to build. Currently in most such applications clients send requests and receive responses from and to a server API. This essentially results in two applications, with state being managed in both in an ad hoc way.

LiveState uses a different approach. Clients dispatch events, which are sent to the server to be handled, and receive updates from the server any time application state changes. This allows state to have a single source of truth, and greatly reduces client code complexity. It also works equally well for applications where updates to state can occur indepently from a user initiated client side event (think "real time" applications such as chat, etc).

# phx-live-state

This is a package to help you build clients for LiveState applications. Such clients connect to a server running [live_state](https://github.com/gaslight/live_state) and send events and receive state (and possibly other events). 

## Version compatibility

This version, 0.7.0, requires version 0.5.0 of later of the [`live_state` elixir library](https://github.com/gaslight/live_state) due to the addition of version tracking for state.

## Installation

```
npm install phx-live-state
```

## Documentation

See [api docs](https://launchscout.github.io/phx-live-state)

## Example projects

Take a look at the following example projects:

* https://github.com/launchscout/livestate-comments
* https://github.com/launchscout/live_state_comments
* https://github.com/launchscout/discord_element
* https://github.com/launchscout/discord-element
