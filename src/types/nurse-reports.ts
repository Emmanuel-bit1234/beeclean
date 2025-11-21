export interface NurseReport {
  nurse: {
    id: number;
    name: string;
    email: string;
  };
  period: {
    type: 'daily' | 'overall';
    date?: string;
    from?: string;
    to?: string;
  };
  summary: {
    totalPatients: number;
    averagePredictionLevel: number;
    mostCommonLevel: number;
    levelDistribution: Record<number, number>;
    criticalPatients: number; // Level 1-2
    moderatePatients: number; // Level 3
    lowUrgencyPatients: number; // Level 4-5
  };
  demographics: {
    genderDistribution: {
      male: number;
      female: number;
    };
    ageGroups: {
      pediatric: number; // 0-17
      adult: number; // 18-64
      elderly: number; // 65+
    };
    arrivalModeDistribution: Record<number, number>;
  };
  performance: {
    averagePredictionTime: string; // Time between first and last prediction of the day
    predictionAccuracy: number; // Based on confidence scores
    busiestHour: number;
    leastBusyHour: number;
  };
  insights: {
    topChiefComplaints: Array<{ complaint: string; count: number }>;
    painLevelDistribution: Record<number, number>;
    vitalSignsRanges: {
      bloodPressure: { min: number; max: number; avg: number };
      heartRate: { min: number; max: number; avg: number };
      respiratoryRate: { min: number; max: number; avg: number };
      bodyTemperature: { min: number; max: number; avg: number };
    };
    riskFactors: {
      highBloodPressure: number;
      highHeartRate: number;
      highTemperature: number;
      highPainScore: number;
    };
  };
  trends: {
    hourlyDistribution: Record<number, number>;
    predictionConfidence: {
      high: number; // > 0.8
      medium: number; // 0.5-0.8
      low: number; // < 0.5
    };
  };
}

export interface NurseSummary {
  id: number;
  name: string;
  email: string;
  totalPatients: number;
  lastActivity: Date | null;
}

export interface NurseComparison {
  nurse1: NurseReport;
  nurse2: NurseReport;
  summary: {
    totalPatientsDiff: number;
    avgLevelDiff: number;
    criticalPatientsDiff: number;
  };
}

export interface NurseReportRequest {
  nurseId: number;
  name?: string;
  date?: string; // Format: YYYY-MM-DD
}
