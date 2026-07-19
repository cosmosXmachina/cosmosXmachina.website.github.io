# cosmosXmachina Website and Creation Lab

This repository contains the bilingual cosmosXmachina homepage, the public Creation Lab portfolio, ten independent product demonstrations, the Gmail SMTP contact route, and the private deterministic lab services.

The approved product plan is preserved in creation_lab_plan.md.

## Public Surface

- index.html is the canonical homepage. Its Three.js composition, SMTP behavior, language precedence, and contact endpoint remain intact.
- portfolio/index.html is the Creation Lab index.
- portfolio/<demo-slug>/ contains the ten complete demonstrations.
- assets/ contains homepage media and deliberate public portfolio images.
- dist/ is the only production web root. It is generated and is never committed.

Every portfolio system uses Orion Works, a clearly fictional Veneto SME, and synthetic data. Version 1 makes no request to an external AI provider.

## Runtime Architecture

Production has three layers:

1. Nginx serves dist/ and proxies /api/*.
2. api/server.mjs binds to 127.0.0.1:8787 and handles SMTP, sessions, workflow validation, and Node-based demonstrations.
3. python_service binds to 127.0.0.1:8790 and runs deterministic document, retrieval, and catalog pipelines.

Both services are private loopback processes managed by systemd. The public internet reaches them only through Nginx on the same origin.

The Spring Boot/JUnit project in architecture-fixture is CI evidence for Architecture Rescue Lab. Java is not a production dependency.

## Quick Start

Requirements:

- Node.js 22 or a compatible current LTS release
- Python 3.11 or newer
- npm
- A Gmail account with an app password for real contact delivery

Setup:

~~~powershell
Copy-Item .env.example .env
npm install
python -m venv .venv
.\.venv\Scripts\python -m pip install -r python_service\requirements.txt
npm run build
~~~

Start the three local processes in separate terminals:

~~~powershell
.\.venv\Scripts\python -m uvicorn python_service.app:app --host 127.0.0.1 --port 8790
npm start
npm run preview
~~~

Open http://127.0.0.1:4173/ and http://127.0.0.1:4173/portfolio/.

The ALLOWED_ORIGIN example already permits http://127.0.0.1:4173 and http://localhost:4173.

## Commands

~~~text
npm run build          Build homepage, portfolio, demos, and public assets into dist/
npm start              Run the private Node gateway on loopback
npm run preview        Serve dist/ locally
npm test               Run Vitest, node:test, and pytest
npm run test:e2e       Run responsive Playwright browser tests
~~~

Run modernization evidence separately when Java and Maven are available:

~~~text
cd architecture-fixture
mvn test
~~~

## Configuration and Privacy

.env is the only runtime configuration source. Create it from .env.example and never commit it.

No AI credentials are needed in version 1. LAB_SESSION_SECRET must be at least 24 random characters. PYTHON_LAB_URL must remain a loopback URL.

Never commit or publish:

- .env
- vash_key or vash_key.pub
- CV and personal-profile source files
- planning source files
- node_modules, .venv, test output, or repository metadata

The build script deliberately copies only index.html, assets/, processed portfolio pages, and the packaged extension source into dist/.

## Documentation

- creation_lab_plan.md: complete approved portfolio plan and locked decisions
- installation.md: fresh-machine, local, DNS, and production deployment procedure
- cosmos_interface.md: architecture, interfaces, language rules, and visual boundaries
- AGENTS.md: repository rules for future implementation work

The old GitHub Pages-only deployment is no longer sufficient for the complete site because SMTP and Creation Lab sessions require the private Node gateway. Use the production procedure in installation.md.
