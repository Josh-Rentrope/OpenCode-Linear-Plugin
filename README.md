# OpenCode-Linear-Plugin

Looking at the linear plugin system and experimenting with it through OpenCodes's system.

## Linear Setup

You will need a Linear API Key. [You can get one here](https://linear.app/settings/account/security)

Windows
```
LINEAR_API_KEY=your_api_key_here
```

Unix
```
export LINEAR_API_KEY=your_api_key_here
```

## OpenCode Setup

Copying the plugin folder and installing `@linear/sdk` to your local or global opencode directory will enable this plugin 

## Current Use

The first tool you can invoke is `linear_auth` which will create and authenticate a client.

This is an example project, so don't expect permanent APIs; feel free to fork/clone/copy to make your own.