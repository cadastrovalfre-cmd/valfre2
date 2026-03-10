// api/tiny-imagem.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ erro: 'URL obrigatória' });
  }

  try {
    const decoded = decodeURIComponent(url);

    // Apenas permite URLs do Tiny/CDN confiáveis
    const allowed = [
      'tiny.com.br',
      'tinyerp.com.br',
      'cdn.tiny.com.br',
      'images.tinyerp.com.br',
      'storage.googleapis.com',
      'firebasestorage.googleapis.com'
    ];
    const isAllowed = allowed.some(d => decoded.includes(d));
    if (!isAllowed) {
      return res.status(403).json({ erro: 'Domínio não permitido' });
    }

    const response = await fetch(decoded, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.tiny.com.br/'
      }
    });

    if (!response.ok) {
      return res.status(response.status).end();
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 's-maxage=86400'); // cache 24h
    return res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    console.error('Erro proxy imagem:', err);
    return res.status(500).end();
  }
}
