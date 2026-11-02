// Funcție Vercel: aduce pronunția germană (mp3) și o pune în cache.
// Folosită când telefonul / calculatorul nu are o voce germană instalată.
export default async function handler(req, res) {
  const q = String(req.query.q || '').trim().slice(0, 200);
  if (!q) return res.status(400).send('lipsește textul');
  const slow = req.query.slow === '1' ? '&ttsspeed=0.3' : '';
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=de&client=tw-ob${slow}&q=${encodeURIComponent(q)}`;
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
        Referer: 'https://translate.google.com/',
      },
    });
    if (!r.ok) return res.status(502).send('tts ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(502).send(String(e));
  }
}
