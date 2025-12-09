'use client'
import {signOut} from "next-auth/react";
import {Suspense, useEffect, useState} from "react";
import Link from "next/link";
import {Button} from "@/components/ui/button";
import {useParams} from "next/navigation";

export default function SignOutPage(){
    const params = useParams<{forced: string}>()
    useEffect(() => {
        if(window){
          // this is needed to fix infinity redirect bug if creds are not valid
          if(params.forced === "true"){
            void signOut({redirectTo: "/auth/signin", redirect: true})
          }
          void signOut({redirect: false})
        }
    }, []);
    return(
        <div className="flex items-center justify-center h-screen w-full">
            <div className="w-full max-w-md px-4 text-center flex flex-col gap-2">
                <h1 className="text-2xl font-bold">Sign Out</h1>
                <p>You have been signed out successfully.</p>
                <div>
                    <Link href="/auth/signin"><Button>Go back to Login</Button></Link>
                </div>
            </div>
        </div>
    )
}
