import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { photos, albumPhotos } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if the photo exists and belongs to the user
    const [photo] = await db
      .select({ id: photos.id })
      .from(photos)
      .where(and(eq(photos.id, id), eq(photos.userId, session.user.id)))
      .limit(1);

    if (!photo) {
      return NextResponse.json(
        { error: "Photo not found or unauthorized" },
        { status: 404 }
      );
    }

    // Delete photo from database. Cascade rules should handle albumPhotos.
    await db.delete(photos).where(eq(photos.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    );
  }
}
