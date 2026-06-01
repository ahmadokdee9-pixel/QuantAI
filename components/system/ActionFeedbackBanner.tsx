"use client";

import InlineSystemNotice from "@/components/system/InlineSystemNotice";
import { resolveInstitutionalState } from "@/lib/ui/systemStateLanguage";

export type ActionFeedbackTone = "success" | "error" | "info";

type Props = {
  message: string;
  tone?: ActionFeedbackTone;
  onRetry?: () => void;
  retryLabel?: string;
  onDismiss?: () => void;
  className?: string;
};

/** Compact save/watchlist/action feedback — reuses institutional inline + workspace alert tokens. */
export default function ActionFeedbackBanner({
  message,
  tone = "info",
  onRetry,
  retryLabel = "Retry",
  onDismiss,
  className = "",
}: Props) {
  if (!message.trim()) return null;

  const institutional = tone === "error" ? resolveInstitutionalState(message) : null;

  if (tone === "error" && institutional) {
    return (
      <div className={className} role="alert" aria-live="assertive">
        <InlineSystemNotice message={message} />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {onRetry ? (
            <button type="button" className="qa-ref-btn qa-ref-btn--ghost" onClick={onRetry}>
              {retryLabel}
            </button>
          ) : null}
          {onDismiss ? (
            <button type="button" className="qa-ref-btn qa-ref-btn--ghost" onClick={onDismiss}>
              Dismiss
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const surfaceClass = tone === "error" ? "qa-ref-ws-alert" : "qi-sys-inline";

  return (
    <div className={className} role="status" aria-live="polite">
      {tone === "error" ? (
        <p className={surfaceClass}>{message}</p>
      ) : (
        <div className={surfaceClass}>
          <span className="qi-sys-pulse-dot qi-sys-pulse-dot--sm" aria-hidden />
          <p className="qi-sys-inline-headline">{message}</p>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {onRetry ? (
          <button type="button" className="qa-ref-btn qa-ref-btn--ghost" onClick={onRetry}>
            {retryLabel}
          </button>
        ) : null}
        {onDismiss ? (
          <button type="button" className="qa-ref-btn qa-ref-btn--ghost" onClick={onDismiss}>
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
