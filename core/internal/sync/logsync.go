// internal/sync/logsync.go
package sync

import (
	"context"
	"log"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"

	"github.com/mindsgn-studio/pocket-money-app/core/internal/db"
)

// ERC-20 Transfer event signature: Transfer(address,address,uint256)
var transferEventTopic = crypto.Keccak256Hash([]byte("Transfer(address,address,uint256)"))

// LogSyncer fetches USDC Transfer logs in chunked block ranges.
type LogSyncer struct {
	db           *db.DB
	client       *ethclient.Client
	userAddress  common.Address
	usdcContract common.Address
}

func NewLogSyncer(database *db.DB, client *ethclient.Client, userAddress, usdcContract string) *LogSyncer {
	return &LogSyncer{
		db:           database,
		client:       client,
		userAddress:  common.HexToAddress(userAddress),
		usdcContract: common.HexToAddress(usdcContract),
	}
}

// Sync fetches all Transfer logs from last synced block to currentHead, in chunks.
func (l *LogSyncer) Sync(ctx context.Context, currentHead *big.Int) error {
	fromBlock, lastHash, err := l.getLastSyncState()
	if err != nil {
		return err
	}

	toBlock := currentHead.Uint64()
	if fromBlock > toBlock {
		return nil // already up to date
	}

	for start := fromBlock; start <= toBlock; start += chunkSize {
		end := start + chunkSize - 1
		if end > toBlock {
			end = toBlock
		}

		logs, err := l.fetchLogsChunk(ctx, start, end)
		if err != nil {
			return err
		}

		l.db.Lock()
		if err := l.persistLogs(ctx, logs); err != nil {
			l.db.Unlock()
			return err
		}

		// Advance the sync cursor
		if _, err := l.db.Conn().ExecContext(ctx, `
            INSERT INTO sync_state (id, last_block, last_block_hash)
            VALUES (1, ?, ?)
            ON CONFLICT(id) DO UPDATE SET last_block = excluded.last_block,
                                          last_block_hash = excluded.last_block_hash`,
			end, lastHash); err != nil {
			l.db.Unlock()
			return err
		}
		l.db.Unlock()

		log.Printf("logsync: synced blocks %d–%d (%d logs)", start, end, len(logs))
	}
	return nil
}

// fetchLogsChunk calls eth_getLogs for a single block range. The filter
// uses the user's address as both topic[1] (from) and topic[2] (to) to
// capture outgoing and incoming transfers in two separate queries, then merges.
func (l *LogSyncer) fetchLogsChunk(ctx context.Context, from, to uint64) ([]types.Log, error) {
	userTopic := common.BytesToHash(l.userAddress.Bytes())

	// Outgoing: user is the FROM address (topic[1])
	outFilter := ethereum.FilterQuery{
		FromBlock: new(big.Int).SetUint64(from),
		ToBlock:   new(big.Int).SetUint64(to),
		Addresses: []common.Address{l.usdcContract},
		Topics: [][]common.Hash{
			{transferEventTopic},
			{userTopic}, // from
			nil,         // to — any
		},
	}

	// Incoming: user is the TO address (topic[2])
	inFilter := ethereum.FilterQuery{
		FromBlock: new(big.Int).SetUint64(from),
		ToBlock:   new(big.Int).SetUint64(to),
		Addresses: []common.Address{l.usdcContract},
		Topics: [][]common.Hash{
			{transferEventTopic},
			nil,         // from — any
			{userTopic}, // to
		},
	}

	outLogs, err := l.client.FilterLogs(ctx, outFilter)
	if err != nil {
		return nil, err
	}
	inLogs, err := l.client.FilterLogs(ctx, inFilter)
	if err != nil {
		return nil, err
	}

	return dedupeAndMerge(outLogs, inLogs), nil
}

func (l *LogSyncer) persistLogs(ctx context.Context, logs []types.Log) error {
	for _, lg := range logs {
		if len(lg.Topics) < 3 {
			continue
		}
		from := common.BytesToAddress(lg.Topics[1].Bytes()).Hex()
		to := common.BytesToAddress(lg.Topics[2].Bytes()).Hex()
		amount := new(big.Int).SetBytes(lg.Data).String()

		direction := "IN"
		if strings.EqualFold(from, l.userAddress.Hex()) {
			direction = "OUT"
		}

		_, err := l.db.Conn().ExecContext(ctx, `
            INSERT OR IGNORE INTO transfers
                (tx_hash, block_number, block_hash, log_index,
                 from_address, to_address, amount, direction, confirmed_depth)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
			lg.TxHash.Hex(),
			lg.BlockNumber,
			lg.BlockHash.Hex(),
			lg.Index,
			from, to, amount, direction,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func (l *LogSyncer) getLastSyncState() (uint64, string, error) {
	l.db.Lock()
	defer l.db.Unlock()
	row := l.db.Conn().QueryRow(`SELECT last_block, last_block_hash FROM sync_state WHERE id = 1`)
	var lastBlock uint64
	var lastHash string
	if err := row.Scan(&lastBlock, &lastHash); err != nil {
		return 0, "", nil // No sync state yet — start from zero
	}
	return lastBlock + 1, lastHash, nil
}

// dedupeAndMerge merges two log slices, removing duplicates by TxHash+LogIndex.
func dedupeAndMerge(a, b []types.Log) []types.Log {
	seen := make(map[string]struct{})
	result := make([]types.Log, 0, len(a)+len(b))
	for _, logs := range [][]types.Log{a, b} {
		for _, lg := range logs {
			key := lg.TxHash.Hex() + ":" + string(rune(lg.Index))
			if _, ok := seen[key]; !ok {
				seen[key] = struct{}{}
				result = append(result, lg)
			}
		}
	}
	return result
}
