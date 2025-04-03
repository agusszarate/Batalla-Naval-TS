import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Route handler for Socket.io health check
 * The actual socket connection will be established through server.js
 */
export async function GET() {
  return NextResponse.json({ status: "Socket server is available" });
}
