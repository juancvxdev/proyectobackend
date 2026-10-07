import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'HTTP_ERROR',
  ) {
    super(message)
  }
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, 'Recurso no encontrado.', 'NOT_FOUND'))
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'La solicitud no cumple el contrato.',
        details: error.flatten(),
      },
    })
  }

  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message } })
  }

  if (error instanceof Error && error.name === 'ConflictError') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: error.message } })
  }

  const message = error instanceof Error ? error.message : 'Error interno.'
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message } })
}
