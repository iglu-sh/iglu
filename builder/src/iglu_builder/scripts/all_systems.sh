#!/usr/bin/env bash
for system in "$@"; do
    echo "Building $system"
    nix build ".#nixosConfigurations.$system.config.system.build.toplevel"
done
