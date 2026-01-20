package native_wallet

type NativeWallet struct{}

func (w *NativeWallet) HelloWorld() string {
	return "Hello World from GO"
}
