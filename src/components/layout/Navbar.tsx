"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useTheme } from "@/components/layout/ThemeProvider";
import {
  PhotoIcon,
  UploadIcon,
  AlbumIcon,
  SunIcon,
  MoonIcon,
  LogOutIcon,
  MenuIcon,
} from "@/components/ui/Icons";
import styles from "@/styles/navbar.module.scss";

interface NavbarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowMenu(false);
  }, [pathname]);

  const navItems = [
    { href: "/photos", label: "Ảnh", icon: <PhotoIcon size={18} /> },
    { href: "/upload", label: "Tải lên", icon: <UploadIcon size={18} /> },
    { href: "/albums", label: "Album", icon: <AlbumIcon size={18} /> },
  ];

  const initial = user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?";

  return (
    <>
      {/* Desktop top navbar */}
      <nav className={`${styles.navbar} glass`}>
        <div className={styles.navInner}>
          <Link href="/photos" className={styles.logo}>
            <span className={styles.logoIcon}>📸</span>
            PhotoVault
          </Link>

          <div className={styles.navLinks}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${pathname === item.href ? styles.active : ""}`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>

          <div className={styles.navActions}>
            <button
              className={styles.iconBtn}
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <SunIcon size={18} /> : <MoonIcon size={18} />}
            </button>

            <div className={styles.userMenuWrapper} ref={menuRef}>
              {user.image ? (
                <div
                  className={styles.userAvatar}
                  onClick={() => setShowMenu(!showMenu)}
                >
                  <img src={user.image} alt={user.name || "User"} />
                </div>
              ) : (
                <div
                  className={styles.userInitial}
                  onClick={() => setShowMenu(!showMenu)}
                >
                  {initial}
                </div>
              )}

              {showMenu && (
                <>
                  <div
                    className={styles.backdrop}
                    onClick={() => setShowMenu(false)}
                  />
                  <div className={`${styles.userMenu} glass`}>
                    <div className={styles.menuUserInfo}>
                      <div className={styles.menuUserName}>{user.name || "User"}</div>
                      <div className={styles.menuUserEmail}>{user.email}</div>
                    </div>
                    <div className={styles.menuDivider} />
                    <button
                      className={`${styles.menuItem} ${styles.danger}`}
                      onClick={() => signOut({ callbackUrl: "/signin" })}
                    >
                      <LogOutIcon size={16} />
                      Đăng xuất
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className={`${styles.mobileNav} glass`}>
        <div className={styles.mobileNavInner}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.mobileNavLink} ${pathname === item.href ? styles.active : ""}`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
