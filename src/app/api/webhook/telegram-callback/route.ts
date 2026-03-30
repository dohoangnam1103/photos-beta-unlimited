import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");

  if (secret !== process.env.WORKER_CALLBACK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit by IP for webhook (internal service)
  const ip = getClientIp(req);
  const limited = await rateLimit(`webhook:${ip}`, "webhook");
  if (limited) return limited;

  const body = await req.json();
  const { photoId, telegramFileId, error } = body;

  if (!photoId || typeof photoId !== "string") {
    return NextResponse.json(
      { error: "photoId required" },
      { status: 400 }
    );
  }

  if (error) {
    await db
      .update(photos)
      .set({ status: "failed" })
      .where(eq(photos.id, photoId));

    return NextResponse.json({ status: "failed" });
  }

  if (!telegramFileId || typeof telegramFileId !== "string") {
    return NextResponse.json(
      { error: "telegramFileId required on success" },
      { status: 400 }
    );
  }

  await db
    .update(photos)
    .set({
      telegramFileId,
      status: "ready",
    })
    .where(eq(photos.id, photoId));

  return NextResponse.json({ status: "ok" });
}
