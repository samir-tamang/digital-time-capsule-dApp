// Generate a fresh AES-256 key for each capsule
export async function generateKey(): Promise<{ key: CryptoKey; keyHex: string }> {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true, // exportable
    ["encrypt", "decrypt"]
  );

  // Convert key to hex string for safe storage/sharing
  const raw = await crypto.subtle.exportKey("raw", key);
  const hex = Array.from(new Uint8Array(raw))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  return { key, keyHex: hex };
}

export async function encryptContent(text: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(text)
  );

  // Combine IV + encrypted data into one blob
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Convert to base64 for easy storage
  return btoa(String.fromCharCode(...combined));
}

export async function decryptContent(base64: string, key: CryptoKey): Promise<string> {
  // Decode base64 back to bytes
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const iv = bytes.slice(0, 12);
  const data = bytes.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  return new TextDecoder().decode(decrypted);
}

// Convert hex string back to CryptoKey (used during decryption)
export async function importKey(hex: string): Promise<CryptoKey> {
  const raw = new Uint8Array(
    hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16))
  );
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
}