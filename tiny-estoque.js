// api/tiny-estoque.js
// Proxy serverless para API do Tiny ERP - busca estoque de produto específico

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const token = process.env.TINY_TOKEN;
  if (!token) {
    return res.status(500).json({ erro: 'TINY_TOKEN não configurado' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ erro: 'ID do produto obrigatório' });
  }

  try {
    const url = `https://api.tiny.com.br/api2/produto.obter.estoque.php?token=${token}&id=${id}&formato=JSON`;
    const response = await fetch(url);
    const data = await response.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=30'); // cache de 30s
    return res.status(200).json(data);
  } catch (err) {
    console.error('Erro Tiny estoque:', err);
    return res.status(500).json({ erro: 'Falha ao buscar estoque do Tiny' });
  }
}
