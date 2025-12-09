# Iglu scheduler
The Iglu Scheduler is responsible for managing [iglu builders](https://github.com/iglu-sh/builder) and their tasks in the Iglu ecosystem. It provides a way to schedule tasks for builders, ensuring that they are executed in a timely manner.
It's not really supposed to be run directly, but rather used with an [iglu controller](https://github.com/iglu-sh/controller).
## Installation
To run this project, you need to have [Bun](https://bun.sh) installed. You can install Bun by following the instructions on their website.
Then you can install the dependencies by running:
```bash
bun install
```
## Usage
You need a `.env` file in the root of the project with at least the following variables
```dotenv
PORT=3008
INTERFACE=127.0.0.1
NODE_NAME=cool-node-name#The name of your node, used for identification
MAX_BUILDS=10#The maximum number of builds that can be running at the same time
CONTROLLER_REGISTRATION_KEY=your_node_psk#The NODE_PSK env var in your controller service
LOG_LEVEL=DEBUG#The log level for the scheduler service
LOGGER_FROMAT=json#May be json or pretty
CONTROLLER_URL=http://localhost:3001#The URL of the controller service, used to send requests to it
REDIS_HOST=localhost#The host of the Redis server
REDIS_USER=default#The user of the Redis server, if authentication is enabled
REDIS_PASSWORD=default#The password of the Redis server, if authentication is enabled
REDIS_PORT=6379#The port of the Redis server
DOCKER_SOCKET=/var/run/docker.sock#The path to the Docker socket, used to communicate with the Docker daemon
AUTO_PULL_IMG=true#If you'd like the scheduler to try to pull the builder image directly, set this to true, set it to false to not pull the image
CROSS_COMPILE=false#Set to true if you want to enable cross-compilation support. This will spawn builders as priviliged Docker Containers and is currently only implemented for x86_64-linux and aarch64-linux hosts.
# Please see the iglu-sh docs for more information on cross-compilation:
# https://docs.iglu.sh/Compontents/Builder
# And also the iglu-sh/builder repository:
# https://github.com/iglu-sh/builder
DOCKER_IMAGE=ghcr.io/iglu-sh/iglu-builder:latest
```

You can then run the scheduler with the following command:
```bash
bun run start 
```