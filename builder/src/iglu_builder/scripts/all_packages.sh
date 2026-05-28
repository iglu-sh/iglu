#!/usr/bin/env bash
for package in "$@"; do
    echo "Building $package"
    nix build ".#$package"
done
