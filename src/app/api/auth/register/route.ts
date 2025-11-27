import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/services/user-service";
import { withLogging } from "@/lib/api/with-logging";
import { withRateLimit } from "@/lib/api/with-rate-limit";
import { strictLimiter } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "تمام فیلدها الزامی هستند" },
        { status: 400 }
      );
    }

    // Create user (validation happens in service)
    const user = await createUser({ email, password, name });

    return NextResponse.json(
      {
        success: true,
        message: "ثبت‌نام با موفقیت انجام شد",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    // Return user-friendly error message
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطا در ثبت‌نام" },
      { status: 400 }
    );
  }
}

export const POST = withLogging(
  withRateLimit(postHandler, strictLimiter),
  'POST /api/auth/register'
);
