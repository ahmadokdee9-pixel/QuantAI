import { NextResponse } from "next/server";

/** Standard API envelope — flat `success` + payload fields (payload must not include `success`). */
export function jsonOk(body: object, init?: ResponseInit) {
  return NextResponse.json({ success: true, ...(body as Record<string, unknown>) }, { status: 200, ...init });
}

export function jsonErr(
  status: number,
  error: string,
  extras?: Record<string, unknown>,
  init?: ResponseInit
) {
  return NextResponse.json({ success: false, error, ...extras }, { status, ...init });
}
