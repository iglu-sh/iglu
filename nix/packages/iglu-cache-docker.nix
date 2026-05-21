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
  archType = if (stdenv.hostPlatform.system == "x86_64-linux") then "amd64" else "arm64";
in
dockerTools.buildImage {
  name = iglu-cache.pname;
  tag = "v${iglu-cache.version}-${archType}";
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
