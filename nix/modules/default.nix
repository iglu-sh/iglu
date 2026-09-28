{ inputs, ... }:
{
  nixpkgs.overlays = [
    inputs.bun2nix.overlays.default
    (final: _prev: import ../packages { pkgs = final; })
  ];
  imports = [ ./services/iglu-cache.nix ];
}
