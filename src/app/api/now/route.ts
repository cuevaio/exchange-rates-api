export const runtime = "edge";
export const revalidate = 5;

export async function GET() {
  const url = "https://cuantoestaeldolar.pe";
  const options = {
    method: "GET",
    headers: {
      authority: "cuantoestaeldolar.pe",
      accept: "/",
      "accept-language": "en-US,en;q=0.9",
      referer: "https://cuantoestaeldolar.pe/",
      "sec-ch-ua-mobile": "?0",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
    },
  };

  try {
    const response = await fetch(url, options);

    const page = await response.text();

    // inside <script id="__NEXT_DATA__" type="application/json">
    const match = page.match(
      /<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/
    );

    if (!match) {
      return Response.json(
        { error: "Ups, it doesn't love you" },
        { status: 500 }
      );
    }

    const data = JSON.parse(match[1]);

    const er: Array<{ entity: string; buy: number; sell: number }> =
      data.props.pageProps.onlineExchangeHouses.map((ex: any) => ({
        entity: ex.title as string,
        buy: Number(ex.rates.buy.cost),
        sell: Number(ex.rates.sale.cost),
        // replace all ced to cuevaio ignore case
        // replace "cuanto-esta-el-dolar" to "cuevaio"
        // replace "Cuanto_esta_el_Dolar" to "cuevaio"
        website: ex.site
          .replace(/ced/gi, "cuevaio")
          .replace(/cuanto-esta-el-dolar/gi, "cuevaio")
          .replace(/Cuanto_esta_el_Dolar/gi, "cuevaio"),
        banks: ex.bank ? ex.bank.split(",").map((x: string) => x.trim()) : [],
      }));

    const sellAvg = er.reduce((acc, curr) => acc + curr.sell, 0) / er.length;
    const buyAvg = er.reduce((acc, curr) => acc + curr.buy, 0) / er.length;

    const minSell = Math.min(...er.map((e) => e.sell));
    const maxBuy = Math.max(...er.map((e) => e.buy));

    return Response.json({
      updatedAt: new Date().toISOString(),
      best: {
        maxBuy: {
          ...er.find((e) => e.buy === maxBuy),
          value: maxBuy,
          buy: undefined,
          sell: undefined,
        },
        minSell: {
          ...er.find((e) => e.sell === minSell),
          value: minSell,
          buy: undefined,
          sell: undefined,
        },
      },
      meta: {
        buyAvg: Math.round(buyAvg * 1000) / 1000,
        sellAvg: Math.round(sellAvg * 1000) / 1000,
        count: er.length,
      },
      houses: er,
    });
  } catch (error) {
    return Response.json({ error: "error" }, { status: 500 });
  }
}
