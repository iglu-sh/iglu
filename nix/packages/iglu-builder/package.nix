{
  python3Packages,
  nix,
  cachix,
}:

let
  src = ../../../builder;
  pyproject = builtins.fromTOML (builtins.readFile (src + /pyproject.toml));
in
python3Packages.buildPythonApplication {
  pname = "iglu-builder";
  inherit (pyproject.project) version;
  inherit src;

  pyproject = true;

  propagatedBuildInputs = with python3Packages; [
    # Python stuff
    fastapi
    websockets
    jinja2
    gitpython
    wheel
    uvicorn
    toml
    types-toml

    # nix stuff
    nix
    cachix
  ];

  build-system = with python3Packages; [
    setuptools
  ];

}
