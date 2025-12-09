_: prev: {
  iglu = prev.iglu // {
    iglu-scheduler = prev.callPackage ./iglu-scheduler { };
    iglu-scheduler-docker = prev.callPackage ./iglu-scheduler-docker { };
  };
}

