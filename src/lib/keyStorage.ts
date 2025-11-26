import { openDB } from 'idb';

const DB_NAME = 'secure-chat-db';
const STORE_NAME = 'key-store';

export async function initKeyStore() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function storeKeyPair(keyPair: CryptoKeyPair) {
  const db = await initKeyStore();
  await db.put(STORE_NAME, keyPair.publicKey, 'publicKey');
  await db.put(STORE_NAME, keyPair.privateKey, 'privateKey');
}

export async function getPublicKey(): Promise<CryptoKey | undefined> {
  const db = await initKeyStore();
  return db.get(STORE_NAME, 'publicKey');
}

export async function getPrivateKey(): Promise<CryptoKey | undefined> {
  const db = await initKeyStore();
  return db.get(STORE_NAME, 'privateKey');
}

export async function clearKeys() {
  const db = await initKeyStore();
  await db.clear(STORE_NAME);
}
