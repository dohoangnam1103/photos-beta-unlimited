import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const MAX_CHECK_ITEMS = 500;

const checkDuplicatesSchema = z.object({
  items: z
    .array(
      z.object({
        hash: z.string().max(128),
        filename: z.string().max(500),
      })
    )
    .min(1)
    .max(MAX_CHECK_ITEMS),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await rateLimit(session.user.id, "standard");
  if (limited) return limited;

  const body = await req.json();
  const parsed = checkDuplicatesSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const items = parsed.data.items;
  const hashes = items.map((i) => i.hash);
  const filenames = items.map((i) => i.filename);

  const existing = await db
    .select({ fileHash: photos.fileHash, originalFilename: photos.originalFilename })
    .from(photos)
    .where(
      and(
        eq(photos.userId, session.user.id),
        or(
          inArray(photos.fileHash, hashes),
          inArray(photos.originalFilename, filenames)
        )
      )
    );

  const duplicateHashes = new Set(existing.map((e) => e.fileHash));
  const duplicateFilenames = new Set(existing.map((e) => e.originalFilename));

  const duplicates = items
    .filter(
      (item) =>
        duplicateHashes.has(item.hash) || duplicateFilenames.has(item.filename)
    )
    .map((item) => ({
      hash: item.hash,
      filename: item.filename,
      reason: duplicateHashes.has(item.hash) ? "hash" : "filename",
    }));

  return NextResponse.json({ duplicates });
}
