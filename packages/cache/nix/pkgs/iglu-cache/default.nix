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

  dontUseBunBuild = true;

  nativeBuildInputs = [
    deadnix
    nixpkgs-fmt
  ];

  startScript = "bun run prod";

  filesToInstall = [
    "index.ts"
    "routes"
    "utils"
  ];
}
