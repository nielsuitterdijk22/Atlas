# Yaly

> Like Backstage, but without the fuss.

A self-service developer portal that reads YAML + Markdown form definitions from a catalog folder, renders them as modern forms, and commits templated output to a target git repo.

![.NET 9](https://img.shields.io/badge/.NET-9.0-512BD4) ![React](https://img.shields.io/badge/React-18-61DAFB) ![Tailwind](https://img.shields.io/badge/Tailwind-CSS-06B6D4)

## How It Works

```
┌────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│  React + TW    │────▶│  ASP.NET Web API     │────▶│  Git (local  │
│  (SPA frontend)│◀────│  - Catalog loader    │     │  or GitHub)  │
└────────────────┘     │  - Scriban templates │     └──────────────┘
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
4. **Execute** — files are rendered with [Scriban](https://github.com/scriban/scriban) and committed to a git repo

## Quick Start

### Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Node.js 18+](https://nodejs.org/)

### Run the backend

```bash
cd Yaly.Api
dotnet run
```

The API starts on `http://localhost:5111`.

### Run the frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server starts on `http://localhost:5173` with API proxy to the backend.

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
apiVersion: yaly/v1
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

Templates use [Scriban](https://github.com/scriban/scriban) (Liquid-like). All form input IDs are available as variables:

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
| `POST` | `/api/templates/reload` | Hot-reload the catalog |

## Tech Stack

- **Backend**: ASP.NET 9, Scriban, LibGit2Sharp, Octokit, YamlDotNet
- **Frontend**: React 18, Vite, Tailwind CSS
- **No auth** (yet)
