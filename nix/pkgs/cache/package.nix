{ bun2nix }:

bun2nix.writeBunApplication {
  packageJson = ../../../packages/cache/package.json;
  src = ../../../packages/cache;

  bunDeps = bun2nix.fetchBunDeps {
    bunNix = ./bun.nix;
  };

  dontUseBunBuild = true;

  startScript = "bun run prod";

  preBunLifecycleScriptsPhase = ''
    substituteInPlace ./package.json \
      --replace-fail "postinstall" "__postinstall"
  '';
}
