<div align="center">
  <img src="public/logo.svg" alt="Verana Logo" height="88" />

  <h2>Verana Visualizer</h2>

  <p>A 3D view of the Verana trust network, built on the Verana indexer.</p>

  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/License-MIT-9D2A6D?style=flat-square"></a>
  <a href="https://discord.gg/edjaFn252q"><img alt="Discord" src="https://img.shields.io/badge/Discord-join-5865F2?logo=discord&logoColor=white&style=flat-square"></a>
</div>

## What it is

A Next.js app that renders the Verana network (participants, ecosystems, schemas, permissions, governance) as an interactive 3D galaxy. Seven lenses reorganise the same entities, you can search, inspect any participant, check whether a DID is trusted, and share a link that restores lens and selection. Everything shown comes from the indexer, the REST API and the RPC of the network it is pointed at. If a call fails, the UI says so instead of showing zeros.

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

The container refuses to start if the indexer, RPC or REST variable is missing.

## Test

```bash
pnpm check-format
pnpm check-types
pnpm test          # unit, Vitest
pnpm test:e2e      # Playwright against fixtures
BASE_URL=https://vis.testnet.verana.network NETWORK=testnet pnpm test:live
```

`test:live` hits a deployed instance and also runs daily in the `Live Smoke` workflow.

## Configure

Variables are read at runtime (`next-runtime-env`), so one image serves any network.

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_VERANA_INDEXER_BASE_URL` | yes | indexer root, a trailing `/v4` or `/` is stripped; the websocket URL is derived from it |
| `NEXT_PUBLIC_VERANA_RPC_ENDPOINT` | yes | Tendermint RPC |
| `NEXT_PUBLIC_VERANA_REST_ENDPOINT` | yes | chain REST API |
| `NEXT_PUBLIC_VERANA_CHAIN_ID` | yes | e.g. `vna-testnet-1` |
| `NEXT_PUBLIC_VERANA_CHAIN_NAME` | no | defaults to the network in the indexer host (`idx.<net>.verana.network`), required otherwise |
| `NEXT_PUBLIC_VERANA_GRAPH_URL` | no | defaults to `https://graph.<net>.verana.network` |
| `NEXT_PUBLIC_VERANA_FRONTEND_URL` | no | defaults to `https://app.<net>.verana.network` |
| `NEXT_PUBLIC_VERANA_PEER_VISUALIZER_URL` | no | network switch target, defaults to `vis.testnet` for devnet and `vis.devnet` for testnet, none for other hosts |

Derivations only apply when the indexer URL matches `idx.<net>.verana.network`; otherwise the optional ones fall back to the indexer URL (graph, frontend) or are hidden (peer).

Legacy names still work when the primary is unset:

| Primary | Legacy fallback |
| --- | --- |
| `NEXT_PUBLIC_VERANA_INDEXER_BASE_URL` | `NEXT_PUBLIC_IDX_ENDPOINT` |
| `NEXT_PUBLIC_VERANA_RPC_ENDPOINT` | `NEXT_PUBLIC_RPC_ENDPOINT` |
| `NEXT_PUBLIC_VERANA_REST_ENDPOINT` | `NEXT_PUBLIC_API_ENDPOINT` |
| `NEXT_PUBLIC_VERANA_CHAIN_ID` | `NEXT_PUBLIC_CHAIN_ID` |
| `NEXT_PUBLIC_VERANA_CHAIN_NAME` | `NEXT_PUBLIC_CHAIN_NAME` |

## Health

`/health` runs live sanity checks against the indexer, the chain and the websocket and shows each as pass, fail or skipped, add `?format=json` for the machine-readable report. It is the first place to look when a deployment shows an empty scene.

## Helm

The chart lives in `charts/` and defaults to testnet, one replica, `ClusterIP`. Override `env` in your values to point it at another network.

```bash
helm lint charts
helm install vis ./charts
```

## Releases

release-please opens the release PR from conventional commits. `cd.yml` builds and pushes the image and the chart to Docker Hub on release.

## License

MIT, see [LICENSE](LICENSE).
