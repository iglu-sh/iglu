_: prev: {
  iglu = prev.iglu // {
    iglu-cache = prev.callPackage ./iglu-cache { };
    iglu-cache-docker = prev.callPackage ./iglu-cache-docker { };
  };
}

