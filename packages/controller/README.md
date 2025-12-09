# Iglu Controller
The Iglu Controller is the component of the Iglu Ecosystem that manages everything in a neat graphical interface.

## Configuration
The Iglu Controller is configured using a `.env` file.
This file should be placed in the root directory of the project and should contain the following variables:
```dotenv
NEXT_PUBLIC_CACHE_URL=http://localhost:3000
LOG_LEVEL=DEBUG
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=cache
LOGGER_USE_ENV=true
LOGGER_JSON=false
AUTH_SECRET=your_auth_secret
```
We recommend setting all the LOGGER_ variables like we have set them here, but you can customize them as per your requirements.


## Running
To run the Iglu Controller, you need to have Bun installed. Once you have installed Bun, you'll have to install all the packages using:
```bash
bun install
```
After installing the packages, you need to set up the environment variables. You can do this by creating a `.env` file in the root directory of the project. The `.env` file should contain the following variables:

```
Then, you can run the controller using:
```bash
bun run dev
```
