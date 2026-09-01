import { NextRequest, NextResponse } from "next/server";
import { getWalletData } from "@/axis";

export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get("wallet") || "";

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const data = await getWalletData(wallet);

   return NextResponse.json(
  JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  ),
  {
    headers: { "Cache-Control": "no-store" },
  }
);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unable to read Base data" },
      { status: 400 }
    );
  }
}
