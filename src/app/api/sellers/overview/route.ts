import { getOverviewDataByUserId } from "@/services/overview.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const data = await getOverviewDataByUserId(5);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}