"use client";

import Link from "next/link";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppWorkspaceError({ error, reset }: Props) {
  return (
    <div className="qa-ref-ws-alert" role="alert">
      <p className="qa-ref-ws-title text-base">Workspace sync interrupted</p>
      <p className="qa-ref-ws-meta mt-2">
        {error.message?.trim() || "Could not render this workspace module."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="qa-ref-btn qa-ref-btn--ghost" onClick={() => reset()}>
          Retry
        </button>
        <Link href="/dashboard" className="qa-ref-btn qa-ref-btn--ghost">
          Workspace
        </Link>
      </div>
    </div>
  );
}
