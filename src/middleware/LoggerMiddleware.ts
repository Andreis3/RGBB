import { Request, Response, NextFunction } from 'express';

export function logger(req: Request, res: Response, next: NextFunction) {
  // console.log(`Request..., ${req.body.session_variables['x-hasura-user-id']}`);
  next();
}
