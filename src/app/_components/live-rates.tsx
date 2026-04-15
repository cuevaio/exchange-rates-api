"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type House = {
  entity: string;
  buy: number;
  sell: number;
  website: string;
  banks: string[];
  logo: string | null;
};

type ApiResponse = {
  updatedAt: string;
  best: {
    maxBuy?: {
      entity: string;
      value: number;
    };
    minSell?: {
      entity: string;
      value: number;
    };
  };
  meta: {
    buyAvg: number;
    sellAvg: number;
    count: number;
  };
  houses: House[];
};

type SortKey = "default" | "buy-desc" | "sell-asc" | "name-asc";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "default", label: "Live order" },
  { value: "buy-desc", label: "Best buy" },
  { value: "sell-asc", label: "Best sell" },
  { value: "name-asc", label: "Name" },
];

async function fetchRates() {
  const response = await fetch("/api/now", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Unable to load rates");
  }

  return (await response.json()) as ApiResponse;
}

function formatRate(value: number) {
  return value.toFixed(3);
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function LogoFallback({ entity }: { entity: string }) {
  return <span className="house-logo-fallback">{entity.slice(0, 1).toUpperCase()}</span>;
}

export function LiveRates() {
  const [sort, setSort] = useState<SortKey>("default");
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["live-rates"],
    queryFn: fetchRates,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  const houses = useMemo(() => {
    if (!data) {
      return [];
    }

    const items = [...data.houses];

    switch (sort) {
      case "buy-desc":
        return items.sort((left, right) => right.buy - left.buy);
      case "sell-asc":
        return items.sort((left, right) => left.sell - right.sell);
      case "name-asc":
        return items.sort((left, right) => left.entity.localeCompare(right.entity));
      default:
        return items;
    }
  }, [data, sort]);

  if (isLoading) {
    return <section className="rates-panel">Loading live exchange houses...</section>;
  }

  if (!data || isError) {
    return (
      <section className="rates-panel">
        {error instanceof Error ? error.message : "Live rates are temporarily unavailable."}
      </section>
    );
  }

  return (
    <section className="rates-panel">
      <div className="summary-grid">
        <div className="summary-item">
          <span className="summary-label">Best buy</span>
          <strong className="summary-value">{data.best.maxBuy?.entity ?? "-"}</strong>
          <span className="summary-meta">S/ {data.best.maxBuy?.value.toFixed(3) ?? "-"}</span>
        </div>

        <div className="summary-item">
          <span className="summary-label">Best sell</span>
          <strong className="summary-value">{data.best.minSell?.entity ?? "-"}</strong>
          <span className="summary-meta">S/ {data.best.minSell?.value.toFixed(3) ?? "-"}</span>
        </div>

        <div className="summary-item">
          <span className="summary-label">Market average</span>
          <strong className="summary-value">S/ {data.meta.buyAvg.toFixed(3)}</strong>
          <span className="summary-meta">Sell avg S/ {data.meta.sellAvg.toFixed(3)}</span>
        </div>
      </div>

      <div className="rates-meta">
        <div className="rates-status">
          <span>{data.meta.count} houses tracked</span>
          <span>Updated {formatUpdatedAt(data.updatedAt)}</span>
        </div>

        <div className="sort-control">
          <span>Sort</span>
          <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
            <SelectTrigger className="sort-trigger" aria-label="Sort exchange houses">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ul className="houses-list">
        {houses.map((house) => (
          <li className="house-row" key={`${house.entity}-${house.website || house.buy}`}>
            <a
              className="house-link"
              href={house.website || undefined}
              target="_blank"
              rel="noreferrer"
            >
              <div className="house-main">
                <div className="house-logo" aria-hidden="true">
                  {house.logo ? (
                    <img
                      src={house.logo}
                      alt=""
                      width={40}
                      height={40}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                        const next = event.currentTarget.nextElementSibling as HTMLElement | null;

                        if (next) {
                          next.style.display = "inline-flex";
                        }
                      }}
                    />
                  ) : null}
                  <span style={{ display: house.logo ? "none" : "inline-flex" }}>
                    <LogoFallback entity={house.entity} />
                  </span>
                </div>

                <div>
                  <div className="house-name-row">
                    <strong>{house.entity}</strong>
                  </div>

                  {house.banks.length > 0 ? (
                    <p className="house-banks">{house.banks.join(" • ")}</p>
                  ) : null}
                </div>
              </div>

              <div className="house-rates">
                <div>
                  <span className="rate-label">Buy</span>
                  <strong>S/ {formatRate(house.buy)}</strong>
                </div>

                <div>
                  <span className="rate-label">Sell</span>
                  <strong>S/ {formatRate(house.sell)}</strong>
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
