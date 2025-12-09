import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Database} from "lucide-react";
import {Switch} from "@/components/ui/switch";
import type {cache} from "@/types/db";
import type {cacheCreationObject} from "@/types/frontend";

export default function Monitoring({cacheToCreate, setCacheToCreate, setInvalid}:{cacheToCreate:cacheCreationObject, setCacheToCreate:(cache:cacheCreationObject) => void, setInvalid:(data:boolean)=>void}) {
    return(
        <Card>
            <CardHeader>
                <CardTitle className="flex flex-row items-center gap-2">
                    <Database />
                    <h2 className="text-2xl font-bold flex flex-row items-center gap-2">
                        Basic Information
                    </h2>
                </CardTitle>
                <CardDescription>
                    Metrics, health checks, and altering
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="flex flex-row justify-between items-center">
                    <div className="flex flex-col">
                        <strong>
                            Enable Metrics Collection
                        </strong>
                        <div className="text-sm text-muted-foreground">
                            Collect performance and usage metrics. Note: This requires you to have set the <code>PROM_ENABLE</code> environment variable in your cache setup.
                        </div>
                    </div>
                    <Switch />
                </div>
                <div className="flex flex-row justify-between items-center">
                    <div className="flex flex-col">
                        <strong>
                            Enable Health Checks
                        </strong>
                        <div className="text-sm text-muted-foreground">
                            Regular health monitoring and status checks
                        </div>
                    </div>
                    <Switch disabled />
                </div>
                <div className="flex flex-row justify-between items-center">
                    <div className="flex flex-col">
                        <strong>
                            Enable Audit Logging
                        </strong>
                        <div className="text-sm text-muted-foreground">
                            Log all user actions and system events
                        </div>
                    </div>
                    <Switch />
                </div>
            </CardContent>
        </Card>
    )
}