import { useState } from "react";

function useFetch(baseUrl) {
  const [isFetching, setIsFetching] = useState(false);

  const get = async (
    url,
    method = "GET",
    // headers = { "Content-Type": "application/json" }, // was causing a CORS error
    headers = {},
    options
  ) => {
    setIsFetching(true);

    const finalUrl = baseUrl + url;

    try {
      // console.log("Fetching url: ", finalUrl);
      const response = await fetch(finalUrl, { method, headers, ...options });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Request received code: ${response.status}`);
      }

      return data;
    } catch (err) {
      throw(err);
    } finally {
      setIsFetching(false);
    }
  };

  return {
    isFetching,
    get,
  }
}

export default useFetch;
