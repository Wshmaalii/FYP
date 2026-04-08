import type { ConversationMessage, MessagingUser } from '../api/messaging';

const DB_NAME = 'tradelink-e2ee';
const STORE_NAME = 'device_keys';
const RSA_ALGORITHM: RsaHashedKeyGenParams = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
};

interface StoredKeyPairRecord {
  userId: string;
  publicJwk: JsonWebKey;
  privateJwk: JsonWebKey;
  createdAt: string;
}

export interface EncryptedConversationPayload {
  ciphertext: string;
  iv: string;
  wrapped_keys: Record<string, string>;
  algorithm: 'AES-GCM';
  key_wrapping: 'RSA-OAEP';
}

function ensureCryptoSupport() {
  if (typeof window === 'undefined' || !window.crypto?.subtle || !window.indexedDB) {
    throw new Error('End-to-end encryption is not supported in this browser.');
  }
}

function arrayBufferToBase64(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(value: string): ArrayBuffer {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function openKeyDatabase(): Promise<IDBDatabase> {
  ensureCryptoSupport();

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error || new Error('Failed to open key store.'));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'userId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(mode: IDBTransactionMode, handler: (store: IDBObjectStore) => Promise<T> | T): Promise<T> {
  const database = await openKeyDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);

    Promise.resolve(handler(store))
      .then((value) => {
        transaction.oncomplete = () => {
          database.close();
          resolve(value);
        };
      })
      .catch((error) => {
        database.close();
        reject(error);
      });

    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('IndexedDB transaction failed.'));
    };
  });
}

function readStoreRecord<T>(store: IDBObjectStore, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onerror = () => reject(request.error || new Error('Failed to read device key.'));
    request.onsuccess = () => resolve((request.result as T | undefined) || null);
  });
}

function writeStoreRecord(store: IDBObjectStore, value: StoredKeyPairRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.put(value);
    request.onerror = () => reject(request.error || new Error('Failed to store device key.'));
    request.onsuccess = () => resolve();
  });
}

async function getStoredKeyPairRecord(userId: string): Promise<StoredKeyPairRecord | null> {
  return withStore('readonly', (store) => readStoreRecord<StoredKeyPairRecord>(store, userId));
}

async function importPrivateKey(privateJwk: JsonWebKey): Promise<CryptoKey> {
  ensureCryptoSupport();
  return window.crypto.subtle.importKey('jwk', privateJwk, RSA_ALGORITHM, true, ['decrypt', 'unwrapKey']);
}

async function importPublicKey(publicJwk: JsonWebKey): Promise<CryptoKey> {
  ensureCryptoSupport();
  return window.crypto.subtle.importKey('jwk', publicJwk, RSA_ALGORITHM, true, ['encrypt', 'wrapKey']);
}

export async function hasStoredDeviceKeyPair(userId: string): Promise<boolean> {
  const record = await getStoredKeyPairRecord(userId);
  return Boolean(record?.privateJwk && record?.publicJwk);
}

export async function getStoredPublicKeyJwk(userId: string): Promise<JsonWebKey | null> {
  const record = await getStoredKeyPairRecord(userId);
  return record?.publicJwk || null;
}

export async function generateAndStoreDeviceKeyPair(userId: string): Promise<JsonWebKey> {
  ensureCryptoSupport();
  const keyPair = await window.crypto.subtle.generateKey(RSA_ALGORITHM, true, ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']);
  const [publicJwk, privateJwk] = await Promise.all([
    window.crypto.subtle.exportKey('jwk', keyPair.publicKey),
    window.crypto.subtle.exportKey('jwk', keyPair.privateKey),
  ]);

  await withStore('readwrite', (store) => writeStoreRecord(store, {
    userId,
    publicJwk,
    privateJwk,
    createdAt: new Date().toISOString(),
  }));

  return publicJwk;
}

async function getPrivateKey(userId: string): Promise<CryptoKey> {
  const record = await getStoredKeyPairRecord(userId);
  if (!record?.privateJwk) {
    throw new Error('This device does not have the private encryption key for this account.');
  }
  return importPrivateKey(record.privateJwk);
}

export async function encryptMessageForMembers(
  plaintext: string,
  members: Array<Pick<MessagingUser, 'user_id'> & { e2ee_public_key?: JsonWebKey | null }>,
): Promise<EncryptedConversationPayload> {
  ensureCryptoSupport();
  const text = (plaintext || '').trim();
  if (!text) {
    throw new Error('Message content is required.');
  }

  const uniqueMembers = members.filter(
    (member, index, current) => current.findIndex((entry) => entry.user_id === member.user_id) === index,
  );
  if (uniqueMembers.length === 0) {
    throw new Error('No recipients are available for encrypted delivery.');
  }

  for (const member of uniqueMembers) {
    if (!member.e2ee_public_key) {
      throw new Error('One or more conversation members have not enabled encryption on this device yet.');
    }
  }

  const symmetricKey = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    symmetricKey,
    new TextEncoder().encode(text),
  );

  const wrapped_keys: Record<string, string> = {};
  for (const member of uniqueMembers) {
    const publicKey = await importPublicKey(member.e2ee_public_key as JsonWebKey);
    const wrappedKey = await window.crypto.subtle.wrapKey('raw', symmetricKey, publicKey, { name: 'RSA-OAEP' });
    wrapped_keys[member.user_id] = arrayBufferToBase64(wrappedKey);
  }

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer),
    wrapped_keys,
    algorithm: 'AES-GCM',
    key_wrapping: 'RSA-OAEP',
  };
}

export async function decryptConversationMessage(
  message: Pick<ConversationMessage, 'content' | 'is_encrypted' | 'encrypted_payload'>,
  currentUserId: string,
): Promise<string> {
  if (!message.is_encrypted || !message.encrypted_payload) {
    return message.content;
  }

  const privateKey = await getPrivateKey(currentUserId);
  const wrappedKey = message.encrypted_payload.wrapped_keys?.[currentUserId];
  if (!wrappedKey) {
    throw new Error('This encrypted message was not shared with the current device.');
  }

  const symmetricKey = await window.crypto.subtle.unwrapKey(
    'raw',
    base64ToArrayBuffer(wrappedKey),
    privateKey,
    { name: 'RSA-OAEP' },
    { name: 'AES-GCM', length: 256 },
    true,
    ['decrypt'],
  );

  const plaintext = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(base64ToArrayBuffer(message.encrypted_payload.iv)) },
    symmetricKey,
    base64ToArrayBuffer(message.encrypted_payload.ciphertext),
  );

  return new TextDecoder().decode(plaintext);
}
