"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  const login = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't sign in. Please try again.");
    },
    onSuccess: () => {
      router.replace(next);
      router.refresh();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        login.mutate();
      }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <label htmlFor="password" className="block text-[14px] font-medium">
          Password
        </label>
        <div className="relative">
          <Input
            id="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-14"
            autoFocus
            required
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute top-0.5 right-0.5 grid size-11 place-items-center rounded-xl text-muted-foreground hover:text-foreground"
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
          >
            {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </div>
      {login.isError && (
        <Notice kind="error" role="alert">
          {login.error.message}
        </Notice>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={!password || login.isPending || login.isSuccess}>
        {login.isPending || login.isSuccess ? <LoaderCircle className="animate-spin" aria-label="Signing in" /> : "Sign in"}
      </Button>
    </form>
  );
}
