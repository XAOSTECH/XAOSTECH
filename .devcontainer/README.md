# Container Configuration

## Metadata
- **Category**: `web-dev`
- **Type**: `Pre-built image`
- **Container Name**: `.`

## Generated Instructions

1. Download the latest dev-control release tag (latest):

   `gh release download latest --repo XAOSTECH/dev-control`

   Or download directly (no gh required):

   https://github.com/XAOSTECH/dev-control/releases/tag/latest

2. Load aliases (includes dc-contain):

   `source ./scripts/alias-loading.sh`

3. Build a base image (example):

   `dc-contain --base --web-dev --defaults`
   `dc-contain --base --web-dev`  # interactive config

4. Run the script directly (same example):

   `./scripts/containerise.sh --base --web-dev --defaults`

5. Generate an image-based devcontainer (example):

   `dc-contain --img --web-dev`

## About

This devcontainer uses a pre-built dev-control category image.
**Base Image:** `devcontrol/web-dev:latest`

This folder is generated from a base image. The usual flow is:

- Build the base image in a parent folder
- Then generate this image-based devcontainer using `--img`

**Features:** Node.js 25 (nvm), npm, modern web frameworks, Wrangler, dev-control

**Build source:** https://github.com/xaostech/dev-control/tree/main/.devcontainer/web-dev

## Files

- **devcontainer.json** - Your personal VS Code devcontainer configuration (gitignored)
- **Dockerfile** - Your personal container image definition (gitignored)
- **.dockerignore** - Files to exclude from build context
- **README.md** - This file
- **devcontainer_example.json** - Tracked reference with placeholder values
- **Dockerfile_example** - Tracked reference Dockerfile
- **devcontainer_minimal.json** - Tracked minimal configuration
- **Dockerfile_minimal** - Tracked minimal Dockerfile

## Usage

1. Open this project in VS Code
2. Press `F1` and run: `Dev Containers: Reopen in Container`
3. The container will build and you'll work inside it

## Customisation

Edit `devcontainer.json` or `Dockerfile` to customise:
- Installed tools and libraries
- Environment variables
- VSCode extensions
- Mount points and volumes

For more information, see the Dev Containers docs:
https://code.visualstudio.com/docs/devcontainers/containers
