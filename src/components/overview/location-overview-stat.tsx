import { cn } from "@/lib/utils";

type LocationOverviewStatProps = {
  label: string;
  value?: string;
  footer?: string;
};

export function LocationOverviewStat({ label, value, footer }: LocationOverviewStatProps) {
  return (
    <div className="rounded-none bg-slate-950/30 p-3 transition-colors duration-500 group-hover:bg-slate-950/6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 transition-colors duration-500 group-hover:text-slate-500">
        {label}
      </p>
      {value ? (
        <p className="mt-2 text-lg font-semibold text-slate-100 transition-colors duration-500 group-hover:text-slate-950">
          {value}
        </p>
      ) : null}
      {footer ? (
        <p
          className={cn(
            `${value ? "mt-3" : "mt-2"} text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 transition-colors duration-500 group-hover:text-slate-500`,
          )}
        >
          {footer}
        </p>
      ) : null}
    </div>
  );
}
