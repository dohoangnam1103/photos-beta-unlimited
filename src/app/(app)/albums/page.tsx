"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PlusIcon } from "@/components/ui/Icons";
import styles from "@/styles/albums.module.scss";

interface Album {
  id: string;
  name: string;
  description: string | null;
  photoCount: number;
  coverUrl: string | null;
  createdAt: string;
}

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchAlbums();
  }, []);

  const fetchAlbums = async () => {
    try {
      const res = await fetch("/api/albums");
      const data = await res.json();
      setAlbums(data.albums || []);
    } catch {
      console.error("Failed to fetch albums");
    } finally {
      setLoading(false);
    }
  };

  const createAlbum = async () => {
    if (!newName.trim()) return;
    setCreating(true);

    try {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDesc }),
      });
      const data = await res.json();

      if (data.album) {
        setAlbums((prev) => [{ ...data.album, photoCount: 0, coverUrl: null }, ...prev]);
        setShowCreate(false);
        setNewName("");
        setNewDesc("");
      }
    } catch {
      console.error("Failed to create album");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.albumsPage}>
      <div className={styles.albumsHeader}>
        <h1>Album</h1>
        <button className={styles.createBtn} onClick={() => setShowCreate(true)}>
          <PlusIcon size={16} />
          Tạo album
        </button>
      </div>

      {loading ? (
        <div className={styles.albumsGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass" style={{
              borderRadius: "var(--radius-lg)",
              aspectRatio: "16/12",
              animation: "shimmer 1.5s infinite",
              background: "linear-gradient(90deg, var(--color-skeleton) 25%, var(--color-skeleton-shine) 50%, var(--color-skeleton) 75%)",
              backgroundSize: "200% 100%",
            }} />
          ))}
        </div>
      ) : albums.length === 0 ? (
        <div className="empty-state" style={{ textAlign: "center", padding: "var(--space-9) var(--space-5)" }}>
          <div style={{ fontSize: "4rem", marginBottom: "var(--space-4)", opacity: 0.5 }}>📁</div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, marginBottom: "var(--space-2)" }}>Chưa có album nào</h2>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-5)" }}>
            Tạo album để sắp xếp ảnh của bạn
          </p>
          <button className={styles.createBtn} onClick={() => setShowCreate(true)}>
            <PlusIcon size={16} />
            Tạo album đầu tiên
          </button>
        </div>
      ) : (
        <div className={styles.albumsGrid}>
          {albums.map((album) => (
            <Link
              key={album.id}
              href={`/albums/${album.id}`}
              className={`${styles.albumCard} glass`}
            >
              <div className={styles.albumCover}>
                {album.coverUrl ? (
                  <img src={album.coverUrl} alt={album.name} loading="lazy" />
                ) : (
                  <div className={styles.albumCoverEmpty}>📁</div>
                )}
              </div>
              <div className={styles.albumInfo}>
                <h3>{album.name}</h3>
                <p>{album.photoCount} ảnh</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <div className={styles.modalOverlay} onClick={() => setShowCreate(false)}>
          <div className={`${styles.modal} glass`} onClick={(e) => e.stopPropagation()}>
            <h2>Tạo album mới</h2>
            <div className={styles.modalForm}>
              <input
                type="text"
                placeholder="Tên album"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
              <textarea
                placeholder="Mô tả (tùy chọn)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowCreate(false)}>
                Hủy
              </button>
              <button
                className={styles.createBtn}
                onClick={createAlbum}
                disabled={!newName.trim() || creating}
              >
                {creating ? "Đang tạo..." : "Tạo album"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
