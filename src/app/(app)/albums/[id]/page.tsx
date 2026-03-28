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
  if (photo.telegramFileId) return `/api/telegram/image/${photo.id}`;
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
    src: getImageSrc(p),
    alt: p.originalFilename,
    width: p.width || 1920,
    height: p.height || 1080,
  }));

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
