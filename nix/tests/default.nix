{ pkgs, self }:
{
  iglu-cache-test = pkgs.testers.nixosTest (import ./iglu-cache.nix { inherit self; });
}
