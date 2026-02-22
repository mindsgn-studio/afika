// internal/db/schema.go
package db

const SchemaSQL = `
-- Wallet identity (single row)
CREATE TABLE IF NOT EXISTS wallet (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    address         TEXT NOT NULL,
    encrypted_key   BLOB NOT NULL,       -- AES-GCM ciphertext of private key
    kdf_salt        BLOB NOT NULL,       -- Argon2id salt for passphrase-derived key
    created_at      INTEGER NOT NULL     -- Unix timestamp
);

-- Cached USDC transfers (incoming + outgoing)
CREATE TABLE IF NOT EXISTS transfers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_hash         TEXT NOT NULL UNIQUE,
    block_number    INTEGER NOT NULL,
    block_hash      TEXT NOT NULL,       -- For reorg detection
    log_index       INTEGER NOT NULL,
    from_address    TEXT NOT NULL,
    to_address      TEXT NOT NULL,
    amount          TEXT NOT NULL,       -- Wei string (USDC has 6 decimals)
    confirmed_depth INTEGER NOT NULL DEFAULT 0,
    direction       TEXT NOT NULL CHECK (direction IN ('IN', 'OUT')),
    timestamp       INTEGER,             -- Block timestamp, nullable until confirmed
    UNIQUE(block_number, log_index)
);

-- Sync cursor — tracks last safely synced block
CREATE TABLE IF NOT EXISTS sync_state (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    last_block      INTEGER NOT NULL DEFAULT 0,
    last_block_hash TEXT NOT NULL DEFAULT ''
);

-- Outbound pending transactions
CREATE TABLE IF NOT EXISTS pending_txs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_hash         TEXT NOT NULL UNIQUE,
    nonce           INTEGER NOT NULL,
    to_address      TEXT NOT NULL,
    amount          TEXT NOT NULL,
    gas_limit       INTEGER NOT NULL,
    gas_price       TEXT NOT NULL,
    submitted_at    INTEGER NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'confirmed', 'dropped'))
);

-- Native balance cache (ETH / MATIC etc.)
CREATE TABLE IF NOT EXISTS gas_balance (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    balance_wei     TEXT NOT NULL DEFAULT '0',
    updated_at      INTEGER NOT NULL DEFAULT 0
);
`