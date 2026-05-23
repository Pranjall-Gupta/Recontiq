<div align="center">
  
  <h1>GSTMatch</h1>
  <p><strong>AI-Powered GST Invoice Reconciliation & GSTR-2B Compliance Platform</strong></p>

  <p>
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#installation">Installation</a> •
    <a href="#api-documentation">API Docs</a>
  </p>
</div>

---

## 📖 Overview

**GSTMatch** is an enterprise-grade tax reconciliation platform designed to scale automatically with your business. By harnessing the power of advanced AI models (via Ollama) and vector embeddings (PGVector), GSTMatch drastically improves the accuracy of detecting invoice mismatches, maximizing ITC (Input Tax Credit) recovery, and ensuring seamless API sync with the GSTR-2B ecosystem.

Whether you are a startup dealing with minimal monthly statements or an enterprise evaluating millions of transactions, GSTMatch eliminates manual blind spots and intelligently routes risk alerts to finance teams.

## ✨ Core Features

- **🧠 Agentic AI Matching**: Intelligent fallback from exact matching to dynamic vector-similarity logic using Spring AI.
- **🛡️ Dynamic Risk Scoring**: Built-in Machine Learning algorithms to profile vendor reliability and red-flag high-risk discrepancies automatically. 
- **📈 ITC Optimization**: Smart tracking of tax credits with full dashboard analytics, keeping operational cash flows positive.
- **⚡ High-Performance Caching**: Powered by Redis for instantaneous dashboard metrics and fast session loading.
- **🔐 Enterprise Security**: JWT-based authentication and rigorously enforced CORS rules.

---

The platform is split into a massively scalable Spring Boot monolith and a state-of-the-art responsive React 19 rendering layer.

## 📂 Repository Structure & IDE Guide

To optimize the developer experience, the frontend and backend are completely isolated into independent subfolders:

```text
impact/                  <-- Root Repository Directory (Open in Terminal for Docker Compose)
├── backend/             <-- Spring Boot Backend Project (Open in IntelliJ IDEA)
│   ├── pom.xml
│   ├── src/
│   └── Dockerfile
├── frontend/            <-- React Vite Frontend Project (Open in VS Code)
│   ├── package.json
│   └── src/
├── infra/               <-- Database and Cache Configuration Files
└── docker-compose.yml   <-- Multi-container configuration
```

### 💻 Local Development Workflow

1. **Backend Development (IntelliJ IDEA)**:
   - Open **IntelliJ IDEA**.
   - Select **Open** and choose the `d:\impact\backend` folder.
   - IntelliJ will automatically detect it as a Maven project and import the dependencies.

2. **Frontend Development (VS Code)**:
   - Open **VS Code**.
   - Open the `d:\impact\frontend` folder.
   - Open the VS Code integrated terminal and run `npm install` and `npm run dev` to start the frontend server.

3. **Running Middleware / Docker (VS Code Root)**:
   - Open the root folder `d:\impact` in VS Code.
   - Run Docker Compose commands from the root directory terminal.

---

## 📚 Documentation Directory

To keep this readme crisp, we've organized in-depth details into dedicated documentation files:

- 🏗️ **[System Architecture & Tech Stack](docs/ARCHITECTURE.md)**: Deep dive into our Spring AI, Postgres Vector workflows, and the Vite-frontend layout.
- 🚀 **[Installation & Local Setup](docs/SETUP.md)**: Step-by-step terminal guides for spinning up Docker, Ollama models, and dev servers.
- 🔗 **[API Reference](docs/API.md)**: Links to localized interactive Swagger documentation and OpenAPI specifications.

---

<div align="center">
  <sub>Built with precision and scalability by the GSTMatch Organization.</sub>
</div>

