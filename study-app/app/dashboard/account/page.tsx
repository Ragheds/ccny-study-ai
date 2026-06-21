"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState, useEffect, useRef } from "react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useHydrated, useStoredValue } from "@/hooks/useStoredValue";
import {
  AccountProfile,
  formatAccountDate,
  isCompactAvatarUrl,
  isValidEmail,
  updateAccountAvatar,
  updateAccountProfile,
  updateAccountBannerColor,
} from "@/lib/account";
import { SavedCourse, SavedMajor } from "@/lib/chatWorkspace";
import { KEYS } from "@/lib/storage";
import { signOutSupabaseUser } from "@/lib/supabase/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { removeFromStorage, ACCOUNT_SCOPED_STORAGE_KEYS, KEYS as STORAGE_KEYS } from "@/lib/storage";

type ProfileOverride = {
  name?: string;
  avatarUrl?: string;
};

const EMPTY_PROFILE_OVERRIDE: ProfileOverride = {};
const EMPTY_COURSES: SavedCourse[] = [];
const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_FILE_BYTES = 8 * 1024 * 1024;
const AVATAR_MAX_DIMENSION = 512;

type Notice = {
  type: "success" | "error";
  message: string;
};

function createProfileMetadata(name: string, avatarUrl?: string) {
  const metadata: { full_name: string; name: string; avatar_url?: string } = {
    full_name: name,
    name,
  };

  // Only include avatar_url when we actually have one. Supabase treats an
  // explicit `null` here as "delete this field" (it merges everything else,
  // but a null value wipes that key from auth.users.raw_user_meta_data for
  // every device). Omitting the key entirely leaves whatever is already
  // saved untouched.
  if (isCompactAvatarUrl(avatarUrl)) {
    metadata.avatar_url = avatarUrl;
  }

  return metadata;
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);

  try {
    return await new Promise((resolve, reject) => {
      const image = new window.Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not read that image. Try another file."));
      image.src = objectUrl;
    });
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

async function compressAvatarFile(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file for your profile photo.");
  }

  if (file.size > MAX_AVATAR_FILE_BYTES) {
    throw new Error("Choose an image under 8 MB.");
  }

  const image = await loadImage(file);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const scale = Math.min(AVATAR_MAX_DIMENSION / width, AVATAR_MAX_DIMENSION / height, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Your browser could not prepare that image.");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Your browser could not prepare that image."));
      },
      "image/jpeg",
      0.86
    );
  });
}

async function uploadAvatarFile(
  supabase: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>,
  accountId: string,
  file: File
): Promise<string> {
  const avatarBlob = await compressAvatarFile(file);
  const { data: userData } = await supabase.auth.getUser();
  const ownerId = userData.user?.id ?? accountId;
  const filePath = `${ownerId}/profile.jpg`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, avatarBlob, {
      cacheControl: "3600",
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    throw new Error("Could not upload your photo. Create a public Supabase Storage bucket named avatars, then try again.");
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
  if (!data.publicUrl) {
    throw new Error("Could not read the uploaded photo URL.");
  }

  return `${data.publicUrl}?v=${Date.now()}`;
}

export default function AccountPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [account, setAccount] = useStoredValue<AccountProfile | null>(KEYS.ACCOUNT, null);
  const [, setProfileOverride] = useStoredValue<ProfileOverride>(
    KEYS.PROFILE,
    EMPTY_PROFILE_OVERRIDE
  );
  const [major] = useStoredValue<SavedMajor | null>(KEYS.MAJOR, null);
  const [courses] = useStoredValue(KEYS.COURSES, EMPTY_COURSES);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isGoogleManaged, setIsGoogleManaged] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastHiding, setToastHiding] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [showDeleteStage, setShowDeleteStage] = useState(0); // 0=hidden,1=confirm,2=final,3=goodbye
  const [deleting, setDeleting] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [pillVisible, setPillVisible] = useState(true);
  const [showColors, setShowColors] = useState(false);
  const [bannerFading, setBannerFading] = useState(false);

  const toastTimerRef = useRef<number | null>(null);
  const toastExitRef = useRef<number | null>(null);
  const pillTimerRef = useRef<number | null>(null);

  const beginEdit = () => {
    if (!account) return;
    setDraftName(account.name);
    setDraftEmail(account.email);
    setError("");
    setNotice(null);
    setEditing(true);
  };

  const colorOptions = [
    "#0f172a", // slate-900
    "#2563eb", // blue-600
    "#06b6d4", // cyan-500
    "#7c3aed", // purple-600
    "#f97316", // orange-500
    "#ef4444", // red-500
    "#ff9ccf", // pink-ish
  ];

  // detect google-managed via Supabase user identities when component mounts
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user as any | null;
        if (!user) return;
        const identities = user.identities as Array<any> | undefined;
        const google = (identities || []).some((i) => i?.provider === "google")
          || (user?.app_metadata?.provider === "google");
        if (mounted) setIsGoogleManaged(Boolean(google));
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // show animated toast when `notice` changes, auto-hide after 2.5s then slide out
  useEffect(() => {
    if (!notice) return;
    // clear any existing timers
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    if (toastExitRef.current) window.clearTimeout(toastExitRef.current);

    setToastHiding(false);
    setToastVisible(true);

    // stay visible for 2500ms, then play exit animation (~420ms), then clear notice
    toastTimerRef.current = window.setTimeout(() => {
      setToastHiding(true);
      toastExitRef.current = window.setTimeout(() => {
        setToastVisible(false);
        setToastHiding(false);
        setNotice(null);
      }, 420);
    }, 2500);

    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (toastExitRef.current) window.clearTimeout(toastExitRef.current);
    };
  }, [notice]);

  // auto-hide the change-color pill after 5s of inactivity
  useEffect(() => {
    if (!pillVisible) return;
    if (pillTimerRef.current) window.clearTimeout(pillTimerRef.current);
    pillTimerRef.current = window.setTimeout(() => setPillVisible(false), 5000);
    return () => {
      if (pillTimerRef.current) window.clearTimeout(pillTimerRef.current);
    };
  }, [pillVisible]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!account || savingProfile) return;

    const cleanName = draftName.replace(/\s+/g, " ").trim();
    const cleanEmail = draftEmail.trim().toLowerCase();

    if (cleanName.length < 2) {
      setError("Enter your name.");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Account updates are unavailable right now.");
      return;
    }

    const emailChanged = cleanEmail !== account.email;

    setSavingProfile(true);
    setError("");
    setNotice(null);

    const updatePayload = emailChanged
      ? { email: cleanEmail, data: createProfileMetadata(cleanName, account.avatarUrl) }
      : { data: createProfileMetadata(cleanName, account.avatarUrl) };

    const { data, error: updateError } = await supabase.auth.updateUser(updatePayload, {
      emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard/account`,
    });

    setSavingProfile(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    const confirmedEmail = data.user?.email?.trim().toLowerCase() || account.email;
    setAccount(updateAccountProfile(account, cleanName, confirmedEmail, account.avatarUrl));
    setProfileOverride({ name: cleanName, avatarUrl: account.avatarUrl });
    setEditing(false);
    setNotice({
      type: "success",
      message: emailChanged
        ? `We sent a confirmation link to ${cleanEmail}. Open it to finish changing your account email.`
        : "Profile updated.",
    });
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !account || savingAvatar) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setNotice({ type: "error", message: "Profile photos are unavailable right now." });
      return;
    }

    setSavingAvatar(true);
    setError("");
    setNotice(null);

    try {
      const avatarUrl = await uploadAvatarFile(supabase, account.id, file);
      const { error: updateError } = await supabase.auth.updateUser({
        data: createProfileMetadata(account.name, avatarUrl),
      });

      if (updateError) throw updateError;

      setAccount(updateAccountAvatar(account, avatarUrl));
      setProfileOverride({ name: account.name, avatarUrl });
      setNotice({ type: "success", message: "Profile photo updated." });
    } catch (avatarError) {
      setNotice({
        type: "error",
        message: avatarError instanceof Error
          ? avatarError.message
          : "Could not update your profile photo.",
      });
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleLogout = async () => {
    await signOutSupabaseUser();
    setAccount(null);
    router.push("/");
  };

  async function performAccountDeletion() {
    if (!account || deleting) return;
    setDeletionError(null);
    setDeleting(true);

    try {
      const res = await fetch(`/api/delete-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: account.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Deletion failed");
      }

      // show goodbye stage
      setShowDeleteStage(3);

      // wait for farewell animation then clear client state
      window.setTimeout(async () => {
        // remove account scoped localStorage
        try {
          for (const key of ACCOUNT_SCOPED_STORAGE_KEYS) {
            removeFromStorage(key);
          }
          removeFromStorage(STORAGE_KEYS.ACCOUNT);
        } catch (e) {
          // ignore local cleanup errors
        }

        // sign out client and clear account in UI
        try {
          await signOutSupabaseUser();
        } catch (e) {
          // ignore
        }
        setAccount(null);
        router.push("/");
      }, 2400);
    } catch (err: any) {
      console.error("Account deletion error:", err);
      setDeletionError(err?.message ?? String(err));
      setShowDeleteStage(0);
    } finally {
      setDeleting(false);
    }
  }

  if (!hydrated) return <main className="min-h-screen bg-[var(--app-bg)]" />;

  if (!account) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-6 py-16 text-[var(--app-text)]">
        <div className="mx-auto max-w-xl rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-center shadow-sm">
          <h1 className="text-3xl font-bold">Create your account</h1>
          <p className="mt-3 text-sm text-[var(--app-muted)]">
            Sign in to attach your dashboard, courses, chats, and flashcards to a local profile.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex rounded-2xl bg-[var(--app-text)] px-6 py-3 text-sm font-semibold text-[var(--app-bg)] transition hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-6 py-10 text-[var(--app-text)]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--app-accent)]">
              Account
            </p>
            <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
            <p className="mt-2 text-sm text-[var(--app-muted)]">
              Manage your profile and study workspace preferences.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-2xl border border-[var(--app-border)] px-5 py-3 text-sm font-semibold text-[var(--app-muted-strong)] transition hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
            <div
              className={`relative h-32 ${bannerFading ? "banner-fade-out" : "banner-fade-in"}`}
              onClick={() => {
                setPillVisible(true);
                setShowColors(false);
              }}
              style={{ background: account.bannerColor ?? "var(--app-accent-soft)", transition: "background-color 420ms ease" }}
            >
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {pillVisible && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowColors((s) => !s);
                      setPillVisible(true);
                    }}
                    className="banner-color-pill bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)] shadow-sm pointer-events-auto"
                  >
                    Change Color
                  </button>
                )}
              </div>

              {showColors && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3 pointer-events-auto">
                  {colorOptions.map((c) => (
                    <button
                      key={c}
                      title={c}
                      onClick={async (ev) => {
                        ev.stopPropagation();
                        setBannerFading(true);
                        // brief fade then update
                        window.setTimeout(async () => {
                          try {
                            const supabase = getSupabaseBrowserClient();
                            if (supabase) {
                              await supabase.auth.updateUser({ data: { banner_color: c } });
                            }
                          } catch (e) {
                            // ignore persistence error
                          }
                          setAccount((acct) => (acct ? updateAccountBannerColor(acct, c) : acct));
                          setShowColors(false);
                          setNotice({ type: "success", message: "Banner color updated." });
                          setBannerFading(false);
                        }, 260);
                      }}
                      className={`color-swatch ${account.bannerColor === c ? "color-swatch-selected" : ""}`}
                      style={{ background: c }}
                    >
                      {account.bannerColor === c && <span className="text-xs font-bold text-[var(--app-bg)]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="-mt-14 px-6 pb-6">
              <div className="relative inline-flex">
                <ProfileAvatar
                  account={account}
                  size="xl"
                  className="border-4 border-[var(--app-surface)] shadow-sm"
                />
                <label className="absolute -bottom-2 -right-3 cursor-pointer rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-[11px] font-black text-[var(--app-text)] shadow-sm transition hover:border-[var(--app-border-strong)]">
                  {savingAvatar ? "Saving" : "Photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarChange}
                    disabled={savingAvatar}
                  />
                </label>
              </div>

              {/* Animated toast */}
              {(toastVisible || notice) && (
                <div
                  className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold profile-toast ${
                    toastVisible && !toastHiding ? "profile-toast--in" : "profile-toast--out"
                  } ${
                    notice?.type === "success"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                      : "border-red-500/30 bg-red-500/10 text-red-600"
                  }`}
                >
                  {notice?.message}
                </div>
              )}

              {!editing ? (
                <div className="mt-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-3xl font-bold">{account.name}</h2>
                      <p className="mt-1 text-sm text-[var(--app-muted)]">{account.email}</p>
                    </div>

                    <button
                      type="button"
                      onClick={beginEdit}
                      className="rounded-xl border border-[var(--app-border)] px-3 py-2 text-xs font-semibold text-[var(--app-muted-strong)] transition hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]"
                    >
                      Edit
                    </button>
                  </div>

                  <dl className="mt-8 space-y-5 text-sm">
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-[var(--app-muted)]">
                        Member since
                      </dt>
                      <dd className="mt-1 font-semibold text-[var(--app-text)]">
                        {formatAccountDate(account.createdAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-[var(--app-muted)]">
                        Student plan
                      </dt>
                      <dd className="mt-1 font-semibold text-[var(--app-text)]">CCNY workspace</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-widest text-[var(--app-muted)]">
                        Profile ID
                      </dt>
                      <dd className="mt-1 truncate font-mono text-xs text-[var(--app-muted-strong)]">
                        {account.id}
                      </dd>
                    </div>
                  </dl>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-8 w-full rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 transition"
                  >
                    Log out
                  </button>

                  {!isGoogleManaged && (
                    <Link
                      href="/reset-password?source=settings"
                      className="mt-3 flex w-full items-center justify-center rounded-2xl border border-[var(--app-border)] px-5 py-3 text-sm font-semibold text-[var(--app-muted-strong)] transition hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]"
                    >
                      Change password
                    </Link>
                  )}

                  {/* Danger zone: Delete account */}
                  <div className="mt-6 rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-50/6 to-transparent p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-red-400">Danger Zone</p>
                    <h3 className="mt-2 text-lg font-bold text-red-500">Delete Account</h3>
                    <p className="mt-1 text-sm text-[var(--app-muted)]">Permanently delete your account and all associated data. This action cannot be undone.</p>
                    <button
                      type="button"
                      onClick={() => setShowDeleteStage(1)}
                      className="mt-4 w-full rounded-2xl border border-red-500/40 bg-red-600/5 px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-600/10"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={saveProfile} className="mt-6 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[var(--app-muted)]">
                      Name
                    </span>
                    <input
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--app-border-strong)]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[var(--app-muted)]">
                      Email
                    </span>
                    <input
                      value={draftEmail}
                      onChange={(event) => setDraftEmail(event.target.value)}
                      disabled={isGoogleManaged}
                      placeholder={isGoogleManaged ? "Managed by Google" : undefined}
                      className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--app-border-strong)]"
                      type="email"
                    />
                    {draftEmail.trim().toLowerCase() !== account.email && !isGoogleManaged && (
                      <span className="mt-2 block text-xs leading-5 text-[var(--app-muted)]">
                        We will send a confirmation link to the new email. The login email changes
                        after the link is confirmed.
                      </span>
                    )}
                    {isGoogleManaged && (
                      <span className="mt-2 block text-xs leading-5 text-[var(--app-muted)]">
                        This account is managed by Google; email cannot be changed here.
                      </span>
                    )}
                  </label>

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setError("");
                      }}
                      disabled={savingProfile}
                      className="rounded-2xl border border-[var(--app-border)] px-4 py-3 text-sm font-semibold text-[var(--app-muted-strong)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="rounded-2xl bg-[var(--app-text)] px-4 py-3 text-sm font-semibold text-[var(--app-bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingProfile ? "Saving..." : "Save"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-widest text-[var(--app-muted)]">
                    Academic setup
                  </p>
                  <h2 className="text-2xl font-bold">
                    {major ? major.name : "No major selected"}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--app-muted)]">
                    {major ? `${major.code} · ${major.school}` : "Choose a major to personalize the app."}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link
                    href="/majors?from=account"
                    className="rounded-2xl border border-[var(--app-border)] px-5 py-3 text-center text-sm font-semibold text-[var(--app-muted-strong)] transition hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]"
                  >
                    {major ? "Change Major" : "Choose Major"}
                  </Link>

                  {major && (
                    <Link
                      href={`/dashboard/${major.code}?from=account`}
                      className="rounded-2xl bg-[var(--app-text)] px-5 py-3 text-center text-sm font-semibold text-[var(--app-bg)] transition hover:opacity-90"
                    >
                      Manage Courses
                    </Link>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <StatCard label="Saved courses" value={String(courses.length)} />
                <StatCard label="Major" value={major?.code ?? "None"} />
                <StatCard label="Storage" value="Local" />
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-widest text-[var(--app-muted)]">
                    Theme
                  </p>
                  <h2 className="text-2xl font-bold">Appearance</h2>
                  <p className="mt-1 text-sm text-[var(--app-muted)]">
                    This preference follows you across dashboard, courses, and study tools.
                  </p>
                </div>

                <div className="w-full lg:w-80">
                  <ThemeToggle />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
              <p className="mb-2 text-xs uppercase tracking-widest text-[var(--app-muted)]">
                Workspace data
              </p>
              <h2 className="text-2xl font-bold">Saved on this browser</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                Your account profile links together local major selection, selected courses,
                AI chats, flashcards, notes, quiz results, and progress tracking.
              </p>
            </div>
          </section>
        </div>
      </div>

      {showDeleteStage > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-md modal-overlay" onClick={() => { if (!deleting) setShowDeleteStage(0); }} />

          <div className="relative z-10 mx-4 w-full max-w-[480px] rounded-2xl bg-[var(--app-surface)] p-6 text-center shadow-2xl modal-card">
            {/* Stage 1: Compact centered confirmation */}
            {showDeleteStage === 1 && (
              <div className="space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-red-500 p-2 modal-icon">
                  <div className="warning-icon" aria-hidden />
                </div>

                <h2 className="text-2xl font-semibold">Delete Account</h2>
                <p className="text-sm font-medium text-[var(--app-muted-strong)]">Deleting your account will permanently remove:</p>

                <ul className="mt-2 space-y-2 text-left">
                  {[
                    "AI conversations",
                    "Notes",
                    "Study history",
                    "Progress",
                    "Profile data",
                  ].map((item, idx) => (
                    <li key={item} className="flex items-start gap-3 opacity-0 animate-list-fade" style={{ animationDelay: `${idx * 80}ms` }}>
                      <span className="mt-1 inline-block h-2 w-2 flex-none rounded-full bg-[var(--app-accent)]/90" />
                      <span className="text-sm font-medium text-[var(--app-text)]">{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => setShowDeleteStage(0)}
                    className="keep-btn rounded-2xl px-5 py-3 text-sm font-semibold"
                    disabled={deleting}
                  >
                    Keep Account
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDeleteStage(2)}
                    className="delete-btn rounded-2xl border border-red-400 px-5 py-3 text-sm font-semibold text-red-600"
                    disabled={deleting}
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            )}

            {/* Stage 2: Final confirmation */}
            {showDeleteStage === 2 && (
              <div className="space-y-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-[var(--app-surface-muted)] flex items-center justify-center">
                  <div className="warning-icon small" aria-hidden />
                </div>

                <h2 className="text-2xl font-semibold">Final confirmation</h2>
                <p className="text-sm font-medium text-[var(--app-muted-strong)]">This action cannot be reversed. Once deleted, your workspace and study history are gone forever.</p>

                {deletionError && <p className="mt-2 text-sm text-red-500">{deletionError}</p>}

                <div className="mx-auto mt-2 h-1 w-full rounded-full bg-[var(--app-surface-muted)] overflow-hidden">
                  <div className={`progress-line ${deleting ? "progress-line-active" : ""}`} />
                </div>

                <div className="mt-5 flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => setShowDeleteStage(1)}
                    className="keep-btn rounded-2xl px-5 py-3 text-sm font-semibold"
                    disabled={deleting}
                  >
                    Go Back
                  </button>

                  <button
                    type="button"
                    onClick={() => performAccountDeletion()}
                    className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white"
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Delete Forever"}
                  </button>
                </div>
              </div>
            )}

            {/* Stage 3: Goodbye with crying sphere */}
            {showDeleteStage === 3 && (
              <div className="space-y-6 py-4">
                <div className="mx-auto relative flex h-40 w-40 items-center justify-center">
                  <div className="sphere">
                    <div className="eye left" />
                    <div className="eye right" />
                    <div className="tear t1" />
                    <div className="tear t2" />
                  </div>
                  <div className="particles" aria-hidden>
                    <div className="p p1" />
                    <div className="p p2" />
                    <div className="p p3" />
                    <div className="p p4" />
                  </div>
                </div>

                <h2 className="text-2xl font-semibold">Goodbye.</h2>
                <p className="mx-auto max-w-xs text-sm text-[var(--app-muted-strong)]">Thank you for being part of CCNY Study AI. We hope we helped you learn something new. You’re always welcome back.</p>
              </div>
            )}
          </div>
        </div>
      )}

    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-4">
      <p className="text-xs uppercase tracking-widest text-[var(--app-muted)]">{label}</p>
      <p className="mt-2 truncate text-lg font-bold text-[var(--app-text)]">{value}</p>
    </div>
  );
}
