import { useState, useEffect } from "react";

export default function useEthPrice() {
  const [ethPrice, setEthPrice] = useState();

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(
          "https://api.exchange.coinbase.com/products/eth-dai/ticker"
        );
        const ethPrice = (await res.json()).price;

        setEthPrice(ethPrice);
      } catch (err) {
        console.error(err);
      }
    };

    const timerId = setInterval(fetchPrice, 10000);

    fetchPrice();

    return () => clearInterval(timerId);
  }, []);

  return ethPrice;
}
