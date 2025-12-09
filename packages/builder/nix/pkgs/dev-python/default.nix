{ python3 }:
python3.withPackages (ps:
with ps; [
  gitpython
  jinja2
  jsonschema
  mypy
  types-jsonschema
]
)
