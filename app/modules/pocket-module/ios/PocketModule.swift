import ExpoModulesCore
import PocketCore

public class PocketModule: Module {
  private let walletCore: CoreWalletCore = {
    guard let core = CoreNewWalletCore() else {
      preconditionFailure("Failed to initialize CoreWalletCore")
    }
    return core
  }()

  private let secureKeyStore = SecureKeyStore()

  public func definition() -> ModuleDefinition {
    Name("PocketCore")

    AsyncFunction("initWallet") { (dataDir: String, password: String, masterKeyB64: String, kdfSaltB64: String) in
      _ = try self.walletCore.init_(dataDir, password: password, masterKeyB64: masterKeyB64, kdfSaltB64: kdfSaltB64)
    }

    AsyncFunction("initWalletSecure") { (dataDir: String, password: String) in
      let masterKeyB64 = try self.secureKeyStore.getOrCreateMasterKeyBase64()
      let kdfSaltB64 = try self.secureKeyStore.getOrCreateKdfSaltBase64()
      _ = try self.walletCore.init_(dataDir, password: password, masterKeyB64: masterKeyB64, kdfSaltB64: kdfSaltB64)
    }

    AsyncFunction("closeWallet") {
      _ = try self.walletCore.close()
    }

    AsyncFunction("createEthereumWallet") { (name: String) throws -> String in
      var nsError: NSError?
      let value = self.walletCore.createEthereumWallet(name, error: &nsError)
      if let error = nsError { throw error }
      return value
    }

    AsyncFunction("openOrCreateWallet") { (name: String) throws -> String in
      var nsError: NSError?
      let value = self.walletCore.openOrCreateWallet(name, error: &nsError)
      if let error = nsError { throw error }
      return value
    }

    AsyncFunction("getBalance") { (network: String) throws -> String in
      var nsError: NSError?
      let value = self.walletCore.getBalance(network, error: &nsError)
      if let error = nsError { throw error }
      return value
    }

    AsyncFunction("getAccountSummary") { (network: String) throws -> String in
      var nsError: NSError?
      let value = self.walletCore.getAccountSummary(network, error: &nsError)
      if let error = nsError { throw error }
      return value
    }

    AsyncFunction("listAccounts") { () throws -> String in
      var nsError: NSError?
      let value = self.walletCore.listAccounts(&nsError)
      if let error = nsError { throw error }
      return value
    }

    AsyncFunction("sendUsdc") { (network: String, destination: String, amount: String, note: String, providerID: String) throws -> String in
      var nsError: NSError?
      let value = self.walletCore.sendUsdc(network, destination: destination, amount: amount, note: note, providerID: providerID, error: &nsError)
      if let error = nsError { throw error }
      return value
    }

   AsyncFunction("getUsdcTransactions") { (network: String, limit: Int, offset: Int) throws -> String in
      var nsError: NSError?
      let value = self.walletCore.listUsdcTransactions(network, limit: limit, offset: offset, error: &nsError)
      if let error = nsError { throw error }
      return value
    }

    AsyncFunction("exportBackup") { (passphrase: String) throws -> String in
      var nsError: NSError?
      let value = self.walletCore.exportWalletBackup(passphrase, error: &nsError)
      if let error = nsError { throw error }
      return value
    }

    AsyncFunction("importBackup") { (payload: String, passphrase: String) throws -> String in
      var nsError: NSError?
      let value = self.walletCore.importWalletBackup(payload, passphrase: passphrase, error: &nsError)
      if let error = nsError { throw error }
      return value
    }
  }
}
