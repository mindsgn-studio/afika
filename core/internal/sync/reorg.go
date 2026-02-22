// internal/sync/reorg.go
package sync

import (
	"context"
	"fmt"
	"log"

	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"

	"github.com/mindsgn-studio/pocket-money-app/core/internal/db"
)

// ReorgGuard detects chain reorganizations by comparing block parent hashes.
type ReorgGuard struct {
	db     *db.DB
	client *ethclient.Client
}

func NewReorgGuard(database *db.DB, client *ethclient.Client) *ReorgGuard {
	return &ReorgGuard{db: database, client: client}
}

// Check compares the new head's parent hash to our last saved block hash.
// If they diverge, a reorg has occurred.
func (r *ReorgGuard) Check(ctx context.Context, head *types.Header) error {
	r.db.Lock()
	row := r.db.Conn().QueryRowContext(ctx,
		`SELECT last_block, last_block_hash FROM sync_state WHERE id = 1`)
	var lastBlock uint64
	var lastHash string
	r.db.Unlock()

	if err := row.Scan(&lastBlock, &lastHash); err != nil {
		return nil // No sync state — nothing to check
	}

	if lastBlock == 0 || lastHash == "" {
		return nil
	}

	// The new head's parent should match our saved tip
	if head.ParentHash.Hex() != lastHash {
		return fmt.Errorf("reorg detected: expected parent %s, got %s (at block %d)",
			lastHash, head.ParentHash.Hex(), lastBlock)
	}
	return nil
}

// Rollback removes transfers from the last `confirmDepth` blocks and
// resets the sync cursor to confirmDepth blocks before the current tip.
// This simple approach re-syncs a safe window rather than walking the fork.
func (r *ReorgGuard) Rollback(ctx context.Context) error {
	r.db.Lock()
	defer r.db.Unlock()

	row := r.db.Conn().QueryRowContext(ctx,
		`SELECT last_block FROM sync_state WHERE id = 1`)
	var lastBlock uint64
	if err := row.Scan(&lastBlock); err != nil {
		return err
	}

	// Roll back to `confirmDepth` before the current tip
	rollbackTarget := int64(lastBlock) - confirmDepth
	if rollbackTarget < 0 {
		rollbackTarget = 0
	}

	log.Printf("reorg: rolling back to block %d (was %d)", rollbackTarget, lastBlock)

	// Delete unconfirmed transfers in the affected range
	_, err := r.db.Conn().ExecContext(ctx,
		`DELETE FROM transfers WHERE block_number > ? AND confirmed_depth < ?`,
		rollbackTarget, confirmDepth)
	if err != nil {
		return err
	}

	// Reset sync cursor
	_, err = r.db.Conn().ExecContext(ctx,
		`UPDATE sync_state SET last_block = ?, last_block_hash = '' WHERE id = 1`,
		rollbackTarget)
	return err
}
