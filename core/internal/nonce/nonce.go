// internal/nonce/nonce.go
package nonce

import (
	"context"
	"sync"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

// Tracker maintains the next pending nonce for a single address.
// It fetches the on-chain pending nonce on first call and increments locally.
type Tracker struct {
	mu           sync.Mutex
	client       *ethclient.Client
	address      string
	pendingNonce uint64
	initialized  bool
}

func NewTracker(client *ethclient.Client, address string) *Tracker {
	return &Tracker{client: client, address: address}
}

// Next returns the next nonce to use. On the first call it fetches
// eth_getTransactionCount with "pending" tag; subsequently it increments locally.
func (t *Tracker) Next(ctx context.Context) (uint64, error) {
	t.mu.Lock()
	defer t.mu.Unlock()

	if !t.initialized {
		n, err := t.client.PendingNonceAt(ctx, common.HexToAddress(t.address))
		if err != nil {
			return 0, err
		}
		t.pendingNonce = n
		t.initialized = true
	}

	current := t.pendingNonce
	t.pendingNonce++
	return current, nil
}

// Rollback decrements the nonce counter if a transaction fails to broadcast.
// This ensures no nonce gap is created on failed sends.
func (t *Tracker) Rollback() {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.initialized && t.pendingNonce > 0 {
		t.pendingNonce--
	}
}

// Resync forces a fresh fetch of the pending nonce from the chain.
// Call this if a transaction is detected as dropped.
func (t *Tracker) Resync(ctx context.Context) error {
	t.mu.Lock()
	defer t.mu.Unlock()
	n, err := t.client.PendingNonceAt(ctx, common.HexToAddress(t.address))
	if err != nil {
		return err
	}
	t.pendingNonce = n
	return nil
}
