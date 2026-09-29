import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/site/logo";
import { LoginForm } from "@/components/admin/login-form";
import { Notice } from "@/components/ui/notice";
import { adminConfigured, serverEnv } from "@/lib/server/env";
import { getAdmin } from "@/lib/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/admin/login">) {
  const { next } = await props.searchParams;
  // Only same-site dashboard paths — never an open redirect.
  const target = typeof next === "string" && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
  if (await getAdmin()) redirect(target);

  return (
    <main id="main" className="paper grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" aria-label="Back to the shop" className="inline-block">
          <Logo />
        </Link>
        <h1 className="display mt-8 text-4xl">Welcome back{serverEnv.adminName ? `, ${serverEnv.adminName}` : ""}.</h1>
        <p className="mt-2 text-muted-foreground">Sign in to manage your store.</p>
        <div className="mt-8 rounded-3xl bg-card p-5 shadow-soft ring-1 ring-border sm:p-6">
          {adminConfigured() ? (
            <LoginForm next={target} />
          ) : (
            <Notice kind="warning" title="Sign-in isn't set up yet">
              Set ADMIN_PASSWORD (12+ characters) and SESSION_SECRET in the site&rsquo;s environment variables, then redeploy.
            </Notice>
          )}
        </div>
      </div>
    </main>
  );
}
