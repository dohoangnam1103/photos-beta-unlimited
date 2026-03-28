import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/auth";
import { MAX_UPLOAD_FILES, MAX_FILE_SIZE_MB } from "@/lib/constants";

const f = createUploadthing();

export const ourFileRouter = {
  photoUploader: f({
    image: {
      maxFileSize: `${MAX_FILE_SIZE_MB}MB`,
      maxFileCount: MAX_UPLOAD_FILES,
    },
  })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user?.id) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl, key: file.key };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
