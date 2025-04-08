import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"


/**
 * Génère un sel aléatoire pour le hachage
 * @returns {Promise<string>} Sel en hexadécimal
 */
async function generateSalt(): Promise<string> {
  const saltArray = new Uint8Array(16); // 16 octets pour le sel
  globalThis.crypto.getRandomValues(saltArray);
  return Buffer.from(saltArray).toString("hex");
}

/**
 * Hache un mot de passe avec PBKDF2 et un sel aléatoire (Web Crypto API)
 * @param {string} password - Mot de passe en clair
 * @returns {Promise<string>} Hash au format "hash:salt"
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await generateSalt();
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(salt);

  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 10000,
      hash: "SHA-256",
    },
    await globalThis.crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      { name: "PBKDF2" },
      false, // non extractable
      ["deriveBits"]
    ),
    256 // Longueur en bits (32 octets)
  );

  const hash = Buffer.from(derivedBits).toString("hex");
  return `${hash}:${salt}`;
}

/**
 * Compare un mot de passe en clair avec un mot de passe hashé
 * @param {string} password - Mot de passe en clair
 * @param {string} hashedPassword - Hash au format "hash:salt"
 * @returns {Promise<boolean>} True si correspondance, false sinon
 * @throws {Error} Si format invalide
 */
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  const [storedHash, salt] = hashedPassword.split(":");
  if (!storedHash || !salt) {
    throw new Error("Invalid hashed password format");
  }

  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(salt);

  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 10000,
      hash: "SHA-256",
    },
    await globalThis.crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    ),
    256 // Longueur en bits (32 octets)
  );

  const hash = Buffer.from(derivedBits).toString("hex");
  return hash === storedHash;
}
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
