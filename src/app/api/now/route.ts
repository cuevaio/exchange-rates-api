export const runtime = "edge";
export const revalidate = 5;

type ExchangeHouse = {
  entity: string;
  buy: number;
  sell: number;
  website: string;
  banks: string[];
  logo: string | null;
};

const MIN_RATE = 3;
const MAX_RATE = 5;

function sanitizeWebsite(site: string) {
  return site
    .replace(/ced/gi, "cuevaio")
    .replace(/cuanto-esta-el-dolar/gi, "cuevaio")
    .replace(/Cuanto_esta_el_Dolar/gi, "cuevaio");
}

function splitBanks(bank: string) {
  return bank
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function sanitizeLogoUrl(url?: string | null) {
  if (!url) {
    return null;
  }

  const trimmed = url.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.replace(/^http:\/\//i, "https://");
  }

  return null;
}

function resolveLogoUrl(house: {
  img?: string;
  dataConverter?: {
    logo?: string | null;
  };
}) {
  const preferredLogo = sanitizeLogoUrl(house.dataConverter?.logo ?? null);
  const fallbackLogo = sanitizeLogoUrl(house.img ?? null);

  if (preferredLogo) {
    return preferredLogo;
  }

  if (fallbackLogo && !fallbackLogo.includes("1700582713774-tkambio.svg")) {
    return fallbackLogo;
  }

  return null;
}

function isValidEntity(entity: string) {
  const normalized = entity.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  return !normalized.startsWith("prueba") && !normalized.includes("test");
}

function decodeFlightChunks(html: string) {
  const chunks = Array.from(
    html.matchAll(/self\.__next_f\.push\(\[1,\s*"((?:\\.|[^"\\])*)"\]\)/g)
  );

  if (chunks.length === 0) {
    return null;
  }

  return chunks
    .map((chunk) => JSON.parse(`"${chunk[1]}"`) as string)
    .join("");
}

function extractExchangeHousesJson(payload: string) {
  const marker = '"exchangeHouses":[';
  const start = payload.indexOf(marker);

  if (start === -1) {
    return null;
  }

  let cursor = start + marker.length - 1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (; cursor < payload.length; cursor += 1) {
    const char = payload[cursor];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "[") {
      depth += 1;
      continue;
    }

    if (char === "]") {
      depth -= 1;

      if (depth === 0) {
        return payload.slice(start + marker.length - 1, cursor + 1);
      }
    }
  }

  return null;
}

function parseExchangeHouses(payload: string): ExchangeHouse[] {
  const exchangeHousesJson = extractExchangeHousesJson(payload);

  if (!exchangeHousesJson) {
    return [];
  }

  const exchangeHouses = JSON.parse(exchangeHousesJson) as Array<{
    title?: string;
    img?: string;
    site?: string;
    bank?: string;
    dataConverter?: {
      logo?: string | null;
    };
    rates?: {
      buy?: { cost?: string | number | null };
      sale?: { cost?: string | number | null };
    };
  }>;

  return exchangeHouses
    .map((house) => {
      const entity = house.title?.trim() ?? "";
      const buy = Number(house.rates?.buy?.cost ?? Number.NaN);
      const sell = Number(house.rates?.sale?.cost ?? Number.NaN);
      const website = sanitizeWebsite(house.site?.trim() ?? "");
      const banks = house.bank ? splitBanks(house.bank) : [];
      const logo = resolveLogoUrl(house);

      return {
        entity,
        buy,
        sell,
        website,
        banks,
        logo,
      };
    })
    .filter(
      (house) =>
        isValidEntity(house.entity) &&
        Number.isFinite(house.buy) &&
        Number.isFinite(house.sell) &&
        house.buy >= MIN_RATE &&
        house.buy <= MAX_RATE &&
        house.sell >= MIN_RATE &&
        house.sell <= MAX_RATE
    );
}

export async function GET() {
  const url = "https://cuantoestaeldolar.pe/cambio-de-dolar-online";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        referer: "https://cuantoestaeldolar.pe/",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      return Response.json({ error: "upstream error" }, { status: 502 });
    }

    const page = await response.text();
    const payload = decodeFlightChunks(page);

    if (!payload) {
      return Response.json({ error: "payload not found" }, { status: 500 });
    }

    const houses = parseExchangeHouses(payload);

    if (houses.length === 0) {
      return Response.json({ error: "rates not found" }, { status: 500 });
    }

    const sellAvg = houses.reduce((acc, curr) => acc + curr.sell, 0) / houses.length;
    const buyAvg = houses.reduce((acc, curr) => acc + curr.buy, 0) / houses.length;

    const minSell = Math.min(...houses.map((house) => house.sell));
    const maxBuy = Math.max(...houses.map((house) => house.buy));

    return Response.json({
      updatedAt: new Date().toISOString(),
      best: {
        maxBuy: {
          ...houses.find((house) => house.buy === maxBuy),
          value: maxBuy,
          buy: undefined,
          sell: undefined,
        },
        minSell: {
          ...houses.find((house) => house.sell === minSell),
          value: minSell,
          buy: undefined,
          sell: undefined,
        },
      },
      meta: {
        buyAvg: Math.round(buyAvg * 1000) / 1000,
        sellAvg: Math.round(sellAvg * 1000) / 1000,
        count: houses.length,
      },
      houses,
    });
  } catch {
    return Response.json({ error: "error" }, { status: 500 });
  }
}
