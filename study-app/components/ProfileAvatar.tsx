import { AccountProfile } from "@/lib/account";

type ProfileAvatarSize = "sm" | "md" | "lg" | "xl";

type ProfileAvatarProps = {
  account: AccountProfile;
  size?: ProfileAvatarSize;
  className?: string;
};

const sizeClasses: Record<ProfileAvatarSize, string> = {
  sm: "h-7 w-7 rounded-lg text-[11px]",
  md: "h-8 w-8 rounded-lg text-xs",
  lg: "h-20 w-20 rounded-3xl text-2xl",
  xl: "h-28 w-28 rounded-full text-4xl",
};

export function ProfileAvatar({ account, size = "md", className = "" }: ProfileAvatarProps) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-[var(--app-accent-soft)] font-black text-[var(--app-accent)] ${sizeClasses[size]} ${className}`}
      aria-hidden="true"
    >
      {account.avatarUrl ? (
        <span
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${account.avatarUrl})` }}
        />
      ) : (
        account.initials
      )}
    </span>
  );
}
