export interface PatientNote {
  id: string;
  content: string;
  author: {
    id: number;
    name: string;
    email: string;
  };
  createdAt: string; // ISO date string
}

export interface Patient {
  id: number;
  patientNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  phoneNumber: string | null;
  email: string | null;
  address: string | null;
  emergencyContact: {
    name: string;
    relationship: string;
    phoneNumber: string;
  } | null;
  medicalHistory: string[] | null;
  allergies: string[] | null;
  medications: string[] | null;
  insuranceInfo: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  } | null;
  notes: PatientNote[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePatientRequest {
  patientNumber?: string; // Now optional - will be auto-generated if not provided
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date string
  gender: 'male' | 'female' | 'other';
  phoneNumber?: string;
  email?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  medicalHistory?: string[];
  allergies?: string[];
  medications?: string[];
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  };
  notes?: PatientNote[]; // Optional notes when creating
}

export interface UpdatePatientRequest {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string; // ISO date string
  gender?: 'male' | 'female' | 'other';
  phoneNumber?: string;
  email?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  medicalHistory?: string[];
  allergies?: string[];
  medications?: string[];
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  };
  notes?: PatientNote[]; // Can update entire notes array or add new note
  newNote?: string; // Convenience field: just provide note content to append
}

export interface PatientSearchParams {
  query?: string; // Search in name, patient number, phone, email
  gender?: 'male' | 'female' | 'other';
  ageMin?: number;
  ageMax?: number;
  hasAllergies?: boolean;
  hasMedications?: boolean;
}

export interface PatientListResponse {
  patients: Patient[];
}

export interface PatientStats {
  totalPatients: number;
  genderDistribution: {
    male: number;
    female: number;
    other: number;
  };
  ageGroups: {
    pediatric: number; // 0-17
    adult: number; // 18-64
    elderly: number; // 65+
  };
  commonAllergies: Array<{ allergy: string; count: number }>;
  commonMedications: Array<{ medication: string; count: number }>;
  recentRegistrations: number; // Last 30 days
}
