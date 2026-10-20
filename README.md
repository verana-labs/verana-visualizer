<div align="center">
  <img src="public/logo.svg" alt="Verana Logo" height="88" />

  <h2>Verana Visualizer</h2>

  <p>A 3D view of the Verana trust network, built on the Verana indexer.</p>

  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/License-Apache--2.0-9D2A6D?style=flat-square"></a>
  <a href="https://discord.gg/edjaFn252q"><img alt="Discord" src="https://img.shields.io/badge/Discord-join-5865F2?logo=discord&logoColor=white&style=flat-square"></a>
</div>

## What it is

A Next.js app that renders the Verana network (ecosystems, credential schemas, participants, corporations, services, governance) as an interactive 3D galaxy. Seven lenses reorganise the same entities, you can search, inspect any participant, check whether a DID is trusted, and share a link that restores lens and selection. Everything shown comes from the indexer, the REST API and the RPC of the network it is pointed at. If a call fails, the UI says so instead of showing zeros.

Spec: [`v4/verana-visualizer/spec.md`](https://github.com/verana-labs/verana-spec/blob/main/v4/verana-visualizer/spec.md) in verana-spec.

## Run

Needs Node 22 and pnpm 9.

```bash
pnpm install --frozen-lockfile
cp env.example .env.local   # or export the variables below
pnpm dev
```

Production build:

```bash
pnpm build
pnpm start
```

Docker:

```bash
docker build --build-arg APP_VERSION=0.0.0-local -t verana-visualizer:local .
docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_VERANA_INDEXER_BASE_URL=https://idx.testnet.verana.network \
  -e NEXT_PUBLIC_VERANA_RPC_ENDPOINT=https://rpc.testnet.verana.network \
  -e NEXT_PUBLIC_VERANA_REST_ENDPOINT=https://api.testnet.verana.network \
  -e NEXT_PUBLIC_VERANA_CHAIN_ID=vna-testnet-1 \
  -e NEXT_PUBLIC_VERANA_CHAIN_NAME=testnet \
  verana-visualizer:local
```

The container refuses to start if the indexer, RPC, REST or chain id variable is missing or blank.

## Test

```bash
pnpm check-format
pnpm check-types
pnpm test          # unit, Vitest
pnpm test:coverage # unit with coverage
pnpm e2e           # Playwright against fixtures
BASE_URL=https://vis.testnet.verana.network NETWORK=testnet pnpm live
```

`live` hits a deployed instance and also runs daily in the `Live Smoke` workflow.

`pnpm perf` builds with `NEXT_PUBLIC_PERF_HARNESS=1`, which turns on a test-only `/perf` page rendering a synthetic 5,000-participant network, then asserts at least 30 fps over 10 s in Chromium with the GPU (`PERF_GL_ARGS` overrides the Chromium flags, e.g. SwiftShader). Without that variable at build time the page is a 404 and the harness is not bundled, so rebuild with `pnpm build` afterwards. It is not part of `pnpm e2e` or CI.

## Configure

Variables are read at runtime (`next-runtime-env`), so one image serves any network.

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_VERANA_INDEXER_BASE_URL` | yes | indexer root, a trailing `/v4` or `/` is stripped; the websocket URL is derived from it |
| `NEXT_PUBLIC_VERANA_RPC_ENDPOINT` | yes | Tendermint RPC |
| `NEXT_PUBLIC_VERANA_REST_ENDPOINT` | yes | chain REST API |
| `NEXT_PUBLIC_VERANA_CHAIN_ID` | yes | e.g. `vna-testnet-1` |
| `NEXT_PUBLIC_VERANA_CHAIN_NAME` | no | defaults to the network in the indexer host (`idx.<net>.verana.network`), required otherwise |
| `NEXT_PUBLIC_VERANA_GRAPH_URL` | custom hosts only | defaults to `https://graph.<net>.verana.network` |
| `NEXT_PUBLIC_VERANA_FRONTEND_URL` | custom hosts only | defaults to `https://app.<net>.verana.network` |
| `NEXT_PUBLIC_VERANA_PEER_VISUALIZER_URL` | no | network switch target, defaults to `vis.testnet` for devnet and `vis.devnet` for testnet, none for other hosts |

Derivations only apply when the indexer URL matches `idx.<net>.verana.network`. For any other host the graph and frontend URLs must be set explicitly (the app refuses to start without them) and the peer switch is hidden.

Legacy names still work when the primary is unset:

| Primary | Legacy fallback |
| --- | --- |
| `NEXT_PUBLIC_VERANA_INDEXER_BASE_URL` | `NEXT_PUBLIC_IDX_ENDPOINT` |
| `NEXT_PUBLIC_VERANA_RPC_ENDPOINT` | `NEXT_PUBLIC_RPC_ENDPOINT` |
| `NEXT_PUBLIC_VERANA_REST_ENDPOINT` | `NEXT_PUBLIC_API_ENDPOINT` |
| `NEXT_PUBLIC_VERANA_CHAIN_ID` | `NEXT_PUBLIC_CHAIN_ID` |
| `NEXT_PUBLIC_VERANA_CHAIN_NAME` | `NEXT_PUBLIC_CHAIN_NAME` |

## Health

`/health` runs live sanity checks against the indexer, the chain and the websocket from the browser and shows each as pass, fail or skipped. `/health?format=json` renders the same report as JSON text in the page once the checks finish; it is a client-rendered page, not a JSON API, so scripts need a browser (the report's `<pre data-testid="health-json">` carries `data-state="done"` when complete). It is the first place to look when a deployment shows an empty scene.

## Helm

The chart lives in `charts/`, see [`charts/README.md`](charts/README.md). Network values have no default: pass `values-devnet.yaml`, `values-testnet.yaml` or your own file.

```bash
helm lint charts
helm install vis ./charts -f ./charts/values-testnet.yaml
```

## Releases

release-please opens the release PR from conventional commits. `cd.yml` builds and pushes the image and the chart to Docker Hub on release.

## License and community

This project is licensed under Apache-2.0 (see `LICENSE`).

- Docs: https://docs.verana.io/
- GitHub: https://github.com/verana-labs
- Repo: https://github.com/verana-labs/verana-visualizer
- Discord: https://discord.gg/edjaFn252q
- X: https://x.com/Verana_io

Don't trust. Verify.
