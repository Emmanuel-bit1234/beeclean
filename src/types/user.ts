export interface UpdateUserRequest {
  name?: string;
  email?: string;
}

export interface UpdateRoleRequest {
  role: 'Admin' | 'Doctor' | 'Nurse' | 'User';
}

export interface UserListResponse {
  users: Array<{
    id: number;
    email: string;
    name: string;
    role: 'Admin' | 'Doctor' | 'Nurse' | 'User';
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
    role: 'Admin' | 'Doctor' | 'Nurse' | 'User';
  }>;
  total: number;
}

