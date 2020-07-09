const debug = () => {};

const fetchGithub = (url, token) =>
  fetch(url, { headers: { Authorization: `token ${token}` } })
    .then(res => {
      const headers = {};
      res.headers.forEach((value, key) => {
        headers[key] = value;
      });
      headers.status = res.status;
      return res.json().then(res => {
        res.headers = headers;
        return res;
      });
    })
    .catch(console.error);

const estimateNumberOfRepos = repos => {
  let pageLast = 0;
  try {
    pageLast = parseInt(
      repos.headers &&
        repos.headers.link &&
        repos.headers.link.match(/\/repos\?page=(\d+?)>; rel=\"last\"/)[1],
    );
  } catch (err) {
    debug({ err });
  }
  debug({ pageLast });
  return pageLast < 2 || repos.length < 30 ? repos.length : (pageLast - 1) * 30;
};

export const verifyGithubToken = (account, token) => {
  debug({ account, token });
  return Promise.all([
    fetchGithub(`https://api.github.com/orgs/${account}/repos`, token),
    fetchGithub(`https://api.github.com/user/repos`, token),
  ])
    .then(([resOrg, resUser]) => {
      debug({ resOrg, resUser });
      const scopes = resOrg.headers["x-oauth-scopes"];
      const org = resOrg.message || estimateNumberOfRepos(resOrg);
      const user = resUser.message || estimateNumberOfRepos(resUser);
      return { org, user, scopes };
    })
    .catch(console.error);
};
