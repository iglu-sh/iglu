enum error_types {
    AUTH, // 401, 403
    NOT_FOUND, // 404
    SERVER_ERROR, //5xx
    FEAT_NOT_ENABLED, //503,
    GENERAL, // Generic error codes, such as 400 or 499
    UNKNOWN, // Any other
    UNMARSHALL_ERROR, // Thrown if a response cannot be parsed
    NAMING_CONFLICT, // i.e 409
    WRONG_SCHEMA, // i.e 422
    IGLU_GENERIC_ERROR // i.e 499

}

const _enum_to_titel_map = [
    "Authorization Error",
    "Not found",
    "Server Error",
    "Feature not enabled",
    "General Error",
    "UNKNOWN Error (please report)",
];

type detail_type = {
    error_details: string;
    additional_information: string | null;
};
export class IgluError extends Error {
    constructor(
        readonly status: string,
        readonly error_type: error_types,
        readonly code: number,
        readonly details: detail_type,
        message: string,
    ) {
        super(
            `${message}\nHTTP Status code: ${code}, Response message: ${status}\nAs always: This error object provides extra information that can be accessed on the details property of the error object. Also consult the Iglu SDK Docs for more information (Error type: ${error_type})`,
        );
    }
}

export class AuthenticationError extends IgluError {
    constructor(status: string, code: number, details: detail_type) {
        super(status, 0, code, details, details.error_details);
    }
}

export class UnmarshallError extends IgluError {
    constructor(status:string, code: number, details: detail_type) {
        super(status, 6, code, details, details.error_details)
    }
}

export class NotFoundError extends IgluError {
    constructor(status:string, code: number, details: detail_type) {
        super(status, 1, code, details, details.error_details)
    }
}

export class FeatureNotEnabledError extends IgluError {
    constructor(status:string, code: number, details: detail_type) {
        super(status, 3, code, details, details.error_details)
    }
}

export class GeneralError extends IgluError {
    constructor(status:string, code: number, details: detail_type) {
        super(status, 2, code, details, details.error_details)
    }
}

export class UnknownError extends IgluError {
    constructor(status:string, code: number, details: detail_type) {
        super(status, 5, code, details, details.error_details)
    }
}

export class NamingError extends IgluError {
    constructor(status:string, code: number, details: detail_type) {
        super(status, 7, code, details, details.error_details)
    }
}

export class WrongSchemaError extends IgluError {
    constructor(status:string, code: number, details: detail_type) {
        super(status, 8, code, details, details.error_details)
    }
}

export class IgluGenericError extends IgluError {
    constructor(status:string, code: number, details: detail_type) {
        super(status, 9, code, details, details.error_details)
    }
}
