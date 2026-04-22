const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
const PINATA_API = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

if (!PINATA_JWT) {
  console.warn("⚠️ NEXT_PUBLIC_PINATA_JWT not found in .env.local");
}

export async function uploadToIPFS(
  encryptedBase64: string,
  filename: string
): Promise<string> {
  if (!PINATA_JWT) throw new Error("Pinata JWT missing. Check .env.local");

  // Convert base64 -> Blob for FormData upload
  const binary = atob(encryptedBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/octet-stream" });

  const formData = new FormData();
  formData.append("file", blob, filename);

  const res = await fetch(PINATA_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`IPFS Upload Failed: ${err.error || res.statusText}`);
  }

  const data = await res.json();
  return data.IpfsHash;
}
export async function getFromIPFS(cid: string): Promise<string> {
  const res = await fetch(`${PINATA_GATEWAY}/${cid}`);
  if (!res.ok) throw new Error(`IPFS Fetch Failed: ${res.statusText}`);

  // Read as ArrayBuffer -> convert to base64
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}