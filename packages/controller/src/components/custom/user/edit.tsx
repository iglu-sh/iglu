'use client'
import {Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import type {cache, keys, public_signing_keys, User} from "@iglu-sh/types/core/db";
import type {signing_key_cache_api_link} from "@/types/db";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {api} from "@/trpc/react";
import {toast} from "sonner";
import type {ColumnDef} from "@tanstack/react-table";
import {DataTable} from "@/components/custom/DataTable";
import RemovePublicSigningKey from "@/components/custom/user/removePublicSigningKey";

export default function EditUser({
    userData,
    variant = "secondary",
    text = "Edit User"
                                 }:{
    userData: {
        user: User;
        caches: cache[];
        apikeys: keys[];
        signingkeys: {
            public_signing_key: public_signing_keys[];
            signing_key_cache_api_link: signing_key_cache_api_link[]
        }[]
    },
    variant: string,
    text: string
}){
    

    const modifyUserKeyLinks = api.user.modifyUserApiKeyLink.useMutation(
        {
            onSuccess: ()=>{
                toast.success("Successfully modified user API key links!");
            },
            onError: (e)=>{
                toast.error(`Failed to modify user API key links: ${e.message}`);
            }
        }
    )
    const cleanedApiKeys:{
        apiKey: keys;
        signingkeys: public_signing_keys[];
        callback: (key: string, action: ("delete" | "removeFromUser"), target: ("apiKey" | "signingKey"), signingKey?: string) => void
    }[] = userData.apikeys.map(key => {
        // If the user has no signing keys, return empty array
        if(!userData.signingkeys?.public_signing_key){
            return {
                apiKey: key,
                signingkeys: [],
                callback: (key:string, action:"delete" | "removeFromUser", target: "apiKey" | "signing")=>{}
            }
        }
        const matchingSigningKeys = userData.signing_keys.public_signing_key.filter((psk)=>{
            return userData.signingkeys.signing_key_cache_api_link.some((link: { key_id: number; }) => link.key_id === key.id);
        })
        return {
            apiKey: key,
            signingkeys: matchingSigningKeys ?? [],
            callback: (key:string, action:"delete" | "removeFromUser", target: "apiKey" | "signingKey", signingKey?:string) => {
                if(target === "apiKey"){
                    modifyUserKeyLinks.mutate({
                        action: action,
                        keyID: key,
                        userID: userData.user.id
                    })
                }
            }
        }
    })
    const cleanedPSKKeys:{
        apiKeyName: string,
        psk: public_signing_keys,
    }[] = cleanedApiKeys.flatMap((key)=>{
        const returnArray:{apiKeyName: string, apiKeyId:string, psk: public_signing_keys}[] = []
        key.signingkeys.forEach((psk)=>{
            returnArray.push({
                apiKeyName: key.apiKey.name,
                apiKeyId: key.apiKey.id.toString(),
                psk: psk
            })
        })
        return returnArray
    })
    const editUserApiKeyColumns:ColumnDef<{
        apiKey: keys
        signingkeys: public_signing_keys[]
        callback: (key: string, action: ("delete" | "removeFromUser"), target: ("apiKey" | "signingKey"), signingKey?: string) => void
    }[]>[] = [
        {
            accessorKey: "apiKey.name",
            header: "Name",
            cell: info => info.getValue()
        },
        {
            accessorKey: "apiKey.description",
            header: "Key",
            cell: info => info.getValue()
        },
        {
            accessorKey: "apiKey.created_at",
            header: "Created At",
        },
        {
            accessorKey: "apiKey.id",
            header: "Actions",
            cell: ({row}) => {
                return (
                    <div className="flex flex-row gap-2">
                        <Button variant="secondary">Regenerate Key</Button>
                        <Button variant="destructive">Delete</Button>
                    </div>
                )
            }
        }
    ]
    const editUserPSKKeyColumns:ColumnDef<{
        apiKeyName: string,
        apiKeyId: string,
        psk: public_signing_keys,
    }>[] = [
        {
            accessorKey: "psk.name",
            header: "Name",
            cell: info => info.getValue()
        },
        {
            accessorKey: "apiKeyName",
            header: "API Key used during creation"
        },
        {
            accessorKey: "psk.description",
            header: "Description",
        },
        {
            accessorKey: "psk.created_at",
            header: "Created At",
        },
        {
            accessorKey: "apiKey.id",
            header: "Actions",
            cell: ({row}) => {
                return (
                    <div className="flex flex-row gap-2">
                        <RemovePublicSigningKey
                            publicSigningKeyId={row.original.psk.id.toString()}
                            keyDeleteCallback={(id:string)=>{
                                // Remove the PSK from the table UI
                                const index = cleanedPSKKeys.findIndex((psk)=> psk.psk.id.toString() === id);
                                if(index !== -1){
                                    cleanedPSKKeys.splice(index, 1);
                                }
                            }}
                        />
                    </div>
                )
            }
        }
    ]

    return(
        <Dialog>
            <DialogTrigger asChild>
                <Button variant={variant}>
                {text} 
                </Button>
            </DialogTrigger>
            <DialogContent className="flex flex-col gap-4">
                <DialogHeader>
                    <DialogTitle>
                        {text} 
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-2">
                    <Label>Username*</Label>
                    <Input defaultValue={userData.user.username} type="text" />
                </div>
                <div className="flex flex-col gap-2">
                    <Label>Email*</Label>
                    <Input defaultValue={userData.user.email} type="email" />
                </div>
                <div className="flex flex-col gap-2">
                    <Label>Api Keys</Label>
                    <DataTable columns={editUserApiKeyColumns} data={cleanedApiKeys} pageIndex={0} pageSize={25} noPagination={false} />
                </div>
                <div className="flex flex-col gap-2">
                    <Label>Public Signing Keys</Label>
                    <DataTable columns={editUserPSKKeyColumns} data={cleanedPSKKeys} pageIndex={0} pageSize={25} noPagination={false} />
                </div>
                {/* Form fields for editing user details would go here */}
                <div className="flex flex-row justify-end gap-2 w-full">
                    <DialogClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </DialogClose>
                    <Button>
                        Confirm changes
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
