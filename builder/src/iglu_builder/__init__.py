import os
from pathlib import Path

# Load default config path if no path is given by IGLU_BUILDER_CONF
default_path = os.getcwd() + "/config.toml"
env_path = os.getenv("IGLU_BUILDER_CONF")

CONF_PATH = Path(os.path.abspath(env_path or default_path))
