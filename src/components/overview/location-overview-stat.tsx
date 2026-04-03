import { cn } from "@/lib/utils";

type LocationOverviewStatProps = {
  label: string;
  value?: string;
  footer?: string;
  selected?: boolean;
};

export function LocationOverviewStat({ label, value, footer, selected = false }: LocationOverviewStatProps) {
  return (
    <div
      className={cn(
        "rounded-none p-3 transition-colors duration-500",
        selected ? "bg-slate-950/6" : "bg-slate-950/30 group-hover:bg-slate-950/6",
      )}
    >
      <p
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors duration-500",
          selected ? "text-slate-500" : "text-slate-500 group-hover:text-slate-500",
        )}
      >
        {label}
      </p>
      {value ? (
        <p
          className={cn(
            "mt-2 text-lg font-semibold transition-colors duration-500",
            selected ? "text-slate-950" : "text-slate-100 group-hover:text-slate-950",
          )}
        >
          {value}
        </p>
      ) : null}
      {footer ? (
        <p
          className={cn(
            `${value ? "mt-3" : "mt-2"} text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors duration-500`,
            selected ? "text-slate-500" : "text-slate-500 group-hover:text-slate-500",
          )}
        >
          {footer}
        </p>
      ) : null}
    </div>
  );
}
