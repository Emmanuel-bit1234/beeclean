export interface PredictionInputs {
  Sex: number;
  Age: string;
  Arrival_mode: number;
  Injury: number;
  Mental: number;
  Pain: number;
  NRS_pain: number;
  SBP: string;
  DBP: string;
  HR: string;
  RR: string;
  BT: string;
  Chief_complain: string;
}

export interface KtasExplained {
  Level: number;
  Title: string;
  Meaning: string;
  Triage_target: string; // Note: underscore instead of space
}

export interface PredictionResponse {
  inputs: PredictionInputs;
  Predict: number;
  Ktas_Explained: KtasExplained; // Note: underscore instead of space
  Probs: string[]; // Note: ML model returns strings, not numbers
  Model: string;
}

export interface PredictionLogData {
  patientNumber: string;
  inputs: PredictionInputs;
  predict: number;
  ktasExplained: KtasExplained;
  probs: string[]; // Note: ML model returns strings
  model: string;
}

export interface PredictionLogWithUser {
  id: number;
  userId: number;
  patientNumber: string;
  inputs: PredictionInputs;
  predict: number;
  ktasExplained: KtasExplained;
  probs: string[]; // Note: ML model returns strings
  model: string;
  createdAt: Date;
  user: {
    id: number;
    email: string;
    name: string;
  };
}
