import 'dotenv/config';
import { randomUUIDv7 } from 'bun'
export function makeApiKey(cacheName:string):string{

    const uid = randomUUIDv7();
    return `${uid}`;
}