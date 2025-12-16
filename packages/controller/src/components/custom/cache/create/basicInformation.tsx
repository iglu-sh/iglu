"use client";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { InfoIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { cacheCreationObject } from "@iglu-sh/types";
import { useEffect } from "react";

export default function BasicInformation({
    cacheToCreate,
    setCacheToCreate,
    setInvalid,
}: {
    cacheToCreate: cacheCreationObject;
    setCacheToCreate: (cache: cacheCreationObject) => void;
    setInvalid: (invalid: boolean) => void;
}) {
    useEffect(() => {
        if (
            cacheToCreate.cache.name.length === 0 ||
            cacheToCreate.cache.name.includes(" ")
        ) {
            setInvalid(true);
        } else {
            setInvalid(false);
        }
    }, [cacheToCreate]);
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex flex-row items-center gap-2">
                    <InfoIcon />
                    <h2 className="flex flex-row items-center gap-2 text-2xl font-bold">
                        Basic Information
                    </h2>
                </CardTitle>
                <CardDescription>
                    Cache name, description, and environment
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <label
                        htmlFor="cacheName"
                        className="text-sm font-semibold"
                    >
                        Cache Name *
                    </label>
                    <Input
                        value={cacheToCreate.cache.name}
                        onChange={(val) => {
                            setCacheToCreate({
                                ...cacheToCreate,
                                cache: {
                                    ...cacheToCreate.cache,
                                    name: val.target.value,
                                },
                            });
                        }}
                        aria-invalid={
                            cacheToCreate.cache.name.length === 0 ||
                            cacheToCreate.cache.name.includes(" ")
                                ? "true"
                                : "false"
                        }
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label
                        htmlFor="cacheName"
                        className="text-sm font-semibold"
                    >
                        Description
                    </label>
                    <Textarea disabled={true} />
                </div>
            </CardContent>
        </Card>
    );
}
