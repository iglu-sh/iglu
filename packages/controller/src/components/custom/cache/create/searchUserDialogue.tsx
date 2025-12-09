import type {cacheCreationObject} from "@/types/frontend";
import type {User} from "@/types/db";
import {
    Dialog, DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import type {ColumnDef} from "@tanstack/react-table";
import {Checkbox} from "@/components/ui/checkbox";
import {DataTable} from "@/components/custom/DataTable";

export default function SearchUserDialogue({setCacheToCreate, cacheToCreate, availUsers}:{setCacheToCreate:(data:cacheCreationObject)=>void, cacheToCreate:cacheCreationObject, availUsers:User[]}){
    const columns:ColumnDef<User>[] = [
        {
            accessorKey: "username",
            header: "Username"
        },
        {
            accessorKey: "email",
            header: "Email"
        },
        {
            accessorKey: "id",
            header: "Actions",
            cell: ({row})=>{
                return (
                    <Checkbox defaultChecked={!!cacheToCreate.allowedUsers.find((u) => {
                        return u.id === row.original.id
                    })}
                    onCheckedChange={()=>{
                        const selectedUsers = [...cacheToCreate.allowedUsers];
                        if(selectedUsers.find((u) => u.id === row.original.id)){
                            // Remove the user if it's already selected
                            setCacheToCreate({
                                ...cacheToCreate,
                                allowedUsers: selectedUsers.filter((u) => u.id !== row.original.id)
                            });
                        }
                        else{
                            // Add the user if it's not selected
                            setCacheToCreate({
                                ...cacheToCreate,
                                allowedUsers: [...selectedUsers, row.original]
                            });
                        }
                    }}
                    />
                )
            }
        }
    ]
    return(
        <Dialog>
            <DialogTrigger asChild>
                <Button>
                    Add Users
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Search for Users to add</DialogTitle>
                    <DialogDescription>
                        Choose from the list below to add users to your cache.
                    </DialogDescription>
                </DialogHeader>
                <DataTable columns={columns} data={availUsers} />
                <DialogClose asChild>
                    <Button>Done</Button>
                </DialogClose>
            </DialogContent>
        </Dialog>
    )
}