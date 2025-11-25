import { describe, it, expect, beforeAll } from 'vitest';
// Mock Web Crypto API for Node.js environment if needed, but vitest might run in jsdom
// Since we are running in a container, we might need to ensure crypto is available.
// We will assume JSDOM or Node 19+ crypto global.

import { generateKeyPair, encryptMessage, decryptMessage, exportPublicKey, importPublicKey } from '../lib/crypto';

// Polyfill for TextEncoder/TextDecoder if missing (Node < 11)
if (typeof TextEncoder === 'undefined') {
  import('util').then(({ TextEncoder, TextDecoder }) => {
    global.TextEncoder = TextEncoder;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.TextDecoder = TextDecoder as any;
  });
}

// Web Crypto API Polyfill for Node.js (if not globally available)
// Note: In typical modern Node (v19+), crypto is global. If it fails, we might need 'crypto' module.
import { webcrypto } from 'node:crypto';
if (!global.window) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  global.window = {} as any;
}
if (!global.window.crypto) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  global.window.crypto = webcrypto as any;
}

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

    // Verify it's not just plaintext
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
