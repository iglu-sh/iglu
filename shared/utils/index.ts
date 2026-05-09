import * as api_key_generationI from "./crypto/api_key_generation";

import * as parse_date_stringsI from "./date/parse_date_strings";

import * as createMockRequestI from "./expressUnitTests/createMockRequest";
import * as createMockResponseI from "./expressUnitTests/createMockResponse";

import * as AuthenticationI from "./rest/Authentication";
import * as FilterFeaturesI from "./rest/FilterFeatures";
import * as IPFilteringI from "./rest/IPFiltering";
import * as MakeRestResponseI from "./rest/MakeResponse";

import * as zod_cachix_schemasI from "./zod/zod_cachix_schemas";
import * as zod_db_schemasI from "./zod/zod_db_schemas";

export namespace crypto {
    export import api_key_generation = api_key_generationI;
}

export namespace date {
    export import parse_date_strings = parse_date_stringsI;
}

export namespace expressUnitTests {
    export import createMockResponse = createMockResponseI;
    export import createMockRequest = createMockRequestI;
}

export namespace rest {
    export import Authentication = AuthenticationI;
    export import FilterFeatures = FilterFeaturesI;
    export import IPFiltering = IPFilteringI;
    export import MakeResponse = MakeRestResponseI;
}

export namespace zod {
    export import zod_db_schemas = zod_db_schemasI;
    export import zod_cachix_schemas = zod_cachix_schemasI;
}
