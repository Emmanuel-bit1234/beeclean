// Vercel serverless function entry point (catch-all route)
import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "../src/auth/routes.js";
import usersRoute from "../src/routes/users.js";
import type { AuthVariables } from "../src/types/auth.js";

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

// Export the app for Vercel
export default app;

