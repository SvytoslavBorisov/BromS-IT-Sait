import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    workspace: {
      uuid: "e3a1c4d0-5f65-4b3c-8a1f-2a6b2a5c9b79", // сгенерируй свой v4
      root: process.env.NEXT_PUBLIC_WORKSPACE_ROOT ?? process.cwd()
    }
  });
}
