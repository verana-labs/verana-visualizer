# Verana Visualizer

A decentralized trust layer visualizer for the Verana network. This React NextJS application provides an interactive interface to explore trust registries, credential schemas, and network statistics.

## Features

- **Header**: Displays Verana logo, network information, and dark/light theme toggle
- **Search Form**: Input field to search for trust registries by ID
- **Results Section**: Displays trust registry details, credential schemas, and permissions
- **Responsive Design**: Works on all devices
- **Dark/Light Theme**: Toggle between themes with persistent preference
- **API Integration**: Connects to Verana network API endpoints

## Tech Stack

- **Framework**: Next.js 15.5.3 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Theme**: Custom dark/light mode with Verana accent color (#9D2A6D)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd verana-visualizer
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file with the following variables:

```env
NEXT_PUBLIC_API_ENDPOINT=https://api.testnet.verana.network
NEXT_PUBLIC_RPC_ENDPOINT=https://rpc.testnet.verana.network
NEXT_PUBLIC_IDX_ENDPOINT=https://idx.testnet.verana.network
NEXT_PUBLIC_RESOLVER_ENDPOINT=https://resolver.verana.network
NEXT_PUBLIC_CHAIN_ID=vna-testnet-1
NEXT_PUBLIC_CHAIN_NAME=Testnet
NEXT_PUBLIC_APP_NAME=Verana Visualizer
NEXT_PUBLIC_APP_LOGO=logo.svg
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/         # React components
│   ├── Header.tsx      # Header component
│   ├── SearchForm.tsx  # Search form
│   ├── ResultsSection.tsx # Results display
│   └── ThemeToggle.tsx # Theme switcher
├── lib/               # Utility functions
│   └── api.ts         # API integration
└── types/             # TypeScript types
    └── index.ts       # Type definitions
```

## Logo Placement

Place your `logo.svg` file in the `public/` directory. The application will automatically use it as the logo.

## CI/CD Pipeline

The project includes a comprehensive GitHub Actions CI/CD pipeline (`.github/workflows/cd.yml`) that provides:

### 🔄 **Automated Checks:**
- **Build Verification**: Tests on Node.js 18.x and 20.x
- **Linting**: ESLint code quality checks
- **Type Checking**: TypeScript compilation validation
- **Security Audit**: npm audit for vulnerability scanning
- **Docker Build**: Multi-architecture container builds

### 🚀 **Deployment Stages:**
- **Staging**: Auto-deploy on `develop` branch
- **Production**: Auto-deploy on `main` branch
- **Docker Hub**: Automated image publishing
- **Kubernetes**: Ready for K8s deployment

### 📦 **Containerization:**
- **Dockerfile**: Optimized multi-stage build
- **Docker Hub**: `verana/verana-visualizer` repository
- **Multi-arch**: Linux AMD64 and ARM64 support

### ☸️ **Kubernetes Support:**
- **Deployment**: `k8s/deployment.yaml`
- **Helm Chart**: `helm/verana-visualizer/`
- **Service**: LoadBalancer configuration
- **Health Checks**: Liveness and readiness probes

## Development Roadmap

### V1 (Current)
- [x] Project initialization with React NextJS + Tailwind
- [x] Basic UI components and theme system
- [x] Search form for trust registry ID
- [x] CI/CD pipeline with GitHub Actions
- [x] Docker containerization
- [x] Kubernetes deployment configuration
- [ ] API integration for trust registry data
- [ ] Results display with formatted JSON schemas
- [ ] Responsive design optimization

### V2 (Planned)
- [ ] Network graph visualization
- [ ] Advanced filtering and search
- [ ] Amazon Lambda deployment
- [ ] Performance optimization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## About Verana

Verana is an open initiative creating a decentralized trust layer for the Internet. It is built on verifiable credentials, DIDs, and public permissionless trust registries.

- **Docs**: [docs.verana.io](https://docs.verana.io/)
- **GitHub**: [github](https://github.com/verana-labs)
- **Discord**: [Join our community](https://discord.gg/edjaFn252q)

Don't trust. Verify.