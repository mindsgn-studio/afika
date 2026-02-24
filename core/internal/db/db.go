package db

import (
	"database/sql"
	"sync"

	_ "github.com/mattn/go-sqlite3"
)

// DB wraps sql.DB with a mutex to serialize access — SQLite allows only one
// concurrent writer even in WAL mode when using a single connection.
type DB struct {
	mu   sync.Mutex
	conn *sql.DB
}

// Open creates or opens the SQLite database at path and applies the schema.
func Open(path string) (*DB, error) {
	conn, err := sql.Open("sqlite3", path+"?_journal_mode=WAL&_foreign_keys=on")
	if err != nil {
		return nil, err
	}
	conn.SetMaxOpenConns(1)
	if _, err := conn.Exec(SchemaSQL); err != nil {
		conn.Close()
		return nil, err
	}
	return &DB{conn: conn}, nil
}

// Lock acquires the write mutex. Must be paired with Unlock.
func (d *DB) Lock() { d.mu.Lock() }

// Unlock releases the write mutex.
func (d *DB) Unlock() { d.mu.Unlock() }

// Conn returns the underlying *sql.DB for query execution.
func (d *DB) Conn() *sql.DB { return d.conn }

// Close closes the underlying database connection.
func (d *DB) Close() error { return d.conn.Close() }
