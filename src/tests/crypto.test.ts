import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPair, encryptMessage, decryptMessage, exportPublicKey, importPublicKey } from '../lib/crypto';

describe('End-to-End Encryption Module', () => {
  let keyPair: CryptoKeyPair;

  beforeAll(async () => {
    keyPair = await generateKeyPair();
  });

  it('should generate a valid RSA-OAEP key pair', () => {
    expect(keyPair).toBeDefined();
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();
    expect(keyPair.publicKey.algorithm.name).toBe('RSA-OAEP');
  });

  it('should export and import public keys correctly', async () => {
    const jwk = await exportPublicKey(keyPair.publicKey);
    expect(jwk.kty).toBe('RSA');
    expect(jwk.n).toBeDefined();

    const importedKey = await importPublicKey(jwk);
    expect(importedKey.algorithm.name).toBe('RSA-OAEP');
  });

  it('should encrypt and decrypt a message correctly', async () => {
    const message = "Hello, this is a secret message! 🤫";

    const encryptedPayload = await encryptMessage(keyPair.publicKey, message);

    expect(encryptedPayload).toBeDefined();
    expect(encryptedPayload.iv).toBeDefined();
    expect(encryptedPayload.key).toBeDefined();
    expect(encryptedPayload.data).toBeDefined();

    expect(JSON.stringify(encryptedPayload.data)).not.toContain("Hello");

    const decryptedMessage = await decryptMessage(keyPair.privateKey, encryptedPayload);
    expect(decryptedMessage).toBe(message);
  });

  it('should fail to decrypt with a wrong key', async () => {
    const otherKeyPair = await generateKeyPair();
    const message = "Secret";
    const encryptedPayload = await encryptMessage(keyPair.publicKey, message);

    await expect(decryptMessage(otherKeyPair.privateKey, encryptedPayload))
      .rejects
      .toThrow();
  });
});
