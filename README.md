<div align="center">
  <img src="public/logo.svg" alt="Verana Logo" height="88" />
  
  <h2>Verana Visualizer</h2>

  <p>A modern, interactive frontend for exploring the Verana decentralized trust layer.</p>

  <a href="https://nodejs.org/en"><img alt="Node" src="https://img.shields.io/badge/Node-%3E%3D18-339933?logo=node.js&logoColor=white&style=flat-square"></a>
  <a href="https://nextjs.org/"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white&style=flat-square"></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white&style=flat-square"></a>
  <a href="https://tailwindcss.com/"><img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square"></a>
  <a href="#docker"><img alt="Docker" src="https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white&style=flat-square"></a>
  <a href="#kubernetes"><img alt="Kubernetes" src="https://img.shields.io/badge/Kubernetes-ready-326CE5?logo=kubernetes&logoColor=white&style=flat-square"></a>
  <a href="#helm"><img alt="Helm" src="https://img.shields.io/badge/Helm-chart-0F1689?logo=helm&logoColor=white&style=flat-square"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/License-MIT-9D2A6D?style=flat-square"></a>
  <a href="https://discord.gg/edjaFn252q"><img alt="Discord" src="https://img.shields.io/badge/Discord-join-5865F2?logo=discord&logoColor=white&style=flat-square"></a>
</div>

---

### What is this?

The Verana Visualizer is a containerized Next.js application that presents Verana network activity and entities through a delightful, responsive UI. It lets you search and explore Trust Registries, their versions and documents, Credential Schemas, and relationships across the network.

- Verana is an open initiative building a decentralized trust layer with DIDs, verifiable credentials, and public permissionless trust registries.
- This visualizer focuses on discovery and transparency: find a Trust Registry by ID, inspect its attributes and versions, view related Credential Schemas, and see connections as a network graph.

Note: The Visualizer is free to optimize display to make it look nice and effective. Expect the UI to evolve as we improve clarity and usability.

---

### Table of contents

- [Overview](#overview)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Local development](#local-development)
- [Docker](#docker)
- [Kubernetes](#kubernetes)
- [Helm](#helm)
- [AWS Lambda (container image)](#aws-lambda-container-image)
- [Project structure](#project-structure)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License and community](#license-and-community)

---

### Overview

This app consumes Verana network endpoints to surface:

- Trust Registries (metadata, controller, versions, documents)
- Credential Schemas (JSON Schema, management modes, validity windows)
- Basic network stats and chain identity
- An interactive network graph for relationships and ecosystem mapping

The application is built for real-world operations: dark/light theme, responsive layout, accessible UI patterns, and first-class containerization for easy deployment.

### Features

- Header with Verana branding, chain info, and theme toggle
- Trust Registry search by ID, with rich details and formatted JSON Schema
- Clickable external links and safe formatting
- Automatic conversions (e.g., deposit in uvna to VNA)
- Network Graph view for relationships
- Dashboard with at-a-glance metrics
- Responsive and mobile-friendly

### Tech stack

- Next.js 15 (App Router, standalone output)
- React 18 + TypeScript 5
- Tailwind CSS 3
- react-force-graph-2d (interactive graphs)

---

### Quick start

Prerequisites:

- Node.js 18+
- npm

Clone and run:

```bash
git clone https://github.com/verana-labs/verana-visualizer.git
cd verana-visualizer
npm install
cp .env.example .env.local
npm run dev
```

Then open http://localhost:3000

---

### Configuration

You can configure the visualizer via environment variables. For local development, use `.env.local`. For containers and clusters, use environment variables directly.

Environment variables (public runtime):

```env
NEXT_PUBLIC_API_ENDPOINT=https://api.testnet.verana.network
NEXT_PUBLIC_RPC_ENDPOINT=https://rpc.testnet.verana.network
NEXT_PUBLIC_IDX_ENDPOINT=https://idx.testnet.verana.network
NEXT_PUBLIC_RESOLVER_ENDPOINT=https://resolver.testnet.verana.network
NEXT_PUBLIC_CHAIN_ID=vna-testnet-1
NEXT_PUBLIC_CHAIN_NAME=Testnet
NEXT_PUBLIC_APP_NAME=Verana Visualizer
NEXT_PUBLIC_APP_LOGO=logo.svg
```

- Logo file is expected at `public/logo.svg`.
- These defaults are set in `Dockerfile` and Helm `values.yaml` for convenience.

---

### Local development

Common scripts:

- `npm run dev` – start dev server with HMR
- `npm run build` – production build
- `npm run start` – start the production server locally
- `npm run lint` – run ESLint

When developing UI or data formats:

- JSON Schemas are rendered formatted for readability
- `snake_case` attribute names are shown in Title Case
- Null/empty values are hidden where appropriate
- External URLs are clickable and open in a new tab

---

### Docker

The application ships as a single container (multi-stage build).

Build locally:

```bash
docker build -t verana/verana-visualizer:local .
```

Run locally (override any env vars as needed):

```bash
docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_API_ENDPOINT=https://api.testnet.verana.network \
  -e NEXT_PUBLIC_RPC_ENDPOINT=https://rpc.testnet.verana.network \
  -e NEXT_PUBLIC_IDX_ENDPOINT=https://idx.testnet.verana.network \
  -e NEXT_PUBLIC_RESOLVER_ENDPOINT=https://resolver.testnet.verana.network \
  -e NEXT_PUBLIC_CHAIN_ID=vna-testnet-1 \
  -e NEXT_PUBLIC_CHAIN_NAME=Testnet \
  -e NEXT_PUBLIC_APP_NAME="Verana Visualizer" \
  -e NEXT_PUBLIC_APP_LOGO=logo.svg \
  verana/verana-visualizer:local
```

---

### Kubernetes

You can deploy directly with the provided manifest.

```bash
kubectl apply -f k8s/deployment.yaml
```

This creates a `Deployment` and a `Service` of type `LoadBalancer`.

- To customize environment variables, edit `k8s/deployment.yaml` under the `env:` section.
- Health probes and resource requests/limits are preconfigured.

---

### Helm

There is a Helm chart at `helm/verana-visualizer/` with production-ready defaults.

Install (from repository root):

```bash
helm install verana-visualizer ./helm/verana-visualizer \
  --set image.repository=verana/verana-visualizer \
  --set image.tag=latest
```

Common overrides via `values.yaml` or `--set`:

- `replicaCount`
- `service.type` (default `LoadBalancer`)
- `resources.requests` / `resources.limits`
- `env.NEXT_PUBLIC_*` variables

Example env overrides:

```bash
helm upgrade --install verana-visualizer ./helm/verana-visualizer \
  --set env.NEXT_PUBLIC_CHAIN_NAME=Mainnet \
  --set env.NEXT_PUBLIC_CHAIN_ID=vna-mainnet-1
```

---

### AWS Lambda (container image)

You can run the visualizer on AWS Lambda by packaging it as a container image and using Lambda's container runtime. This approach preserves SSR while offering on-demand scaling.

High-level steps:

1) Build and tag the image for ECR

```bash
docker build -t <account-id>.dkr.ecr.<region>.amazonaws.com/verana-visualizer:lambda .
```

2) Push to ECR

```bash
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/verana-visualizer:lambda
```

3) Create a Lambda function from the image

- Runtime: Provide your image URI
- Memory: 1024–2048 MB recommended
- Timeout: 10–30s recommended
- Handler/CMD: the container's default `CMD` is `node server.js`

4) Configure environment variables (the `NEXT_PUBLIC_*` set above)

5) Expose via API Gateway HTTP API

- Map the root path `/` to the Lambda function
- Enable binary/streaming if required by your setup

Note: For very low-latency web serving, a container orchestrator (Kubernetes) is typically preferred. Lambda is great for cost-efficient bursty traffic.

---

### Project structure

```
src/
├─ app/
│  ├─ dashboard/            # Main dashboard route
│  ├─ network-graph/        # Interactive graph view
│  ├─ trust-registries/     # Trust registries explorer
│  ├─ did-directory/        # DID directory view
│  ├─ layout.tsx            # Root layout
│  └─ globals.css           # Global styles
├─ components/
│  ├─ Header.tsx, Sidebar.tsx, ThemeToggle.tsx
│  ├─ EnhancedDashboardCards.tsx, NetworkGraph.tsx
│  ├─ DIDTable.tsx, TrustRegistryTable.tsx
│  └─ RefreshButton.tsx, ResultsSection.tsx, SearchForm.tsx
├─ lib/
│  └─ api.ts                # API helpers
└─ types/
   └─ index.ts              # Shared types
```

Routing:

- The root route redirects to `/dashboard`.
- Explore `/network-graph`, `/trust-registries`, and `/did-directory` for specialized views.

---

### Roadmap

- Richer ecosystem visualizations and filters
- Performance tuning and streaming data
- Deeper integration with indexer and resolver services
- Expanded search and discovery

Have ideas? Open an issue or discussion!

---

### Contributing

We welcome issues and pull requests.

1) Fork the repo
2) Create a feature branch
3) Commit with clear messages
4) Open a PR with context and screenshots if UI changes

---

### License and community

This project is licensed under MIT – see `LICENSE`.

- Docs: https://docs.verana.io/
- GitHub: https://github.com/verana-labs
- Repo: https://github.com/verana-labs/verana-visualizer/
- Discord: https://discord.gg/edjaFn252q

Don’t trust. Verify.