import { NextResponse } from "next/server";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

export async function GET() {
  try {
    const urlPresent = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const anonPresent = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    const serviceRolePresent = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE);

    return NextResponse.json({
      ok: true,
      supabaseUrl: urlPresent,
      anonKey: anonPresent,
      serviceRoleConfigured: serviceRolePresent,
    });
  } catch (error: unknown) {
    return NextResponse.json({ ok: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
