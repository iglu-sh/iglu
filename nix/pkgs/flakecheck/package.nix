{ writeShellApplication
, nixpkgs-fmt
, flake-checker
, deadnix
, statix
}:

writeShellApplication {
  name = "flakecheck";
  runtimeInputs = [
    nixpkgs-fmt
    deadnix
    statix
    flake-checker
  ];
  text = builtins.readFile ./flakecheck.sh;
}
