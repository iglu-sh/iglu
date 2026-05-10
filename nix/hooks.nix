{
  my-python,
  pkgs,
  lib,
}:
{
  # Nix
  nixfmt.enable = true;
  statix.enable = true;
  deadnix.enable = true;

  # Python
  black.enable = true;
  pyright = {
    extraPackages = [ my-python ];
    enable = true;
  };

  # toml
  check-toml.enable = true;

  # Type/JavaScript
  biome = {
    enable = true;
    extraPackages = [ pkgs.nodejs ];
    settings = {
      binPath = "./node_modules/.bin/biome";
      configPath = "./biome.json";
      write = false;
    };
  };

  shared-unit-tests = {
    enable = true;
    name = "shared-unit-tests";
    entry = "${lib.getExe pkgs.bash} -c 'bun i && bun run test::shared'";
    files = "^(shared/|tests/shared/)";

    language = "unsupported";
    pass_filenames = false;
    package = pkgs.bun;
  };

  cache-unit-tests = {
    enable = true;
    name = "cache-unit-tests";
    entry = "${lib.getExe pkgs.bash} -c 'bun i && bun run test::cache'";
    files = "^(cache/|tests/cache/)";

    language = "unsupported";
    pass_filenames = false;
    package = pkgs.bun;
  };
}
