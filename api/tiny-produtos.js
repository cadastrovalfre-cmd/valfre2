export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');

  const token = process.env.TINY_TOKEN;
  const pagina = req.query.pagina || 1;

  try {

    const params = new URLSearchParams({
      token: token,
      formato: 'JSON',
      pagina: String(pagina),
      situacao: 'A'
    });

    const r = await fetch(
      'https://api.tiny.com.br/api2/produtos.pesquisa.php',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      }
    );

    const data = await r.json();

    res.setHeader('Cache-Control', 's-maxage=120');

    return res.status(200).json(data);

  } catch (err) {

    return res.status(500).json({ erro: String(err) });

  }
}
