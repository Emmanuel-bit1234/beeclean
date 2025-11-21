import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./auth/routes.js";
import usersRoute from "./routes/users.js";
import { authMiddleware } from "./auth/middleware.js";
import { db } from "./db/connection.js";
import type { AuthVariables } from "./types/auth.js";
import type { PredictionResponse } from "./types/prediction.js";

const app = new Hono<{ Variables: AuthVariables }>();

// Enable CORS
app.use("*", cors());

// Health check endpoint
app.get("/", (c) => {
  return c.json({
    message: "Triage CDSS Proxy API",
    status: "running",
    version: "1.0.0",
  });
});

// Authentication routes
app.route("/auth", auth);


// User management routes
app.route("/users", usersRoute);

// Export for Vercel serverless functions
export default app;

// Only start server in development/local environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  serve(
    {
      fetch: app.fetch,
      port: Number(process.env.PORT) || 3005,
    },
    (info) => {
      console.log(`Server is running on http://localhost:${info.port}`);
    }
  );
}
