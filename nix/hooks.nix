{ my-python, pkgs }:
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
    settings = {
      configPath = "./biome.json";
      write = false;
    };
  };

  shared-unit-tests = {
    enable = true;
    name = "shared-unit-tests";
    entry = "bun test tests/shared";
    files = "^(shared/|tests/shared/)";

    language = "unsupported";
    pass_filenames = false;
    package = pkgs.bun;
  };
}
