"use client";

import { useActionState } from "react";
import { signInAction, signInWithGoogle } from "@/app/actions/auth";
import Link from "next/link";
import styles from "@/styles/auth.module.scss";
import { GoogleIcon } from "@/components/ui/Icons";

export default function SignInPage() {
  const [state, action, isPending] = useActionState(signInAction, undefined);

  return (
    <div className={styles.authLayout}>
      <div className={`${styles.authCard} glass`}>
        <div className={styles.authHeader}>
          <h1>Chào mừng trở lại</h1>
          <p>Đăng nhập để xem bộ sưu tập ảnh của bạn</p>
        </div>

        <form action={action} className={styles.authForm}>
          {state?.error && (
            <div className={styles.errorMsg}>{state.error}</div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isPending}
          >
            {isPending ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <div className={styles.divider}>hoặc</div>

        <form action={signInWithGoogle}>
          <button type="submit" className={styles.googleBtn}>
            <GoogleIcon />
            Tiếp tục với Google
          </button>
        </form>

        <div className={styles.authFooter}>
          Chưa có tài khoản? <Link href="/signup">Đăng ký</Link>
        </div>
      </div>
    </div>
  );
}
