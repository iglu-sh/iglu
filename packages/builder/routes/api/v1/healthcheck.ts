import bodyParser, {type Request, type Response} from 'express'

export const get = [
  bodyParser.json(),
  async (req: Request, res: Response) => {
    if(req.method !== 'GET'){
      return res.status(405).send('Method Not Allowed');
    }
    return res.status(200).send("Everyting seems healthy!");
  }
]
