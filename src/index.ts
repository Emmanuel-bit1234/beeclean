import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./auth/routes.js";
import usersRoute from "./routes/users.js";
import ministriesRoute from "./routes/ministries.js";
import departmentsRoute from "./routes/departments.js";
import employeesRoute from "./routes/employees.js";
import employeeVerificationsRoute from "./routes/employee-verifications.js";
import payrollRunsRoute from "./routes/payroll-runs.js";
import payrollReportsRoute from "./routes/payroll-reports.js";
import budgetsRoute from "./routes/budgets.js";
import payslipsRoute from "./routes/payslips.js";
import messagesRoute from "./routes/messages.js";
import sanctionsRoute from "./routes/sanctions.js";
import excelUploadsRoute from "./routes/excel-uploads.js";
import mobileMoneyRoute from "./routes/mobile-money.js";
import dashboardRoute from "./routes/dashboard.js";
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
    message: "RDC Government Payroll API",
    status: "running",
    version: "1.0.1",
  });
});

// RDC Payroll: list allowed roles (hiérarchie + structure interne ministère)
app.get("/roles", (c) => {
  return c.json({ roles: [...RDC_PAYROLL_ROLES] });
});

// Dashboard (Tableau de bord) – requires auth
app.route("/dashboard", dashboardRoute);

// Authentication routes
app.route("/auth", auth);

// User management routes
app.route("/users", usersRoute);

// Payroll domains
app.route("/ministries", ministriesRoute);
app.route("/departments", departmentsRoute);
app.route("/employees", employeesRoute);
app.route("/employee-verifications", employeeVerificationsRoute);
app.route("/payroll-runs", payrollRunsRoute);
app.route("/payroll-reports", payrollReportsRoute);
app.route("/budgets", budgetsRoute);
app.route("/payslips", payslipsRoute);
app.route("/messages", messagesRoute);
app.route("/sanctions", sanctionsRoute);
app.route("/excel-uploads", excelUploadsRoute);
app.route("/mobile-money", mobileMoneyRoute);

serve(
  {
    fetch: app.fetch,
    port: 3005,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
