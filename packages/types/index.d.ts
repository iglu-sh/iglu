import * as controller from "./controller";
declare module "@iglu-sh/types"{
    export {controller}
}

declare module "@iglu-sh/types/controller" {
   export * from "./controller"
}
export as namespace IgluTypes;