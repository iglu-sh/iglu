import {SessionProvider} from "next-auth/react";
import OOBTopLevel from "@/components/custom/oob/topLevel";
import {api} from "@/trpc/server";
import {auth} from "@/server/auth";
import {redirect} from "next/navigation";

export default async function OOB(){
    const session = await auth();
    if(!session){
        // If the user is not authenticated, redirect to the home page
        redirect("/api/auth/signin")
        return null;
    }
    const showOOB = await api.user.mustShowOOB(session.user.session_user.id)
    console.log(showOOB)
    if(!showOOB){
        // If the user is not an admin or does not need to see the OOB flow, redirect to the app
        redirect("/app");
        return null;
    }
    return(
        <SessionProvider>
            <OOBTopLevel />
        </SessionProvider>
    )
}