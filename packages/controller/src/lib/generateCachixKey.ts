/*
* Generates a Cachix signing key pair.
* @throws {Error} If there is an error during key generation.
* */
import assert from "node:assert";
import Logger from "@iglu-sh/logger";
export default async function generateCachixKey():Promise<{private:`iglu-signing-key:${string}`, public:`iglu-signing-key:${string}`}> {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    return new Promise(async (resolve, reject) =>{
        //Create the cachix signing key
        const proc = Bun.spawn(["nix", "key", "generate-secret", "--key-name", "iglu-signing-key", "--extra-experimental-features", "nix-command"],
            {
                onExit(proc, exitCode, signalCode, error){
                    if(error){
                        Logger.error(`Error generating Cachix key: ${error.message}`);
                        reject(error)
                    }
                }
            })

        const nixprivatekey = await new Response(proc.stdout).text().then((text) => {return text.trim()});

        //Generate the corresponding public key
        const procPublic = Bun.spawn({
            cmd: ["nix", "key", "convert-secret-to-public", "--extra-experimental-features", "nix-command"],
            stdin: Buffer.from(nixprivatekey, 'utf-8'),
            onExit(proc, exitCode, signalCode, error){
                if(error){
                    reject(error)
                }
            }
        })
        const nixpublickey = await new Response(procPublic.stdout).text().then((text) => {return text.trim()});

        //Check if both keys were generated successfully
        try{
            assert(nixprivatekey && nixpublickey, "Failed to generate Cachix keys");
            assert(nixprivatekey.includes(`iglu-signing-key:`) && nixpublickey.includes(`iglu-signing-key:`), "Generated keys do not contain the expected prefix");
            assert(Buffer.from(nixprivatekey.split(":")[1]!, 'base64').length === 64, "Generated private key is not 64 bytes long");
            assert(Buffer.from(nixpublickey.split(':')[1]!, 'base64').length === 32, "Generated public key is not 44 bytes long");
        }
        catch(error){
            console.error('Assertion error during Cachix key generation:', error);
            reject(new Error("Failed to generate valid Cachix keys"));
        }

        resolve({private: nixprivatekey.trim() as `iglu-signing-key:${string}` , public: nixpublickey.trim() as `iglu-signing-key:${string}`});
    })
}
