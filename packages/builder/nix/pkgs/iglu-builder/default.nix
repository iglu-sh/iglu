{ bun2nix
, nix
, cachix
, iglu
, deadnix
, nixpkgs-fmt
, lib
}:

bun2nix.writeBunApplication rec{
  packageJson = ../../../package.json;

  src = ../../..;

  bunDeps = bun2nix.fetchBunDeps {
    bunNix = ./bun.nix;
  };

  nativeBuildInputs = [
    deadnix
    nixpkgs-fmt
  ];

  buildInputs = [
    iglu.dev-python
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

}
