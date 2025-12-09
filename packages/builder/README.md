# Iglu Builder
[![Build Image and upload to ghcr](https://github.com/iglu-sh/builder/actions/workflows/build-docker.yml/badge.svg)](https://github.com/iglu-sh/builder/actions/workflows/build-docker.yml)
[![CodeQL](https://github.com/iglu-sh/builder/actions/workflows/codeql.yml/badge.svg)](https://github.com/iglu-sh/builder/actions/workflows/codeql.yml)

The builder compoment of the Iglu project. It's a simple nix builder that can be used to build and push derivations to a cachix compatible Cache. ([Iglu Cache](https://github.com/iglu-sh/cache))

## Installation
Normally you don't have to setup the builder manually. The [Iglu Controller](https://github.com/iglu-sh/controller) spins up new builder each time it starts a job. If you want to spin up a builder manually anyway then you can use:

```bash
docker run --rm -v ./repos:/tmp/repos -p 3000:3000 ghcr.io/iglu-sh/iglu-builder:latest
```

## Documentation
Documentation of the build could be found [here](https://docs.iglu.sh/docs/Components/Iglu%20Builder).

## Development
For development you need a working installation of [Bun](https://bun.sh).
The simplest way to get a working development-environment is to us `nix develop` at the top of the repository.

**IMPORTANT:** If you want to build the docker image you have to run `nix build .#iglu-builder-docker && docker load < result`.

```bash
bun install
bun run prod
```

This project was created using `bun init` in bun v1.2.12. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
