import makeLogger from "./logger";
const logger = makeLogger("fetch");

const fetchCache = {};
export const cachedFetch = async (url, params = {}, forceCache = false) => {
  logger.debug("cachedFetch:", { url, params, forceCache });
  if (
    fetchCache[url] &&
    fetchCache[url].res &&
    (!fetchCache[url].expired || forceCache)
  ) {
    fetchCache[url].count++;
    logger.debug(url, "Cached used count:", fetchCache[url].count);
    return fetchCache[url].res;
  }
  // const response = await fetch(url, params).catch(err => {
  const response = await fetch(url, {
    ...params,
    cache: forceCache ? "force-cache" : "default",
  }).catch(err => {
    logger.error("cachedFetch failed:", { url, params, forceCache }, err);
    return null;
  });

  if (!response) {
    if (fetchCache[url] && fetchCache[url].res) {
      fetchCache[url].count++;
      return fetchCache[url].res;
    }
    return null;
  }

  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const res = await response.json();
  res.headers = headers;
  res.response = response;

  logger.debug(url, res);

  fetchCache[url] = { res, count: 0, expired: false };
  setTimeout(() => {
    fetchCache[url].expired = true;
  }, 120000);
  return res;
};
