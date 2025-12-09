import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import type {xTheEverythingType} from "@/types/db";
import {Key, Package, Server, Unlock} from "lucide-react";

export default function Heading({caches}:{caches:xTheEverythingType[]}){
    const totalCaches = caches.length;
    let signingKeys = 0;
    let storedDerivations = 0;
    let apiKeys = 0;
    for(const cache of caches){
        storedDerivations += cache.derivations.count;

        // Fuck you
        apiKeys += (cache.api_keys ?? []).length;
        signingKeys += (cache.public_signing_keys ?? []).length;
    }
    return(
        <div className="grid grid-cols-4 gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex flex-row justify-between items-center">
                        <div>
                            Total Caches
                        </div>
                        <Server />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <strong>{
                        totalCaches
                    }</strong>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex flex-row justify-between items-center">
                        <div>
                            Stored Derivations
                        </div>
                        <Package />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <strong>{storedDerivations}</strong>
                    <div className="text-sm text-muted-foreground">
                        Across all caches
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex flex-row justify-between items-center">
                        <div>
                            Signing Keys
                        </div>
                        <Unlock />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <strong>{signingKeys}</strong>
                    <div className="text-sm text-muted-foreground">
                        Available for use
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex flex-row justify-between items-center">
                        <div>
                            API Keys
                        </div>
                        <Key />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <strong>{apiKeys}</strong>
                    <div className="text-sm text-muted-foreground">
                        Available for use
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}