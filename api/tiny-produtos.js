// api/tiny-produtos.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const token = process.env.TINY_TOKEN;
  if (!token) {
    return res.status(500).json({ erro: 'TINY_TOKEN não configurado' });
  }

  const pagina = req.query.pagina || 1;

  try {
    const body = new URLSearchParams({
      token: token,
      formato: 'JSON',
      pagina: String(pagina),
      situacao: 'A',
      retornar_imagens: 'S'
    });

    const response = await fetch('https://api.tiny.com.br/api2/produtos.pesquisa.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=120');
    return res.status(200).json(data);

  } catch (err) {
    console.error('Erro Tiny produtos:', err);
    return res.status(500).json({ erro: String(err) });
  }
}
