import Image from "next/image";

import { cn } from "@/lib/utils";

const flagByLocationSlug: Record<string, { src: string; alt: string }> = {
  berlin: {
    src: "/flags/germany.png",
    alt: "Flag of Germany",
  },
  barcelona: {
    src: "/flags/spain.png",
    alt: "Flag of Spain",
  },
  chicago: {
    src: "/flags/united-states.png",
    alt: "Flag of the United States",
  },
  frankfurt: {
    src: "/flags/germany.png",
    alt: "Flag of Germany",
  },
  hamburg: {
    src: "/flags/germany.png",
    alt: "Flag of Germany",
  },
  london: {
    src: "/flags/united-kingdom.png",
    alt: "Flag of the United Kingdom",
  },
  "los-angeles": {
    src: "/flags/united-states.png",
    alt: "Flag of the United States",
  },
  luton: {
    src: "/flags/united-kingdom.png",
    alt: "Flag of the United Kingdom",
  },
  milan: {
    src: "/flags/italy.png",
    alt: "Flag of Italy",
  },
  "new-york-city": {
    src: "/flags/united-states.png",
    alt: "Flag of the United States",
  },
  paris: {
    src: "/flags/france.png",
    alt: "Flag of France",
  },
  rome: {
    src: "/flags/italy.png",
    alt: "Flag of Italy",
  },
  "san-francisco": {
    src: "/flags/united-states.png",
    alt: "Flag of the United States",
  },
  valencia: {
    src: "/flags/spain.png",
    alt: "Flag of Spain",
  },
};

type LocationFlagProps = {
  slug: string;
  variant: "card" | "list";
  selected?: boolean;
};

export function LocationFlag({ slug, variant, selected = false }: LocationFlagProps) {
  const flag = flagByLocationSlug[slug];

  if (!flag) {
    return null;
  }

  if (variant === "list") {
    return (
      <div
        className={cn(
          "relative h-8 w-11 shrink-0 overflow-hidden border shadow-[0_8px_24px_rgba(15,23,42,0.18)]",
          selected ? "border-slate-300/70 bg-white/85" : "border-white/10 bg-white/[0.04]",
        )}
      >
        <Image alt={flag.alt} className="object-cover object-center" fill sizes="44px" src={flag.src} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute right-5 top-5 z-0 h-[21%] min-h-[3.6rem] w-[23%] min-w-[5.1rem] transition-all duration-500",
        selected ? "opacity-88" : "opacity-45 group-hover:opacity-95",
      )}
    >
      <div
        className={cn(
          "relative h-full w-full overflow-hidden border shadow-[0_10px_30px_rgba(15,23,42,0.18)] transition-colors duration-500",
          selected
            ? "border-slate-300/85 bg-white/85"
            : "border-white/10 bg-white/[0.04] group-hover:border-slate-300/80 group-hover:bg-white/80",
        )}
      >
        <Image
          alt={flag.alt}
          className={cn(
            "object-cover object-center transition-transform duration-500",
            selected ? "scale-[1.01]" : "group-hover:scale-[1.02]",
          )}
          fill
          sizes="(min-width: 768px) 9rem, 7rem"
          src={flag.src}
        />
      </div>
    </div>
  );
}
