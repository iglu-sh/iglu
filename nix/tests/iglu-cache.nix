{ self }:
{
  name = "iglu-cache";

  nodes.machine =
    { pkgs, ... }:
    {
      imports = [
        self.nixosModules.default
      ];
      virtualisation.diskSize = 1024 * 10;

      environment.systemPackages = [ pkgs.cachix ];

      services = {
        iglu-cache = {
          enable = true;
          database = {
            type = "postgres";
            createLocally = true;
          };
          settings = {
            logger.log_level = "debug";
            server.hashing_secret_file = "${pkgs.writeText "secret" "somesecurestring"}";
            tenants.definitions = [
              {
                name = "default";
                github_username = "iglu-sh";
                is_public = true;
              }
            ];
            deployments.definitions = [
              { name = "default"; }
            ];
          };
        };
      };
    };

  testScript = ''
    with subtest("let all services reach active state"):
      machine.start()
      machine.wait_for_unit("postgresql.service")
      machine.wait_for_unit("iglu-cache.service")

    with subtest("check port"):
      machine.wait_for_open_port(8080)

    with subtest("check if info page"):
      machine.succeed(
        "curl http://localhost:8080/default | grep 'This iglu cache is PARTIALLY operational'"
      )

    with subtest("test cachix push and generate-keypair"):
      machine.succeed(
        "cachix authtoken $(journalctl -u iglu-cache | grep 'Created API key for cache: default; Key:' | awk '{print $NF}')"
      )

      machine.succeed(
        "cachix config set hostname http://localhost:8080"
      )

      machine.succeed(
        "cachix generate-keypair default"
      )

      machine.succeed(
        "cachix push default /run/current-system/sw/bin/cachix"
      )
  '';
}
