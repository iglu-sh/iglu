import type {dbLogResourceType, dbLogType, log} from "@/types/db";
const colors:Record<dbLogResourceType, string> = {
    'cache' : 'bg-blue-500',
    'derivation' : 'bg-green-500',
    'user' : 'bg-yellow-500',
    'builder' : 'bg-purple-500',
    'signing_key' : 'bg-red-500',
    'api_key' : 'bg-orange-500',
}

const activityText:Record<dbLogType, string> = {
    'create' : `Created $type $resource`,
    'delete' : `Deleted $type $resource`,
    'update' : `Updated $type $resource`,
    'read' : `Read $type $resource`,
}

export default function Activity({log}:{log:log}){
    //Calculate the time difference between the log timestamp and now
    const differenceInMilliseconds = Math.abs(Date.now() - log.timestamp.getTime());

    // Convert the difference to seconds, minutes, and days and limit the output to 2 decimal places
    const differenceInSeconds = Math.floor(differenceInMilliseconds / 1000).toFixed(2);
    const differenceInMinutes = Math.floor(parseFloat(differenceInSeconds) / 60).toFixed(2);
    const differenceInDays = (differenceInMilliseconds / (1000 * 60 * 60 * 24)).toFixed(2);
    let dateText = "";


    if(parseFloat(differenceInMinutes) < 0){
        dateText = "Just now";
    }
    else if(parseFloat(differenceInMinutes) > 0 && parseFloat(differenceInMinutes) < 60){
        dateText = `${differenceInMinutes} minute${parseFloat(differenceInMinutes) > 1 ? 's' : ''} ago`;
    }
    else{
        dateText = `${differenceInDays} day${parseFloat(differenceInDays) > 1 ? 's' : ''} ago`;
    }
    return(
        <div className="flex flex-col gap-0 font-mono">
            <div className="flex flex-row gap-1 items-center">
                <div className={`rounded-full p-1 ${colors[log.resource_type]} w-2 h-2`} />
                <div className="flex flex-row">
                    {
                        activityText[log.type].replace("$type", log.resource_type).replace("$resource", log.resource_name)
                    }
                </div>
            </div>
            <div className="flex flex-row gap-1">
                <div className="w-2 h-2 rounded-full"> </div>
                <div className="text-xs text-muted-foreground">
                    {
                        dateText
                    }
                </div>
            </div>
        </div>
    )
}