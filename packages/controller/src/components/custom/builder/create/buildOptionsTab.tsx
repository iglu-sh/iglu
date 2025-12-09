import type {combinedBuilder} from "@iglu-sh/types/core/db";
import React, {type Dispatch} from "react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {CircleAlert} from "lucide-react";
import Link from "next/link";

export default function BuildOptionsTab({config, setConfig}:{config:combinedBuilder, setConfig: Dispatch<React.SetStateAction<combinedBuilder>>}){
    return(
        <Card>
            <CardContent>
                <CardTitle>
                    Build Options
                </CardTitle>
                <CardDescription>
                    Configure the Build Options for the Builder. These options will be used when building the project.
                </CardDescription>
                <div className="flex flex-col gap-2 mt-4">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-4">
                        <div>
                            <span className="font-bold">
                                Command
                            </span>
                            <div className="text-sm text-muted-foreground">
                                The command to run when building the project.
                            </div>
                            <Input onChange={(e)=>{
                                setConfig((prev) => ({
                                    ...prev,
                                    build_options: {
                                        ...prev.build_options,
                                        command: e.target.value
                                    }
                                }))
                            }}
                            aria-invalid={
                                !config.build_options.command ||
                                config.build_options.command.length < 1 ||
                                !config.build_options.command.includes('nix build') &&
                                !config.build_options.command.includes('nix-build')
                            }
                            value={config.build_options.command} placeholder="nix build .#myPackage"
                            />
                        </div>
                    </div>
                    <Alert className="text-primary mt-2">
                        <AlertTitle className="flex flex-row gap-2 items-center text-sm font-bold">
                            <CircleAlert />
                            About Sandboxing
                        </AlertTitle>
                        <AlertDescription className="text-sm">
                            If your build command requires building inside of the Nix sandbox or fails unexpectedly, ensure that your command uses the &#34;--sandbox&#34; flag as the sandbox is disabled by default.
                            This is important for some builds to ensure they run correctly. <br />
                            By default, this flag ist disabled in our builder environment due to certain limitations using docker containers.
                            If you wish to know more about the sandboxing feature of Nix and if you should turn it on, please check the official NixOS documentation&nbsp;
                        </AlertDescription>
                    </Alert>
                </div>
            </CardContent>

        </Card>
    )
}