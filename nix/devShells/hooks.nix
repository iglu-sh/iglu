{ pkgs }:
{
  # Nix
  nixfmt.enable = true;
  statix.enable = true;
  deadnix = {
    enable = true;
    settings.exclude = [ "bun.nix" ];
  };

  # Python
  black.enable = true;
  pyright.enable = true;

  # toml
  check-toml.enable = true;

  # Type/JavaScript
  biome = {
    enable = true;
    extraPackages = [ pkgs.nodejs ];
    settings = {
      binPath = "./node_modules/@biomejs/biome/bin/biome";
      configPath = "./biome.json";
      write = false;
    };
  };

  shared-unit-tests = {
    enable = true;
    name = "shared-unit-tests";
    entry = "${pkgs.writeShellScript "shared-unit-tests" ''
      bun i
      bun run test::shared::ci
    ''}";
    files = "^(shared/|tests/shared/)";
    language = "unsupported";
    pass_filenames = false;
    extraPackages = [ pkgs.bun ];
  };

  cache-unit-tests = {
    enable = true;
    name = "cache-unit-tests";
    entry = "${pkgs.writeShellScript "cache-unit-tests" ''
      bun i
      bun run test::cache::ci
    ''}";
    files = "^(cache/|tests/cache/)";
    language = "unsupported";
    pass_filenames = false;
    extraPackages = [ pkgs.bun ];
  };
}
