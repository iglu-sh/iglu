{
  lib,
  config,
  pkgs,
  ...
}:

with lib;
with lib.types;
let
  cfg = config.services.iglu-cache;
  isPostgres = cfg.database.type == "postgres";
  isFS = cfg.settings.storage.storage_type == "fs";

  # Build Config file
  toml = pkgs.formats.toml { };
  configFile = toml.generate "config.toml" (
    recursiveUpdate cfg.settings {
      database = {
        database_type = cfg.database.type;
        database_name = cfg.database.name;
      }
      // optionalAttrs (!isPostgres) {
        database_file_location = "${cfg.dataDir}/db.sqlite";
      }
      // optionalAttrs isPostgres {
        inherit (cfg.database) user host port;
      };
      deployments = {
        create_deployments_from_config = cfg.settings.deployments.definitions != [ ];
      };
      tenants = {
        create_tenants_from_config = cfg.settings.tenants.definitions != [ ];
      };
    }
  );
in
{
  options.services.iglu-cache = {
    enable = mkEnableOption "Iglu-cache service.";
    package = mkOption {
      type = package;
      default = pkgs.iglu-cache;
      description = "The package that runs iglu-cache.";
    };
    user = mkOption {
      type = str;
      default = "iglu";
      description = "User account under which iglu-cache runs.";
    };
    group = mkOption {
      type = str;
      default = "iglu";
      description = "Group under which iglu-cache runs.";
    };
    dataDir = mkOption {
      type = str;
      default = "/var/lib/iglu-cache";
      description = "Path where the derivations get stored.";
    };
    openFirewall = mkOption {
      type = bool;
      default = false;
      description = "Open ports in the firewall for the iglu-cache.";
    };
    database = {
      type = mkOption {
        type = enum [
          "sqlite"
          "postgres"
        ];
        default = "sqlite";
        description = ''
          Set which database type is used.
        '';
      };
      createLocally = mkOption {
        type = bool;
        default = false;
        description = "Create the database and database user locally.";
      };
      name = mkOption {
        type = str;
        default = "iglu";
        description = "Database name.";
      };
      user = mkOption {
        type = str;
        default = cfg.user;
        description = "Databases user.";
      };
      passwordFile = mkOption {
        type = nullOr str;
        default = null;
        description = "The full path to a file that contains the database password.";
      };
      host = mkOption {
        type = str;
        default = "/var/run/postgresql";
        description = "Host where the database is stored.";
      };
      port = mkOption {
        type = port;
        default = 5432;
        description = "Port of the database connection.";
      };
    };
    configFile = mkOption {
      type = package;
      readOnly = true;
      description = "Finalised config.toml";
    };
    settings = {
      server = {
        hostname = mkOption {
          type = str;
          default = "http://127.0.0.1:8080";
          description = "Hostname which the client will access.";
        };
        interface = mkOption {
          type = str;
          default = "127.0.0.1";
          description = "The interface on which the cache will listen on.";
        };
        port = mkOption {
          type = port;
          default = 8080;
          description = "The port on which the cache will listen on.";
        };
        hashing_secret_file = mkOption {
          type = str;
          default = "";
          description = "path to the file which contains the hashing secret.";
        };
        enable_rest = mkOption {
          type = bool;
          default = true;
          description = "Enable rest configuration enpoint.";
        };
        enable_info = mkOption {
          type = bool;
          default = true;
          description = "Enable a info page for each tenant.";
        };
      };
      storage = {
        storage_type = mkOption {
          type = enum [
            "fs"
            "s3"
          ];
          default = "fs";
          description = "Use fs for filesystem an s3 for a S3 instance";
        };
        binary_storage_directory = mkOption {
          type = str;
          default = "${cfg.dataDir}/data";
          description = "Location where the data gets stored if fs is used";
        };
        # TODO: S3 settings implementation
      };
      logger = {
        logging_format = mkOption {
          type = enum [
            "pretty"
            "json"
          ];
          default = "pretty";
          description = "Print the log pretty or as json.";
        };
        logging_prefix = mkOption {
          type = str;
          default = "cache";
          description = "Prefix befor each log entry.";
        };
        logging_prefix_color = mkOption {
          type = enum [
            "magenta"
            "black"
            "red"
            "green"
            "yellow"
            "blue"
            "cyan"
            "white"
          ];
          default = "magenta";
          description = "The color of the prefix befor each log entry";
        };
        log_level = mkOption {
          type = enum [
            "debug"
            "info"
            "warn"
            "error"
          ];
          default = "info";
          description = "Log level of the logger.";
        };
        should_log_requests = mkOption {
          type = bool;
          default = false;
          description = "Set it to true if you want all requests in your logs.";
        };
      };
      tenants = {
        definitions = mkOption {
          default = [ ];
          description = "Definitions of tenants.";
          type = listOf (submodule {
            options = {
              name = mkOption {
                type = str;
                default = "default";
                description = "Name of the tenant.";
              };
              github_username = mkOption {
                type = str;
                default = "";
                description = "The GitHub username from the cache.";
              };
              is_public = mkOption {
                type = bool;
                default = false;
                description = "Set this cache public.";
              };
              preferred_compression_method = mkOption {
                type = enum [
                  "zstd"
                  "xz"
                ];
                default = "zstd";
                description = "Set the default compression method.";
              };
              priority = mkOption {
                type = ints.positive;
                default = 1;
                description = "Set the priority of the cache.";
              };
              api_key_id = mkOption {
                type = str;
                default = "generated";
                description = "Set an api_key_id or generate one with \"generated\"";
              };
              ttl = mkOption {
                type = str;
                default = "5w";
                description = "Time how long the derivations will live.";
              };
            };
          });
        };
      };
      deployments = {
        enable_deployments = mkOption {
          type = bool;
          default = cfg.settings.deployments.definitions != [ ];
          description = "Enable deployment endpoints";
        };
        definitions = mkOption {
          default = [ ];
          description = "Definitions of deployment endpoints.";
          type = listOf (submodule {
            options = {
              name = mkOption {
                type = str;
                default = "";
                description = "Name of the deployment";
              };
              type = mkOption {
                type = enum [
                  "agent"
                  "activate"
                ];
                default = "agent";
                description = "Choose agent ot activation for activation token.";
              };
              expires_at = mkOption {
                type = str;
                default = "-1";
                description = "ISO format (e. g. 2026-05-02T14:30:00Z) or \"-1\" for no expire date.";
              };
              tenant_name = mkOption {
                type = str;
                default = "default";
                description = "Name of the tenant to use.";
              };
            };
          });
        };
      };
    };
  };

  config = mkIf cfg.enable {
    assertions = [
      {
        assertion = !(cfg.database.type == "sqlite" && cfg.database.createLocally);
        message = "You can't use a sqlite database and create a postgres locally. Set `services.iglu-cache.database.type = \"postgres\";`";
      }
    ];

    users = {
      users.${cfg.user} = {
        inherit (cfg) group;
        isSystemUser = true;
      };
      groups."${cfg.group}" = { };
    };

    services = {
      iglu-cache.configFile = configFile;
      postgresql = mkIf cfg.database.createLocally {
        enable = true;
        ensureDatabases = [ cfg.database.name ];
        ensureUsers = [
          {
            name = cfg.database.user;
            ensureDBOwnership = true;
          }
        ];
      };
    };

    systemd = {
      tmpfiles.rules = [
        "d ${cfg.dataDir} 0750 ${cfg.user} ${cfg.group} - -"
      ]
      ++ optional isFS "d ${cfg.settings.storage.binary_storage_directory} 0750 ${cfg.user} ${cfg.group} - -";
      services.iglu-cache = {
        description = "Iglu cache server";
        after = [
          "network.target"
          "systemd-tmpfiles-setup.service"
        ]
        ++ optional isPostgres "postgresql.service";
        wants = [
          "network.target"
          "systemd-tmpfiles-setup.service"
        ]
        ++ optional isPostgres "postgresql.service";
        wantedBy = [ "multi-user.target" ];
        environment = {
          IGLU_CACHE_CONF = configFile;
        };
        serviceConfig = {
          Type = "simple";
          User = cfg.user;
          Group = cfg.group;
          UMask = "0077";
          WorkingDirectory = cfg.dataDir;
          ExecStart = "${getExe cfg.package}";
          Restart = "on-failure";
          CapabilityBoundingSet = [ "" ];
          NoNewPrivileges = true;
          SystemCallArchitecture = "native";
          RestrictNamespaces = true;
          RestrictRealtime = true;
          RestrictSUIDSGID = true;
          ProcSubset = "pid";
          ProtectControlGroups = true;
          ProtectClock = true;
          ProtectHome = true;
          ProtectHostname = true;
          ProtectKernelLogs = true;
          ProtectKernelModules = true;
          ProtectKernelTunables = true;
          ProtectProc = "invisible";
          ProtectSystem = "strict";
          LockPersonality = true;
          PrivateTmp = true;
          PrivateDevices = true;
          PrivateUsers = true;
          RemoveIPC = true;
          DevicePolicy = "closed";
          PrivateMounts = true;
        };
      };
    };
  };
}
