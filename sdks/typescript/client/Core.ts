import type z from "zod";
import { AuthenticationError, WrongSchemaError, FeatureNotEnabledError, GeneralError, NamingError, NotFoundError, UnknownError, UnmarshallError } from "../errors";
import type { IgluOptions } from "./index";
import { CLIENT_VERSION } from "./index";
import { base_response_schema } from "@/shared/utils/zod/zod_rest_schemas";

export class Core {
    private readonly baseUrl: string;
    private readonly token: string;
    private readonly timeoutMs: number;
    //private readonly _maxRetries: number;
    private readonly fetch: typeof fetch;

    constructor(config: IgluOptions) {
        this.baseUrl = config.baseUrl;
        this.token = config.token;
        this.timeoutMs = config.timeoutMs ?? 9000;
        //this._maxRetries = config.maxRetries ?? 3;
        this.fetch = config.fetch ?? fetch;
    }

    /**
     * @description Returns information needed for a fetch request in downstream classes
     * @param {boolean} needs_authentication Determines wether or not a request must be authenticated against the iglu sdk (i.e if  the Auhtorization Header must be set)
     * @param {string} method Controls which type of request is going to be made. This can later be overwritten by the using classes in how they construct their request.
     * @returns {{method: string, headers: Headers, redirect: 'follow', signal: AbortSignal}}
     * */
    public prepare_request(
        needs_authentication: boolean,
        method: string,
        content_type?: string
    ): {
        fetch: typeof fetch;
        base_url: string;
        options: {
            method: string;
            headers: Headers;
            redirect: "follow";
            signal: AbortSignal;
        };
    } {
        const request_headers = new Headers();
        request_headers.append("User-agent", `Iglu Typescript SDK ${CLIENT_VERSION}`);
        if (needs_authentication) {
            request_headers.append("Authorization", `Bearer ${this.token}`);
        }
        if(content_type){
            request_headers.append("content-type", content_type)
        }

        return {
            fetch: this.fetch,
            base_url: this.baseUrl,
            options: {
                method: method,
                headers: request_headers,
                redirect: "follow",
                signal: AbortSignal.timeout(this.timeoutMs),
            },
        };
    }


    /**
    * @description Parse a returned response on a top-level and make sure the returned result is not an error 
    * @param {Response} result The response that needs parsing
    * @returns {Response}
    * */
    public parse_response(result:Response):Response{
        if (result.status === 401 || result.status === 403) {
            throw new AuthenticationError(result.statusText, result.status, {
                error_details: "Unable to query Iglu API: Authentication not accepted",
                additional_information: "Iglu did not accept your credentials. Make sure you are allowed to access this tenant",
            });
        }
        if (result.status === 404){
            throw new NotFoundError(result.statusText, result.status, {
                error_details: "The requested resource does not exist",
                additional_information: null
            }) 
        }

        if (result.status === 503){
            throw new FeatureNotEnabledError(result.statusText, result.status, {
                error_details: "The REST API is not enabled on the target iglu server. Enable it via the feature flag in the config.toml",
                additional_information: null
            })
        }
        if (result.status >= 500){
            throw new GeneralError(result.statusText, result.status, {
                error_details: "Iglu was unable to handle your request. Please retry later.",
                additional_information: null
            })
        }
        if (result.status === 409){
            throw new NamingError(result.statusText, result.status, {
                error_details: "Iglu was unable to handle your request because of a naming error.",
                additional_information: "This is usually caused by you providing a name of a ressource that already exists. For example if you were trying to create a tenant, the name must be unique across ALL tenants on the server, not just the ones you can see." 
            })
        }
        if (result.status === 422){
            throw new WrongSchemaError(result.statusText, result.status, {
                error_details: "Iglu rejected your request because your body schema did not conform to the endpoint's required schema",
                additional_information: "Consult the iglu docs for more information on schemas"
            })
        }
        if (result.status < 200 || result.status > 399){
            throw new UnknownError(result.statusText, result.status, {
                error_details: "Iglu was unable to handle your request. You have encountered an unknown error. Please open an issue on the iglu github page so we can fix this :).",
                additional_information: null
            })
        }

        if(!result.headers.get("content-type")?.includes("application/json")){
            throw new UnmarshallError("Unmarshall Error", -1, {
                "error_details": `Cannot parse response from iglu (content-type wasn't available or it wasn't application/json). HTTP Result code: ${result.ok}`,
                additional_information: null
            }) 
        }
        return result
    }

    /**
     * @description Parse a given JSON response and make sure it adheres to both the base response schema and the given specific type 
     * @param {Response} input The response to validate
     * @param {z.ZodTypeAny} type_to_verify The type the result should have
     * @param {z.ZodType<{data:unknown}>} [base_response_override] (optional) The zod schema that should be used instead of base_response_schema
     * @returns {z.infer<T>} The **data** that is contained in the response object
     * */
    public async parse_body<T extends z.ZodTypeAny>(input:Response, type_to_verify:T, base_response_override?:z.ZodType<{data:unknown}>): Promise<z.infer<T>>{
        let parsed_result = null;
        try{
            parsed_result = await input.json()
        }
        catch(e){
            throw new UnmarshallError("Unmarshall Error", -1, {
                error_details: `Error whilst parsing iglu response. Make sure iglu is working as expected`,
                additional_information: `JSON Parse error was: ${e}`
            }) 
        }

        if(parsed_result === null){
            throw new UnmarshallError("Unmarshall Error", -1, {
                error_details: `Error whilst parsing iglu response. JSON Parse result was empty.`,
                additional_information: null
            }) 
        }

        const verified_result = (base_response_override ?? base_response_schema).safeParse(parsed_result)
        if(!verified_result.success){
            throw new UnmarshallError("Unmarshall Error", -1, {
                error_details: `Error whilst parsing iglu response. The returned result does not adhere to the base response schema. Make sure iglu is working correctly`,
                additional_information: null
            }) 
        }

        const parsed = type_to_verify.safeParse(verified_result.data.data)
        if(!parsed.success){
            throw new UnmarshallError("Unmarshall Error", -1, {
                error_details: `Error whilst parsing iglu response. The returned result does not adhere to the tenant response schema. Make sure iglu is working correctly`,
                additional_information: null
            }) 
        }
        return parsed.data 
    }

    /**
    * @description Parse and verify a given Fetch result
    * @param {Response} input The response to validate
    * @param {z.ZodTypeAny} type_to_verify The type the result should have
    * @param {z.ZodType<{data:unknown}>} [base_response_override] (optional) The zod schema that should be used instead of base_response_schema
    * @returns {z.infer<T>} The **data** that is contained in the response object
    * */
    public async process_response<T extends z.ZodTypeAny>(input:Response, type_to_verify: T, base_response_override?:z.ZodType<{data:unknown}>): Promise<z.infer<T>>{
        this.parse_response(input)
        return await this.parse_body(input, type_to_verify, base_response_override)     
    }
}
