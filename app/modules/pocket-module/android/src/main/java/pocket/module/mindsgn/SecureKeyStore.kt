package pocket.module.mindsgn

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.security.SecureRandom
import java.util.Base64

class SecureKeyStore(context: Context) {
  private val prefsName = "pocket_wallet_secure_store"
  private val masterKeyName = "master_key_b64"
  private val kdfSaltName = "kdf_salt_b64"

  private val sharedPreferences = try {
    val masterKey = MasterKey.Builder(context)
      .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
      .build()

    EncryptedSharedPreferences.create(
      context,
      prefsName,
      masterKey,
      EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
      EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
  } catch (error: Exception) {
    throw IllegalStateException("Failed to initialize Android secure storage", error)
  }

  fun getOrCreateMasterKeyBase64(): String {
    return getOrCreateBase64(masterKeyName, 32)
  }

  fun getOrCreateKdfSaltBase64(): String {
    return getOrCreateBase64(kdfSaltName, 16)
  }

  private fun getOrCreateBase64(key: String, byteCount: Int): String {
    val existing = sharedPreferences.getString(key, null)
    if (!existing.isNullOrBlank()) {
      return existing
    }

    val generated = generateRandomBase64(byteCount)
    val stored = sharedPreferences.edit().putString(key, generated).commit()
    if (!stored) {
      throw IllegalStateException("Failed to persist secure value for key: $key")
    }
    return generated
  }

  companion object {
    internal fun bytesToBase64(bytes: ByteArray): String {
      return Base64.getEncoder().encodeToString(bytes)
    }

    internal fun generateRandomBase64(byteCount: Int, secureRandom: SecureRandom = SecureRandom()): String {
      val bytes = ByteArray(byteCount)
      secureRandom.nextBytes(bytes)
      return bytesToBase64(bytes)
    }
  }
}