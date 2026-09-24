import { readdir } from "node:fs/promises";
import {
    OpenAPIRegistry,
    OpenApiGeneratorV3,
    type RouteConfig,
} from "@asteasolutions/zod-to-openapi";
import { Logger } from "@iglu-sh/shared/logger";
import {
    openapi_authentication_extra_meta,
    openapi_authentication_extra_responses,
} from "@iglu-sh/shared/utils/zod";
import {
    extra_feature_responses,
    zod_openapi_definition,
} from "@iglu-sh/shared/utils/zod/zod_openapi_schemas";

Logger.setPrefix("OAPI");
Logger.setLogLevel("DEBUG");
Logger.setJsonLogging(false);

const IGLU_ROUTE_FOLDER = "../cache/routes";

const ALL_FILES = await readdir(IGLU_ROUTE_FOLDER, { recursive: true });

const REGISTRY = new OpenAPIRegistry();

for (const FILE of ALL_FILES) {
    const file = Bun.file(`${IGLU_ROUTE_FOLDER}/${FILE}`);
    if (!file.exists) {
        Logger.debug(`Skipping non-existant file: ${IGLU_ROUTE_FOLDER}/${FILE}`);
        continue;
    }
    const stat = await file.stat();
    if (stat.isDirectory()) {
        Logger.debug(`Skipping directory: ${IGLU_ROUTE_FOLDER}/${FILE}`);
        continue;
    }

    const { openapi } = await import(`${IGLU_ROUTE_FOLDER}/${FILE}`);

    if (!openapi) {
        Logger.warn(
            `Route ${FILE} is MISSING openapi spec definitions. Add them as soon as possible.`,
        );
        continue;
    }
    Logger.info(`Found Openapi Specs in file: ${FILE}`);
    const parsed_openapi_spec = zod_openapi_definition.safeParse(openapi);
    if (!parsed_openapi_spec.success) {
        Logger.error("Unable to validate openapi spec");
        Logger.debug(`Zod schema errors: ${parsed_openapi_spec.error}`);
        continue;
    }

    for (const route of parsed_openapi_spec.data.routes) {
        const path_to_register: RouteConfig = {
            ...route,
            path: parsed_openapi_spec.data.meta.path,
        };
        if (parsed_openapi_spec.data.meta.authentication_required) {
            path_to_register.responses = {
                ...path_to_register.responses,
                ...openapi_authentication_extra_responses.responses,
            };

            if (!path_to_register.request) {
                path_to_register.request = {};
            }
            path_to_register.request = {
                ...path_to_register.request,
                headers: path_to_register.request.headers
                    ? path_to_register.request.headers.extend(
                          openapi_authentication_extra_meta.headers.shape,
                      )
                    : openapi_authentication_extra_meta.headers,
            };
        }
        if (parsed_openapi_spec.data.meta.feature_filtered) {
            path_to_register.responses = {
                ...path_to_register.responses,
                ...extra_feature_responses,
            };
        }
        path_to_register.tags = parsed_openapi_spec.data.meta.tags;
        REGISTRY.registerPath(path_to_register);
    }
}

const generator = new OpenApiGeneratorV3(REGISTRY.definitions);
const out = generator.generateDocument({
    openapi: "3.0.0",
    info: {
        version: "0.0.1",
        title: "Iglu API",
        description: "Iglu API Docs for use in your development",
    },
    servers: [{ url: "/" }],
});

const schema_doc = Bun.file("./schema.openapi.json");

if (await schema_doc.exists()) {
    await schema_doc.delete();
}

schema_doc.write(JSON.stringify(out));
