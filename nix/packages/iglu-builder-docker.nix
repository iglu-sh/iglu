{
  dockerTools,
  self,
  buildEnv,
  stdenv,
  nix,
  cachix,
  gitMinimal,
  gzip,
  gnutar,
  openssh,
  xz,
  iana-etc,
  busybox,
  writeTextFile,
  bash,
}:

let
  inherit (self.packages.${stdenv.hostPlatform.system}) iglu-builder;
  archType = if (stdenv.hostPlatform.system == "x86_64-linux") then "amd64" else "arm64";
  buildUsers = [
    "nixbld:x:30000:30000:Nix build user 0:/var/empty:/noshell"
  ]
  ++ (builtins.genList (
    i:
    let
      userNum = i;
      uid = 30000 + i;
    in
    "nixbld${toString userNum}:x:${toString uid}:30000:Nix build user ${toString userNum}:/var/empty:/noshell"
  ) 32);
  buildGroup = [
    (builtins.concatStringsSep "," (
      [ "nixbld:x:30000:nixbld" ] ++ (builtins.genList (i: "nixbld${toString i}") 32)
    ))
  ];
in
dockerTools.buildImageWithNixDb {
  name = iglu-builder.pname;
  tag = "v${iglu-builder.version}-${archType}";
  created = "now";

  copyToRoot = buildEnv {
    name = "image-root";
    paths = with dockerTools; [
      # Builder
      iglu-builder

      # Nix
      nix
      gitMinimal
      cachix
      gnutar
      gzip
      openssh
      xz
      busybox
      bash

      (fakeNss.override {
        extraPasswdLines = buildUsers;
        extraGroupLines = buildGroup;
      })
      (writeTextFile {
        name = "nix.conf";
        destination = "/etc/nix/nix.conf";
        text = ''
          # Nix
          accept-flake-config = true
          experimental-features = nix-command flakes
          max-jobs = auto
          trusted-users = root

          # Crosscompiling
          extra-platforms = i686-linux
          system-features = nixos-test benchmark big-parallel kvm

          sandbox = true
          sandbox-fallback = true
        '';
      })

      # Networking
      iana-etc
      caCertificates

    ];
    pathsToLink = [
      "/bin"
      "/etc"
      "/var"
    ];
  };

  extraCommands = ''
    # Create dir for /usr/bin/env
    mkdir usr
    ln -s ../bin usr/bin

    # Create /tmp
    mkdir -m 1777 tmp

    # create root Home
    mkdir -vp root
  '';

  config = {
    Cmd = [ "/bin/iglu-builder" ];
    WorkingDir = "/tmp/iglu_builder";
    Volumes = {
      "/tmp/iglu_builder" = { };
    };
    Expose = 8000;
    Env = [
      # NIX ENVs
      "NIX_BUILD_SHELL=/bin/bash"
      "NIX_PATH=nixpkgs=https://github.com/NixOS/nixpkgs/archive/refs/tags/26.11.tar.gz"
      "BASH_ENV=/etc/profile.d/nix.sh"
      "ENV=/etc/profile.d/nix.sh"

      # Other
      "PATH=/root/.nix-profile/bin:/usr/bin:/bin"
      "PAGER=cat"
      "USER=root"
    ];
  };
}
