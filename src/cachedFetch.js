import logger from "./logger";

const fetchCache = {};
export const cachedFetch = async (url, params, useCache) => {
  if (
    fetchCache[url] &&
    fetchCache[url].res &&
    (!fetchCache[url].expired || useCache)
  ) {
    fetchCache[url].count = fetchCache[url].count + 1;
    logger.debug(url, "Cached used count:", fetchCache[url].count);
    return fetchCache[url].res;
  }
  const response = await fetch(url, { ...params, cache: "force-cache" }).catch(
    logger.error,
  );
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  if (response.status >= 400) {
    logger.error("fetch error:", { response, headers });
  }

  const res = await response.json();
  res.headers = headers;

  logger.debug(url, res);

  fetchCache[url] = { res, count: 0, expired: false };
  setTimeout(() => {
    fetchCache[url].expired = true;
  }, 120000);
  return res;
};
