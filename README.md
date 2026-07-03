# Atlas

> Like Backstage, but without the fuss.

A self-service developer portal that reads YAML + Markdown form definitions from a catalog folder, renders them as modern forms, and commits templated output to a target git repo.

![Go](https://img.shields.io/badge/Go-1.25-00ADD8) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![Zitadel](https://img.shields.io/badge/Auth-Zitadel-blue)

Matches the architecture of Atlas's sibling projects (Quill, Forge, Tempo): a
Next.js 14 App Router / TypeScript frontend over a Go backend (chi, pgx/sqlc,
golang-migrate), authenticated via Zitadel OIDC.

## How It Works

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│  Next.js 14 (TS) │────▶│  Go API (chi)        │────▶│  Git (local  │
│  NextAuth+Zitadel│◀────│  - Catalog loader    │     │  or GitHub)  │
└──────────────────┘     │  - template renderer │     └──────────────┘
                         └──────────┬──────────┘
                                    │ reads
                             ┌──────┴──────┐
                             │  /catalog   │
                             │  YAML + tpl │
                             └─────────────┘
```

1. **Define** a template in `catalog/` with a `form.yaml` and a `skeleton/` folder
2. **Browse** templates in the web UI
3. **Fill in** the form — inputs are generated from the YAML definition
4. **Execute** — files are rendered and committed to a git repo

## Quick Start

### Prerequisites

- [Go 1.25+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/)
- Docker (for local Postgres)
- A Zitadel application (issuer, client id, project id) — see `backend/.env.example` and `frontend/.env.example`

### Run Postgres

```bash
docker compose up -d postgres
```

### Run the backend

```bash
cd backend
go run ./cmd/api
```

The API starts on `http://localhost:8080` and applies database migrations automatically.

### Run the frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server starts on `http://localhost:3003` with an API proxy to the backend.

## Adding Templates

Create a folder under `catalog/` with a `form.yaml` and a `skeleton/` directory:

```
catalog/
  my-template/
    form.yaml          # Form definition
    skeleton/           # Template files
      README.md.tpl     # .tpl files are rendered with Scriban
      config.yaml       # Non-.tpl files are copied as-is
```

### form.yaml

```yaml
apiVersion: atlas/v1
kind: Template
metadata:
  name: my-template
  title: My Template
  description: Does something useful.
  icon: rocket          # rocket, settings, database, code, file, cloud, shield, globe
spec:
  owner: my-team
  inputs:
    - id: app_name
      title: Application Name
      type: string        # string | number | boolean | select | multiline
      required: true
      pattern: "^[a-z][a-z0-9-]*$"
    - id: environment
      title: Environment
      type: select
      options: [dev, staging, prod]
      default: dev
  output:
    target:
      type: local         # "local" or "github"
      repo: /path/to/repo
      branch: main
      path: /
      commitMessage: "feat: add {{ app_name }}"
    template: ./skeleton/
```

### Input Types

| Type        | Renders As      | Extra Fields                  |
|-------------|-----------------|-------------------------------|
| `string`    | Text input      | `pattern`, `required`         |
| `number`    | Number input    | `min`, `max`, `default`       |
| `boolean`   | Toggle switch   | `default`                     |
| `select`    | Dropdown        | `options`, `default`          |
| `multiline` | Textarea        | `description`                 |

### Template Syntax

Templates use a small Scriban-syntax subset (variable interpolation and
if/else-if/else/end conditionals) implemented in `backend/internal/template`.
All form input IDs are available as variables:

```
# {{ app_name }}

{{ if environment == "prod" }}Production mode{{ else }}Dev mode{{ end }}
```

File paths can also contain template variables. A file named `{{environment}}.yaml.tpl` will have both its name and content rendered.

### GitHub Output

To commit via the GitHub API instead of locally:

```yaml
output:
  target:
    type: github
    repo: "my-org/{{ app_name }}"
    branch: main
    commitMessage: "feat: scaffold {{ app_name }}"
  github:
    tokenEnv: GITHUB_TOKEN   # reads token from this env var
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/templates` | List all templates |
| `GET` | `/api/templates/{name}` | Get template details |
| `POST` | `/api/templates/{name}/execute` | Execute a template |
| `GET` | `/api/orgs`, `/api/services`, `/api/requests`, `/api/admin/*` | Organizations, catalog, provisioning requests, admin |

## Production Deployment

`deploy/compose/` has a Docker Compose stack for running Atlas on the same VM
as Quill, sharing its Zitadel instance and Caddy reverse proxy instead of
standing up either one a second time. See `deploy/compose/README.md`.

## Tech Stack

- **Backend**: Go, chi, pgx/sqlc, golang-migrate, go-git, go-github
- **Frontend**: Next.js 14 (App Router), TypeScript, NextAuth v5
- **Auth**: Zitadel OIDC (self-hosted)
