'use client'
import {
    AlertDialog, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {Button} from "@/components/ui/button";
import {api} from "@/trpc/react";
import {useEffect, useState} from "react";
import {toast} from "sonner";
import {LoaderCircle} from "lucide-react";

export default function RemovePublicSigningKey({publicSigningKeyId, keyDeleteCallback}:{publicSigningKeyId:string, keyDeleteCallback: (id:string)=>void}){
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const removePSK = api.admin.removePublicSigningKey.useMutation(
        {
            onSuccess: () => {
                setLoading(false)
                toast.success("Successfully removed public signing key!");
                keyDeleteCallback(publicSigningKeyId)
                setOpen(false)
            },
            onError: (error) => {
                setLoading(false)
                toast.error(`Failed to remove public signing key: ${error.message}`);
            }
        }
    )
    return(
        <AlertDialog open={open} onOpenChange={()=>setOpen(!open)}>
            <AlertDialogTrigger asChild>
                <Button variant="destructive">
                    Delete
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Delete Public Signing Key
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        This will delete the public signing key from the system. It will no longer be available for signing packages, however signed packages will remain in the cache until they reach their expiration date.<br/>
                        <strong>
                            The API Key associated with this public signing key will not be deleted!
                        </strong> <br />
                        This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex flex-row gap-4 w-full">
                    <AlertDialogCancel asChild>
                        <Button variant="secondary">
                            Cancel
                        </Button>
                    </AlertDialogCancel>
                    {
                        loading ? (
                            <Button variant="destructive" disabled>
                                <LoaderCircle className="animate-spin" />
                            </Button>
                        ) : <Button variant="destructive" onClick={()=>{
                            setLoading(true)
                            removePSK.mutate({publicSigningKeyId: publicSigningKeyId})
                        }}>Do it!</Button>
                    }
                </div>
            </AlertDialogContent>
        </AlertDialog>
    )
}