package nonce

import (
	"context"
	"sync"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

// PendingNonceProvider abstracts eth_getTransactionCount(pending) for testability.
type PendingNonceProvider interface {
	PendingNonceAt(ctx context.Context, account common.Address) (uint64, error)
}

// Tracker maintains the next pending nonce for a single address.
// On first use it fetches the on-chain pending nonce; subsequently it
// increments locally to avoid stale RPC round-trips on rapid sends.
type Tracker struct {
	mu           sync.Mutex
	provider     PendingNonceProvider
	address      common.Address
	pendingNonce uint64
	initialized  bool
}

// NewTracker creates a Tracker for the given address backed by an ethclient.
func NewTracker(client *ethclient.Client, address string) *Tracker {
	return &Tracker{
		provider: client,
		address:  common.HexToAddress(address),
	}
}

// NewTrackerWithProvider creates a Tracker with a custom provider (useful in tests).
func NewTrackerWithProvider(provider PendingNonceProvider, address string) *Tracker {
	return &Tracker{
		provider: provider,
		address:  common.HexToAddress(address),
	}
}

// Next returns the next nonce to use for a transaction.
// On the first call it fetches eth_getTransactionCount(pending).
// Subsequent calls increment locally until Resync is called.
func (t *Tracker) Next(ctx context.Context) (uint64, error) {
	t.mu.Lock()
	defer t.mu.Unlock()

	if !t.initialized {
		n, err := t.provider.PendingNonceAt(ctx, t.address)
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

// Rollback decrements the pending nonce by 1.
// Call this when a transaction fails to broadcast so no gap is introduced.
func (t *Tracker) Rollback() {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.initialized && t.pendingNonce > 0 {
		t.pendingNonce--
	}
}

// Resync forces a fresh pending nonce fetch from the chain.
// Use this after a transaction is confirmed dropped or on wallet re-open.
func (t *Tracker) Resync(ctx context.Context) error {
	t.mu.Lock()
	defer t.mu.Unlock()
	n, err := t.provider.PendingNonceAt(ctx, t.address)
	if err != nil {
		return err
	}
	t.pendingNonce = n
	t.initialized = true
	return nil
}

// Current returns the next nonce that would be used WITHOUT advancing it.
// Useful for inspection in tests and logging.
func (t *Tracker) Current() (uint64, bool) {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.pendingNonce, t.initialized
}
