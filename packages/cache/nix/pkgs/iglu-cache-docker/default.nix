{ dockerTools
, iglu
, bash
, stdenv
}:

let
  archType = if (stdenv.hostPlatform.system == "x86_64-linux") then "amd64" else "arm64";
in
dockerTools.buildLayeredImage {
  name = "iglu-cache";
  tag = "v${iglu.iglu-cache.version}-${archType}";

  contents = [
    iglu.iglu-cache
    bash
  ];

  config = {
    ExposedPorts = {
      "3000/tcp" = { };
      "9464/tcp" = { };
    };
    Cmd = [ "/bin/iglu-cache" ];
  };
}
