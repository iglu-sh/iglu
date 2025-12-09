{ dockerTools
, writeTextFile
, iglu
, bashInteractive
, gitMinimal
, gnutar
, gzip
, openssh
, xz
, iana-etc
, buildEnv
, tini
, nix
, stdenv
, busybox
, man
, wrapQemuBinfmtP
, qemu-user
}:

let
  nixosVersion = "25.05";
  archType =
    if (stdenv.hostPlatform.system == "x86_64-linux") then "amd64" else "arm64";
  ccType =
    if (stdenv.hostPlatform.system == "x86_64-linux") then "aarch64" else "x86_64";

  buildUsers = [ "nixbld:x:30000:30000:Nix build user 0:/var/empty:/noshell" ] ++ (builtins.genList
    (i:
      let
        userNum = i;
        uid = 30000 + i;
      in
      "nixbld${toString userNum}:x:${toString uid}:30000:Nix build user ${toString userNum}:/var/empty:/noshell"
    ) 32);
  buildGroup = [
    (builtins.concatStringsSep "," ([ "nixbld:x:30000:nixbld" ] ++ (builtins.genList
      (i:
        "nixbld${toString i}"
      ) 32)))
  ];

  binfmtQemu = wrapQemuBinfmtP "qemu-${ccType}-binfmt-P" "${qemu-user}/bin/qemu-${ccType}";
in
dockerTools.buildImageWithNixDb {
  name = "iglu-builder";
  tag = "v${iglu.iglu-builder.version}-${archType}";

  copyToRoot = buildEnv {
    name = "image-root";
    paths = with dockerTools; [
      iglu.iglu-builder
      iglu.enable-cc
      binfmtQemu
      bashInteractive
      busybox

      # runtime dependencies of nix
      nix
      gitMinimal
      gnutar
      gzip
      openssh
      xz
      iana-etc

      tini
      caCertificates
      man
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
          extra-platforms = ${ccType}-linux i686-linux
          extra-sandbox-paths = /run/binfmt ${binfmtQemu}
          system-features = nixos-test benchmark big-parallel kvm

          # Sandboxing does currently not work with cross-compiling
          sandbox = false
          sandbox-fallback = true
        '';
      })
    ];
    pathsToLink = [ "/bin" "/etc" "/var" ];
  };

  extraCommands = ''
    # Create dir for /usr/bin/env
    mkdir usr
    ln -s ../bin usr/bin

    # Create /tmp
    mkdir -m 1777 tmp

    # create root Home
    mkdir -vp root

    # Create /run/binfmt
    mkdir -p run/binfmt
    ln -s ../../bin/qemu-${ccType}-binfmt-P run/binfmt/${ccType}-linux
  '';

  config = {
    Env = [
      # NIX ENVs
      "NIX_BUILD_SHELL=/bin/bash"
      "NIX_PATH=nixpkgs=https://github.com/NixOS/nixpkgs/archive/refs/tags/${nixosVersion}.tar.gz"
      "BASH_ENV=/etc/profile.d/nix.sh"
      "ENV=/etc/profile.d/nix.sh"

      # Other
      "PATH=/root/.nix-profile/bin:/usr/bin:/bin"
      "PAGER=cat"
      "USER=root"
    ];
    ExposedPorts = { "3000/tcp" = { }; };
    Cmd = [ "/bin/iglu-builder" ];
    Entrypoint = [ "/bin/entrypoint.sh" ];
  };
}
