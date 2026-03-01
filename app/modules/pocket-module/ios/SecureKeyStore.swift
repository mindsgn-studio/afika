import Foundation
import Security

enum SecureKeyStoreError: LocalizedError {
  case randomGenerationFailed(OSStatus)
  case keychainReadFailed(OSStatus)
  case keychainWriteFailed(OSStatus)
  case unexpectedKeychainData

  var errorDescription: String? {
    switch self {
    case .randomGenerationFailed(let status):
      return "Failed to generate secure random bytes (OSStatus: \(status))"
    case .keychainReadFailed(let status):
      return "Failed to read Keychain item (OSStatus: \(status))"
    case .keychainWriteFailed(let status):
      return "Failed to write Keychain item (OSStatus: \(status))"
    case .unexpectedKeychainData:
      return "Unexpected Keychain data format"
    }
  }
}

final class SecureKeyStore {
  private let service = "pocket.module.mindsgn.wallet"
  private let masterKeyAccount = "master-key-b64"
  private let kdfSaltAccount = "kdf-salt-b64"

  func getOrCreateMasterKeyBase64() throws -> String {
    try getOrCreateBase64(account: masterKeyAccount, byteCount: 32)
  }

  func getOrCreateKdfSaltBase64() throws -> String {
    try getOrCreateBase64(account: kdfSaltAccount, byteCount: 16)
  }

  private func getOrCreateBase64(account: String, byteCount: Int) throws -> String {
    if let existing = try readKeychain(account: account) {
      return existing.base64EncodedString()
    }

    let generated = try generateRandom(byteCount: byteCount)
    try writeKeychain(account: account, data: generated)
    return generated.base64EncodedString()
  }

  private func generateRandom(byteCount: Int) throws -> Data {
    var bytes = [UInt8](repeating: 0, count: byteCount)
    let status = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
    guard status == errSecSuccess else {
      throw SecureKeyStoreError.randomGenerationFailed(status)
    }
    return Data(bytes)
  }

  private func readKeychain(account: String) throws -> Data? {
    let query: [CFString: Any] = [
      kSecClass: kSecClassGenericPassword,
      kSecAttrService: service,
      kSecAttrAccount: account,
      kSecReturnData: true,
      kSecMatchLimit: kSecMatchLimitOne
    ]

    var result: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &result)

    if status == errSecItemNotFound {
      return nil
    }

    guard status == errSecSuccess else {
      throw SecureKeyStoreError.keychainReadFailed(status)
    }

    guard let data = result as? Data else {
      throw SecureKeyStoreError.unexpectedKeychainData
    }

    return data
  }

  private func writeKeychain(account: String, data: Data) throws {
    let query: [CFString: Any] = [
      kSecClass: kSecClassGenericPassword,
      kSecAttrService: service,
      kSecAttrAccount: account,
      kSecAttrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
      kSecValueData: data
    ]

    let status = SecItemAdd(query as CFDictionary, nil)
    if status == errSecSuccess {
      return
    }

    if status == errSecDuplicateItem {
      let updateQuery: [CFString: Any] = [
        kSecClass: kSecClassGenericPassword,
        kSecAttrService: service,
        kSecAttrAccount: account
      ]
      let updateAttributes: [CFString: Any] = [
        kSecValueData: data,
        kSecAttrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
      ]

      let updateStatus = SecItemUpdate(updateQuery as CFDictionary, updateAttributes as CFDictionary)
      guard updateStatus == errSecSuccess else {
        throw SecureKeyStoreError.keychainWriteFailed(updateStatus)
      }
      return
    }

    throw SecureKeyStoreError.keychainWriteFailed(status)
  }
}