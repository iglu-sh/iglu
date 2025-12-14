/*
* This file holds types that combine specific types for convenience and use across all projects
* */

/*
* Holds full Information about a builder, used by the scheduler and the controller
* */
import {build_config, builder, cachix_config, git_config, build_log} from "./db";

export type full_builder = {
    builder: builder,
    git_config: git_config,
    cachix_config: cachix_config,
    build_config: build_config,
    builder_logs: Array<build_log>
}
