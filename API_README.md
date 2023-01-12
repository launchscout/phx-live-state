# Introduction

This package is the javascript client for [LiveState channels](https://github.com/launchscout/live_state). LiveState channels are Phoenix Channels which manage state for connected web clients.

This library is organized in layers of increasing levels of abstraction.

## {@link LiveState}

This is the lowest level of abstraction for connecting to LiveState. It is typically, but not necessarily, used by framework integrations.

## {@link connectElement}

This is a function designed to connect a Custom Element to LiveState

## {@link liveState}

This is a decorator function for CustomElement classes which leverages {@link connectElement}