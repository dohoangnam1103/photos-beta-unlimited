import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/photos");
  }

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      textAlign: "center",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute",
        top: "-30%",
        right: "-10%",
        width: "500px",
        height: "500px",
        background: "radial-gradient(circle, var(--color-accent-light), transparent 70%)",
        borderRadius: "50%",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>📸</div>
        <h1 style={{
          fontSize: "clamp(2rem, 5vw, 3.5rem)",
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: "1rem",
          background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          PhotoVault
        </h1>
        <p style={{
          fontSize: "1.1rem",
          color: "var(--color-text-secondary)",
          maxWidth: "480px",
          margin: "0 auto 2rem",
          lineHeight: 1.6,
        }}>
          Lưu giữ, sắp xếp và chia sẻ những khoảnh khắc đáng nhớ của bạn
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/signin"
            style={{
              padding: "0.75rem 2rem",
              background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))",
              color: "white",
              borderRadius: "var(--radius-md)",
              fontWeight: 600,
              fontSize: "1rem",
              textDecoration: "none",
              transition: "transform 150ms ease",
            }}
          >
            Đăng nhập
          </Link>
          <Link
            href="/signup"
            style={{
              padding: "0.75rem 2rem",
              border: "1px solid var(--color-border-light)",
              borderRadius: "var(--radius-md)",
              fontWeight: 600,
              fontSize: "1rem",
              color: "var(--color-text-primary)",
              textDecoration: "none",
            }}
          >
            Đăng ký
          </Link>
        </div>
      </div>
    </div>
  );
}
