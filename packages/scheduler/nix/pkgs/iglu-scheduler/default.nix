{ bun2nix
, deadnix
, nixpkgs-fmt
}:

bun2nix.writeBunApplication {
  packageJson = ../../../package.json;

  src = ../../..;

  bunDeps = bun2nix.fetchBunDeps {
    bunNix = ./bun.nix;
  };

  nativeBuildInputs = [
    deadnix
    nixpkgs-fmt
  ];

  dontUseBunBuild = true;

  startScript = "bun run start";
}
