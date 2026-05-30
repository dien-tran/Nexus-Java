import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "5137");
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || "http://localhost:8080";

app.use(express.json());

async function proxyToGateway(req: express.Request, res: express.Response) {
  try {
    const headers: Record<string, string> = {};
    if (req.headers.authorization) headers.Authorization = String(req.headers.authorization);
    if (!["GET", "HEAD"].includes(req.method)) headers["Content-Type"] = "application/json";

    const upstream = await fetch(`${API_GATEWAY_URL}${req.originalUrl}`, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body)
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.type(upstream.headers.get("content-type") || "application/json");
    res.send(text);
  } catch (error: any) {
    console.error("API Gateway proxy error:", error);
    res.status(502).json({ error: error?.message || "API Gateway is unavailable" });
  }
}

app.use([
  "/api/auth",
  "/api/users",
  "/api/plans",
  "/api/tasks",
  "/api/dashboard",
  "/api/chatbot"
], proxyToGateway);

async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error("Failed to start server:", err);
});
