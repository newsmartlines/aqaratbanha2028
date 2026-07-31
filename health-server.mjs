import http from 'http';

const VITE_PORT = Number(process.env.VITE_PORT ?? 5001);
const PROXY_PORT = 20787;

const proxy = http.createServer((req, res) => {
  const options = {
    hostname: '127.0.0.1',
    port: VITE_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${VITE_PORT}` },
  };
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxyReq.on('error', () => {
    res.writeHead(502);
    res.end('upstream unavailable');
  });
  req.pipe(proxyReq, { end: true });
});

proxy.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`Reverse proxy listening on port ${PROXY_PORT} -> ${VITE_PORT}`);
});
