"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useStoredValue } from "@/hooks/useStoredValue";
import {
  AccountProfile,
  createAccountProfileFromAuthUser,
  isValidEmail,
} from "@/lib/account";
import { KEYS } from "@/lib/storage";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthMode;
};

type AuthNotice = {
  type: "error" | "success";
  message: string;
  canResendVerification?: boolean;
};

function getCallbackErrorMessage(): string {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);
  const providerMessage = params.get("message");
  if (providerMessage) return providerMessage;

  const authError = params.get("error");
  if (!authError) return "";

  const messageByCode: Record<string, string> = {
    missing_code: "Google did not return an auth code. Try signing in again.",
    provider_error: "Google sign-in failed. Check the provider setup and try again.",
    oauth_failed: "Google sign-in failed. Check your Supabase and Google redirect URLs.",
    supabase_not_configured: "Supabase is missing its public URL or anon key.",
  };

  return messageByCode[authError] ?? "Sign-in failed. Try again.";
}

function getInitialNotice(): AuthNotice | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const status = params.get("status");

  if (status === "password_changed") {
    return {
      type: "success",
      message: "Your password was updated. Login with your email and new password.",
    };
  }

  const callbackError = getCallbackErrorMessage();
  return callbackError ? { type: "error", message: callbackError } : null;
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function AnimatedEmailHint({ hidden }: { hidden: boolean }) {
  if (hidden) return null;

  return (
    <span className="auth-email-placeholder" aria-hidden="true">
      <span className="auth-email-example auth-email-example-a">raghed@example.com</span>
      <span className="auth-email-example auth-email-example-b">
        cunylogin@stu-mail.ccny.cuny.edu
      </span>
    </span>
  );
}

function getFriendlyAuthError(message: string): AuthNotice {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("email not confirmed")) {
    return {
      type: "error",
      message: "Confirm your email before logging in. Check your inbox or resend the verification email.",
      canResendVerification: true,
    };
  }

  if (lowerMessage.includes("invalid login credentials")) {
    return {
      type: "error",
      message: "Email or password is incorrect. If you just signed up, verify your email first.",
      canResendVerification: true,
    };
  }

  if (lowerMessage.includes("rate limit")) {
    return {
      type: "error",
      message: "Too many email requests. Wait a minute, then try resending.",
    };
  }

  return { type: "error", message };
}

function getVerificationSentMessage(email: string): string {
  return `We sent a verification link to ${email}.`;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [account, setAccount] = useStoredValue<AccountProfile | null>(KEYS.ACCOUNT, null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<AuthNotice | null>(() => getInitialNotice());
  const [pendingSignupEmail, setPendingSignupEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [authLoading, setAuthLoading] = useState<
    "google" | "email" | "resend" | "reset" | null
  >(null);
  const isSignup = mode === "signup";

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const handleGoogleSignIn = async () => {
    setNotice(null);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setNotice({
        type: "error",
        message: "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
      });
      return;
    }

    setAuthLoading("google");

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (googleError) {
      setAuthLoading(null);
      setNotice({ type: "error", message: googleError.message });
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      setNotice({
        type: "error",
        message: "Enter your email first, then tap Forgot your password.",
      });
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setNotice({
        type: "error",
        message: "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
      });
      return;
    }

    setAuthLoading("reset");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setAuthLoading(null);

    if (resetError) {
      setNotice({ type: "error", message: resetError.message });
      return;
    }

    setNotice({
      type: "success",
      message: `We sent a password reset link to ${cleanEmail}. Open it to choose a new password.`,
    });
  };

  const handleResendSignupEmail = async () => {
    const cleanEmail = (pendingSignupEmail || email).trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      setNotice({ type: "error", message: "Enter a valid email address first." });
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setNotice({
        type: "error",
        message: "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
      });
      return;
    }

    setAuthLoading("resend");

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: cleanEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setAuthLoading(null);

    if (resendError) {
      setNotice(getFriendlyAuthError(resendError.message));
      return;
    }

    setPendingSignupEmail(cleanEmail);
    setResendCooldown(60);
    setNotice({
      type: "success",
      message: getVerificationSentMessage(cleanEmail),
      canResendVerification: true,
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    const cleanFirstName = firstName.replace(/\s+/g, " ").trim();
    const cleanLastName = lastName.replace(/\s+/g, " ").trim();
    const cleanEmail = email.trim().toLowerCase();

    if (isSignup && cleanFirstName.length < 2) {
      setNotice({ type: "error", message: "Enter your first name." });
      return;
    }

    if (isSignup && cleanLastName.length < 1) {
      setNotice({ type: "error", message: "Enter your last name." });
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setNotice({ type: "error", message: "Enter a valid email address." });
      return;
    }

    if (password.trim().length < 6) {
      setNotice({ type: "error", message: "Enter a password with at least 6 characters." });
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setNotice({
        type: "error",
        message: "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
      });
      return;
    }

    setAuthLoading("email");

    if (isSignup) {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: `${cleanFirstName} ${cleanLastName}`,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      setAuthLoading(null);

      if (signupError) {
        setNotice({ type: "error", message: signupError.message });
        return;
      }

      if (data.user && data.session) {
        setAccount(createAccountProfileFromAuthUser(data.user));
        router.push("/dashboard");
        return;
      }

      setPendingSignupEmail(cleanEmail);
      setResendCooldown(60);
      setNotice({
        type: "success",
        message: getVerificationSentMessage(cleanEmail),
        canResendVerification: true,
      });
      return;
    }

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    setAuthLoading(null);

    if (loginError) {
      const friendlyError = getFriendlyAuthError(loginError.message);
      if (friendlyError.canResendVerification) {
        setPendingSignupEmail(cleanEmail);
      }
      setNotice(friendlyError);
      return;
    }

    if (data.user) {
      setAccount(createAccountProfileFromAuthUser(data.user));
      router.push("/dashboard");
    }
  };

  if (account) {
    return (
      <main className="auth-page min-h-screen px-6 py-16 text-[#302d2a]">
        <section className="auth-card mx-auto max-w-xl p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-[#6d28ff] text-xl font-black text-white shadow-[0_18px_40px_rgba(109,40,255,0.22)]">
            {account.initials}
          </div>
          <h1 className="text-4xl font-black tracking-tight">You are signed in</h1>
          <p className="mt-2 text-base text-[#6d6964]">{account.email}</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href="/dashboard"
              className="rounded-2xl bg-[#6d28ff] px-5 py-3 text-sm font-black text-white transition hover:bg-[#5b1ee0]"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/dashboard/account"
              className="rounded-2xl border border-[#8b8680] px-5 py-3 text-sm font-black text-[#302d2a] transition hover:bg-[#f0eeee]"
            >
              Account Settings
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page flex h-[100dvh] flex-col items-center justify-center gap-3 overflow-hidden px-5 py-3 text-[#302d2a] sm:gap-4 sm:py-6">
      <section className="auth-card w-full max-w-[26.5rem] p-4 sm:p-6">
        <h1 className="text-[2rem] font-extrabold leading-none tracking-[-0.03em] sm:text-[2.35rem]">
          {isSignup ? "Sign Up" : "Login"}
        </h1>
        <p className="mt-2 text-[0.88rem] font-medium leading-5 text-[#6d6964] sm:text-[0.95rem]">
          {isSignup
            ? "Study with CCNY Study AI. No credit card required."
            : "Study with CCNY Study AI. No credit card required."}
        </p>

        <div className="mt-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={authLoading !== null}
            className="auth-provider-button"
          >
            <GoogleLogo />
            {authLoading === "google" ? "Opening Google..." : "Continue with Google"}
          </button>
        </div>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-[#a9a6a2]" />
          <span className="text-sm font-medium text-[#6d6964]">OR</span>
          <span className="h-px flex-1 bg-[#a9a6a2]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          {isSignup && (
            <div className="grid grid-cols-2 gap-2.5">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-[#6d6964]">First name</span>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="auth-input"
                  placeholder="Raghed"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold text-[#6d6964]">Last name</span>
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="auth-input"
                  placeholder="Soliman"
                />
              </label>
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-[#6d6964]">Email</span>
            <span className="relative block">
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={`auth-input ${email.length === 0 ? "auth-input-empty" : ""}`}
                placeholder=""
                type="email"
              />
              <AnimatedEmailHint hidden={email.length > 0} />
            </span>
          </label>

          <label className="block">
            <span className="mb-1 flex items-center justify-between gap-3 text-xs font-bold text-[#6d6964]">
              Password
              {!isSignup && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={authLoading !== null}
                  className="font-bold underline decoration-[#6d6964]/60 underline-offset-2 transition hover:text-[#302d2a]"
                >
                  {authLoading === "reset" ? "Sending..." : "Forgot your password?"}
                </button>
              )}
            </span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="auth-input"
              type="password"
            />
          </label>

          {notice && (
            <div className={`auth-notice auth-notice-${notice.type}`}>
              <p>{notice.message}</p>
              {notice.canResendVerification && pendingSignupEmail && (
                <button
                  type="button"
                  onClick={handleResendSignupEmail}
                  disabled={authLoading !== null || resendCooldown > 0}
                  className="auth-resend-button"
                >
                  {authLoading === "resend"
                    ? "Sending..."
                    : resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend email"}
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={authLoading !== null}
            className="auth-submit-button"
          >
            {authLoading === "email" ? "Connecting..." : isSignup ? "Create an account" : "Login"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm font-medium text-[#6d6964]">
          {isSignup ? "Already have an account? " : "Don't have an account? "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="font-bold text-[#4b4641] underline decoration-[#4b4641]/70 underline-offset-2 transition hover:text-[#6d28ff]"
          >
            {isSignup ? "Sign in" : "Sign up"}
          </Link>
        </p>
      </section>

      <p className="auth-legal w-full max-w-[26.5rem] text-center text-[0.72rem] font-medium leading-4 text-[#7a756f] sm:text-xs sm:leading-5">
        By creating or entering an account, you agree that CCNY Study AI can save your
        courses, chats, notes, flashcards, and study history to your account.
        <span className="block font-black text-[#4b4641]">Created by Raghed Soliman.</span>
      </p>
    </main>
  );
}
