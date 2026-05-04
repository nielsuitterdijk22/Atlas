FROM {{ if language == "csharp" }}mcr.microsoft.com/dotnet/aspnet:9.0{{ else if language == "go" }}golang:1.22-alpine{{ else if language == "python" }}python:3.12-slim{{ else }}node:20-alpine{{ end }}

WORKDIR /app
COPY . .

EXPOSE {{ port }}

{{ if language == "csharp" }}CMD ["dotnet", "run"]{{ else if language == "go" }}CMD ["go", "run", "."]{{ else if language == "python" }}CMD ["python", "main.py"]{{ else }}CMD ["node", "index.js"]{{ end }}
