function origin(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || (String(host).includes('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}

async function capture(req, path) {
  const response = await fetch(`${origin(req)}${path}?mode=capture`, {
    headers: {
      accept: 'application/json',
      ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
    },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`${path}: ${body.error || response.status}`);
  return body;
}

module.exports = async function handler(req, res) {
  try {
    const sp500 = await capture(req, '/api/signal-history');
    const smallcaps = await capture(req, '/api/smallcap-signal-history');
    return res.status(200).json({ success: true, sp500, smallcaps });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
