import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Server} from "lucide-react";

export default function Infrastructure(){
    return(
        <Card>
            <CardHeader>
                <CardTitle className="flex flex-row items-center gap-2">
                    <Server />
                    <h2 className="text-2xl font-bold flex flex-row items-center gap-2">
                        Infrastructure
                    </h2>
                </CardTitle>
                <CardDescription>
                    Server specifications and resources
                </CardDescription>
                <CardContent>
                    Nothing here yet!
                </CardContent>
            </CardHeader>
        </Card>
    )
}