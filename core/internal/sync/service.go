// internal/sync/service.go
package sync

import (
	"context"
	"log"
	"math/big"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"

	"github.com/mindsgn-studio/pocket-money-app/core/internal/db"
)

const (
	pollInterval = 12 * time.Second // ~1 Ethereum block
	chunkSize    = uint64(2000)     // Max block range per eth_getLogs call
	confirmDepth = 12               // Blocks before a tx is "confirmed"
)

// Service is the background sync goroutine coordinator.
type Service struct {
	db         *db.DB
	client     *ethclient.Client
	logSyncer  *LogSyncer
	reorgGuard *ReorgGuard
	address    string
	stopCh     chan struct{}
}

func NewService(database *db.DB, client *ethclient.Client, userAddress, usdcContract string) *Service {
	return &Service{
		db:         database,
		client:     client,
		logSyncer:  NewLogSyncer(database, client, userAddress, usdcContract),
		reorgGuard: NewReorgGuard(database, client),
		address:    userAddress,
		stopCh:     make(chan struct{}),
	}
}

// Start launches the sync loop in a background goroutine.
func (s *Service) Start(ctx context.Context) {
	go s.loop(ctx)
}

// Stop signals the sync loop to exit.
func (s *Service) Stop() {
	close(s.stopCh)
}

func (s *Service) loop(ctx context.Context) {
	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()

	// Run once immediately on startup
	s.tick(ctx)

	for {
		select {
		case <-ticker.C:
			s.tick(ctx)
		case <-s.stopCh:
			return
		case <-ctx.Done():
			return
		}
	}
}

func (s *Service) tick(ctx context.Context) {
	// 1. Fetch latest chain head
	head, err := s.client.HeaderByNumber(ctx, nil)
	if err != nil {
		log.Printf("sync: fetch head error: %v", err)
		return
	}

	// 2. Reorg check — compare parent hashes
	if err := s.reorgGuard.Check(ctx, head); err != nil {
		log.Printf("sync: reorg detected, rolling back: %v", err)
		if err := s.reorgGuard.Rollback(ctx); err != nil {
			log.Printf("sync: rollback failed: %v", err)
			return
		}
	}

	// 3. Sync transfer logs
	if err := s.logSyncer.Sync(ctx, head.Number); err != nil {
		log.Printf("sync: log sync error: %v", err)
		return
	}

	// 4. Update native (ETH) balance
	if err := s.updateNativeBalance(ctx); err != nil {
		log.Printf("sync: native balance error: %v", err)
	}

	// 5. Update confirmation depths for pending transfers
	s.updateConfirmations(ctx, head.Number)
}

func (s *Service) updateNativeBalance(ctx context.Context) error {
	s.db.Lock()
	defer s.db.Unlock()

	addr := common.HexToAddress(s.address)
	bal, err := s.client.BalanceAt(ctx, addr, nil)
	if err != nil {
		return err
	}

	_, err = s.db.Conn().ExecContext(ctx, `
        INSERT INTO gas_balance (id, balance_wei, updated_at)
        VALUES (1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET balance_wei = excluded.balance_wei,
                                      updated_at = excluded.updated_at`,
		bal.String(), time.Now().Unix())
	return err
}

func (s *Service) updateConfirmations(ctx context.Context, currentBlock *big.Int) {
	s.db.Lock()
	defer s.db.Unlock()
	s.db.Conn().ExecContext(ctx, `
        UPDATE transfers
        SET confirmed_depth = ? - block_number
        WHERE block_number > 0`,
		currentBlock.Int64())
}
