echo "Run nix flake check..."
if nix flake check; then
    flake_check=success
    echo "Everything is fine with nix flake check!"
else
    flake_check=failed
fi

echo
echo
echo "Run flake-checker..."
if flake-checker; then
    flake_checker=success
    echo "Everything is fine with flake-checker!"
else
    flake_checker=failed
fi

echo
echo
echo "Run statix..."
if statix check; then
    statix=success
    echo "Everything fine with statix!"
else
    statix=failed
fi
 
echo
echo
echo "Run deadnix..."
if git ls-files '*.nix' | xargs deadnix -f; then
    deadnix=success
    echo "Everything fine with deadnix!"
else
    deadnix=failed
fi

echo
echo
echo "Run nixpkgs-fmt check..."
if git ls-files '*.nix' | xargs nixpkgs-fmt --check; then
    nixpkgs=success
    echo "Everything fine with nixpkgs-fmt!"
else
    nixpkgs=failed
fi

echo
echo
echo "flake_check:   $flake_check"
echo "flake_checker: $flake_checker"
echo "statix:        $statix"
echo "deadnix:       $deadnix"
echo "nixpkgs-fmt:   $nixpkgs"

if [ $flake_check == "failed" ] || [ $flake_checker == "failed" ] || [ $statix == "failed" ] || [ $deadnix == "failed" ] || [ $nixpkgs == "failed" ]; then
  exit 1
fi
