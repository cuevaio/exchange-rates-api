export async function GET() {
  const url =
    "https://cuantoestaeldolar.pe/_next/data/Nhze7u0ZXc8u_4onczCKt/cambio-de-dolar-online.json";
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
    const data = await response.json();
    console.log(data);

    const er: Array<{ entity: string; buy: number; sell: number }> =
      data.pageProps.onlineExchangeHouses.map((ex: any) => ({
        entity: ex.title as string,
        buy: Number(ex.rates.buy.cost),
        sell: Number(ex.rates.sale.cost),
      }));

    const sellAvg = er.reduce((acc, curr) => acc + curr.sell, 0) / er.length;
    const buyAvg = er.reduce((acc, curr) => acc + curr.buy, 0) / er.length;

    return Response.json({
      meta: {
        sellAvg,
        buyAvg,
        count: er.length,
      },
      data: er,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "error" }, { status: 500 });
  }
}
