# Deploying Atlas alongside Quill

This stack is meant to run on the same VM as [Quill](../../../quill), reusing
its Zitadel instance and its Caddy reverse proxy instead of standing up
either one a second time. It brings up Postgres, the Atlas backend (`api`),
and the Atlas frontend (`web`) — nothing here binds a host port or terminates
TLS; Quill's Caddy remains the only public entrypoint on the box.

| Service  | Reachable at                    | Notes                              |
| -------- | -------------------------------- | ----------------------------------- |
| web      | `atlas-web:3003` (Docker only)   | Reverse-proxied by Quill's Caddy    |
| api      | `atlas-api:8080` (Docker only)   | Only `web` talks to it              |
| postgres | `postgres:5432` (Docker only)    | Atlas's own database, not shared    |

## Prerequisites

- Quill already deployed on this VM with its `production` Caddy profile
  running (`docker compose --profile production up -d`), so the `quill_default`
  Docker network and the shared Zitadel instance exist.
- A Zitadel application registered for Atlas — see `.env.example` for the
  redirect URI to configure and which IDs to copy out.
- DNS A/AAAA record for Atlas's domain (e.g. `atlas.example.com`) pointing at
  the VM's public IP, same as Quill's.

## First deploy

```bash
# from the Atlas repo root
cp deploy/compose/.env.example deploy/compose/.env
# fill in deploy/compose/.env — every value marked required in the file will
# make `docker compose` refuse to start until it's set

docker compose -f deploy/compose/docker-compose.yml up -d --build
```

## Wire Atlas into Quill's Caddy

Atlas's `web` container joins Quill's Docker network (`quill_default`) but
isn't routed to until you add a vhost block to Quill's Caddyfile
(`deploy/compose/Caddyfile` in the Quill repo), next to the existing `git.` and
auth vhosts:

```
atlas.{$QUILL_DOMAIN} {
    reverse_proxy atlas-web:3003
}
```

Reload Caddy from the Quill repo after editing:

```bash
docker compose -f deploy/compose/docker-compose.yml exec caddy caddy reload --config /etc/caddy/Caddyfile
```

If you'd rather give Atlas its own domain unrelated to Quill's, replace
`atlas.{$QUILL_DOMAIN}` with the literal hostname, e.g. `atlas.example.com`.

## Why no Caddy or Zitadel service here

- **Caddy**: only one process can bind host ports 80/443. Quill's Caddy
  already owns them, so Atlas joins its Docker network instead of running a
  second proxy — see above.
- **Zitadel**: Atlas authenticates against the same Zitadel instance Quill
  uses (`ZITADEL_ISSUER` in `.env`), as a second registered application. Do
  not stand up a second Zitadel instance for Atlas.

## Updating

```bash
git pull
docker compose -f deploy/compose/docker-compose.yml up -d --build
```

Database migrations run automatically on `api` startup.

## Backup

```bash
docker compose -f deploy/compose/docker-compose.yml exec postgres \
  pg_dump -U atlas atlas > atlas-$(date +%Y%m%d).sql

docker run --rm \
  -v atlas_atlas-data:/data \
  -v "$(pwd)":/backup \
  alpine tar czf /backup/atlas-data-$(date +%Y%m%d).tar.gz /data
```

`atlas-data` holds the per-org catalog clone cache and the AES key that
encrypts stored catalog repo tokens — losing the key without a Postgres
restore alongside it makes those stored tokens unrecoverable, so always back
up both together.
