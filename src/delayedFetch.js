import { cachedFetch } from "./cachedFetch";
import makeLogger from "./logger";
const logger = makeLogger("delayed");

const fetchCache = {};
export const delayedFetch = async (url, params = {}, total = 20) => {
  const delay = Math.random() * (2 + total / 20) * 1000;
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await cachedFetch(url, params);
        logger.debug(delay, url.split("=")[1], result.detail);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    }, delay);
  });
};
