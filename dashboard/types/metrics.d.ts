export interface ExecutionTime {
  timestamp: string;
  provider: string;
  duration: number;
}

export interface Prompt {
  timestamp: string;
  taskType: string;
  provider: string;
}

export interface Alert {
  timestamp: string;
  type: string;
  message: string;
  severity: string;
}

export interface QualityScores {
  [key: string]: number[];
}

export interface Metrics {
  prompts: Prompt[];
  models: Record<string, number>;
  qualityScores: QualityScores;
  executionTimes: ExecutionTime[];
  alerts: Alert[];
} 