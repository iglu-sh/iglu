import crypto from 'crypto';
import fs from 'fs'
export default async function  getFileHash(path:string){

    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const rs = fs.createReadStream(path);
        rs.on('error', reject);
        rs.on('data', (d:any) => {hash.update(d)})
        rs.on('end', () => {resolve(hash.digest('hex'))})
    })

}