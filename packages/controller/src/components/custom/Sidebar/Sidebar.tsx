"use client";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { BarChart3, HardDrive, Home, Package, Pencil } from "lucide-react";
import CacheDropdown from "@/components/custom/Sidebar/CacheDropdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { Cog } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { router } from "next/client";
export default function AppSidebar() {
    // We can be sure that the Session is available here because we check for this in the parent component before rendering this component.
    const session = useSession();
    const params = useSearchParams();
    const router = useRouter();
    const cache = api.cache.byUser.useQuery();
    const cacheID = params.get("cacheID");

    const [dropdownContent, setDropdownContent] = useState(
        <div>Loading Caches...</div>,
    );

    // Fetch all the caches this user has access to
    // This will be used to populate the CacheDropdown component
    useEffect(() => {
        // Check if the cache ID is empty and, if so, set the first cache as the default cache
        if (!params?.has("cacheID")) {
            if (cache?.data?.[0]?.id) {
                window.location.href = `${window.location.toString()}?cacheID=${cache.data[0].cache.id}`;
            }
        }
    }, [params]);

    useEffect(() => {
        if (cache && cache.data) {
            if (cache.data.length === 0) {
                //router.push("/empty");
                return;
            }
            setDropdownContent(
                <CacheDropdown caches={cache.data.flatMap((r) => r.cache)} />,
            );
        }
    }, [cache.data]);

    return (
        <Sidebar>
            <SidebarHeader className="flex flex-col gap-4">
                <div className="flex flex-row items-center gap-2">
                    <Image
                        src={"/logo.jpeg"}
                        alt={"Iglu Logo"}
                        width={48}
                        height={48}
                        className="rounded-md"
                    />
                    <h1 className="text-2xl font-bold">Iglu</h1>
                </div>
                {dropdownContent}
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <Link
                        href={`/app?cacheID=${cacheID}`}
                        className="w-full text-lg font-bold"
                    >
                        <Button
                            variant="ghost"
                            className="w-full justify-start"
                        >
                            <Home />
                            Overview
                        </Button>
                    </Link>
                    <Link
                        href={`/app/packages?cacheID=${cacheID}`}
                        className="w-full text-lg font-bold"
                    >
                        <Button
                            variant="ghost"
                            className="w-full justify-start"
                        >
                            <Package />
                            Packages
                        </Button>
                    </Link>
                    <Link
                        href={`/app/builders?cacheID=${cacheID}`}
                        className="w-full text-lg font-bold"
                    >
                        <Button
                            variant="ghost"
                            className="w-full justify-start"
                        >
                            <Pencil />
                            Builders
                        </Button>
                    </Link>
                    <Link
                        href={`/app/performance?cacheID=${cacheID}`}
                        className="w-full text-lg font-bold"
                    >
                        <Button
                            variant="ghost"
                            className="w-full justify-start"
                        >
                            <BarChart3 />
                            Performance
                        </Button>
                    </Link>
                    <Link
                        href={`/app/storage?cacheID=${cacheID}`}
                        className="w-full text-lg font-bold"
                    >
                        <Button
                            variant="ghost"
                            className="w-full justify-start"
                        >
                            <HardDrive />
                            Storage
                        </Button>
                    </Link>
                    <Link
                        href={`/app/admin?cacheID=${cacheID}`}
                        className="w-full text-lg font-bold"
                    >
                        <Button
                            variant="ghost"
                            className="w-full justify-start"
                        >
                            <Cog />
                            Admin Center
                        </Button>
                    </Link>
                    <Link
                        href={`/app/settings?cacheID=${cacheID}`}
                        className="w-full text-lg font-bold"
                    >
                        <Button
                            variant="ghost"
                            className="w-full justify-start"
                        >
                            <Cog />
                            Cache Settings
                        </Button>
                    </Link>
                </SidebarGroup>
            </SidebarContent>
            {session?.data ? (
                <SidebarFooter className="w-full p-0">
                    <Link
                        href={`/app/user?cacheID=${cacheID}`}
                        className="flex h-full w-full flex-col gap-2"
                    >
                        <Button
                            variant="ghost"
                            className="h-full w-full justify-start"
                        >
                            <Avatar>
                                <AvatarFallback
                                    style={{
                                        backgroundColor:
                                            session.data.user.user.avatar_color,
                                    }}
                                >
                                    {session.data.user.user.username.charAt(
                                        0,
                                    ) || "U"}
                                </AvatarFallback>
                                <AvatarImage
                                    src={session.data.user.user.avatar}
                                />
                            </Avatar>
                            <div className="flex w-full flex-col items-start gap-1">
                                <h3 className="font-bold">
                                    {session.data.user.user.username || "User"}
                                </h3>
                                <div className="text-muted-foreground text-xs">
                                    {session.data.user.user.email}
                                </div>
                            </div>
                        </Button>
                    </Link>
                </SidebarFooter>
            ) : null}
        </Sidebar>
    );
}
