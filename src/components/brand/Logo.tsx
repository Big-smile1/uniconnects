import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, variant = "dark" }: { className?: string; variant?: "dark" | "light" }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md",
          variant === "dark" ? "bg-primary text-primary-foreground" : "bg-gold text-gold-foreground",
        )}
      >
        <GraduationCap className="h-5 w-5" />
      </span>
      <div className="leading-none">
        <div className="font-serif text-lg font-semibold tracking-tight">EduLink</div>
        <div className={cn("text-[10px] uppercase tracking-[0.18em]", variant === "dark" ? "text-muted-foreground" : "text-sidebar-accent-foreground/70")}>
          Nigeria
        </div>
      </div>
    </div>
  );
}
