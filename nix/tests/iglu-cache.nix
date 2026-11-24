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
            config.reconcile.mode = "additive";
            server.hostname = "http://localhost:8080";
            logger.log_level = "debug";
            tenants."default" = {
              name = "default";
              preferred_compression_method = "zstd";
              priority = 1;
              ttl = "5w";
              signing_method = "client";
              github_username = "iglu-sh";
              is_public = true;
            };
            api_keys."default" = {
              generated = true;
              tenant = "default";
            };
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

    with subtest("test cachix generate-keypair"):
      machine.succeed(
        "cachix authtoken $(cat /var/lib/iglu-cache/.share/keyoutput.toml | grep 'api_key=' | cut -d'\"' -f2)"
      )

      machine.succeed(
        "cachix config set hostname http://localhost:8080"
      )

      machine.succeed(
        "cachix generate-keypair default"
      )

    with subtest("test cachix push"):
      machine.succeed(
        "cachix push default /run/current-system/sw/bin/cachix"
      )
  '';
}
