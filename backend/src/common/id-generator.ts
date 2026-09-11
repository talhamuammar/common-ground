import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Generates a cryptographically secure random 8 or 9-digit numeric ID.
 * Fits within standard 32-bit signed PostgreSQL INTEGER (up to 2,147,483,647).
 * - 8 digits: 10,000,000 to 99,999,999 (90 million possible IDs)
 * - 9 digits: 100,000,000 to 999,999,999 (900 million possible IDs)
 */
export function generateRandomNumericId(digits: 8 | 9 = 8): number {
  if (digits === 8) {
    return crypto.randomInt(10_000_000, 100_000_000);
  }
  return crypto.randomInt(100_000_000, 1_000_000_000);
}

/**
 * Generates an 8-digit unique ID for a new Post, ensuring no collisions.
 */
export async function generateUniquePostId(prisma: PrismaService): Promise<number> {
  // Primary attempt: 8 digits
  for (let attempt = 0; attempt < 15; attempt++) {
    const candidate = generateRandomNumericId(8);
    const existing = await prisma.post.findUnique({
      where: { id: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
  }

  // Fallback: 9 digits if 8-digit space collides
  for (let attempt = 0; attempt < 15; attempt++) {
    const candidate = generateRandomNumericId(9);
    const existing = await prisma.post.findUnique({
      where: { id: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
  }

  throw new Error('Could not generate a unique post ID. Please try again.');
}

/**
 * Generates an 8-digit unique ID for a new User/Account, ensuring no collisions.
 */
export async function generateUniqueUserId(prisma: PrismaService): Promise<number> {
  // Primary attempt: 8 digits
  for (let attempt = 0; attempt < 15; attempt++) {
    const candidate = generateRandomNumericId(8);
    const existing = await prisma.user.findUnique({
      where: { id: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
  }

  // Fallback: 9 digits if 8-digit space collides
  for (let attempt = 0; attempt < 15; attempt++) {
    const candidate = generateRandomNumericId(9);
    const existing = await prisma.user.findUnique({
      where: { id: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
  }

  throw new Error('Could not generate a unique user ID. Please try again.');
}
