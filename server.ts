import express from "express";
import { createServer as createViteServer } from "vite";
import path from "node:path";
import { fetchYahooFinancePrice } from "./src/lib/financeServer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/finance", async (req, res) => {
    const ticker = req.query.ticker as string;
    if (!ticker) {
      return res.status(400).json({ error: "Ticker is required" });
    }

    try {
      const result = await fetchYahooFinancePrice(ticker);

      if (result.price !== null) {
        res.json({ price: result.price });
      } else {
        res.status(404).json({ error: result.error });
      }
    } catch (error) {
      console.error("Error fetching finance data from Yahoo:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
