const { SocksProxyAgent } = require('/app/node_modules/socks-proxy-agent');
const { fetch, Agent } = require('/app/node_modules/undici');

async function trial(label, url, dispatcher) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 15000);
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      dispatcher,
      signal: c.signal,
      headers: { 'Accept': 'application/json,text/plain,*/*', 'User-Agent': 'okhttp/3.12.0' },
    });
    const buf = await r.arrayBuffer();
    console.log(`[${label}] OK status=${r.status} bytes=${buf.byteLength} ms=${Date.now() - t0}`);
  } catch (e) {
    console.log(`[${label}] THREW: ${e && e.message} name=${e && e.name} code=${e && e.code}`);
    console.log(`[${label}] cause:`, e && e.cause);
    if (e && e.errors) {
      for (const err of e.errors) {
        console.log(`[${label}] sub: ${err.message} code=${err.code}`);
      }
    }
  } finally {
    clearTimeout(t);
  }
}

(async () => {
  const target = 'https://gh-proxy.com/https://raw.githubusercontent.com/qist/tvbox/master/fty.json';
  const altTarget = 'https://raw.githubusercontent.com/qist/tvbox/master/fty.json';

  console.log('--- T1 socks + gh-proxy ---');
  await trial('socks+gh', target, new SocksProxyAgent('socks5://192.168.6.1:1070'));

  console.log('--- T2 socks + raw.github direct ---');
  await trial('socks+raw', altTarget, new SocksProxyAgent('socks5://192.168.6.1:1070'));

  console.log('--- T3 no proxy + raw.github direct (control) ---');
  await trial('direct+raw', altTarget, new Agent());
})();
