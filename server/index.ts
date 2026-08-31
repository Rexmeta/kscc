import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { isDatabaseReady } from "./db";
import { registerHealthRoutes } from "./health";
import { registerSeoRoutes } from "./seo";
import { startScheduledPublicationWorker } from "./scheduledPublications";
import {
  emitOperationalEvent,
  getCorrelationId,
  getTelemetryRoute,
  requestTelemetry,
} from "./telemetry";

const app = express();

// Trust proxy for rate limiting to work correctly behind reverse proxy
app.set('trust proxy', 1);

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'", "ws:", "wss:", "https://storage.googleapis.com"],
      frameSrc: ["'self'", "https://www.openstreetmap.org"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Correlate requests before rate limiting, parsing, and health checks so even
// rejected or malformed requests have a safe identifier in the logs.
app.use(requestTelemetry);

// Keep health probes outside the API rate limit and request body parsers.
registerHealthRoutes(app, isDatabaseReady);

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: { message: "Too many authentication attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api", apiLimiter);

// Uploads use signed object-storage URLs, so API requests should stay bounded.
// Rich-text content still has room for a reasonably large article payload.
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

(async () => {
  const server = await registerRoutes(app);
  registerSeoRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    
    // In production, don't expose internal error details
    const isProduction = process.env.NODE_ENV === 'production';
    const message = isProduction && status >= 500 
      ? "Internal Server Error" 
      : (err.message || "Internal Server Error");
    
    // Never serialize the error object: it may contain request data or
    // provider payloads. The response remains intentionally generic in prod.
    emitOperationalEvent("http.error", "error", {
      correlationId: getCorrelationId(req),
      requestId: getCorrelationId(req),
      route: getTelemetryRoute(req),
      status,
      errorType: err instanceof Error ? err.name : "UnknownError",
    });

    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // The worker is intentionally bounded and overlap-safe. Every instance may
  // run it; PostgreSQL row locks decide which instance claims each due post.
  const stopScheduledPublicationWorker = startScheduledPublicationWorker();
  server.once("close", stopScheduledPublicationWorker);
})();
