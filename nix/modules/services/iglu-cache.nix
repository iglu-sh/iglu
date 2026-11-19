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
  isFS = !(hasAttr "storage_type" cfg.settings.storage) || cfg.settings.storage.storage_type == "fs";

  # Build Config file
  toml = pkgs.formats.toml { };
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
    encryptionSecretPath = mkOption {
      type = str;
      default = "${cfg.dataDir}/.share/encryption";
      description = "Path containing the encryption secret, if path is empty a new secret file will be created.";
    };
    hashingSecretPath = mkOption {
      type = str;
      default = "${cfg.dataDir}/.share/hashing";
      description = "Path containing the hashing secret, if path is empty a new secret file will be created.";
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
    settings = mkOption {
      default = { };
      description = "Free-form settings written directly to the config.toml file.";
      type = submodule {
        freeformType = toml.type;
        options = {
          database = {
            database_type = mkOption {
              type = str;
              default = cfg.database.type;
              defaultText = "config.services.iglu-cache.database.type";
              description = "Set the type which the cache uses for database.";
            };
            database_file_location = mkOption {
              type = nullOr str;
              default = "${cfg.dataDir}/sqlite.db";
              defaultText = "\"$${config.services.iglu-cache.dataDir}\"/sqlite.db";
              description = "Set the file location for the sqlite database file.";
            };
            user = mkOption {
              type = nullOr str;
              default = cfg.database.user;
              defaultText = "config.services.iglu-cache.database.user";
              description = "Database user.";
            };
            host = mkOption {
              type = nullOr str;
              default = cfg.database.host;
              defaultText = "config.services.iglu-cache.database.host";
              description = "Database host.";
            };
            port = mkOption {
              type = nullOr port;
              default = cfg.database.port;
              defaultText = "config.services.iglu-cache.database.port";
              description = "Database port.";
            };
          };
          storage = {
            binary_storage_directory = mkOption {
              type = str;
              default = "${cfg.dataDir}/data";
              defaultText = "\"$${config.services.iglu-cache.dataDir}/data\"";
              description = "Location where the data gets stored if fs is used";
            };
          };
          server.port = mkOption {
            type = port;
            default = 8080;
            description = "Port on which the server listens on.";
          };
          api_keys = mkOption {
            default = { };
            type = attrsOf (submodule {
              freeformType = lib.types.attrs;
              options = {
                out_file = mkOption {
                  type = str;
                  default = "${cfg.dataDir}/.share/keyoutput.toml";
                  description = "Path where the api keys are stored.";
                };
              };
            });
          };
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
      {
        assertion =
          !(
            cfg.settings.config.reconcile.mode == "authorative"
            && (
              cfg.settings.tenants == null
              || (!(hasAttr "api_keys" cfg.settings) || cfg.settings.api_keys == null)
              || (!(hasAttr "public_keys" cfg.settings) || cfg.settings.public_keys == null)
              || (!(hasAttr "keypairs" cfg.settings) || cfg.settings.keypairs == null)
            )
          );
        message = ''
          If `services.iglu-cache.settings.config.reconcile.mode = "authorative";` you have to set `api_keys`, `tenants`, `public_keys` and `keypairs`.
        '';
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
      iglu-cache = {
        configFile = toml.generate "config.toml" (filterAttrsRecursive (_: v: v != null) cfg.settings);
      };
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

    networking.firewall.allowedTCPPorts = mkIf cfg.openFirewall [ cfg.settings.server.port ];

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
          IGLU_CACHE_CONF = cfg.configFile;
          IGLU_ENCRYPTION_SECRET_FILE = cfg.encryptionSecretPath;
          IGLU_HASHING_SECRET_FILE = cfg.hashingSecretPath;
        };
        path = [ pkgs.busybox ];
        serviceConfig = {
          Type = "simple";
          User = cfg.user;
          Group = cfg.group;
          UMask = "0077";
          WorkingDirectory = cfg.dataDir;
          ReadWritePaths = cfg.dataDir;
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
