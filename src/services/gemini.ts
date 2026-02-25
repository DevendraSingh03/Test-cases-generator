import { GoogleGenAI, Type } from "@google/genai";
import { GenerationResult, TestScenario, TestCase, AIConfig } from "../types";

export async function generateTestDesign(
  jiraId: string,
  fixVersion: string,
  projectName: string,
  userStoryData: any,
  mode: "Normal" | "RAG" | "Agent" = "Normal",
  aiConfig?: AIConfig,
  customFormat?: string
): Promise<GenerationResult> {
  const providerId = aiConfig?.provider || "Gemini";
  const customProvider = aiConfig?.customProviders?.find(p => p.id === providerId);
  
  const effectiveProvider = customProvider ? customProvider.baseProvider : providerId;
  const effectiveApiKey = customProvider ? customProvider.apiKey : (
    providerId === "Gemini" ? (aiConfig?.geminiKey || process.env.GEMINI_API_KEY || "") :
    providerId === "OpenAI" ? aiConfig?.openaiKey :
    providerId === "Anthropic" ? aiConfig?.anthropicKey : ""
  );

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

  const formatInstruction = customFormat 
    ? `\nCUSTOM OUTPUT FORMAT REQUIREMENTS:\n${customFormat}\n` 
    : "";

  const prompt = `
    ${modeInstruction}
    ${formatInstruction}
    
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

  let text = "";

  if (effectiveProvider === "Gemini") {
    if (!effectiveApiKey) throw new Error("Gemini API Key is missing");
    
    const ai = new GoogleGenAI({ apiKey: effectiveApiKey });
    const model = "gemini-3.1-pro-preview";

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
    text = response.text || "";
  } else if (effectiveProvider === "OpenAI") {
    if (!effectiveApiKey) throw new Error("OpenAI API Key is missing");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${effectiveApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert QA Engineer. Always respond with valid JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    text = data.choices[0].message.content;
  } else if (effectiveProvider === "Anthropic") {
    if (!effectiveApiKey) throw new Error("Anthropic API Key is missing");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": effectiveApiKey,
        "anthropic-version": "2023-06-01",
        "dangerously-allow-browser": "true"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 4096,
        messages: [
          { role: "user", content: prompt + "\n\nIMPORTANT: Return ONLY the JSON object, no other text." }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    text = data.content[0].text;
  }

  if (!text) throw new Error("Failed to generate content from AI provider");
  
  try {
    return JSON.parse(text) as GenerationResult;
  } catch (e) {
    console.error("JSON Parse Error:", text);
    throw new Error("AI returned invalid JSON. Please try again.");
  }
}
