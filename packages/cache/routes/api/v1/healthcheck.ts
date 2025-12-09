import bodyParser, {type Request, type Response} from 'express'

export const get = [
  bodyParser.json(),
  async (req: Request, res: Response) => {
    if(req.method != 'GET'){
      res.status(405).send('Method Not Allowed');
      return;
    }

    return res.status(200).send("OK")
  }
]
