#!/usr/bin/env bash
rm ./.cachix.dhll
docker stop --all
mkdir ./repos

docker pull ghcr.io/iglu-sh/iglu-cache:latest postgres:17
nix build .#iglu-builder-docker
docker load < result

docker network create -d bridge iglu_test

BUILDER_IMAGE=$(docker images | grep "localhost/iglu-builder" | awk '{print $3}')

POSTGRES_CONTAINER=$(docker run --rm -d \
  --network=iglu_test \
  -e POSTGRES_PASSWORD="iglu" \
  -e POSTGRES_USER="iglu" \
  -e POSTGRES_DB="cache" \
  --hostname tst-postgres \
  --name tst-postgres \
  postgres)

BUILDER_CONTAINER=$(docker run --rm -d \
  -e LOG_LEVEL="DEBUG" \
  --network=iglu_test \
  --hostname tst-builder \
  --name tst-builder \
  -v ./repos:/tmp/repos \
  -p 3000:3000 \
  $BUILDER_IMAGE)

CACHE_CONTAINER=$(docker run --rm -d \
  --network=iglu_test \
  -e CACHE_MAX_GB=100 \
  -e POSTGRES_PASSWORD="iglu" \
  -e POSTGRES_USER="iglu" \
  -e POSTGRES_HOST="tst-postgres" \
  -e LOG_LEVEL="DEBUG" \
  -e PROM_ENABLE=true \
  -e CACHE_ROOT_DOMAIN="http://tst-cache:3000" \
  --hostname tst-cache \
  --name tst-cache \
  -p 3001:3000 \
  -p 9464:9464 \
  iglu-sh/iglu-cache)

INITIAL_KEY=false

while [[ $INITIAL_KEY == "false" ]]; do
  echo "Waiting for key..."
  sleep 5
  INITIAL_KEY=$(docker logs tst-cache | grep "Initial Key for cache" | awk '{print $9}')
  if [[ $INITIAL_KEY == "" ]]; then
    INITIAL_KEY="false"
  fi
done

cachix config set hostname http://localhost:3001 --config ./.cachix.dhll &> /dev/zero
cachix authtoken $INITIAL_KEY --config ./.cachix.dhll &> /dev/zero
cachix generate-keypair default --config ./.cachix.dhll &> /dev/zero

SIGNING_KEY=$(cat .cachix.dhll | grep '==' | cut -d'"' -f2)

echo "
{
    \"git\": {
        \"noClone\": true
    },
    \"buildOptions\": {
        \"command\": \"nix build github:NixOS/nixpkgs#azure-cli\",
        \"cachix\": {
            \"push\": true,
            \"target\": \"http://tst-cache:3000/default\",
            \"apiKey\": \"$INITIAL_KEY\",
            \"signingKey\": \"$SIGNING_KEY\"
        }
    }
}
"


