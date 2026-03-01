export async function getWalletInitSecrets() {
  throw new Error('getWalletInitSecrets is deprecated. Use PocketCore.initWalletSecure(dataDir, password).')
}