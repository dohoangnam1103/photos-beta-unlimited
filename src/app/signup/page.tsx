"use client";

import { useActionState, useEffect, useState } from "react";
import { signUpAction, signInWithGoogle } from "@/app/actions/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "@/styles/auth.module.scss";
import { GoogleIcon } from "@/components/ui/Icons";

export default function SignUpPage() {
  const [state, action, isPending] = useActionState(signUpAction, undefined);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      setShowSuccess(true);
      const timer = setTimeout(() => router.push("/signin"), 2000);
      return () => clearTimeout(timer);
    }
  }, [state?.success, router]);

  return (
    <div className={styles.authLayout}>
      <div className={`${styles.authCard} glass`}>
        <div className={styles.authHeader}>
          <h1>Tạo tài khoản</h1>
          <p>Bắt đầu lưu giữ kỷ niệm của bạn</p>
        </div>

        {showSuccess && (
          <div className={styles.successMsg}>
            Tạo tài khoản thành công! Đang chuyển đến trang đăng nhập...
          </div>
        )}

        <form action={action} className={styles.authForm}>
          {state?.error && (
            <div className={styles.errorMsg}>{state.error}</div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="name">Tên hiển thị</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Tên của bạn"
              required
              autoComplete="name"
            />
          </div>

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
              placeholder="Tối thiểu 6 ký tự"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword">Nhập lại mật khẩu</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isPending || showSuccess}
          >
            {isPending ? "Đang tạo tài khoản..." : "Đăng ký"}
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
          Đã có tài khoản? <Link href="/signin">Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
