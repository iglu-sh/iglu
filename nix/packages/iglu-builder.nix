{
  python3Packages,
  nix,
  cachix,
}:

python3Packages.buildPythonApplication {
  pname = "iglu-builder";
  version = "0.0.1";
  src = ../../builder;

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
