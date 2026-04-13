import Image from "next/image";

import { cn } from "@/lib/utils";

const flagByLocationSlug: Record<string, { src: string; alt: string }> = {
  austin: {
    src: "/flags/united-states.png",
    alt: "Flag of the United States",
  },
  "buenos-aires": {
    src: "/flags/argentina.png",
    alt: "Flag of Argentina",
  },
  berlin: {
    src: "/flags/germany.png",
    alt: "Flag of Germany",
  },
  barcelona: {
    src: "/flags/spain.png",
    alt: "Flag of Spain",
  },
  budapest: {
    src: "/flags/hungary.png",
    alt: "Flag of Hungary",
  },
  birmingham: {
    src: "/flags/united-kingdom.png",
    alt: "Flag of the United Kingdom",
  },
  chicago: {
    src: "/flags/united-states.png",
    alt: "Flag of the United States",
  },
  cleveland: {
    src: "/flags/united-states.png",
    alt: "Flag of the United States",
  },
  dallas: {
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
  "hong-kong": {
    src: "/flags/hong-kong.png",
    alt: "Flag of Hong Kong",
  },
  houston: {
    src: "/flags/united-states.png",
    alt: "Flag of the United States",
  },
  "johor-bahru": {
    src: "/flags/malaysia.png",
    alt: "Flag of Malaysia",
  },
  "kuala-lumpur": {
    src: "/flags/malaysia.png",
    alt: "Flag of Malaysia",
  },
  london: {
    src: "/flags/united-kingdom.png",
    alt: "Flag of the United Kingdom",
  },
  louisville: {
    src: "/flags/united-states.png",
    alt: "Flag of the United States",
  },
  "los-angeles": {
    src: "/flags/united-states.png",
    alt: "Flag of the United States",
  },
  luton: {
    src: "/flags/united-kingdom.png",
    alt: "Flag of the United Kingdom",
  },
  manchester: {
    src: "/flags/united-kingdom.png",
    alt: "Flag of the United Kingdom",
  },
  milan: {
    src: "/flags/italy.png",
    alt: "Flag of Italy",
  },
  melbourne: {
    src: "/flags/australia.png",
    alt: "Flag of Australia",
  },
  montevideo: {
    src: "/flags/uruguay.png",
    alt: "Flag of Uruguay",
  },
  minneapolis: {
    src: "/flags/united-states.png",
    alt: "Flag of the United States",
  },
  munich: {
    src: "/flags/germany.png",
    alt: "Flag of Germany",
  },
  "new-york-city": {
    src: "/flags/united-states.png",
    alt: "Flag of the United States",
  },
  paris: {
    src: "/flags/france.png",
    alt: "Flag of France",
  },
  phoenix: {
    src: "/flags/united-states.png",
    alt: "Flag of the United States",
  },
  rome: {
    src: "/flags/italy.png",
    alt: "Flag of Italy",
  },
  "sao-paulo": {
    src: "/flags/brazil.png",
    alt: "Flag of Brazil",
  },
  "san-francisco": {
    src: "/flags/united-states.png",
    alt: "Flag of the United States",
  },
  seattle: {
    src: "/flags/united-states.png",
    alt: "Flag of the United States",
  },
  sydney: {
    src: "/flags/australia.png",
    alt: "Flag of Australia",
  },
  tokyo: {
    src: "/flags/japan.png",
    alt: "Flag of Japan",
  },
  valencia: {
    src: "/flags/spain.png",
    alt: "Flag of Spain",
  },
};

const flagByCountry: Record<string, { src: string; alt: string }> = {
  Argentina: {
    src: "/flags/argentina.png",
    alt: "Flag of Argentina",
  },
  Australia: {
    src: "/flags/australia.png",
    alt: "Flag of Australia",
  },
  Brazil: {
    src: "/flags/brazil.png",
    alt: "Flag of Brazil",
  },
  France: {
    src: "/flags/france.png",
    alt: "Flag of France",
  },
  Germany: {
    src: "/flags/germany.png",
    alt: "Flag of Germany",
  },
  Italy: {
    src: "/flags/italy.png",
    alt: "Flag of Italy",
  },
  Japan: {
    src: "/flags/japan.png",
    alt: "Flag of Japan",
  },
  Hungary: {
    src: "/flags/hungary.png",
    alt: "Flag of Hungary",
  },
  Malaysia: {
    src: "/flags/malaysia.png",
    alt: "Flag of Malaysia",
  },
  Spain: {
    src: "/flags/spain.png",
    alt: "Flag of Spain",
  },
  Uruguay: {
    src: "/flags/uruguay.png",
    alt: "Flag of Uruguay",
  },
  "Hong Kong": {
    src: "/flags/hong-kong.png",
    alt: "Flag of Hong Kong",
  },
  "United Kingdom": {
    src: "/flags/united-kingdom.png",
    alt: "Flag of the United Kingdom",
  },
  "United States": {
    src: "/flags/united-states.png",
    alt: "Flag of the United States",
  },
};

type LocationFlagProps = {
  slug: string;
  country?: string;
  variant: "card" | "list";
  selected?: boolean;
};

export function LocationFlag({ slug, country, variant, selected = false }: LocationFlagProps) {
  const flag = flagByLocationSlug[slug] ?? (country ? flagByCountry[country] : null);

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
