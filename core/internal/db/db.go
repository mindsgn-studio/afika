// internal/db/db.go
package db

import (
	"database/sql"
	"sync"

	_ "github.com/mattn/go-sqlite3"
)

// DB wraps sql.DB with a mutex to serialize access from the sync goroutine
// and the UI layer — required because go-sqlite3 is not goroutine-safe in
// WAL mode without proper connection management.
type DB struct {
	mu   sync.Mutex
	conn *sql.DB
}

func Open(path string) (*DB, error) {
	conn, err := sql.Open("sqlite3", path+"?_journal_mode=WAL&_foreign_keys=on")
	if err != nil {
		return nil, err
	}
	conn.SetMaxOpenConns(1) // SQLite: single writer
	if _, err := conn.Exec(SchemaSQL); err != nil {
		return nil, err
	}
	return &DB{conn: conn}, nil
}

func (d *DB) Lock()         { d.mu.Lock() }
func (d *DB) Unlock()       { d.mu.Unlock() }
func (d *DB) Conn() *sql.DB { return d.conn }
