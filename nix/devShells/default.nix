{ pkgs, inputs }:
let
  pre-commit-check = inputs.git-hooks.lib.${pkgs.system}.run {
    src = ../../.;
    excludes = [ "./bun.nix" ];
    hooks = import ./hooks.nix { inherit pkgs; };
  };
  inherit (pre-commit-check) enabledPackages shellHook;
in
pkgs.mkShell {
  shellHook = ''
    ${shellHook}
    bun i

    # Just start zsh if it's an interactive shell
    if [[ $- == *i* ]]; then
      exec zsh
    fi
  '';
  buildInputs =
    with pkgs;
    [
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
      bun
      bun2nix
      nodejs

      lcov

      # Needed as better-sqlite3 has to be compiled for bun every time
      gnumake
      node-gyp
    ]
    ++ enabledPackages;
}
