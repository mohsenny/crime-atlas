"use client";

import { useEffect, useTransition } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

type BackLinkProps = {
  href: Route;
  label: string;
  className?: string;
  showLabel?: boolean;
};

export function BackLink({ href, label, className, showLabel = true }: BackLinkProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    router.prefetch(href);
  }, [href, router]);

  return (
    <button
      aria-label={label}
      className={cn(
        "-ml-1 inline-flex h-10 shrink-0 items-center gap-2 text-slate-400 transition hover:text-slate-100",
        isPending ? "text-slate-200" : null,
        className,
      )}
      onClick={() => {
        startTransition(() => {
          router.push(href);
        });
      }}
      type="button"
    >
      {isPending ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" /> : <ArrowLeft className="h-4 w-4 shrink-0" />}
      {showLabel ? (
        <span className={cn("hidden text-sm font-semibold leading-none sm:inline", isPending ? "opacity-80" : null)}>
          {label}
        </span>
      ) : null}
    </button>
  );
}
