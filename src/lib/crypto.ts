// Web Crypto API helpers for End-to-End Encryption

export async function generateKeyPair() {
  return window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportPublicKey(key: CryptoKey) {
  return window.crypto.subtle.exportKey("jwk", key);
}

export async function importPublicKey(jwk: JsonWebKey) {
  return window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

// Hybrid Encryption: AES-GCM for data, RSA-OAEP for the AES key
export async function encryptMessage(publicKey: CryptoKey, text: string) {
  // 1. Generate a one-time AES key
  const aesKey = await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt"]
  );

  // 2. Encrypt the message with AES
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    data
  );

  // 3. Export the AES key to encrypt it with RSA
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

  // 4. Encrypt the AES key with the recipient's Public Key (RSA)
  const encryptedKey = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicKey,
    rawAesKey
  );

  // 5. Combine everything into a portable format
  return {
    iv: Array.from(iv),
    key: Array.from(new Uint8Array(encryptedKey)),
    data: Array.from(new Uint8Array(encryptedData)),
  };
}

export async function decryptMessage(privateKey: CryptoKey, payload: { iv: number[], key: number[], data: number[] }) {
  try {
    // 1. Decrypt the AES key using the Private Key (RSA)
    const rawAesKey = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      privateKey,
      new Uint8Array(payload.key)
    );

    // 2. Import the AES key
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      rawAesKey,
      {
        name: "AES-GCM",
      },
      false,
      ["decrypt"]
    );

    // 3. Decrypt the message using the AES key
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(payload.iv),
      },
      aesKey,
      new Uint8Array(payload.data)
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt message");
  }
}
