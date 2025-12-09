_: prev: {
  iglu = {
    flakecheck = prev.callPackage ./flakecheck/package.nix { };
    devshell = prev.callPackage ./devshell.nix { };

    cache = prev.callPackage ./cache/package.nix { };
    cache-docker = prev.callPackage ./cache/docker.nix { };

    scheduler = prev.callPackage ./scheduler/package.nix { };
    scheduler-docker = prev.callPackage ./scheduler/docker.nix { };

    builder = prev.callPackage ./builder/package.nix { };
    builder-docker = prev.callPackage ./builder/docker.nix { };

    controller = prev.callPackage ./controller/package.nix { };
    controller-docker = prev.callPackage ./controller/docker.nix { };
  };
}

