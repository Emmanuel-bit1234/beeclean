import type { RdcPayrollRole } from './roles.js';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  surname: string;
  email: string;
  role: RdcPayrollRole;
  password: string;
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
    name: string;
    surname: string;
    role: RdcPayrollRole;
  };
  token: string;
}

export interface JWTPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  surname: string;
  role: RdcPayrollRole;
}

export interface AuthVariables {
  user: AuthenticatedUser;
}
