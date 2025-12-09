{ bun2nix
, glibc
, deadnix
, nixpkgs-fmt
, nix
, lib
}:

bun2nix.writeBunApplication {
  packageJson = ../../../package.json;
  src = ../../..;

  nativeBuildInputs = [
    deadnix
    nixpkgs-fmt
  ];

  buildInputs = [
    glibc
    nix
  ];

  buildPhase = ''
    bun run build
  '';

  postInstall = ''
    wrapProgram $out/bin/iglu-controller \
      --prefix PATH : ${lib.makeBinPath [ nix ]}
  '';

  startScript = ''
    bun --bun run next start
  '';

  bunDeps = bun2nix.fetchBunDeps {
    bunNix = ./bun.nix;
  };
}
