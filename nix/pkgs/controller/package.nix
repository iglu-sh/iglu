{ bun2nix
, glibc
, nix
, lib
}:

bun2nix.writeBunApplication {
  packageJson = ../../../packages/controller/package.json;
  src = ../../../packages/controller;

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

  preBunLifecycleScriptsPhase = ''
    substituteInPlace ./package.json \
      --replace-fail "postinstall" "__postinstall"
  '';
}
