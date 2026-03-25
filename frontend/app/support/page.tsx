export default function SupportPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 text-sm text-zinc-700 dark:text-zinc-300">
      <h1 className="text-2xl font-semibold mb-6">Support</h1>

      <p className="mb-6">
        Need help with AFIKA? Here are common topics and how to get support.
      </p>

      <h2 className="font-medium mt-6 mb-2">Getting Started</h2>
      <ul className="list-disc ml-6 mb-4 space-y-1">
        <li>Create your wallet by setting a 5-digit PIN</li>
        <li>Your wallet is generated automatically on-device</li>
        <li>Use Home to view balances and transaction history</li>
      </ul>

      <h2 className="font-medium mt-6 mb-2">Sending Money</h2>
      <ul className="list-disc ml-6 mb-4 space-y-1">
        <li>Select a saved recipient or enter a wallet address</li>
        <li>Enter amount in USDC</li>
        <li>Confirm with swipe-to-send</li>
      </ul>

      <h2 className="font-medium mt-6 mb-2">Receiving Money</h2>
      <ul className="list-disc ml-6 mb-4 space-y-1">
        <li>Open Receive</li>
        <li>Copy or share your wallet address</li>
      </ul>

      <h2 className="font-medium mt-6 mb-2">Important Security Notes</h2>
      <ul className="list-disc ml-6 mb-4 space-y-1">
        <li>AFIKA cannot recover your wallet if access is lost</li>
        <li>Keep your device and PIN secure</li>
        <li>Do not share your wallet access with anyone</li>
      </ul>

      <h2 className="font-medium mt-6 mb-2">Contact</h2>
      <p className="mb-4">
        For support inquiries, please contact:
      </p>

      <p className="font-medium">
        support@afika.app
      </p>

      <p className="mt-6 text-xs text-zinc-500">
        Include your issue, device type, and app version for faster assistance.
      </p>
    </div>
  );
}