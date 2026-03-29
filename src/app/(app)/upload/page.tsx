"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUploadThing } from "@/lib/uploadthing-client";
import { hashFile } from "@/lib/utils";
import { MAX_UPLOAD_FILES, ACCEPTED_IMAGE_TYPES } from "@/lib/constants";
import { XIcon, SpinnerIcon } from "@/components/ui/Icons";
import styles from "@/styles/upload.module.scss";
import exifr from "exifr";

interface FileWithMeta {
  file: File;
  preview: string;
  hash: string;
  isDuplicate: boolean;
  duplicateReason?: string;
  takenAt?: string;
  uploading: boolean;
  progress: number;
}

export default function UploadPage() {
  const [files, setFiles] = useState<FileWithMeta[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const autoUploadRef = useRef(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const { startUpload } = useUploadThing("photoUploader");

  // Tạo thumbnail nhỏ (max 200px) bằng canvas để tiết kiệm RAM cho iOS
  const createThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 200;
        let w = img.width;
        let h = img.height;
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url); // Giải phóng file gốc khỏi RAM ngay
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(""); // fallback
      };
      img.src = url;
    });
  };

  const processFiles = useCallback(async (rawFiles: File[]) => {
    setStatus(null);

    // Filter valid types
    const validFiles = rawFiles.filter((f) => {
      const type = f.type.toLowerCase();
      return (
        ACCEPTED_IMAGE_TYPES.includes(type) ||
        f.name.toLowerCase().endsWith(".heic") ||
        f.name.toLowerCase().endsWith(".heif")
      );
    });

    if (validFiles.length === 0) {
      setStatus({ type: "error", msg: "Không có file ảnh hợp lệ" });
      return;
    }

    const totalAfterAdd = files.length + validFiles.length;
    if (totalAfterAdd > MAX_UPLOAD_FILES) {
      setStatus({ type: "error", msg: `Tối đa ${MAX_UPLOAD_FILES} ảnh mỗi lần upload` });
      return;
    }

    // Process each file: hash + EXIF
    const processed: FileWithMeta[] = [];

    for (const file of validFiles) {
      let processedFile = file;

      // Convert HEIC to JPEG on client
      if (
        file.type.toLowerCase().includes("heic") ||
        file.name.toLowerCase().endsWith(".heic") ||
        file.name.toLowerCase().endsWith(".heif")
      ) {
        try {
          const heic2any = (await import("heic2any")).default;
          const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
          const convertedBlob = Array.isArray(blob) ? blob[0] : blob;
          processedFile = new File(
            [convertedBlob],
            file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg"),
            { type: "image/jpeg" }
          );
        } catch {
          console.warn("HEIC conversion failed for", file.name);
          continue;
        }
      }

      const hash = await hashFile(processedFile);
      let takenAt: string | undefined;

      try {
        const exifData = await exifr.parse(processedFile, { pick: ["DateTimeOriginal", "CreateDate"] });
        if (exifData?.DateTimeOriginal) {
          takenAt = new Date(exifData.DateTimeOriginal).toISOString();
        } else if (exifData?.CreateDate) {
          takenAt = new Date(exifData.CreateDate).toISOString();
        }
      } catch {
        // No EXIF data
      }

      const thumbnail = await createThumbnail(processedFile);

      processed.push({
        file: processedFile,
        preview: thumbnail,
        hash,
        isDuplicate: false,
        takenAt,
        uploading: false,
        progress: 0,
      });
    }

    // Check duplicates
    if (processed.length > 0) {
      try {
        const res = await fetch("/api/photos/check-duplicates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: processed.map((f) => ({ hash: f.hash, filename: f.file.name })),
          }),
        });
        const data = await res.json();

        if (data.duplicates?.length > 0) {
          const dupHashes = new Set(data.duplicates.map((d: { hash: string }) => d.hash));
          const dupFilenames = new Set(data.duplicates.map((d: { filename: string }) => d.filename));

          for (const p of processed) {
            if (dupHashes.has(p.hash)) {
              p.isDuplicate = true;
              p.duplicateReason = "File trùng nội dung";
            } else if (dupFilenames.has(p.file.name)) {
              p.isDuplicate = true;
              p.duplicateReason = "Tên file trùng";
            }
          }
        }
      } catch {
        // Continue without duplicate check
      }
    }

    setFiles((prev) => [...prev, ...processed]);
    
    // Đánh dấu cần auto-upload 
    if (processed.some(p => !p.isDuplicate)) {
      autoUploadRef.current = true;
    }
  }, [files.length]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      processFiles(droppedFiles);
    },
    [processFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files ? Array.from(e.target.files) : [];
      processFiles(selected);
      e.target.value = "";
    },
    [processFiles]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => {
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpload = async () => {
    const filesToUpload = files.filter((f) => !f.isDuplicate);

    if (filesToUpload.length === 0) {
      setStatus({ type: "error", msg: "Không có ảnh mới để upload" });
      return;
    }

    setUploading(true);
    setStatus({ type: "info", msg: `Đang tải lên ${filesToUpload.length} ảnh...` });

    try {
      const result = await startUpload(filesToUpload.map((f) => f.file));

      if (!result) {
        setStatus({ type: "error", msg: "Upload thất bại" });
        setUploading(false);
        return;
      }

      // Save photo records to DB
      const photoData = result.map((r, i) => ({
        originalFilename: filesToUpload[i].file.name,
        fileHash: filesToUpload[i].hash,
        uploadthingUrl: r.ufsUrl,
        uploadthingKey: r.key,
        mimeType: filesToUpload[i].file.type || "image/jpeg",
        fileSize: filesToUpload[i].file.size,
        takenAt: filesToUpload[i].takenAt,
      }));

      await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: photoData }),
      });

      setStatus({ type: "success", msg: `Đã tải lên ${filesToUpload.length} ảnh thành công!` });

      // Clean up
      files.forEach((f) => URL.revokeObjectURL(f.preview));
      setFiles([]);

      setTimeout(() => router.push("/photos"), 1500);
    } catch {
      setStatus({ type: "error", msg: "Đã xảy ra lỗi khi upload" });
    } finally {
      setUploading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (autoUploadRef.current && !uploading && files.length > 0) {
      autoUploadRef.current = false;
      handleUpload();
    }
  }, [files, uploading]); // intentionally omitting handleUpload to avoid infinite loops since it's not a useCallback yet

  const duplicateCount = files.filter((f) => f.isDuplicate).length;
  const uploadableCount = files.filter((f) => !f.isDuplicate).length;

  return (
    <div className={styles.uploadPage}>
      <h1 className={styles.pageTitle}>Tải ảnh lên</h1>

      <div
        className={`${styles.dropZone} ${isDragging ? styles.dragging : ""}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className={styles.dropIcon}>📷</div>
        <h3>Kéo thả ảnh vào đây</h3>
        <p>hoặc click để chọn • Tối đa {MAX_UPLOAD_FILES} ảnh • JPEG, PNG, WebP, HEIC</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          multiple
          onChange={handleFileSelect}
        />
      </div>

      {duplicateCount > 0 && (
        <div className={styles.duplicateWarning}>
          ⚠️ {duplicateCount} ảnh trùng sẽ được bỏ qua khi upload
        </div>
      )}

      {files.length > 0 && (
        <>
          <div className={styles.previewGrid}>
            {files.map((f, i) => (
              <div
                key={i}
                className={`${styles.previewItem} ${f.isDuplicate ? styles.duplicate : ""}`}
              >
                <img src={f.preview} alt={f.file.name} loading="lazy" />
                {!uploading && (
                  <button className={styles.removeBtn} onClick={() => removeFile(i)}>
                    <XIcon size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className={styles.uploadActions}>
            <span className={styles.fileCount}>
              <span>{uploadableCount}</span> ảnh đang được xử lý...
              {duplicateCount > 0 && ` (Đã bỏ qua ${duplicateCount} ảnh trùng)`}
            </span>
            <button
              className={styles.uploadBtn}
              onClick={handleUpload}
              disabled={true}
            >
              <SpinnerIcon size={16} /> Đang tải lên...
            </button>
          </div>
        </>
      )}

      {status && (
        <div className={`${styles.statusMsg} ${styles[status.type]}`}>
          {status.msg}
        </div>
      )}
    </div>
  );
}
