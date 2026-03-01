import ExpoModulesCore
import PocketCore

public class PocketModule: Module {
  private let walletCore: CoreWalletCore = CoreNewWalletCore()!

  public func definition() -> ModuleDefinition {
    Name("PocketCore")

    /*
    AsyncFunction("initWallet") { (dataDir: String, password: String, masterKeyB64: String, kdfSaltB64: String) in
      _ = try self.walletCore.init_(dataDir, password: password, masterKeyB64: masterKeyB64, kdfSaltB64: kdfSaltB64)
    }

    AsyncFunction("closeWallet") {
      _ = try self.walletCore.close()
    }

    AsyncFunction("createEthereumWallet") { (name: String) -> String in
      try self.walletCore.createEthereumWallet(name)
    }

    AsyncFunction("getBalance") { (network: String) -> String in
      try self.walletCore.getBalance(network)
    }

    AsyncFunction("listAccounts") { () -> String in
      try self.walletCore.listAccounts()
    }
    */
  }
}
