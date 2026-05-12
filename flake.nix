{
  description = "Flake for the Iglu Project";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    utils.url = "github:gytis-ivaskevicius/flake-utils-plus";
    git-hooks.url = "github:cachix/git-hooks.nix";
  };
  outputs =
    inputs@{
      self,
      utils,
      ...
    }:
    utils.lib.mkFlake {
      inherit self inputs;

      outputsBuilder =
        channels:
        let
          pkgs = channels.nixpkgs;
          # Read all directorys in /nix/packages
          packageNames = builtins.attrNames (builtins.readDir ./nix/packages);

          # Import every file from /nix/packages as package
          allPackages = builtins.listToAttrs (
            map (
              name:
              let
                pkg = import ./nix/packages/${name};
                path = ./nix/packages/${name};
                cleanName = builtins.replaceStrings [ ".nix" ] [ "" ] name;
                extraArgs = if (pkgs.lib.functionArgs pkg) ? self then { inherit self; } else { };
              in
              {
                name = cleanName;
                value = pkgs.callPackage path extraArgs;
              }
            ) packageNames
          );

          my-python =
            with pkgs;
            (python313.withPackages (
              pyPkgs: with pyPkgs; [
                fastapi
                fastapi-cli
                websockets
                gitpython
                jinja2
                toml
                types-toml
                black
              ]
            ));
        in
        {
          devShells.default =
            let
              inherit (self.checks.${pkgs.system}.pre-commit-check) enabledPackages shellHook;
            in
            pkgs.mkShell {
              shellHook = ''
                bun i
              ''
              + shellHook;
              buildInputs =
                with pkgs;
                [
                  my-python
                  zsh
                  bun
                  nodejs

                  lcov

                  # Needed as better-sqlite3 has to be compiled for bun every time
                  gnumake
                  node-gyp
                ]
                ++ enabledPackages;
            };
          packages = allPackages;

          checks.pre-commit-check = inputs.git-hooks.lib.${pkgs.system}.run {
            src = ./.;
            hooks = import ./nix/hooks.nix {
              inherit my-python pkgs;
              inherit (pkgs) lib;
            };
          };
        };
    };
}
