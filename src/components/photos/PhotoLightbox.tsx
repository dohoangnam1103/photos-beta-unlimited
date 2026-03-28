"use client";

import { useCallback, useRef } from "react";
import Lightbox from "yet-another-react-lightbox";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import "yet-another-react-lightbox/styles.css";
import { SLIDESHOW_DELAY_MS } from "@/lib/constants";

interface PhotoLightboxProps {
  open: boolean;
  close: () => void;
  slides: { src: string; alt?: string; width?: number; height?: number }[];
  index: number;
}

export function PhotoLightbox({ open, close, slides, index }: PhotoLightboxProps) {
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchDeltaY.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - touchStartY.current;
    touchDeltaY.current = delta;

    if (containerRef.current && delta > 0) {
      const opacity = Math.max(0, 1 - delta / 300);
      const scale = Math.max(0.85, 1 - delta / 1500);
      containerRef.current.style.transform = `translateY(${delta}px) scale(${scale})`;
      containerRef.current.style.opacity = String(opacity);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchDeltaY.current > 120) {
      close();
    }
    if (containerRef.current) {
      containerRef.current.style.transform = "";
      containerRef.current.style.opacity = "";
    }
    touchDeltaY.current = 0;
  }, [close]);

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: "fixed", inset: 0, zIndex: 9999, transition: "transform 200ms ease, opacity 200ms ease" }}
    >
      <Lightbox
        open={open}
        close={close}
        slides={slides}
        index={index}
        plugins={[Slideshow]}
        slideshow={{ autoplay: false, delay: SLIDESHOW_DELAY_MS }}
        animation={{ swipe: 250 }}
        carousel={{ finite: false }}
        controller={{ closeOnBackdropClick: true }}
        styles={{
          container: { backgroundColor: "rgba(0, 0, 0, 0.95)" },
        }}
      />
    </div>
  );
}
