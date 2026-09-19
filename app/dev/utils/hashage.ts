import crypto from "crypto";

if (!process.env.SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET n'est pas définie dans les variables d'environnement"
  );
}

const SECRET = process.env.SESSION_SECRET;

export function sign(value: string): string {
  const hmac = crypto.createHmac("sha256", SECRET);
  hmac.update(value);
  const signature = hmac.digest("hex");
  return `${value}.${signature}`;
}

export function verify(signed: string): string | null {
  const lastDotIndex = signed.lastIndexOf(".");
  if (lastDotIndex === -1) return null;

  const value = signed.slice(0, lastDotIndex);
  const providedSig = signed.slice(lastDotIndex + 1);

  const hmac = crypto.createHmac("sha256", SECRET);
  hmac.update(value);
  const expectedSig = hmac.digest("hex");

  // Comparaison "timing-safe" : évite qu'un attaquant devine la signature
  // caractère par caractère en mesurant le temps de réponse
  const providedBuffer = Buffer.from(providedSig);
  const expectedBuffer = Buffer.from(expectedSig);

  if (providedBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) return null;

  return value;
}