export async function POST(request: Request) {
  void request

  return Response.json(
    {
      status: "error",
      error: {
        code: "INTERNAL_ERROR",
        message: "Use /api/summarize/start instead.",
      },
    },
    { status: 410 },
  )
}
