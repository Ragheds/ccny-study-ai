import Image from "next/image";

type BrandMarkSize = "sm" | "md" | "lg" | "xl";
type BrandMarkVariant = "home" | "app" | "footer";

type BrandMarkProps = {
  size?: BrandMarkSize;
  variant?: BrandMarkVariant;
  priority?: boolean;
  className?: string;
};

const sizeClasses: Record<BrandMarkSize, string> = {
  sm: "h-9 w-9 rounded-xl",
  md: "h-10 w-10 rounded-lg",
  lg: "h-11 w-11 rounded-xl",
  xl: "h-12 w-12 rounded-2xl",
};

const variantClasses: Record<BrandMarkVariant, string> = {
  home: "border-white/[0.18] bg-white shadow-[0_0_24px_rgba(255,255,255,0.12)]",
  app: "border-0 bg-transparent shadow-none",
  footer: "border-white/[0.14] bg-white shadow-[0_0_24px_rgba(124,77,255,0.18)]",
};

const srcByVariant: Record<BrandMarkVariant, string> = {
  home: "/benny-beaver.png",
  app: "/benny-beaver-transparent.png",
  footer: "/benny-beaver.png",
};

const imageClasses: Record<BrandMarkVariant, string> = {
  home: "h-full w-full scale-[1.2] object-cover",
  app: "h-full w-full scale-[1.18] object-contain",
  footer: "h-full w-full scale-[1.2] object-cover",
};

export function BrandMark({
  size = "md",
  variant = "app",
  priority = false,
  className = "",
}: BrandMarkProps) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden border ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      aria-hidden="true"
    >
      <Image
        src={srcByVariant[variant]}
        alt=""
        width={96}
        height={96}
        priority={priority}
        className={imageClasses[variant]}
      />
    </span>
  );
}
