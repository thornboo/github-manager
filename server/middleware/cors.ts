import type { NextFunction, Request, Response } from "express";
import { buildCorsHeaders, isCorsOriginAllowed } from "../utils/index.js";

function applyHeaders(res: Response, headers: Record<string, string>): void {
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
}

export default function corsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const corsHeaders = buildCorsHeaders(req, {
    allowMethods: "GET, POST, OPTIONS",
  });
  applyHeaders(res, corsHeaders);

  if (!isCorsOriginAllowed(req)) {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
}
