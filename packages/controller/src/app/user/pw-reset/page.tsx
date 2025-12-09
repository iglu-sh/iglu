'use client'
import {Card, CardContent, CardDescription, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {api} from "@/trpc/react";
import {Toaster} from "@/components/ui/sonner";
import {toast} from "sonner";
import {signOut, useSession} from "next-auth/react";
import {type RefObject, useEffect, useRef} from "react";

export default function Page(){
    const session = useSession()
    const oldPW:RefObject<null | HTMLInputElement> = useRef(null)
    const newPW:RefObject<null | HTMLInputElement> = useRef(null)
    const repeatPW:RefObject<null | HTMLInputElement> = useRef(null)
    useEffect(() => {
        if(session.status != "loading" && !session.data){
            // If the user is not logged in, redirect to the login page
            window.location.href = "/api/auth/signin?callbackUrl=/user/pw-reset";
        }
    }, []);
    const changePassword = api.user.changePassword.useMutation({
        onSuccess: async (data) => {
            if(!data){
                toast.error("There was an error changing your password, please try again.");
                return
            }
            toast.success("Password changed successfully, you will be redirected to the login page in a moment.");
            await signOut({redirectTo: "/api/auth/signin?callbackUrl=/app"});
        },
        onError: (error) => {
            console.log(error)
            toast.error("Ther was an error changing your password, please try again.");
        }
    })
    function handleSubmit(event: Event){
        event.preventDefault()
        if(!newPW.current || !repeatPW.current || !oldPW.current){
            toast.error("Please fill in all fields.");
            return;
        }
        if(newPW.current.value !== repeatPW.current.value){
            toast.error("The new passwords do not match.");
            return;
        }
        if(newPW.current.value.length < 8){
            toast.error("The new password must be at least 8 characters long.");
            return;
        }
        if(newPW.current.value === oldPW.current.value){
            toast.error("The new password must be different from the current password.");
            return;
        }
        changePassword.mutate({
            oldPassword: oldPW.current.value,
            newPassword: newPW.current.value,
            repeatPassword: repeatPW.current.value
        });

    }
    return (
        <div className="flex justify-center items-center h-screen">
            <Card>
                <CardContent className="flex flex-col gap-4 w-full">
                    <CardTitle>
                        <h1 className="text-2xl font-semibold">
                            Reset Password
                        </h1>
                    </CardTitle>
                    <CardDescription>
                        You must reset your password before you can continue.
                    </CardDescription>
                    <form onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="current-password">Current Password</label>
                        <Input
                            type="password"
                            placeholder="Current Password"
                            name="current-password"
                            ref={oldPW}
                        />
                        <label htmlFor="new-password">New Password</label>
                        <Input
                            type="password"
                            placeholder="New Password"
                            name="new-password"
                            ref={newPW}
                        />
                        <label htmlFor="repeat-password">Repeat Password</label>
                        <Input
                            type="password"
                            placeholder="Repeat new Password"
                            name="repeat-password"
                            ref={repeatPW}
                        />
                        <Button type="submit">Change Password</Button>
                    </div>
                  </form>
                </CardContent>
            </Card>
            <Toaster richColors={true} />
        </div>
    )
}
