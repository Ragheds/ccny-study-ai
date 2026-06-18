import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const providerError = requestUrl.searchParams.get("error");
  const providerErrorDescription = requestUrl.searchParams.get("error_description");
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  if (providerError || providerErrorDescription) {
    const redirectUrl = new URL("/login", requestUrl.origin);
    redirectUrl.searchParams.set("error", "provider_error");
    redirectUrl.searchParams.set(
      "message",
      providerErrorDescription || providerError || "Google sign-in failed."
    );
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", requestUrl.origin));
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.redirect(new URL("/login?error=supabase_not_configured", requestUrl.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
