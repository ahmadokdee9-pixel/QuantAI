/**
 * Safely parse a `fetch` Response as JSON — avoids throwing on HTML error pages or empty bodies.
 */

export type ApiReadResult<T> = {
  ok: boolean;
  status: number;
  success: boolean;
  data: T | null;
  contentType?: string;
  responseUrl?: string;
  redirected?: boolean;
  responseTextSnippet?: string;
  /** Human-readable when body was not valid JSON or looked like HTML. */
  error?: string;
  notJson?: boolean;
};

export async function readApiJson<T = Record<string, unknown>>(res: Response): Promise<ApiReadResult<T>> {
  const status = res.status;
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const responseUrl = res.url;
  const redirected = res.redirected;
  let text: string;
  try {
    text = await res.text();
  } catch {
    return {
      ok: false,
      status,
      success: false,
      data: null,
      contentType: ct,
      responseUrl,
      redirected,
      error: "Could not read response body.",
    };
  }

  const trimmed = text.trimStart();
  const snippet = trimmed.slice(0, 260);
  if (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<!doctype") ||
    trimmed.startsWith("<html") ||
    trimmed.startsWith("<HTML")
  ) {
    return {
      ok: false,
      status,
      success: false,
      data: null,
      contentType: ct,
      responseUrl,
      redirected,
      responseTextSnippet: snippet,
      error: "Server returned HTML instead of JSON (often auth redirect, wrong route, or 404 page).",
      notJson: true,
    };
  }

  if (!text.length) {
    return {
      ok: res.ok,
      status,
      success: res.ok,
      data: null,
      contentType: ct,
      responseUrl,
      redirected,
      error: res.ok ? undefined : "Empty response body.",
    };
  }

  if (!ct.includes("application/json") && !trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return {
      ok: false,
      status,
      success: false,
      data: null,
      contentType: ct,
      responseUrl,
      redirected,
      responseTextSnippet: snippet,
      error: "Response was not JSON.",
      notJson: true,
    };
  }

  try {
    const data = JSON.parse(text) as T;
    const success =
      typeof data === "object" &&
      data !== null &&
      "success" in data &&
      typeof (data as { success?: unknown }).success === "boolean"
        ? (data as { success: boolean }).success
        : res.ok;
    return {
      ok: res.ok,
      status,
      success,
      data,
      contentType: ct,
      responseUrl,
      redirected,
    };
  } catch {
    return {
      ok: false,
      status,
      success: false,
      data: null,
      contentType: ct,
      responseUrl,
      redirected,
      responseTextSnippet: snippet,
      error: "Invalid JSON in response.",
    };
  }
}
