{ python3
, callPackage
, python3Packages
}:

python3.withPackages (ps:
let
  types-jsonschema = callPackage ./types-jsonschema.nix {
    inherit (python3Packages) buildPythonPackage referencing setuptools;
  };
in
with ps; [
  gitpython
  jinja2
  jsonschema
  mypy
  types-jsonschema
]
)
