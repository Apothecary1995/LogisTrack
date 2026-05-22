FROM golang:latest

WORKDIR /app

COPY go.mod ./
RUN go mod download

COPY . .

RUN go build -o rate_limiter .

CMD ["./rate_limiter"]