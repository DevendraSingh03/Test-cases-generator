export interface TestScenario {
  sNo: number;
  folder: string;
  userStory: string;
  scenarioId: string;
  scenarioName: string;
  objective: string;
  classification: string;
  priority: string;
  comments: string;
  providedBy: string;
}

export interface TestCase {
  sNo: number;
  folder: string;
  userStory: string;
  testId: string;
  name: string;
  objective: string;
  precondition: string;
  testSteps: string;
  expectedResult: string;
  postCondition: string;
  classification: string;
  priority: string;
  automatable: "Y" | "N";
  automationStatus: string;
}

export interface GenerationResult {
  scenarios: TestScenario[];
  testCases: TestCase[];
}

export interface JiraConfig {
  apiToken: string;
  domain: string;
  email: string;
}

export interface CustomProvider {
  id: string;
  name: string;
  apiKey: string;
  baseProvider: "OpenAI" | "Anthropic" | "Gemini" | "Cohere" | "HuggingFace";
}

export interface AIConfig {
  provider: string;
  geminiKey: string;
  openaiKey: string;
  anthropicKey: string;
  cohereKey?: string;
  huggingFaceKey?: string;
  customProviders: CustomProvider[];
}

export type DesignBy = "Jira ID" | "Release Name" | "Manual Input" | "Custom Format";
export type GenerationMode = "Normal" | "RAG" | "Agent";
