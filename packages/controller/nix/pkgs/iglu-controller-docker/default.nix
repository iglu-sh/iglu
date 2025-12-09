{ dockerTools
, iglu
, bash
, stdenv
}:

let
  archType = if (stdenv.hostPlatform.system == "x86_64-linux") then "amd64" else "arm64";
in
dockerTools.buildLayeredImage {
  name = "iglu-controller";
  tag = "v${iglu.iglu-controller.version}-${archType}";

  contents = [
    iglu.iglu-controller
    bash
  ];

  config = {
    ExposedPorts = {
      "3000/tcp" = { };
    };
    Cmd = [ "/bin/iglu-controller" ];
  };
}
