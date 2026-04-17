FROM golang:1.22-alpine AS build

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -v -o main ./backend/cmd/api/main.go

FROM alpine:3.20
WORKDIR /app
COPY --from=build /app/main /app/main
ENV PORT=8080
EXPOSE ${PORT}
CMD ["./main"]
