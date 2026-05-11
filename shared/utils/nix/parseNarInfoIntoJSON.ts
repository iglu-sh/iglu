export default function parseNarInfoIntoJSON(nar:string):Record<string,string>{
    const return_obj:Record<string, string> = {}
    for(const line of nar.split("\n")){
        if(line.trim() === "") continue;
        let line_parts = line.split(":")
        if(line_parts.length != 2){
            line_parts = line.split(" ")
        }
        return_obj[(line_parts[0] as string).replace(":", "")] = (line_parts[1] as string).trim()
    }

    return return_obj
}
