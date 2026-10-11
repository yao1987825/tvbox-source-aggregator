const { Agent } = require('/app/node_modules/undici');

async function trial(label, url) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 12000);
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      dispatcher: new Agent(),
      signal: c.signal,
      headers: { 'Accept': 'application/json,text/plain,*/*', 'User-Agent': 'okhttp/3.12.0' },
    });
    const buf = await r.arrayBuffer();
    const txt = Buffer.from(buf).toString('utf-8');
    console.log(`[${label}] status=${r.status} bytes=${buf.byteLength} ms=${Date.now() - t0}`);
    console.log(`  preview=${txt.slice(0, 200).replace(/\n/g, ' ')}`);
  } catch (e) {
    console.log(`[${label}] THREW: ${e.message}`);
  } finally {
    clearTimeout(t);
  }
}

(async () => {
  // 注：在容器内直连（不走 SOCKS）
  console.log('--- A1 from container: gh-proxy URL ---');
  await trial('container→gh-proxy', 'https://gh-proxy.com/https://raw.githubusercontent.com/qist/tvbox/master/fty.json');
  console.log('--- A2 from container: raw.github direct ---');
  await trial('container→raw', 'https://raw.githubusercontent.com/qist/tvbox/master/fty.json');
  console.log('--- A3 from container: jsDelivr ---');
  await trial('container→jsdelivr', 'https://cdn.jsdelivr.net/gh/qist/tvbox@master/fty.json');
})();
