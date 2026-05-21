{
  bun2nix,
}:

bun2nix.writeBunApplication {
  pname = "iglu-cache";
  packageJson = ../../cache/package.json;

  src = ../../cache;

  bunDeps = bun2nix.fetchBunDeps {
    bunNix = ../../bun.nix;
  };

  bunLockFile = ../../bun.lock;

  bunWorkspace = "cache";

  bunWorkspaceDeps = {
    "@iglu-sh/shared" = ../../shared;
  };

  dontUseBunBuild = true;

  startScript = ''
    bun prod
  '';
  postInstall = ''
    mv $out/bin/iglu-cache $out/bin/.iglu-cache-unwrapped
    makeWrapper $out/bin/.iglu-cache-unwrapped $out/bin/iglu-cache \
      --run 'export IGLU_CWD="$PWD"'
  '';
}
