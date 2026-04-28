from iglu_builder import DEFAULT_CONF_PATH
from iglu_builder.ConfigManager import ConfigManager
from iglu_builder.Server import Server

configuration = ConfigManager(DEFAULT_CONF_PATH)
server = Server(configuration)
app = server.get_app()


def main() -> None:
    server.run()


if __name__ == "__main__":
    main()
