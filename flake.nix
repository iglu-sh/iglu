{
  description = "Flake for managing all packages in the iglu.sh organisation";
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-25.11";
    utils.url = "github:gytis-ivaskevicius/flake-utils-plus?ref=afcb15b845e74ac5e998358709b2b5fe42a948d1";
    bun2nix.url = "github:nix-community/bun2nix?ref=2.0.6";
  };

  # deadnix: skip
  outputs = inputs@{ self, nixpkgs, utils, bun2nix }:
    utils.lib.mkFlake {
      inherit self inputs;

      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];

      overlays = {
        pkgs = import ./nix/pkgs;
      };

      sharedOverlays = [
        inputs.bun2nix.overlays.default
        self.overlays.pkgs
      ];

      outputsBuilder = channels:
        let
          inherit (channels) nixpkgs;
        in
        {
          devShells.default = nixpkgs.iglu.devshell;
          packages = nixpkgs.iglu;
        };
    };
}
