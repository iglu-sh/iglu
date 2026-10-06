import { Iglu } from "./client";

const iglu = await new Iglu({
    baseUrl: "http://localhost:8080",
    token: "01a11046-28a9-74ca-871f-21aab6922e93",
})
const test = await iglu.tenants.search("");
console.log(test);

/*
const new_tenant = await iglu.tenants.create({
    id: "n/a",
    github_username: "SirBerg",
    name: "test2",
    permission: "Read",
    is_public: true,
    preferred_compression_method: "xz",
    uri: "http://127.0.0.1:8080/default",
    priority: 2,
    ttl: 302400
}) 
console.log(new_tenant)
*/

//await iglu.tenants.delete("test2")
//
const new_state = await iglu.tenants.update("default", {
    id: "n/a",
    github_username: "Test",
    name: "default",
    permission: "Read",
    is_public: true,
    preferred_compression_method: "xz",
    uri: "http://127.0.0.1:8080/default",
    priority: 1,
    ttl: 302400
})
console.log(new_state)
