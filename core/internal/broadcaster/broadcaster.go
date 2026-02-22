// internal/broadcaster/broadcaster.go
package broadcaster

import (
	"context"

	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

// Broadcaster wraps the RPC client's SendTransaction for clean testability.
type Broadcaster struct {
	client *ethclient.Client
}

func New(client *ethclient.Client) *Broadcaster {
	return &Broadcaster{client: client}
}

// Send pushes a signed, RLP-encoded transaction to the network via eth_sendRawTransaction.
func (b *Broadcaster) Send(ctx context.Context, tx *types.Transaction) error {
	return b.client.SendTransaction(ctx, tx)
}
