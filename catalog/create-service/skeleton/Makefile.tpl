.PHONY: run build test

run:
{{ if language == "csharp" }}	dotnet run{{ else if language == "go" }}	go run .{{ else if language == "python" }}	python main.py{{ else }}	node index.js{{ end }}

build:
	docker build -t {{ service_name }} .

test:
{{ if language == "csharp" }}	dotnet test{{ else if language == "go" }}	go test ./...{{ else if language == "python" }}	pytest{{ else }}	npm test{{ end }}
