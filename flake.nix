{
  description = "Flake for the Iglu Project";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    utils.url = "github:gytis-ivaskevicius/flake-utils-plus";
    git-hooks.url = "github:cachix/git-hooks.nix";
    bun2nix = {
      # Using this fork while https://github.com/nix-community/bun2nix/pull/82 is not merged
      url = "github:poly2it/bun2nix/module-populator";
      inputs.nixpkgs.follows = "nixpkgs";
    };

  };
  outputs =
    inputs@{
      self,
      utils,
      ...
    }:
    utils.lib.mkFlake {
      inherit self inputs;
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];

      sharedOverlays = [
        inputs.bun2nix.overlays.default
        (final: _prev: import ./nix/packages { pkgs = final; })
      ];

      outputsBuilder =
        channels:
        let
          pkgs = channels.nixpkgs;
        in
        {
          packages = import ./nix/packages { inherit pkgs; };
          devShells.default = import ./nix/devShells { inherit pkgs inputs; };
          nixosModules.default = import ./nix/modules;
          checks = import ./nix/tests { inherit pkgs self; };
        };
    };
}
