import type {cache, keys, public_signing_keys, User} from "@iglu-sh/types/core/db";
import type {signing_key_cache_api_link} from "@/types/db";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {DataTable} from "@/components/custom/DataTable";
import {userColumns} from "@/app/app/admin/Components/columns";
import {Button} from "@/components/ui/button";
import CreateUser from "@/components/custom/user/create";
import {SessionProvider} from "next-auth/react";

export default function UsersTab({users, refreshUsers}:{users:Array<{
    user: User;
    caches: cache[];
    apikeys: keys[];
    signingkeys: Array<{
        public_signing_key: public_signing_keys[];
        signing_key_cache_api_link: signing_key_cache_api_link[]
    }>
}>, refreshUsers: ()=>void}){

    return (
        <Card>
            <CardHeader className="flex flex-row gap-2 justify-between">
                <div className="flex flex-col gap-2">
                    <CardTitle className="text-xl font-bold">
                        Users
                    </CardTitle>
                    <CardDescription>
                        Manage your users here. Total Users: {users.length}
                    </CardDescription>
                </div>
                <div className="flex flex-row items-end-safe justify-end-safe gap-1">
                    <SessionProvider>
                        <CreateUser finishCallback={()=>refreshUsers()}/>
                    </SessionProvider>
                    <Button onClick={refreshUsers} variant="secondary">
                        Refresh Users
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <SessionProvider>
                    <DataTable columns={userColumns} data={users} />
                </SessionProvider>
            </CardContent>
        </Card>
    )
}