package pocket.module.mindsgn

import core.WalletCore
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PocketModule : Module() {
  private val walletCore = WalletCore()

  private val secureKeyStore by lazy {
    val context = requireNotNull(appContext.reactContext) {
      "React context is unavailable"
    }
    SecureKeyStore(context.applicationContext)
  }

  override fun definition() = ModuleDefinition {
    Name("PocketCore")

    AsyncFunction("initWallet") { dataDir: String, password: String, masterKeyB64: String, kdfSaltB64: String ->
      walletCore.init(dataDir, password, masterKeyB64, kdfSaltB64)
    }

    AsyncFunction("initWalletSecure") { dataDir: String, password: String ->
      val masterKeyB64 = secureKeyStore.getOrCreateMasterKeyBase64()
      val kdfSaltB64 = secureKeyStore.getOrCreateKdfSaltBase64()
      walletCore.init(dataDir, password, masterKeyB64, kdfSaltB64)
    }

    AsyncFunction("closeWallet") {
      walletCore.close()
    }

    AsyncFunction("createEthereumWallet") { name: String ->
      walletCore.createEthereumWallet(name)
    }

    AsyncFunction("openOrCreateWallet") { name: String ->
      walletCore.openOrCreateWallet(name)
    }

    AsyncFunction("getBalance") { network: String ->
      walletCore.getBalance(network)
    }

    AsyncFunction("getAccountSummary") { network: String ->
      walletCore.getAccountSummary(network)
    }

    AsyncFunction("listAccounts") {
      walletCore.listAccounts()
    }

    AsyncFunction("sendUsdc") { network: String, destination: String, amount: String, note: String, providerID: String ->
      walletCore.sendUsdc(network, destination, amount, note, providerID)
    }

    AsyncFunction("getUsdcTransactions") { network: String, limit: Int, offset: Int ->
      walletCore.listUsdcTransactions(network, limit.toLong(), offset.toLong())
    }

    AsyncFunction("exportBackup") { passphrase: String ->
      walletCore.exportWalletBackup(passphrase)
    }

    AsyncFunction("importBackup") { payload: String, passphrase: String ->
      walletCore.importWalletBackup(payload, passphrase)
    }
  }
}
