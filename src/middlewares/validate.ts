import type { NextFunction, Request, Response } from 'express'
import type { z } from 'zod'

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (error) {
      next(error)
    }
  }
}

export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      res.locals.validatedQuery = schema.parse(req.query)
      next()
    } catch (error) {
      next(error)
    }
  }
}
