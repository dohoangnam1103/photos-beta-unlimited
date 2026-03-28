import express from "express";

const app = express();
app.use(express.json());

const {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHANNEL_ID,
  CALLBACK_SECRET,
  UPLOADTHING_TOKEN,
  PORT = 3001,
} = process.env;

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// In-memory dedup: track photoIds currently being processed
const processingSet = new Set();

// Process image webhook
app.post("/webhook/process-image", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${CALLBACK_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { photoId, uploadthingUrl, uploadthingKey, callbackUrl } = req.body;

  if (!photoId || !uploadthingUrl) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Dedup: skip if already processing this photo
  if (processingSet.has(photoId)) {
    console.log(`[${photoId}] Already processing, skipping duplicate`);
    return res.json({ status: "already_processing" });
  }

  processingSet.add(photoId);

  // Respond immediately, process in background
  res.json({ status: "processing" });

  try {
    console.log(`[${photoId}] Downloading from UploadThing...`);

    // 1. Download image from UploadThing
    const imageRes = await fetch(uploadthingUrl);
    if (!imageRes.ok) throw new Error(`Download failed: ${imageRes.status}`);

    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
    const contentType = imageRes.headers.get("content-type") || "image/jpeg";

    console.log(`[${photoId}] Uploading to Telegram (${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB)...`);

    // 2. Upload to Telegram channel
    const formData = new FormData();
    formData.append("chat_id", TELEGRAM_CHANNEL_ID);
    formData.append(
      "photo",
      new Blob([imageBuffer], { type: contentType }),
      `photo_${photoId}.jpg`
    );

    const tgRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
      { method: "POST", body: formData }
    );

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      // If file is too large for sendPhoto (>10MB), try sendDocument
      if (imageBuffer.length > 10 * 1024 * 1024) {
        console.log(`[${photoId}] Photo too large, trying sendDocument...`);

        const docFormData = new FormData();
        docFormData.append("chat_id", TELEGRAM_CHANNEL_ID);
        docFormData.append(
          "document",
          new Blob([imageBuffer], { type: contentType }),
          `photo_${photoId}.jpg`
        );

        const docRes = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`,
          { method: "POST", body: docFormData }
        );

        const docData = await docRes.json();

        if (!docData.ok) {
          throw new Error(`Telegram error: ${JSON.stringify(docData)}`);
        }

        const fileId = docData.result.document.file_id;

        // 3. Callback to Next.js
        await sendCallback(callbackUrl, photoId, fileId);
      } else {
        throw new Error(`Telegram error: ${JSON.stringify(tgData)}`);
      }
    } else {
      // Get the largest photo size
      const photoSizes = tgData.result.photo;
      const largestPhoto = photoSizes[photoSizes.length - 1];
      const fileId = largestPhoto.file_id;

      console.log(`[${photoId}] Telegram upload success. file_id: ${fileId}`);

      // 3. Callback to Next.js
      await sendCallback(callbackUrl, photoId, fileId);
    }

    // 4. Delete from UploadThing
    if (uploadthingKey && UPLOADTHING_TOKEN) {
      try {
        console.log(`[${photoId}] Deleting from UploadThing...`);

        const deleteRes = await fetch("https://api.uploadthing.com/v6/deleteFiles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-uploadthing-api-key": UPLOADTHING_TOKEN,
          },
          body: JSON.stringify({ fileKeys: [uploadthingKey] }),
        });

        if (deleteRes.ok) {
          console.log(`[${photoId}] UploadThing cleanup done`);
        }
      } catch (err) {
        console.error(`[${photoId}] UploadThing cleanup failed:`, err.message);
      }
    }

    console.log(`[${photoId}] Processing complete ✓`);
  } catch (err) {
    console.error(`[${photoId}] Processing failed:`, err.message);

    // Report failure to callback
    try {
      await fetch(callbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CALLBACK_SECRET}`,
        },
        body: JSON.stringify({ photoId, error: err.message }),
      });
    } catch {}
  } finally {
    processingSet.delete(photoId);
  }
});

async function sendCallback(callbackUrl, photoId, telegramFileId) {
  const res = await fetch(callbackUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CALLBACK_SECRET}`,
    },
    body: JSON.stringify({ photoId, telegramFileId }),
  });

  if (!res.ok) {
    console.error(`[${photoId}] Callback failed: ${res.status}`);
  }
}

app.listen(PORT, () => {
  console.log(`Worker running on port ${PORT}`);
});
