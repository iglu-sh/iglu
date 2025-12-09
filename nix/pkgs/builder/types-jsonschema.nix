{ buildPythonPackage
, fetchPypi
, setuptools
, referencing
}:

buildPythonPackage rec {
  pname = "types_jsonschema";
  version = "4.24.0.20250708";

  src = fetchPypi {
    inherit pname;
    inherit version;
    sha256 = "sha256-qRDklEaBy7GxipP/tQLgmRDbeIMUMS/HY98I2Kwqrbc=";
  };

  pyproject = true;

  build-system = [ setuptools ];

  propagatedBuildInputs = [ referencing ];

  doCheck = false;
}
