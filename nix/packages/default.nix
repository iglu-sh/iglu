{ pkgs }:
let
  dirContent = builtins.readDir ./.;
  fileNames = builtins.attrNames dirContent;
  pkgNames = builtins.filter (name: dirContent.${name} != "regular") fileNames;
in
builtins.listToAttrs (
  map (
    name:
    let
      path = ./${name}/package.nix;
      cleanName = "${name}";
    in
    {
      name = cleanName;
      value = pkgs.callPackage path { };
    }
  ) pkgNames
)
// builtins.listToAttrs (
  map (
    name:
    let
      path = ./${name}/docker.nix;
      cleanName = "${name}-docker";
    in
    {
      name = cleanName;
      value = pkgs.callPackage path { };
    }
  ) pkgNames
)
