import {CircleCheck} from "lucide-react";

export default function Steps({step}:{step:number}){
    return(
        <div className="flex flex-row items-start gap-4 justify-center">
            <div className="flex flex-col items-center text-center">

                <div className={`rounded-full ${step >= 1 ? "bg-primary" : ""} w-10 h-10 flex items-center justify-center font-bold`}>
                    {
                        step > 1 ?
                            <CircleCheck /> : "1"
                    }
                </div>
                <h2 className="">
                    Basic <br />Information
                </h2>
            </div>
            <div className="flex flex-col items-center text-center">
                <div className={`rounded-full ${step >= 2 ? "bg-primary" : ""} w-10 h-10 flex items-center justify-center font-bold`}>
                    {
                        step > 2 ?
                            <CircleCheck /> : "2"
                    }
                </div>
                <h2 className="">
                    Infrastructure
                </h2>
            </div>
            <div className="flex flex-col items-center text-center">
                <div className={`rounded-full ${step >= 3 ? "bg-primary" : ""} w-10 h-10 flex items-center justify-center font-bold`}>
                    {
                        step > 3 ?
                            <CircleCheck /> : "3"
                    }
                </div>
                <h2 className="">
                    Network & <br/>
                    Security
                </h2>
            </div>
            <div className="flex flex-col items-center text-center">
                <div className={`rounded-full ${step >= 4 ? "bg-primary" : ""} w-10 h-10 flex items-center justify-center font-bold`}>
                    {
                        step > 4 ?
                            <CircleCheck /> : "4"
                    }
                </div>
                <h2 className="">
                    Storage & <br/>
                    Backup
                </h2>
            </div>
            <div className="flex flex-col items-center text-center">
                <div className={`rounded-full ${step >= 5 ? "bg-primary" : ""} w-10 h-10 flex items-center justify-center font-bold`}>
                    {
                        step > 5 ?
                            <CircleCheck /> : "5"
                    }
                </div>
                <h2 className="">
                    Monitoring
                </h2>
            </div>
            <div className="flex flex-col items-center text-center">
                <div className={`rounded-full ${step >= 6 ? "bg-primary" : ""} w-10 h-10 flex items-center justify-center font-bold`}>
                    {
                        step > 6 ?
                            <CircleCheck /> : "6"
                    }
                </div>
                <h2 className="">
                    Review & <br/>
                    Deploy
                </h2>
            </div>
        </div>
    )
}