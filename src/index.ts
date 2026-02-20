import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./auth/routes.js";
import usersRoute from "./routes/users.js";
import { RDC_PAYROLL_ROLES } from "./types/roles.js";
import type { AuthVariables } from "./types/auth.js";

const app = new Hono<{ Variables: AuthVariables }>();

// Enable CORS with credentials support
app.use(
  "*",
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://beeclean-eight.vercel.app",
    ],
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// Health check endpoint
app.get("/", (c) => {
  return c.json({
    message: "Triage CDSS Proxy API",
    status: "running",
    version: "1.0.1",
  });
});

// RDC Payroll: list allowed roles (hiérarchie + structure interne ministère)
app.get("/roles", (c) => {
  return c.json({ roles: [...RDC_PAYROLL_ROLES] });
});

// Authentication routes
app.route("/auth", auth);

// User management routes
app.route("/users", usersRoute);

serve(
  {
    fetch: app.fetch,
    port: 3005,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
