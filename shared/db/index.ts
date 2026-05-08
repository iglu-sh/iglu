import * as access_rules from "./DAO/access_rules";
import * as agents from "./DAO/agents";
import * as agents_deployments_links from "./DAO/agents_deployments_links";
import * as api_keys from "./DAO/api_key";
import * as api_keys_tenant_link from "./DAO/api_key_tenant_link";
import * as deployments from "./DAO/deployment";
import * as deployment_keys from "./DAO/deployment_keys";
import * as derivations from "./DAO/derivation";
import * as derivation_tenant_link from "./DAO/derivation_tenant_link";
import * as requests from "./DAO/request";
import * as signing_keys from "./DAO/signing_keys";
import * as tenants from "./DAO/tenants";
import * as uploads from "./DAO/uploads";

export namespace db {
    export import Access_rules = access_rules.Access_Rules;
    export import Agents = agents.Agents;
    export import Agents_deployments_links = agents_deployments_links.Agents_deployments_links;
    export import Api_keys = api_keys.Api_keys;
    export import Api_keys_tenants_link = api_keys_tenant_link.Api_keys_tenants_link;
    export import Deployments = deployments.Deployments;
    export import Deployment_keys = deployment_keys.Deployment_keys;
    export import Derivations = derivations.Derivations;
    export import Derivation_tenant_link = derivation_tenant_link.Derivation_tenant_link;
    export import Requests = requests.Requests;
    export import Signing_Keys = signing_keys.Signing_Keys;
    export import Tenants = tenants.Tenants;
    export import Uploads = uploads.Uploads;
}
