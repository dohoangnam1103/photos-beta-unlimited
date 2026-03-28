import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { SessionProvider } from "next-auth/react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  return (
    <SessionProvider session={session}>
      <div style={{ minHeight: "100dvh", paddingBottom: "80px" }}>
        <Navbar user={session.user} />
        <main>{children}</main>
      </div>
    </SessionProvider>
  );
}
