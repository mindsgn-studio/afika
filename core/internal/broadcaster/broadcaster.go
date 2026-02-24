package broadcaster

import (
	"context"

	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

// Sender abstracts eth_sendRawTransaction for testability.
type Sender interface {
	SendTransaction(ctx context.Context, tx *types.Transaction) error
}

// Broadcaster wraps the RPC client's SendTransaction.
// It is intentionally thin — its only job is to push a signed raw transaction
// to the network. All retry/backoff logic belongs at a higher layer.
type Broadcaster struct {
	sender Sender
}

// New creates a Broadcaster backed by a live ethclient.
func New(client *ethclient.Client) *Broadcaster {
	return &Broadcaster{sender: client}
}

// NewWithSender creates a Broadcaster with a custom Sender (useful in tests).
func NewWithSender(s Sender) *Broadcaster {
	return &Broadcaster{sender: s}
}

// Send pushes a signed, RLP-encoded transaction to the network via
// eth_sendRawTransaction. Returns the node's error verbatim.
func (b *Broadcaster) Send(ctx context.Context, tx *types.Transaction) error {
	return b.sender.SendTransaction(ctx, tx)
}
