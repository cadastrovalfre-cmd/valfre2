// api/tiny-estoque.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const token = process.env.TINY_TOKEN;
  if (!token) {
    return res.status(500).json({ erro: 'TINY_TOKEN não configurado' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ erro: 'ID do produto obrigatório' });
  }

  try {
    // A API do Tiny exige POST com body urlencoded
    const body = new URLSearchParams({
      token: token,
      id: String(id),
      formato: 'JSON'
    });

    const response = await fetch('https://api.tiny.com.br/api2/produto.obter.estoque.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=30');
    return res.status(200).json(data);
  } catch (err) {
    console.error('Erro Tiny estoque:', err);
    return res.status(500).json({ erro: String(err) });
  }
}
