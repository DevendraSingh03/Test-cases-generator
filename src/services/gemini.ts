import { GoogleGenAI, Type } from "@google/genai";
import { GenerationResult, TestScenario, TestCase } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateTestDesign(
  jiraId: string,
  fixVersion: string,
  projectName: string,
  userStoryData: any,
  mode: "Normal" | "RAG" | "Agent" = "Normal"
): Promise<GenerationResult> {
  const model = "gemini-3.1-pro-preview";

  let modeInstruction = "";
  if (mode === "RAG") {
    modeInstruction = "Use a Retrieval-Augmented Generation (RAG) approach. Focus heavily on the provided context, acceptance criteria, and specific project details to ensure high relevance.";
  } else if (mode === "Agent") {
    modeInstruction = "Act as an autonomous Senior QA Agent. Use advanced reasoning to identify edge cases, security vulnerabilities, and complex integration points that might not be immediately obvious.";
  } else {
    modeInstruction = "Follow standard enterprise QA practices to generate a balanced set of test scenarios and cases.";
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
