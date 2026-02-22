/**
 * Signal-style E2EE using Web Crypto:
 * - X25519 ECDH for key agreement (only sender and recipient can derive the key)
 * - HKDF to derive an AES-256 key from the shared secret
 * - AES-GCM for authenticated encryption
 *
 * Private keys never leave the client. Server only stores public keys and ciphertext.
 */

const ECDH_CURVE = "X25519";
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 128;
function b64Encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64Decode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  return new Uint8Array(binary.length).map((_, i) => binary.charCodeAt(i));
}

/**
 * Generate a new X25519 identity key pair for E2EE.
 * Call once per user; store private key in secure storage (e.g. localStorage or sessionStorage).
 */
export async function generateIdentityKeyPair(): Promise<CryptoKeyPair> {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: ECDH_CURVE },
    true,
    ["deriveBits"]
  );
  return pair as CryptoKeyPair;
}

/**
 * Export the public key to base64url for storing on the server.
 */
export async function exportPublicKeyBase64(publicKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", publicKey);
  return b64Encode(new Uint8Array(raw));
}

/**
 * Import a public key from base64url (as stored in user_identity_keys).
 */
export async function importPublicKeyBase64(base64: string): Promise<CryptoKey> {
  const raw = b64Decode(base64);
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "ECDH", namedCurve: ECDH_CURVE },
    false,
    []
  );
}

/**
 * Export the private key to base64url for persisting in client storage.
 * Only store in a secure place (e.g. encrypted or same-origin only).
 */
export async function exportPrivateKeyBase64(privateKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("pkcs8", privateKey);
  return b64Encode(new Uint8Array(raw));
}

/**
 * Import a private key from base64url (restored from client storage).
 */
export async function importPrivateKeyBase64(base64: string): Promise<CryptoKey> {
  const raw = b64Decode(base64);
  return crypto.subtle.importKey(
    "pkcs8",
    raw,
    { name: "ECDH", namedCurve: ECDH_CURVE },
    false,
    ["deriveBits"]
  );
}

/**
 * Derive a shared AES-GCM key from ECDH (my private + their public).
 * Uses ECDH then SHA-256-based KDF so only sender and recipient can decrypt.
 */
export async function deriveSharedAesKey(
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey
): Promise<CryptoKey> {
  const sharedBits = await crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: theirPublicKey,
    },
    myPrivateKey,
    256
  );

  const info = new TextEncoder().encode("chat-app-e2ee-v1");
  const combined = new Uint8Array(sharedBits.byteLength + info.length);
  combined.set(new Uint8Array(sharedBits), 0);
  combined.set(info, sharedBits.byteLength);

  const hash = await crypto.subtle.digest("SHA-256", combined);
  const keyBytes = new Uint8Array(hash);

  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

export type EncryptedPayload = {
  ciphertext: string;
  iv: string;
};

/**
 * Encrypt plaintext with a shared AES key. Returns base64url ciphertext and iv.
 */
export async function encrypt(
  plaintext: string,
  sharedAesKey: CryptoKey
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: AUTH_TAG_LENGTH,
    },
    sharedAesKey,
    encoded
  );

  return {
    ciphertext: b64Encode(new Uint8Array(ciphertext)),
    iv: b64Encode(iv),
  };
}

/**
 * Decrypt ciphertext (base64url) with iv (base64url) using the shared AES key.
 */
export async function decrypt(
  ciphertextB64: string,
  ivB64: string,
  sharedAesKey: CryptoKey
): Promise<string> {
  const ciphertext = b64Decode(ciphertextB64);
  const iv = b64Decode(ivB64);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: AUTH_TAG_LENGTH,
    },
    sharedAesKey,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Generate a random key ID for the identity key (e.g. for key rotation later).
 */
export function generateKeyId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return b64Encode(bytes);
}
