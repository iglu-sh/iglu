"use client";
import { SessionProvider, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import { Avatar } from "@/components/ui/avatar";
import Heading from "@/components/custom/oob/heading";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchIcon } from "lucide-react";
import CreateUser from "@/components/custom/user/create";
import Link from "next/link";
import ClaimableCache from "@/components/custom/oob/claimable/claimableCache";
import type { xTheEverythingType } from "@/types/db";
import AddDialogue from "@/components/custom/oob/addDialogue";

export default function OOBTopLevel() {
    const session = useSession();
    useEffect(() => {
        if (
            !session?.data?.user?.user?.is_admin &&
            session.status != "loading"
        ) {
            // If the user is not authenticated, redirect to the login page
            window.location.href = "/api/auth/signin?callbackUrl=/oob";
        }
    }, [session]);
    const everything = api.admin.getCachesPropagated.useQuery();
    const [caches, setCaches] = useState<xTheEverythingType[]>([]);
    const [claimed, setClaimed] = useState<number[]>([]);
    useEffect(() => {
        if (!everything.isPending && everything.data) {
            setCaches(everything.data);
        }
    }, [everything]);
    return (
        <div className="m-7 flex flex-col gap-4">
            <div className="flex flex-row justify-between">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold">Welcome to Iglu!</h1>
                    <div className="text-muted-foreground text-sm">
                        <p>
                            Let&apos;s get you setup with your caches. This will
                            only take a few minutes.
                        </p>
                    </div>
                </div>
                {session?.data ? (
                    <div className="flex flex-row items-center justify-center gap-2">
                        <Avatar
                            style={{
                                backgroundColor:
                                    session.data.user.session_user.avatar_color,
                            }}
                            className="flex items-center justify-center"
                        >
                            {session.data.user.session_user.username[0]}
                        </Avatar>
                        <span className="ml-1">
                            {session.data.user.session_user.username}
                        </span>
                    </div>
                ) : null}
            </div>
            <Heading caches={caches} />
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold">Claim existing Caches</h2>
                <div className="text-muted-foreground text-sm">
                    Iglu has found some caches that you have created or that
                    were created automatically for you. You can claim them here
                    to manage them through the Controller. <br />
                    If you do not claim them, they will not be managed by this
                    Controller and you will need to manage them through th CLI
                    or other means.
                </div>
            </div>
            <Card>
                <CardContent className="flex flex-row items-center justify-between">
                    <div className="flex w-1/3 flex-row gap-1">
                        <Input placeholder="Search for caches..."></Input>
                        <Button variant="outline">
                            <SearchIcon />
                        </Button>
                    </div>
                    <div className="flex flex-row gap-1">
                        <SessionProvider>
                            <CreateUser />
                        </SessionProvider>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (claimed.length > 0) {
                                    setClaimed([]);
                                } else {
                                    setClaimed(caches.map((c) => c.cache.id));
                                }
                            }}
                        >
                            {claimed.length > 0
                                ? "Unclaim All Caches"
                                : "Claim All Caches"}
                        </Button>
                        <Link href="https://docs.iglu.sh/docs/Components/Iglu%20Controller">
                            <Button variant="secondary">Documentation</Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
            {caches.map((cache, index) => {
                return (
                    <ClaimableCache
                        cache={cache}
                        claimed={claimed.includes(cache.cache.id)}
                        claim={(id: number) => {
                            if (claimed.includes(id)) {
                                setClaimed(claimed.filter((c) => c !== id));
                            } else {
                                setClaimed([...claimed, id]);
                            }
                        }}
                        key={index}
                    />
                );
            })}
            <div className="flex flex-row justify-end">
                <AddDialogue
                    caches={caches}
                    claimedCaches={claimed}
                    userID={session.data?.user?.id ?? ""}
                />
            </div>
        </div>
    );
}
