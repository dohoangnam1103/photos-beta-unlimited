"use server";

import { signIn } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AuthError } from "next-auth";

const signUpSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  confirmPassword: z.string(),
  name: z.string().min(1, "Tên không được để trống"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu không khớp",
  path: ["confirmPassword"],
});

export async function signUpAction(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
    name: formData.get("name") as string,
  };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { email, password, name } = parsed.data;

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return { error: "Email đã được sử dụng" };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await db.insert(users).values({
    email,
    password: hashedPassword,
    name,
  });

  return { success: true };
}

export async function signInAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirectTo: "/photos",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email hoặc mật khẩu không đúng" };
    }
    throw error;
  }
}

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/photos" });
}
