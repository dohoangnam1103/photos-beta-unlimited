import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = await rateLimit(session.user.id, "standard");
    if (limited) return limited;

    const { id } = await params;

    // Check if the photo exists, belongs to the user, and is not already deleted
    const [photo] = await db
      .select({ id: photos.id })
      .from(photos)
      .where(and(eq(photos.id, id), eq(photos.userId, session.user.id), isNull(photos.deletedAt)))
      .limit(1);

    if (!photo) {
      return NextResponse.json(
        { error: "Photo not found or unauthorized" },
        { status: 404 }
      );
    }

    // Soft delete: set deletedAt timestamp
    await db.update(photos).set({ deletedAt: new Date() }).where(eq(photos.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    );
  }
}
