export type Workout = {
  id: string;
  date: string;
  name: string;
  minutes: number;
  kind: "Strength" | "Run" | "Mobility" | "Other";
};
export type Journal = { workouts: Workout[] };
export type Envelope = {
  version: 1;
  salt: string;
  iv: string;
  ciphertext: string;
};
const encode = (data: Uint8Array) => btoa(String.fromCharCode(...data));
const decode = (data: string) =>
  Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
export async function deriveKey(passphrase: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function seal(
  journal: Journal,
  key: CryptoKey,
  salt: Uint8Array,
): Promise<Envelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(journal)),
  );
  return {
    version: 1,
    salt: encode(salt),
    iv: encode(iv),
    ciphertext: encode(new Uint8Array(ciphertext)),
  };
}
export async function open(envelope: Envelope, passphrase: string) {
  if (envelope.version !== 1) throw new Error("Unsupported vault version");
  const salt = decode(envelope.salt);
  const key = await deriveKey(passphrase, salt);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decode(envelope.iv) },
    key,
    decode(envelope.ciphertext),
  );
  const journal: Journal = JSON.parse(new TextDecoder().decode(plain));
  if (
    !Array.isArray(journal.workouts) ||
    journal.workouts.some(
      (w) =>
        typeof w.id !== "string" ||
        typeof w.name !== "string" ||
        typeof w.date !== "string" ||
        !Number.isFinite(w.minutes) ||
        w.minutes <= 0 ||
        !["Strength", "Run", "Mobility", "Other"].includes(w.kind),
    )
  )
    throw new Error("Invalid vault");
  return { key, salt, journal };
}
