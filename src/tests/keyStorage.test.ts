import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storeKeyPair, getPublicKey, getPrivateKey, clearKeys } from '../lib/keyStorage';

// Mock idb
vi.mock('idb', () => {
  const mockStore = new Map();
  return {
    openDB: vi.fn().mockResolvedValue({
      put: vi.fn().mockImplementation((storeName, value, key) => {
        mockStore.set(key, value);
        return Promise.resolve(key);
      }),
      get: vi.fn().mockImplementation((storeName, key) => {
        return Promise.resolve(mockStore.get(key));
      }),
      clear: vi.fn().mockImplementation((storeName) => {
        mockStore.clear();
        return Promise.resolve();
      }),
      objectStoreNames: {
        contains: vi.fn().mockReturnValue(true)
      },
      createObjectStore: vi.fn()
    })
  };
});

describe('keyStorage', () => {
  const mockKeyPair = {
    publicKey: 'mock-public-key' as unknown as CryptoKey,
    privateKey: 'mock-private-key' as unknown as CryptoKey
  };

  beforeEach(async () => {
    await clearKeys();
    vi.clearAllMocks();
  });

  it('stores and retrieves keys', async () => {
    await storeKeyPair(mockKeyPair);

    const publicKey = await getPublicKey();
    const privateKey = await getPrivateKey();

    expect(publicKey).toBe(mockKeyPair.publicKey);
    expect(privateKey).toBe(mockKeyPair.privateKey);
  });

  it('clears keys', async () => {
    await storeKeyPair(mockKeyPair);
    await clearKeys();

    const publicKey = await getPublicKey();
    const privateKey = await getPrivateKey();

    expect(publicKey).toBeUndefined();
    expect(privateKey).toBeUndefined();
  });
});
