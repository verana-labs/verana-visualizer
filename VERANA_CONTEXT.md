# Verana Visualizer Project Context

## Project Overview
Verana is an open initiative creating a decentralized trust layer for the Internet. It is built on verifiable credentials, DIDs, and public permissionless trust registries.

## Project Details
- **Project Name**: Verana Visualizer
- **Tech Stack**: React NextJS + Tailwind CSS
- **Accent Color**: #9D2A6D
- **Theme**: Black/White with switch
- **Language**: English (project), French (roadmap)
- **Logo**: logo.svg (to be placed after init)

## API Endpoints
- **API_ENDPOINT**: https://api.testnet.verana.network
- **RPC_ENDPOINT**: https://rpc.testnet.verana.network
- **IDX_ENDPOINT**: https://idx.testnet.verana.network
- **RESOLVER_ENDPOINT**: https://resolver.verana.network
- **CHAIN_ID**: vna-testnet-1
- **CHAIN_NAME**: Testnet

## Key Features (V1)
1. Header with Verana logo, network info, and dark/light mode toggle
2. Form section with trust registry ID input and search button
3. Result section displaying trust registry, credential schemas, permissions
4. Responsive design for all devices
5. JSON schema formatting with snake_case to Title Case conversion
6. Clickable URLs (open in new window)
7. Deposit conversion from uvna to VNA
8. Hide null attributes

## Roadmap (French)
1. ✅ Init React NextJS Tailwind + git repo with correct branches
2. CI/CD GitHub Actions workflow cd.yml for build checks and npm lint
3. Docker deployment (Dockerfile + .dockerignore)
4. Deployable on Docker, Kubernetes, and Amazon Lambda
5. Fetch latest Verana network API results
6. Header with global project/network info
7. MVP table display for info
8. Clickable elements for detailed views
9. Result section for trust registry, credential schemas, permissions
10. Search form implementation
11. Search by specific trust registry ID
12. Filter buttons for search
13. V1 Complete
14. New page for network graph visualization
15. Re-implement filters and search for graph
16. Data leak prevention and security
17. Optimize requests for scalability
18. Complete README with deployment instructions
19. Footer with specifications and community links
20. V2 Complete

## Footer Requirements
- Specifications: Verifiable Trust, Verifiable Public Registry, Trust Registry Query Protocol
- Community: LinkedIn, Discord, GitHub
- About Verana: Verana Verifiable Trust Network, Foundation Website
- ©2025 Verana Foundation

## Technical Notes
- Containerized frontend
- Must be versioned and deployed to Docker Hub
- Documentation required for Docker, Kubernetes, Helm, and Lambda deployment
- Responsive layout required
- Header must include app logo, name, and dark/light mode toggle
- Form must query API_ENDPOINT for trust registry data
- Results must display trust registry and credential schemas
- JSON schema must be formatted
- Deposit values in uvna must be converted to VNA
- Null attributes must not be shown
- URLs must be clickable and open in new window

## Environment Variables
- APP_NAME: Verana Visualizer
- APP_LOGO: logo.svg
- API_ENDPOINT: https://api.testnet.verana.network
- RPC_ENDPOINT: https://rpc.testnet.verana.network
- IDX_ENDPOINT: https://idx.testnet.verana.network
- RESOLVER_ENDPOINT: https://resolver.verana.network
- CHAIN_ID: vna-testnet-1
- CHAIN_NAME: Testnet
