import type { Request, Response } from "express";

export const get = [
    async (req:Request, res:Response) => {
        console.log(req.query, req.params)
        const date_now = new Date().toISOString()
        console.log(date_now)
        let status = "Pending"
        if(Math.random() > 0.5){
            //status = "Succeeded"
            if(Math.random() < 0.5){
                status = "Succeeded"
            }
            else{
                status = "Failed"
            }
        }
        console.log(status, Math.random())
        return res.status(200).json({
            id: req.params.deployment_id,
            index: 1,
            createdOn: date_now,
            closureSize: null,
            finishedOn: null,
            status: status, // Pending, InProgress, Cancelled, Failed, Succeeded
            storePath: "/nix/store/something.nar"
        })     

        /*
         *{
    "closureSize": null,
    "createdOn": "2026-04-20T08:29:32.53608Z",
    "finishedOn": null,
    "id": "a7003da8-b666-44c6-a174-897ce052012a",
    "index": 3,
    "startedOn": null,
    "status": "Pending",
    "storePath": "/nix/store/something.nar"
}
        * */
    }
]
