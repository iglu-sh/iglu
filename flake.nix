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
          # Alle Einträge in nix/packages/ einlesen
          packageNames = builtins.attrNames (builtins.readDir ./nix/packages);

          # Jeden Ordner/jede Datei als Package importieren
          allPackages = builtins.listToAttrs (
            map (
              name:
              let
                # Unterstützt sowohl foo/ als auch foo.nix
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
              inherit (self.checks.${pkgs.system}.pre-commit-check) enabledPackages;
              pre-commit-shellHook = self.checks.${pkgs.system}.pre-commit-check.shellHook;
            in
            pkgs.mkShell {
              shellHook = ''
                ${pre-commit-shellHook}
                exec zsh
              '';
              buildInputs =
                with pkgs;
                [
                  my-python
                  zsh
                  bun
                ]
                ++ enabledPackages;
            };
          packages = allPackages;

          checks.pre-commit-check = inputs.git-hooks.lib.${pkgs.system}.run {
            src = ./.;
            hooks = {
              # Nix
              nixfmt.enable = true;
              statix.enable = true;
              deadnix.enable = true;

              # Python
              black.enable = true;
              pyright = {
                extraPackages = [ my-python ];
                enable = true;
              };

              # toml
              check-toml.enable = true;

              # Type/JavaScript
              biome = {
                enable = true;
                settings.configPath = "./biome.json";
              };
            };
          };
        };
    };
}
