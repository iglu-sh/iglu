{
  dockerTools,
  self,
  stdenv,
  buildEnv,
  bash,
  busybox,
}:

let
  inherit (self.packages.${stdenv.hostPlatform.system}) iglu-cache;
in
dockerTools.buildImage {
  name = iglu-cache.pname;
  tag = "v${iglu-cache.version}";
  created = "now";

  copyToRoot = buildEnv {
    name = "image-root";
    paths = with dockerTools; [
      # iglu-cache
      iglu-cache
      # debugging
      bash
      busybox

      # Networking
      caCertificates
    ];
    pathsToLink = [
      "/bin"
      "/etc"
      "/var"
    ];
  };

  config = {
    Cmd = [ "/bin/iglu-cache" ];
    WorkingDir = "/app/iglu_cache";
    Volumes = {
      "/app/iglu_cache" = { };
    };
    Expose = 80;
  };
}
