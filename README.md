# Iglu - A next gen Nix automation suite.

<div align="center">
    <img width="300" src="./docs/static/img/logo.jpg" alt="Iglu Logo">
    <br>
    <img src="https://github.com/iglu-sh/iglu/actions/workflows/build-docker.yaml/badge.svg" alt="Latest Build">
    <img src="https://github.com/iglu-sh/iglu/actions/workflows/publish-iglu-shared.yml/badge.svg" alt="Shared NPM">
    <img src="https://github.com/iglu-sh/iglu/actions/workflows/publish-iglu-typescript-sdk.yml/badge.svg" alt="Iglu SDK">
</div>

## Table of Content
- [What is Iglu](#what-is-iglu)
- [Features](#features)
    - [Cache](#cache)
    - [Builder](#builder)
    - [Controller](#controller)
- [Cache Setup](#cache-setup)
    - [Docker](#docker)
    - [NixOS Module](#nixos-module)
- [Documentation](#documentation)

## What is Iglu
Iglu is a [Cachix](https://www.cachix.org/) compatible Nix cache.
It consists of three components:
- Cache: the heart of Iglu
- Builder: automatic nix builds
- Controller: A UI to manage the other two

## Features
### Cache
- Cachix compatible
- Multiple caches (tenants) on one cache instance 
- Deduplication across tenants
- S3 and local filesystem support to store the data
- SQLite & PostgreSQL as database
- Declarative configuration with and without NixOS
- Nix module
- Docker image

### Builder
- Websocket with build log
- Docker image
- Custom build commands
- Preconfigured build commands (all packages, all systems)
- Automatic push to cachix compatible caches

### Controller
WIP

## Cache setup
The cache can be setup using either the provided a NixOS module or a docker image.

### Docker 
A quick-start `docker-compose.yaml` looks like this:
```yaml
services:
    postgres:
        image: "postgres:18.3"
        environment:
            POSTGRES_PASSWORD: "changeme"
            POSTGRES_DB: "iglu"
    iglu:
        image: "ghcr.io/iglu-sh/iglu-cache:stable"
        volumes:
            - "./binaries:/binaries"
            - "./config:/config"
        environment:
            IGLU_CACHE_CONF: "/config/config.toml" # Sets which directory should be searched for your config.toml
        depends_on:
            - "postgres"
        ports:
            - "80:80"
```

And to get you started, here's a minimal `config.toml`.
For more information on what values can be configured, you can check out our article over on our [docs page](https://docs.iglu.sh/docs/cache/configuration/)
```toml
[database]
database_type = 'postgres'
user = 'postgres'
password = 'postgres'
host = 'postgres'
port = 5432
database_name = 'iglu'

[logger]
logging_format = 'pretty'
logging_prefix = 'cache'
logging_prefix_color = 'magenta'
log_level = 'info'
should_log_requests = false 

[server]
hostname = 'http://127.0.0.1:80' # Set this to your ACTUAL hostname (this is important for cachix) 
interface = '127.0.0.1' # Interface on which the cache is listening
port = 80 # Port on which the server is listening
use_reverse_proxy = false

[storage]
storage_type = 'fs' 
binary_storage_directory = '/binaries' # This is where you binaries will end up, we recommend setting this to an SSD Path for faster access times / faster uploads 

# Define your tenants here, or if you wish to use either the CLI or the Controller set this variable to true:
# CAREFULL: Changing the key of the tenant deletes the old tenant and recreates a new one, which also deletes all derivation <-> tenant links this tenant might have stored
[tenants]
[tenants.default]
github_username = 'YOUR_USER' #Set to your Github Username, as far as we can tell this field is largely unused
is_public = true #True adds an allow rule with CIDR 0.0.0.0/0 and priority 100 to your cache, setting to false does the opposite. You can change this later.
preferred_compression_method = 'zstd' #May either be xz or zstd
priority = 1 #Sets the priority of this nix cache, this affects which cache gets asked first for a cache hit during nix build processes
ttl = '5w'
signing_method = 'client'

[api_keys]
[api_keys.default]
name = 'default key'
generated = true
tenant = 'default'
out_file = '/config/.shared/keyoutput.toml'
```
The API key can be found at `./config/.share/keyoutput.toml` after startup.

### NixOS Module
Just import the Flake:
```nix
{
  inputs = {
  ...
    iglu.url = "github:iglu-sh/iglu";
  ...
  };

  outputs = {nixpkgs, iglu, ...} @ inputs: {
    nixosConfigurations.HOSTNAME = nixpkgs.lib.nixosSystem {
      specialArgs = { inherit inputs; };
        modules = [
          ./configuration.nix
          iglu.nixosModules.default
        ];
      };
    }; 
  };
};
```

And configure a basic setup:
```nix
services.iglu-cache = {
  enable = true;
  database = {
    type = "postgres";
    createLocally = true;
  };
  settings = {
    config.reconcile.mode = "additive";
    server.hostname = "http://localhost:8080";
    logger.log_level = "info";
    tenants."default" = {
      name = "default";
      preferred_compression_method = "zstd";
      priority = 1;
      ttl = "5w";
      signing_method = "client";
      github_username = "YOUR_USER";
      is_public = true;
    };
    api_keys."default" = {
      generated = true;
      tenant = "default";
    };
  };
};
```
The API key can be found at `/var/lib/iglu-cache/.share/keyoutput.toml` after startup.

## Documentation
All required information for deployment and contributing can be found at our docs site, which is located [here](https://docs.iglu.sh).
