# 🚀 Installation & Local Setup

## 1. Prerequisites
Ensure you have the following installed on your local development machine:
- **Java 21+** (JDK) and Maven
- **Node.js** (v18+ recommended) and NPM
- **Docker Desktop** (or running daemon)
- **Ollama** 

## 2. Back-End Setup
The core Spring Boot API runs on port `8080` by default.

### A. Start Infrastructure Services 
If you have docker installed locally, use the provided `docker-compose.yml` to spin up PostgreSQL (with PGVector enabled) and Redis.
```bash
docker-compose up -d
```

### B. Start Ollama Daemon & Pull Models
Ensure the required lightweight inference models are pulled.
```bash
ollama pull llama3.2:1b
ollama pull nomic-embed-text
```

### C. Run the Spring Server
Depending on your setup, compile and run the backend wrapper.
```bash
mvn clean install
mvn spring-boot:run
```
*(Note: Flyway will trigger automatically on startup to initialize the `/db/migration` schema scripts.)*

---

## 3. Front-End Setup
The frontend runs on Vite's default dev port (usually `5173`) or `3000`.

### A. Open the frontend directory:
```bash
cd frontend
```

### B. Install Dependencies:
```bash
npm install
```

### C. Start the Development Server:
```bash
npm run dev
```

---

## 🔧 Environment Variables

While the codebase holds sensible defaults in `application.yml` and `.env` respectively, you may choose to override specific tokens globally:

| Variable | Description |
|---|---|
| `SPRING_DATASOURCE_URL` | PostgreSQL endpoint (default: `jdbc:postgresql://localhost:5432/gst_recon`) |
| `SPRING_AI_OLLAMA_BASE_URL` | Ollama Daemon URL (default: `http://localhost:11434`) |
| `APP_JWT_SECRET` | Secret hash seed for Token verification |
