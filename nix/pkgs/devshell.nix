{ mkShell
, zsh
, wget
, cachix
, bun
, iglu
, nixpkgs-fmt
, flake-checker
, deadnix
, statix
, node-gyp
}:

mkShell {
  packages = [
    zsh
    wget
    cachix
    bun
    nixpkgs-fmt
    deadnix
    statix
    flake-checker
    node-gyp
    iglu.flakecheck
  ];

  shellHook = ''
    exec zsh
  '';
}
