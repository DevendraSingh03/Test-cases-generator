import { GoogleGenAI, Type } from "@google/genai";
import { GenerationResult, TestScenario, TestCase, AIConfig } from "../types";

export async function generateTestDesign(
  jiraId: string,
  fixVersion: string,
  projectName: string,
  userStoryData: any,
  mode: "Normal" | "RAG" | "Agent" = "Normal",
  aiConfig?: AIConfig
): Promise<GenerationResult> {
  const apiKey = aiConfig?.geminiKey || process.env.GEMINI_API_KEY || "";
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3.1-pro-preview";

  let modeInstruction = "";
  if (mode === "RAG") {
    modeInstruction = `
      MODE: Retrieval-Augmented Generation (RAG)
      METHODOLOGY: Grounded Context Analysis
      INSTRUCTION: You must strictly adhere to the provided User Story details, Project context, and Versioning. 
      Cross-reference the description with the acceptance criteria to ensure 100% requirement traceability. 
      Do not hallucinate features not mentioned in the story. Use the provided project metadata as the primary source of truth.
    `;
  } else if (mode === "Agent") {
    modeInstruction = `
      MODE: Autonomous Multi-Agent Orchestration (CrewAI Style)
      METHODOLOGY: Collaborative Agent Reasoning
      INSTRUCTION: Act as a Lead QA Orchestrator managing a crew of specialized agents:
      1. Security Agent: Focuses on OWASP, data privacy, and vulnerability vectors.
      2. Integration Agent: Analyzes API contracts, race conditions, and system boundaries.
      3. UX/Accessibility Agent: Evaluates user friction, WCAG compliance, and edge-case interactions.
      4. Performance Agent: Identifies potential bottlenecks and scalability concerns.
      
      Synthesize their findings into a unified, high-density test suite that goes beyond standard functional testing. 
      Think like a hacker and a power user simultaneously.
    `;
  } else {
    modeInstruction = `
      MODE: Standard Enterprise QA
      METHODOLOGY: Functional Verification
      INSTRUCTION: Generate a comprehensive and balanced set of test scenarios covering functional, negative, and boundary value testing based on standard industry best practices.
    `;
  }

  const prompt = `
    ${modeInstruction}
    
    Generate a comprehensive test design for the following User Story:
    Jira ID: ${jiraId}
    Project: ${projectName}
    Version: ${fixVersion}
    Title: ${userStoryData.title}
    Description: ${userStoryData.description}
    Acceptance Criteria: ${Array.isArray(userStoryData.acceptanceCriteria) ? userStoryData.acceptanceCriteria.join(", ") : "None provided"}

    Requirements:
    1. Generate at least 10 Test Scenarios covering:
       - Functional coverage
       - Boundary value cases
       - Negative scenarios
       - Validation checks
       - Empty/null handling
       - Invalid data handling
       - Security scenarios
       - Integration scenarios
       - Performance scenarios
       - UI validation scenarios

    2. For each Scenario, generate detailed Test Cases following enterprise QA format.

    Return the result in JSON format matching the provided schema.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scenarios: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sNo: { type: Type.INTEGER },
                folder: { type: Type.STRING },
                userStory: { type: Type.STRING },
                scenarioId: { type: Type.STRING },
                scenarioName: { type: Type.STRING },
                objective: { type: Type.STRING },
                classification: { type: Type.STRING },
                priority: { type: Type.STRING },
                comments: { type: Type.STRING },
                providedBy: { type: Type.STRING },
              },
              required: ["sNo", "folder", "userStory", "scenarioId", "scenarioName", "objective", "classification", "priority", "comments", "providedBy"]
            }
          },
          testCases: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sNo: { type: Type.INTEGER },
                folder: { type: Type.STRING },
                userStory: { type: Type.STRING },
                testId: { type: Type.STRING },
                name: { type: Type.STRING },
                objective: { type: Type.STRING },
                precondition: { type: Type.STRING },
                testSteps: { type: Type.STRING },
                expectedResult: { type: Type.STRING },
                postCondition: { type: Type.STRING },
                classification: { type: Type.STRING },
                priority: { type: Type.STRING },
                automatable: { type: Type.STRING, enum: ["Y", "N"] },
                automationStatus: { type: Type.STRING },
              },
              required: ["sNo", "folder", "userStory", "testId", "name", "objective", "precondition", "testSteps", "expectedResult", "postCondition", "classification", "priority", "automatable", "automationStatus"]
            }
          }
        },
        required: ["scenarios", "testCases"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Failed to generate content");
  
  return JSON.parse(text) as GenerationResult;
}
