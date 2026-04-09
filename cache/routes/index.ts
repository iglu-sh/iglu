import type {Request, Response} from 'express'

export const get = async (req:Request, res:Response)=>{
    return res.status(200).send('OK')
}
