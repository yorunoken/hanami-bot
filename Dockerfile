FROM rust:1-bookworm AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y pkg-config libssl-dev

# prepare caching

COPY ./Cargo.lock ./Cargo.lock
COPY ./Cargo.toml ./Cargo.toml

RUN mkdir src && echo "fn main() {}" > src/main.rs

RUN cargo build --release

# build the than

RUN rm src/*.rs
RUN rm ./target/release/deps/hanami*

COPY ./src ./src
RUN cargo build --release

# runner
FROM debian:bookworm-slim AS runner

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl3 \
    sqlite3 && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/hanami ./hanami

CMD ["./hanami"]