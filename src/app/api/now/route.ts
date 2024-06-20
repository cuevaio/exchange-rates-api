export const runtime = "edge";

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
    next: { revalidate: 60 },
  };

  try {
    const response = await fetch(url, options);

    const page = await response.text();

    // inside         <script id="__NEXT_DATA__" type="application/json">

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
    console.log(data.props.pageProps.onlineExchangeHouses);

    const er: Array<{ entity: string; buy: number; sell: number }> =
      data.props.pageProps.onlineExchangeHouses.map((ex: any) => ({
        entity: ex.title as string,
        buy: Number(ex.rates.buy.cost),
        sell: Number(ex.rates.sale.cost),
      }));

    const sellAvg = er.reduce((acc, curr) => acc + curr.sell, 0) / er.length;
    const buyAvg = er.reduce((acc, curr) => acc + curr.buy, 0) / er.length;

    return Response.json({
      updatedAt: new Date().toISOString(),
      meta: {
        sellAvg: Math.round(sellAvg * 1000) / 1000,
        buyAvg: Math.round(buyAvg * 1000) / 1000,
        count: er.length,
      },
      data: er,
    });
  } catch (error) {
    return Response.json({ error: "error" }, { status: 500 });
  }
}
