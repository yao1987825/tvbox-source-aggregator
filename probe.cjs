const { Agent } = require('/app/node_modules/undici');

const url = process.argv[2];
if (!url) { console.log('usage: probe.cjs URL'); process.exit(1); }

(async () => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 30000);
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      dispatcher: new Agent(),
      signal: c.signal,
      headers: { 'Accept': 'application/json,text/plain,*/*', 'User-Agent': 'okhttp/3.12.0' },
    });
    const buf = await r.arrayBuffer();
    const txt = Buffer.from(buf).toString('utf-8');
    console.log(`status=${r.status} bytes=${buf.byteLength} ms=${Date.now() - t0}`);
    console.log(`preview=${txt.slice(0, 250).replace(/\n/g, ' ')}`);
  } catch (e) {
    console.log(`THREW: ${e.message}`);
    if (e.cause) console.log(`cause: ${e.cause.message || e.cause}`);
  } finally {
    clearTimeout(t);
  }
})();
