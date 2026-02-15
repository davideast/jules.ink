export interface CodeRef {
  file: string;
  startLine: number;
  endLine: number;
}

// Key format: "sectionName:index" → e.g. "patterns:0", "riskAssessments:1"
export type CodeRefMap = Record<string, CodeRef[]>;

export interface Intent {
  title: string;
  activityIndices: number[];
  files: string[];
  whatChanged: string;
  whyItChanged: string;
}

export interface AgentTrace {
  taskUnderstanding: string;
  planQuality: string;
  executionFidelity: string;
  decisionPoints: string[];
  corrections: string[];
  pacing: string;
}

export interface FactualFindings {
  architecturalImpact: string[];
  riskFactors: string[];
  patterns: string[];
  gaps: string[];
}

export interface StructuralAnalysis {
  intents: Intent[];
  agentTrace: AgentTrace;
  factualFindings: FactualFindings;
  codeRefs?: CodeRefMap;
  generatedAt: string;
}

export interface IntentDescription {
  intentIndex: number;
  title: string;
  description: string;
}

export interface InterpretiveAnalysis {
  narrative: string;
  intentDescriptions: IntentDescription[];
  riskAssessments: string[];
  keyInsights: string[];
  verdict: string;
  nextSteps: string[];
  codeRefs?: CodeRefMap;
  tone: string;
  model: string;
  generatedAt: string;
}

export interface AnalysisCache {
  structural?: StructuralAnalysis;
  interpretive?: Record<string, InterpretiveAnalysis>;
}

export interface SessionAnalysisRequest {
  sessionId: string;
  stackId: string;
  sessionPrompt?: string;
  tone: string;
  model?: string;
  structuralAnalysis?: StructuralAnalysis;
}

export interface SessionAnalysisResponse {
  structural: StructuralAnalysis;
  interpretive: InterpretiveAnalysis;
}
