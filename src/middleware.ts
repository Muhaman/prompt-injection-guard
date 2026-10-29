import type { RequestHandler } from "express";
import type { Guard } from "./guard.js";

export interface GuardMiddlewareOptions {
  /** Request body field holding the user text. Default "message". */
  field?: string;
}

/**
 * Blocks prompt injections with 400 `prompt_injection`; otherwise replaces the body
 * field with the PII-redacted text and stores the result on `res.locals.guard`.
 * Mount it after a body parser.
 */
export function guardMiddleware(guard: Guard, options: GuardMiddlewareOptions = {}): RequestHandler {
  const field = options.field ?? "message";
  return async (req, res, next) => {
    try {
      const body = req.body as Record<string, unknown> | undefined;
      const value = body?.[field];
      if (!body || typeof value !== "string") {
        res.status(400).json({
          error: { code: "invalid_request", message: `Body field "${field}" must be a string.` },
        });
        return;
      }
      const result = await guard.check(value);
      if (!result.allowed) {
        res.status(400).json({
          error: {
            code: "prompt_injection",
            message: "Request blocked: possible prompt injection.",
            reasons: result.reasons,
          },
        });
        return;
      }
      body[field] = result.redacted;
      res.locals.guard = result;
      next();
    } catch (err) {
      next(err);
    }
  };
}
