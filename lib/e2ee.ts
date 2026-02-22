"use client";

import { createClient } from "@/lib/supabase";
import {
  generateIdentityKeyPair,
  exportPublicKeyBase64,
  exportPrivateKeyBase64,
  importPrivateKeyBase64,
  importPublicKeyBase64,
  deriveSharedAesKey,
  encrypt as cryptoEncrypt,
  decrypt as cryptoDecrypt,
  generateKeyId,
  type EncryptedPayload,
} from "./crypto";

const STORAGE_KEY_PRIVATE = "chat-app-e2ee-private-key";
const STORAGE_KEY_KEY_ID = "chat-app-e2ee-key-id";

/**
 * Get or create this user's identity key pair.
 * Public key is upserted to user_identity_keys; private key is stored in localStorage.
 * Call once after login (e.g. in a provider or chat layout).
 */
export async function ensureIdentityKey(userId: string): Promise<{
  publicKeyBase64: string;
  keyId: string;
}> {
  const storedPrivate = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_PRIVATE) : null;
  const storedKeyId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_KEY_ID) : null;

  let privateKey: CryptoKey;
  let publicKeyBase64: string;
  let keyId: string;

  if (storedPrivate && storedKeyId) {
    privateKey = await importPrivateKeyBase64(storedPrivate);
    const raw = await crypto.subtle.exportKey("raw", await getPublicFromPrivate(privateKey));
    publicKeyBase64 = b64Encode(new Uint8Array(raw));
    keyId = storedKeyId;
  } else {
    const pair = await generateIdentityKeyPair();
    if (!pair.privateKey || !pair.publicKey) throw new Error("Failed to generate identity key pair");
    privateKey = pair.privateKey;
    publicKeyBase64 = await exportPublicKeyBase64(pair.publicKey);
    keyId = generateKeyId();
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_PRIVATE, await exportPrivateKeyBase64(privateKey));
      localStorage.setItem(STORAGE_KEY_KEY_ID, keyId);
    }
  }

  const supabase = createClient();
  await supabase.from("user_identity_keys").upsert(
    { user_id: userId, public_key: publicKeyBase64, key_id: keyId },
    { onConflict: "user_id" }
  );

  return { publicKeyBase64, keyId };
}

async function getPublicFromPrivate(privateKey: CryptoKey): Promise<CryptoKey> {
  const jwk = await crypto.subtle.exportKey("jwk", privateKey) as JsonWebKey & { d?: string };
  if (!jwk.x) throw new Error("Invalid key");
  const { d: _d, ...publicJwk } = jwk;
  const pub = { ...publicJwk, key_ops: [] as string[] };
  return crypto.subtle.importKey("jwk", pub, { name: "ECDH", namedCurve: "X25519" }, false, []);
}

function b64Encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Fetch a user's public key from the server. Returns null if they have not set up E2EE.
 */
export async function getRecipientPublicKey(recipientUserId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("user_identity_keys")
    .select("public_key")
    .eq("user_id", recipientUserId)
    .single();
  return data?.public_key ?? null;
}

/**
 * Encrypt a message for a recipient. Use their user_id to fetch their public key.
 * Returns payload to store in messages.ciphertext and messages.iv (with messages.encrypted = true).
 */
export async function encryptMessage(
  plaintext: string,
  myUserId: string,
  recipientUserId: string
): Promise<EncryptedPayload | null> {
  const recipientPublicKeyB64 = await getRecipientPublicKey(recipientUserId);
  if (!recipientPublicKeyB64) return null;

  const storedPrivate = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_PRIVATE) : null;
  if (!storedPrivate) return null;

  const myPrivateKey = await importPrivateKeyBase64(storedPrivate);
  const theirPublicKey = await importPublicKeyBase64(recipientPublicKeyB64);
  const sharedKey = await deriveSharedAesKey(myPrivateKey, theirPublicKey);
  return cryptoEncrypt(plaintext, sharedKey);
}

/**
 * Decrypt a message from a sender. Use sender_id to fetch their public key.
 */
export async function decryptMessage(
  ciphertext: string,
  iv: string,
  myUserId: string,
  senderUserId: string
): Promise<string | null> {
  const senderPublicKeyB64 = await getRecipientPublicKey(senderUserId);
  if (!senderPublicKeyB64) return null;

  const storedPrivate = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_PRIVATE) : null;
  if (!storedPrivate) return null;

  const myPrivateKey = await importPrivateKeyBase64(storedPrivate);
  const senderPublicKey = await importPublicKeyBase64(senderPublicKeyB64);
  const sharedKey = await deriveSharedAesKey(myPrivateKey, senderPublicKey);
  try {
    return await cryptoDecrypt(ciphertext, iv, sharedKey);
  } catch {
    return null;
  }
}

/**
 * Check if the current client has an identity key (E2EE set up).
 */
export function hasIdentityKey(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(STORAGE_KEY_PRIVATE);
}
