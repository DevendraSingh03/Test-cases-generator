import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API for User Story Data
  app.get("/api/user-story/:id", async (req, res) => {
    const { id } = req.params;
    const jiraApiToken = req.headers['x-jira-api-token'] as string;
    const jiraDomain = req.headers['x-jira-domain'] as string;
    const jiraEmail = req.headers['x-jira-email'] as string;

    if (jiraApiToken && jiraDomain && jiraEmail) {
      try {
        const auth = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64');
        const response = await fetch(`https://${jiraDomain}/rest/api/3/issue/${id}`, {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Jira API error: ${response.statusText}`);
        }

        const data: any = await response.json();
        
        // Extract relevant fields from Jira response
        res.json({
          id: data.key,
          title: data.fields.summary,
          description: data.fields.description?.content?.map((c: any) => (c.content || []).map((inner: any) => inner.text || "").join('')).join('\n') || data.fields.description || "No description provided",
          acceptanceCriteria: [
            "Acceptance criteria fetched from Jira",
            ...(data.fields.customfield_10016 || []) // Example custom field for AC
          ],
          project: data.fields.project.name,
          version: data.fields.fixVersions?.[0]?.name || "N/A"
        });
        return;
      } catch (error: any) {
        console.error("Jira Fetch Error:", error);
        // Fallback to mock if real fetch fails or just return error
        res.status(500).json({ error: error.message });
        return;
      }
    }

    // Default Mock API for User Story Data
    res.json({
      id,
      title: `User Story for ${id}`,
      description: `As a user, I want to be able to ${id === 'JIRA-925' ? 'generate test designs using an AI agent' : 'perform actions in the system'} so that I can improve my productivity.`,
      acceptanceCriteria: [
        "System should accept valid inputs",
        "System should handle empty inputs gracefully",
        "System should provide feedback on success/failure",
        "Security protocols must be followed"
      ],
      project: "Intelligent Test Design",
      version: "2.0"
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
