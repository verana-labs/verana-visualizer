# Verana Visualizer Helm Chart

This chart deploys the Verana Visualizer (Next.js) as a Deployment with a Service and an optional Ingress. One image serves any network: the network is picked at deploy time through `env`.

## Kubernetes Resources

- Deployment with liveness and readiness probes on `/`
- Service (ClusterIP by default)
- Ingress (enabled by default, needs `ingress.hosts`)

## Configuration

| Parameter | Description | Default |
| --- | --- | --- |
| `replicaCount` | Deployment replicas | `1` |
| `image.repository` | Image repository | `veranalabs/verana-visualizer` |
| `image.tag` | Image tag | Chart version |
| `image.pullPolicy` | Pull policy | `IfNotPresent` |
| `imagePullSecrets` | Pull secrets | `[]` |
| `service.type` | Service type | `ClusterIP` |
| `service.port` | Service port | `80` |
| `service.targetPort` | Container port | `3000` |
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.className` | Ingress class | `nginx` |
| `ingress.annotations` | Ingress annotations | cert-manager `letsencrypt-prod`, SSL redirect |
| `ingress.hosts` | Ingress hosts and paths; required when ingress is enabled | `[]` |
| `ingress.tls` | Ingress TLS entries | `[]` |
| `resources` | Pod resources | requests `250m`/`256Mi`, limits `500m`/`512Mi` |
| `nodeSelector`, `tolerations`, `affinity` | Scheduling | empty |
| `env` | Env vars (see below); the network ones have no default | required |

> **Note:** The image tag matches the chart version by default, so a chart release always runs the image built with it. Override `image.tag` only to debug.

### Environment variables

Defined under `env`. These have no default and rendering fails when one is missing, so every deploy passes `values-devnet.yaml`, `values-testnet.yaml` or its own file:

- `NEXT_PUBLIC_VERANA_INDEXER_BASE_URL`
- `NEXT_PUBLIC_VERANA_RPC_ENDPOINT`
- `NEXT_PUBLIC_VERANA_REST_ENDPOINT`
- `NEXT_PUBLIC_VERANA_CHAIN_ID`

`ingress.hosts` is required the same way while the ingress is enabled. The rest are optional; left empty, they are derived from an indexer host of the form `idx.<net>.verana.network`:

- `NEXT_PUBLIC_VERANA_CHAIN_NAME` (defaults to `<net>`)
- `NEXT_PUBLIC_VERANA_GRAPH_URL` (defaults to `https://graph.<net>.verana.network`)
- `NEXT_PUBLIC_VERANA_FRONTEND_URL` (defaults to `https://app.<net>.verana.network`)
- `NEXT_PUBLIC_VERANA_PEER_VISUALIZER_URL` (defaults to the other network's visualizer, hidden on other hosts)

On any other indexer host, set the graph and frontend URLs explicitly or the app refuses to start.

### Quick examples

Render:

```bash
helm template ./charts -f ./charts/values-devnet.yaml
```

Install/upgrade on devnet (override the image tag if needed):

```bash
helm upgrade --install verana-visualizer ./charts \
  -n vna-devnet-1 \
  -f ./charts/values-devnet.yaml \
  --set image.tag=v2.0.0-dev.1
```
