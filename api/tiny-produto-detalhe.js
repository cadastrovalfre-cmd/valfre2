export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const token = process.env.TINY_TOKEN;
  if (!token) return res.status(500).json({ erro: 'TINY_TOKEN nao configurado' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ erro: 'ID obrigatorio' });

  try {

   const params = new URLSearchParams({ token, id_produto: String(id), formato: 'JSON' });
    const r = await fetch('https://api.tiny.com.br/api2/produto.obter.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const data = await r.json();

    res.setHeader('Cache-Control', 's-maxage=300');

    return res.status(200).json(data);

  } catch (err) {

    return res.status(500).json({ erro: String(err) });

  }
}
