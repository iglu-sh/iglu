import { Iglu } from "./client";

const test = new Iglu({
    baseUrl: "http://localhost:8080",
    token: "test",
}).tenants.get("test");
console.log(test);
