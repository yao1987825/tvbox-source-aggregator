const { SocksProxyAgent } = require('socks-proxy-agent');
const { fetch, Agent, setGlobalDispatcher } = require('undici');

async function trial(label, options) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 15000);
  const t0 = Date.now();
  try {
    const r = await fetch(options.url, {
      ...options.fetchOpts,
      signal: c.signal,
    });
    const buf = await r.arrayBuffer();
    const txt = Buffer.from(buf).toString('utf-8');
    console.log(`[${label}] status=${r.status} bytes=${buf.byteLength} ms=${Date.now() - t0}`);
    console.log(`[${label}] preview=${txt.slice(0, 180).replace(/\n/g, ' ')}`);
  } catch (e) {
    console.log(`[${label}] THREW: ${e && e.message} code=${e && e.code}`);
  } finally {
    clearTimeout(t);
  }
}

(async () => {
  const tgt = 'https://gh-proxy.com/https://raw.githubusercontent.com/qist/tvbox/master/fty.json';

  // 1) undici.fetch + SocksProxyAgent dispatcher
  await trial('undici+dispatcher', {
    url: tgt,
    fetchOpts: {
      dispatcher: new SocksProxyAgent('socks5://192.168.6.1:1070'),
      headers: { 'Accept': 'application/json,text/plain,*/*', 'User-Agent': 'okhttp/3.12.0' },
    },
  });

  // 2) global dispatcher (verify internal mechanism)
  setGlobalDispatcher(new SocksProxyAgent('socks5://192.168.6.1:1070'));
  await trial('global-dispatcher', {
    url: tgt,
    fetchOpts: { headers: { 'Accept': 'application/json,text/plain,*/*', 'User-Agent': 'okhttp/3.12.0' } },
  });

  // 3) plain global fetch (no proxy, in-container direct test)
  setGlobalDispatcher(new Agent());
  await trial('plain-direct', {
    url: tgt,
    fetchOpts: { headers: { 'Accept': 'application/json,text/plain,*/*', 'User-Agent': 'okhttp/3.12.0' } },
  });
})();
