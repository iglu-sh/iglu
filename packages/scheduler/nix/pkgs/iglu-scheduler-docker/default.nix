{ dockerTools
, iglu
, bash
, stdenv
}:

let
  archType = if (stdenv.hostPlatform.system == "x86_64-linux") then "amd64" else "arm64";
in
dockerTools.buildLayeredImage {
  name = "iglu-scheduler";
  tag = "v${iglu.iglu-scheduler.version}-${archType}";

  contents = [
    iglu.iglu-scheduler
    bash
  ];

  config = {
    ExposedPorts = {
      "3008/tcp" = { };
    };
    Cmd = [ "/bin/iglu-scheduler" ];
    Env = [
      "DOCKER_MODE=true"
    ];
  };
}
