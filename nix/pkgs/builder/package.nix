{ bun2nix
, nix
, cachix
, lib
, callPackage
}:

let
  python-env = callPackage ./python-env.nix { };
in
bun2nix.writeBunApplication rec{
  packageJson = ../../../packages/builder/package.json;

  src = ../../../packages/builder;

  bunDeps = bun2nix.fetchBunDeps {
    bunNix = ./bun.nix;
  };

  buildInputs = [
    python-env
    nix
    cachix
  ];

  dontUseBunBuild = true;

  postInstall = ''
    wrapProgram $out/bin/iglu-builder \
      --prefix PATH : ${lib.makeBinPath buildInputs}
  '';

  startScript = "bun run prod";

  buildPhase = ''
    patchShebangs lib
  '';

  preBunLifecycleScriptsPhase = ''
    substituteInPlace ./package.json \
      --replace-fail "postinstall" "__postinstall"
  '';
}
