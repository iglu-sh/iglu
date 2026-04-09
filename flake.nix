{
  description = "Flake for the Iglu Project";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    utils.url = "github:gytis-ivaskevicius/flake-utils-plus";
  };
  outputs =
    inputs@{
      nixpkgs,
      self,
      utils,
      ...
    }:
    { };
}
