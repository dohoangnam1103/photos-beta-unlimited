"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { ShareIcon, PlusIcon } from "@/components/ui/Icons";
import { PhotoLightbox } from "@/components/photos/PhotoLightbox";
import { formatDate } from "@/lib/utils";
import styles from "@/styles/albums.module.scss";
import galleryStyles from "@/styles/gallery.module.scss";

interface AlbumData {
  id: string;
  name: string;
  description: string | null;
}

interface Photo {
  id: string;
  originalFilename: string;
  uploadthingUrl: string | null;
  telegramFileId: string | null;
  takenAt: string | null;
  uploadedAt: string;
  status: string;
  width?: number | null;
  height?: number | null;
}

function getImageSrc(photo: Photo): string {
  if (photo.telegramFileId) {
    if (process.env.NEXT_PUBLIC_CDN_URL) {
      return `${process.env.NEXT_PUBLIC_CDN_URL}/image/${photo.telegramFileId}`;
    }
    return `/api/telegram/image/${photo.id}`;
  }
  return photo.uploadthingUrl || "";
}

export default function AlbumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showShare, setShowShare] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchAlbum();
  }, [id]);

  const fetchAlbum = async () => {
    try {
      const res = await fetch(`/api/albums/${id}`);
      const data = await res.json();
      setAlbum(data.album);
      setPhotos(data.photos || []);
    } catch {
      console.error("Failed to fetch album");
    } finally {
      setLoading(false);
    }
  };

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const createShareLink = async () => {
    try {
      const res = await fetch(`/api/albums/${id}/share`, { method: "POST" });
      const data = await res.json();
      setShareUrl(data.shareUrl);
      setShowShare(true);
    } catch {
      console.error("Failed to create share link");
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lightboxSlides = photos.map((p) => ({
    id: p.id,
    src: getImageSrc(p),
    alt: p.originalFilename,
    width: p.width || 1920,
    height: p.height || 1080,
  }));

  const deletePhoto = async (photoId: string) => {
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        setLightboxOpen(false);
      } else {
        alert("Có lỗi xảy ra khi xoá ảnh.");
      }
    } catch {
      alert("Lỗi kết nối khi xoá ảnh.");
    }
  };
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const downloadAll = async () => {
    setDownloading(true);
    setDownloadProgress(0);
    try {
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        const url = getImageSrc(p);
        
        // Tải ảnh về qua URL để giữ định dạng nguyên bản
        const res = await fetch(url);
        if (res.ok) {
          const blob = await res.blob();
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = p.originalFilename || `photo_${i + 1}.jpg`;
          document.body.appendChild(link); // Required for Firefox/some browsers
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        }
        setDownloadProgress(i + 1);
        
        // Thêm một độ trễ nhỏ để tránh trình duyệt coi là Spam
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (e) {
      alert("Tải xuống thất bại. Vui lòng thử lại.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.albumDetail}>
        <div style={{ height: 40, width: 200, borderRadius: 8, background: "var(--color-skeleton)", animation: "shimmer 1.5s infinite" }} />
      </div>
    );
  }

  if (!album) {
    return (
      <div className={styles.albumDetail}>
        <h1>Album không tồn tại</h1>
      </div>
    );
  }

  return (
    <div className={styles.albumDetail}>
      <Link href="/albums" className={styles.backLink}>
        ← Tất cả album
      </Link>

      <div className={styles.albumDetailHeader}>
        <div className={styles.albumTitle}>
          <h1>{album.name}</h1>
          {album.description && <p>{album.description}</p>}
        </div>
        <div className={styles.albumActions}>
          <button className={styles.actionBtn} onClick={downloadAll} disabled={downloading}>
            {downloading ? `Đang tải ${downloadProgress}/${photos.length}` : "⬇️ Tải tất cả"}
          </button>
          <button className={styles.actionBtn} onClick={createShareLink}>
            <ShareIcon size={16} />
            Chia sẻ
          </button>
          <Link href={`/albums/${id}/edit`} className={styles.actionBtn}>
            <PlusIcon size={16} />
            Thêm ảnh
          </Link>
        </div>
      </div>

      {photos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "var(--space-9) var(--space-5)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "var(--space-3)", opacity: 0.5 }}>📷</div>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-4)" }}>
            Album này chưa có ảnh
          </p>
          <Link href={`/albums/${id}/edit`} className={styles.createBtn}>
            <PlusIcon size={16} />
            Thêm ảnh vào album
          </Link>
        </div>
      ) : (
        <div className={galleryStyles.masonry}>
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className={galleryStyles.masonryItem}
              onClick={() => openLightbox(index)}
            >
              <img src={getImageSrc(photo)} alt={photo.originalFilename} loading="lazy" />
              <div className={galleryStyles.masonryOverlay}>
                <span className={galleryStyles.photoDate}>
                  {formatDate(photo.takenAt || photo.uploadedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <PhotoLightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={lightboxSlides}
        index={lightboxIndex}
        showDelete={true}
        onDelete={deletePhoto}
      />

      {showShare && (
        <div className={styles.modalOverlay} onClick={() => setShowShare(false)}>
          <div className={`${styles.modal} glass`} onClick={(e) => e.stopPropagation()}>
            <h2>Chia sẻ album</h2>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
              Bất kỳ ai có link đều có thể xem album này
            </p>
            <div className={styles.shareLink}>
              <input type="text" value={shareUrl} readOnly />
              <button className={styles.copyBtn} onClick={copyLink}>
                {copied ? "Đã copy!" : "Copy"}
              </button>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowShare(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
