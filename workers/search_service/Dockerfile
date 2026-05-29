FROM golang:latest
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .
RUN go build -o search_service .
CMD ["./search_service"]