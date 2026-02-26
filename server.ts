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
  app.post("/api/jira/test", async (req, res) => {
    const jiraApiToken = (req.body.apiToken || '').trim();
    let jiraDomain = (req.body.domain || '').trim();
    const jiraEmail = (req.body.email || '').trim();

    if (!jiraApiToken || !jiraDomain || !jiraEmail) {
      return res.status(400).json({ error: "Missing Jira credentials" });
    }

    // Clean up domain (extract just the hostname if a full URL is provided)
    try {
      const url = new URL(jiraDomain.includes('://') ? jiraDomain : `https://${jiraDomain}`);
      jiraDomain = url.hostname;
    } catch (e) {
      jiraDomain = jiraDomain.replace(/^https?:\/\//, '').split('/')[0];
    }

    try {
      const auth = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64');
      const response = await fetch(`https://${jiraDomain}/rest/api/2/myself`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(`401 Unauthorized: Invalid Jira Email or API Token. If using Jira Cloud, ensure you use an API Token (not your password). If using Jira Server/Data Center, this app currently uses Basic Auth which may require different configuration.`);
        }
        throw new Error(`Jira API error: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        const snippet = text.substring(0, 100).replace(/\n/g, ' ');
        throw new Error(`Received non-JSON response from ${jiraDomain}. This usually means the domain is incorrect, requires VPN/SSO, or is an on-premise instance. Response snippet: ${snippet}...`);
      }

      const data = await response.json();
      res.json({ success: true, user: data.displayName });
    } catch (error: any) {
      console.error("Jira Test Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/user-story/:id", async (req, res) => {
    const { id } = req.params;
    const jiraApiToken = (req.body.apiToken || '').trim();
    let jiraDomain = (req.body.domain || '').trim();
    const jiraEmail = (req.body.email || '').trim();

    if (jiraApiToken && jiraDomain && jiraEmail) {
      // Clean up domain (extract just the hostname if a full URL is provided)
      try {
        const url = new URL(jiraDomain.includes('://') ? jiraDomain : `https://${jiraDomain}`);
        jiraDomain = url.hostname;
      } catch (e) {
        jiraDomain = jiraDomain.replace(/^https?:\/\//, '').split('/')[0];
      }

      try {
        const auth = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64');
        const response = await fetch(`https://${jiraDomain}/rest/api/2/issue/${id}`, {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(`401 Unauthorized: Invalid Jira Email or API Token. If using Jira Cloud, ensure you use an API Token (not your password). If using Jira Server/Data Center, this app currently uses Basic Auth which may require different configuration.`);
          }
          throw new Error(`Jira API error: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          const snippet = text.substring(0, 100).replace(/\n/g, ' ');
          throw new Error(`Received non-JSON response from ${jiraDomain}. This usually means the domain is incorrect, requires VPN/SSO, or is an on-premise instance. Response snippet: ${snippet}...`);
        }

        const data: any = await response.json();
        
        // Extract relevant fields from Jira response
        // Note: Jira v2 API description is usually a string, unlike v3 which is Atlassian Document Format
        let description = data.fields.description || "No description provided";
        if (typeof description === 'object' && description.content) {
          description = description.content.map((c: any) => (c.content || []).map((inner: any) => inner.text || "").join('')).join('\n');
        }

        res.json({
          id: data.key,
          title: data.fields.summary,
          description: description,
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
