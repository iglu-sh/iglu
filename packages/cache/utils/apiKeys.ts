import 'dotenv/config';
import { randomUUIDv7 } from 'bun'
export function makeApiKey():string{

    const uid = randomUUIDv7();
    return `${uid}`;
}