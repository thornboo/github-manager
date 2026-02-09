import express from "express";
import { fileURLToPath } from "node:url";
import corsMiddleware from "./middleware/cors.js";
import analyzeReposRoute from "./routes/analyze-repos.js";
import analyzeStreamRoute from "./routes/analyze-stream.js";
import aiSearchRoute from "./routes/ai-search.js";
import testAiConnectionRoute from "./routes/test-ai-connection.js";

const app = express();

app.set("trust proxy", true);
app.use(express.json({ limit: "10mb" }));
app.use(corsMiddleware);

app.post("/api/analyze-repos", analyzeReposRoute);
app.post("/api/analyze-stream", analyzeStreamRoute);
app.post("/api/ai-search", aiSearchRoute);
app.post("/api/test-ai-connection", testAiConnectionRoute);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;

const isMainModule =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  const port = Number(process.env.PORT || 3001);
  app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
  });
}
