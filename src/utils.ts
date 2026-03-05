import * as XLSX from "xlsx";
import { GenerationResult } from "./types";

export function exportToExcel(data: GenerationResult, fileName: string = "TestDesign.xlsx") {
  const wb = XLSX.utils.book_new();

  // Test Scenarios Sheet
  const wsScenarios = XLSX.utils.json_to_sheet(data.scenarios.map(s => {
    const row: any = {
      "S.No": s.sNo,
      "Folder": s.folder,
      "User Story": s.userStory,
      "Scenario ID": s.scenarioId,
      "Scenario Name": s.scenarioName,
      "Objective": s.objective,
      "Classification": s.classification,
      "Priority": s.priority,
      "Comments": s.comments,
      "Provided By": s.providedBy
    };
    // Add any dynamic keys from custom format
    for (const key in s) {
      if (!["sNo", "folder", "userStory", "scenarioId", "scenarioName", "objective", "classification", "priority", "comments", "providedBy"].includes(key)) {
        row[key] = s[key];
      }
    }
    return row;
  }));
  XLSX.utils.book_append_sheet(wb, wsScenarios, "TestScenario");

  // Test Cases Sheet
  const wsCases = XLSX.utils.json_to_sheet(data.testCases.map(tc => {
    const row: any = {
      "S.No": tc.sNo,
      "Folder": tc.folder,
      "User Story": tc.userStory,
      "Test ID": tc.testId,
      "Name": tc.name,
      "Objective": tc.objective,
      "Precondition": tc.precondition,
      "Test Steps": Array.isArray(tc.testSteps) ? tc.testSteps.join("\n") : tc.testSteps,
      "Expected Result": Array.isArray(tc.expectedResult) ? tc.expectedResult.join("\n") : tc.expectedResult,
      "Post Condition": tc.postCondition,
      "Classification": tc.classification,
      "Priority": tc.priority,
      "Automatable?": tc.automatable,
      "Automation Status": tc.automationStatus
    };
    // Add any dynamic keys from custom format
    for (const key in tc) {
      if (!["sNo", "folder", "userStory", "testId", "name", "objective", "precondition", "testSteps", "expectedResult", "postCondition", "classification", "priority", "automatable", "automationStatus"].includes(key)) {
        row[key] = tc[key];
      }
    }
    return row;
  }));
  XLSX.utils.book_append_sheet(wb, wsCases, "TestCases");

  XLSX.writeFile(wb, fileName);
}
