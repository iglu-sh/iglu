import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {HardDrive} from "lucide-react";
import {Switch} from "@/components/ui/switch";
import {Input} from "@/components/ui/input";
import type {cacheCreationObject} from "@/types/frontend";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {useEffect} from "react";

export default function StorageBackup({
    cacheToCreate,
    setCacheToCreate,
    setInvalid
}:{cacheToCreate:cacheCreationObject, setCacheToCreate:(cache:cacheCreationObject) => void, setInvalid:(invalid:boolean) => void}) {
    useEffect(()=>{
        // Ensure that something is entered for preferred compression method
        if(cacheToCreate.preferredcompressionmethod === ""){
            setInvalid(true)
        }
        else{
            setInvalid(false)
        }
    }, [cacheToCreate]);
    return(
        <Card>
            <CardHeader>
                <CardTitle className="flex flex-row items-center gap-2">
                    <HardDrive />
                    <h2 className="text-2xl font-bold flex flex-row items-center gap-2">
                        Basic Information
                    </h2>
                </CardTitle>
                <CardDescription>
                    Storage configuration and backup policies
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="flex flex-row justify-between items-center">
                    <div className="flex flex-col">
                        <strong>
                            Enable Deduplication
                        </strong>
                        <div className="text-sm text-muted-foreground">
                            Reduce storage usage by eliminating duplicate data.
                        </div>
                    </div>
                    <Switch defaultChecked={false} disabled />
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col">
                        <strong>
                            Retention Policy (days)
                        </strong>
                        <div className="text-sm text-muted-foreground">
                            Packages older than this will be automatically deleted.
                        </div>
                    </div>
                    <Input type="text" />
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col">
                        <strong>
                            Preferred Compression Method
                        </strong>
                        <div className="text-sm text-muted-foreground">
                            Choose the default compression method for stored packages.
                        </div>
                    </div>
                    <Select onValueChange={(value)=>{setCacheToCreate({
                        ...cacheToCreate,
                        preferredcompressionmethod: value
                    })}}
                    >
                        <SelectTrigger aria-invalid={cacheToCreate.preferredcompressionmethod === ""}>
                            <SelectValue placeholder="Compression Method" defaultValue="ZSDT"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ZSDT">Zstandard (ZSDT)</SelectItem>
                            <SelectItem value="XZ">XZ Compression (XZ)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>

        </Card>
    )
}