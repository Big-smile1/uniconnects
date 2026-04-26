import { cn } from "@/lib/utils";
import mtuLogo from "@/assets/mtu-logo.png";

export function Logo({ className, variant = "dark" }: { className?: string; variant?: "dark" | "light" }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={mtuLogo}
        alt="Mountain Top University crest"
        className="h-11 w-11 shrink-0 object-contain"
      />
      <div className="leading-tight">
        <div className="font-serif text-base font-semibold tracking-tight">Mountain Top University</div>
        <div
          className={cn(
            "text-[10px] uppercase tracking-[0.18em]",
            variant === "dark" ? "text-muted-foreground" : "text-sidebar-accent-foreground/70",
          )}
        >
          Empowered to Excel
        </div>
      </div>
    </div>
  );
}
