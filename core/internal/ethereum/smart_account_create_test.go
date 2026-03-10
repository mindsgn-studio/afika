package ethereum

import (
	"context"
	"errors"
	"math/big"
	"strings"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/mindsgn-studio/pocket-money-app/core/internal/config"
	"github.com/mindsgn-studio/pocket-money-app/core/internal/database"
)

type mockBundler struct {
	estimate    UserOperationGasEstimate
	estimateErr error
	sendHash    string
	sendErr     error
	sentOp      UserOperation
}

func (m *mockBundler) EstimateUserOperationGas(_ context.Context, _ UserOperation, _ string) (UserOperationGasEstimate, error) {
	if m.estimateErr != nil {
		return UserOperationGasEstimate{}, m.estimateErr
	}
	return m.estimate, nil
}

func (m *mockBundler) SendUserOperation(_ context.Context, op UserOperation, _ string) (string, error) {
	m.sentOp = op
	if m.sendErr != nil {
		return "", m.sendErr
	}
	return m.sendHash, nil
}

func (m *mockBundler) GetUserOperationReceipt(_ context.Context, _ string) (*userOpReceipt, error) {
	return nil, nil
}

func makeCreateAccountOp(sender common.Address) UserOperation {
	paymaster := common.HexToAddress("0x909badF15C6738f772F2F19Bc7B6bD6C46f68b59")
	pad := append([]byte{}, paymaster.Bytes()...)
	pad = append(pad, []byte{0xde, 0xad, 0xbe, 0xef}...)

	return UserOperation{
		Sender:               sender,
		Nonce:                big.NewInt(0),
		InitCode:             []byte{0x01, 0x02, 0x03},
		CallData:             []byte{0x04, 0x05},
		CallGasLimit:         big.NewInt(300000),
		VerificationGasLimit: big.NewInt(350000),
		PreVerificationGas:   big.NewInt(90000),
		MaxFeePerGas:         big.NewInt(10_000_000_000),
		MaxPriorityFeePerGas: big.NewInt(2_000_000_000),
		PaymasterAndData:     pad,
	}
}

func TestSubmitSmartAccountCreateUserOperationSuccess(t *testing.T) {
	ctx := context.Background()
	db := openTestDB(t)
	defer db.Close()

	privateKey, err := crypto.GenerateKey()
	if err != nil {
		t.Fatalf("GenerateKey() error = %v", err)
	}

	sender := database.WalletSecret{Address: "0x00000000000000000000000000000000000000ab"}
	owner := common.HexToAddress("0x00000000000000000000000000000000000000cd")
	predicted := common.HexToAddress("0x00000000000000000000000000000000000000ef")
	entryPoint := common.HexToAddress("0x0000000071727De22E5E9d8BAf0edAc6f37da032")
	op := makeCreateAccountOp(predicted)

	bundler := &mockBundler{
		estimate: UserOperationGasEstimate{
			PreVerificationGas:   big.NewInt(12345),
			VerificationGasLimit: big.NewInt(45678),
			CallGasLimit:         big.NewInt(78901),
		},
		sendHash: "0xfeed1234",
	}

	hash, err := submitSmartAccountCreateUserOperation(
		ctx,
		db,
		"ethereum-sepolia",
		config.Deployment{FactoryAddress: "0x149C7e88FF747F4d275fc1898B2aCa5b900f76a8"},
		sender,
		owner,
		predicted,
		entryPoint,
		11155111,
		op,
		privateKey,
		bundler,
	)
	if err != nil {
		t.Fatalf("submitSmartAccountCreateUserOperation() error = %v", err)
	}
	if hash != "0xfeed1234" {
		t.Fatalf("expected bundler hash, got %s", hash)
	}
	if bundler.sentOp.Signature == nil || len(bundler.sentOp.Signature) == 0 {
		t.Fatalf("expected signed user operation")
	}
	if bundler.sentOp.CallGasLimit.Cmp(big.NewInt(78901)) != 0 {
		t.Fatalf("expected estimated call gas to be applied")
	}

	txs, err := db.ListTransactions(ctx, sender.Address, "ACCOUNT", 10, 0)
	if err != nil {
		t.Fatalf("ListTransactions() error = %v", err)
	}
	if len(txs) != 1 {
		t.Fatalf("expected 1 transaction, got %d", len(txs))
	}
	if txs[0].UserOpHash != "0xfeed1234" {
		t.Fatalf("expected tx userOpHash to match send hash, got %s", txs[0].UserOpHash)
	}
}

func TestSubmitSmartAccountCreateUserOperationAA23Diagnostics(t *testing.T) {
	ctx := context.Background()
	db := openTestDB(t)
	defer db.Close()

	privateKey, err := crypto.GenerateKey()
	if err != nil {
		t.Fatalf("GenerateKey() error = %v", err)
	}

	sender := database.WalletSecret{Address: "0x00000000000000000000000000000000000000ab"}
	owner := common.HexToAddress("0x00000000000000000000000000000000000000cd")
	predicted := common.HexToAddress("0x00000000000000000000000000000000000000ef")
	entryPoint := common.HexToAddress("0x0000000071727De22E5E9d8BAf0edAc6f37da032")
	op := makeCreateAccountOp(predicted)

	bundler := &mockBundler{
		sendErr: errors.New("AA23 reverted"),
	}

	_, err = submitSmartAccountCreateUserOperation(
		ctx,
		db,
		"ethereum-sepolia",
		config.Deployment{FactoryAddress: "0x149C7e88FF747F4d275fc1898B2aCa5b900f76a8"},
		sender,
		owner,
		predicted,
		entryPoint,
		11155111,
		op,
		privateKey,
		bundler,
	)
	if err == nil {
		t.Fatalf("expected submit error")
	}
	if !strings.Contains(err.Error(), "diagnostics=") {
		t.Fatalf("expected diagnostics in error, got %s", err.Error())
	}
	if !strings.Contains(strings.ToLower(err.Error()), "aa23") {
		t.Fatalf("expected aa23 in error, got %s", err.Error())
	}

	var submissionErr *BundlerSubmissionError
	if !errors.As(err, &submissionErr) {
		t.Fatalf("expected BundlerSubmissionError, got %T", err)
	}
	if submissionErr.Diagnostics.Sender != predicted.Hex() {
		t.Fatalf("expected diagnostics sender %s, got %s", predicted.Hex(), submissionErr.Diagnostics.Sender)
	}
	if submissionErr.Diagnostics.PaymasterAndDataLen == 0 {
		t.Fatalf("expected paymaster diagnostics to be populated")
	}

	txs, listErr := db.ListTransactions(ctx, sender.Address, "ACCOUNT", 10, 0)
	if listErr != nil {
		t.Fatalf("ListTransactions() error = %v", listErr)
	}
	if len(txs) != 0 {
		t.Fatalf("expected no transaction records on bundler failure, got %d", len(txs))
	}
}
