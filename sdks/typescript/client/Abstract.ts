import type { Core } from "./Core";

export default abstract class Abstract {
    constructor(private core: Core) {}

    protected getCore(): Core {
        return this.core;
    }
}
