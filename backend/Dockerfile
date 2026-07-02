# syntax=docker/dockerfile:1

# ---- build ----
FROM golang:1.25-alpine AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/atlas-api ./cmd/api

# ---- run ----
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/atlas-api /atlas-api
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/atlas-api"]
