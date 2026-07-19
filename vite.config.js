import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const pages = {
  portfolio: "portfolio/index.html",
  documentOperations: "portfolio/document-operations/index.html",
  operationsHub: "portfolio/operations-hub/index.html",
  knowledgeAssistant: "portfolio/knowledge-assistant/index.html",
  catalogIntelligence: "portfolio/catalog-intelligence/index.html",
  leadAppointment: "portfolio/lead-appointment/index.html",
  kpiStudio: "portfolio/kpi-studio/index.html",
  integrationControl: "portfolio/integration-control/index.html",
  architectureRescue: "portfolio/architecture-rescue/index.html",
  workflowAudit: "portfolio/workflow-audit/index.html",
  opportunityScout: "portfolio/opportunity-scout/index.html"
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 4173,
    proxy: {
      "/api": "http://127.0.0.1:8787"
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    cssCodeSplit: true,
    rollupOptions: {
      input: Object.fromEntries(
        Object.entries(pages).map(([name, page]) => [name, resolve(page)])
      )
    }
  },
  test: {
    environment: "node",
    include: ["tests/frontend/**/*.test.js"]
  }
});
