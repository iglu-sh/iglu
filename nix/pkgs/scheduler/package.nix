{ bun2nix }:

bun2nix.writeBunApplication {
  packageJson = ../../../packages/scheduler/package.json;

  src = ../../../packages/scheduler;

  bunDeps = bun2nix.fetchBunDeps {
    bunNix = ./bun.nix;
  };

  dontUseBunBuild = true;

  startScript = "bun run start";

  preBunLifecycleScriptsPhase = ''
    substituteInPlace ./package.json \
      --replace-fail "postinstall" "__postinstall"
  '';
}
