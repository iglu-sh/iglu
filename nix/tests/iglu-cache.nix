{ self, system }:
{
  name = "iglu-cache";

  nodes.machine =
    { pkgs, ... }:
    {
      imports = [
        self.nixosModules.${system}.default
      ];
      virtualisation.diskSize = 1024 * 10;

      services = {
        # Needed until NixOS-26.11 is released
        postgresql.package = pkgs.postgresql_18;
        iglu-cache = {
          enable = true;
          database = {
            type = "postgres";
            createLocally = true;
          };
          settings = {
            server.hashing_secret_file = "${pkgs.writeText "secret" "somesecurestring"}";
            tenants.definitions = [
              {
                name = "default";
                github_username = "iglu-sh";
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
        "curl http://localhost:8080/default"
      )
  '';
}
