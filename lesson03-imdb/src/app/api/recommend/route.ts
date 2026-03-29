import { NextResponse } from "next/server";
import { AppError } from "../../../lib/errors";
import { getMovieRecommendation } from "../../../lib/recommendations/service";
import { parseMovieQuery } from "../../../lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = parseMovieQuery(body);
    const payload = await getMovieRecommendation(query);
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message
          }
        },
        { status: error.status }
      );
    }

    console.error(error);

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Произошла внутренняя ошибка"
        }
      },
      { status: 500 }
    );
  }
}
