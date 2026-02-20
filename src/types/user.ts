import type { RdcPayrollRole } from './roles.js';

export interface UpdateUserRequest {
  name?: string;
  surname?: string;
  email?: string;
}

export interface UpdateRoleRequest {
  role: RdcPayrollRole;
}

export interface UserListResponse {
  users: Array<{
    id: number;
    email: string;
    name: string;
    surname: string;
    role: RdcPayrollRole;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  limit: number;
  offset: number;
}

export interface UserSearchResponse {
  users: Array<{
    id: number;
    email: string;
    name: string;
    surname: string;
    role: RdcPayrollRole;
  }>;
  total: number;
}

