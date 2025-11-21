export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: 'Admin' | 'Doctor' | 'Nurse' | 'User'; // Optional, defaults to 'Nurse'
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
    name: string;
    role: 'Admin' | 'Doctor' | 'Nurse' | 'User';
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
  role: 'Admin' | 'Doctor' | 'Nurse' | 'User';
}

export interface AuthVariables {
  user: AuthenticatedUser;
}
