// cmd/tui/main.go
package main

import (
	"context"
	"fmt"
	"os"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/mindsgn-studio/pocket-money-app/core/internal/config"
	"github.com/mindsgn-studio/pocket-money-app/core/internal/facade"
)

func main() {
	cfg := config.Load() // Reads from env / config file

	wallet, err := facade.New("wallet.db", cfg)
	if err != nil {
		fmt.Fprintf(os.Stderr, "fatal: %v\n", err)
		os.Exit(1)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	wallet.StartSync(ctx)

	// Initialize TUI model with the wallet facade
	m := newModel(wallet)
	p := tea.NewProgram(m, tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "tui error: %v\n", err)
		os.Exit(1)
	}
}
