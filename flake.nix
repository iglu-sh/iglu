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
    let
      inherit (utils.lib) exportPackages exportOverlays;
    in
    utils.lib.mkFlake {
      inherit self inputs;

      overlays = exportOverlays {
        inherit (self) inputs pkgs;
      };

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
                path = ./nix/packages/${name};
                cleanName = builtins.replaceStrings [ ".nix" ] [ "" ] name;
              in
              {
                name = cleanName;
                value = pkgs.callPackage path { };
              }
            ) packageNames
          );
        in
        {
          devShells.default = pkgs.mkShell {
            packages = with pkgs; [
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
              ))
              zsh
            ];
            shellHook = ''
              exec zsh
            '';
          };
          packages = allPackages;
        };
    };
}
