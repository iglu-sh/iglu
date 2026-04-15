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

    utils.lib.mkFlake {
      inherit self inputs;
      outputsBuilder =
        channels:
        let
          pkgs = channels.nixpkgs;
        in
        {
          devShells.default = pkgs.mkShell {
            packages = with pkgs; [
              (python313.withPackages (
                pyPkgs: with pyPkgs; [
                  fastapi
                  fastapi-cli
                  websockets
                ]
              ))
              zsh
            ];
            shellHook = ''
              exec zsh
            '';
          };
        };
    };
}
