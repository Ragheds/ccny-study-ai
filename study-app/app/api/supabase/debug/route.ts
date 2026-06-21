import { NextResponse } from "next/server";

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
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
