'use client'
import {SessionProvider, useSession} from "next-auth/react";
import {useRouter} from "next/navigation";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty"
import {FileQuestion, Icon} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useEffect, useState} from "react";
import Link from "next/link";
import CreateCachePage from "@/app/app/caches/create/page";

export default function EmptyCachesWrapper(){
    return <SessionProvider>
        <EmptyCaches />
    </SessionProvider>
}
export function EmptyCaches(){
    const session = useSession()
    const router = useRouter()
    const [showCreateCache, setShowCreateCache] =  useState(false)
    useEffect(()=>{
        if(session.status === "unauthenticated"){
            router.push("/auth/signin")
        }
    }, [session])
    return(
        <div className="flex items-center justify-center pt-5 w-full overflow-y-auto">
            {
                showCreateCache ?
                    <div className="max-w-1/2 w-full">
                        <CreateCachePage />
                    </div>
                     :
                    <Empty className="border border-solid max-w-1/2">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <FileQuestion />
                            </EmptyMedia>
                            <EmptyTitle>No Caches found!</EmptyTitle>
                            <EmptyDescription>It seems like there were no caches found for your Account. Please create one by clicking below:</EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent className="w-full">
                            <Button onClick={()=>setShowCreateCache(true)}>

                            </Button>
                            <EmptyDescription>
                                <Link href="https://docs.iglu.sh/controller/help/why-do-i-need-a-cache">Learn why having a cache connected is important.</Link>
                            </EmptyDescription>
                        </EmptyContent>
                    </Empty>
            }

        </div>
    )
}