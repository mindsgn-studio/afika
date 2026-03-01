package pocket.module.mindsgn

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.security.SecureRandom
import java.util.Base64

class SecureKeyStoreTest {
  @Test
  fun generateRandomBase64_hasExpectedDecodedLength() {
    val encoded = SecureKeyStore.generateRandomBase64(32, SecureRandom())
    val decoded = Base64.getDecoder().decode(encoded)

    assertEquals(32, decoded.size)
  }

  @Test
  fun bytesToBase64_roundTripsExpectedBytes() {
    val input = byteArrayOf(1, 2, 3, 4, 5)
    val encoded = SecureKeyStore.bytesToBase64(input)
    val decoded = Base64.getDecoder().decode(encoded)

    assertTrue(input.contentEquals(decoded))
  }
}
