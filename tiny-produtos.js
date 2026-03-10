// api/tiny-produtos.js
// Proxy serverless para API do Tiny ERP - busca produtos
// Roda no servidor da Vercel, sem problemas de CORS

export default async function handler(req, res) {
  // Permite apenas GET
  if (req.method !== 'GET') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const token = process.env.TINY_TOKEN;
  if (!token) {
    return res.status(500).json({ erro: 'TINY_TOKEN não configurado' });
  }

  const pagina = req.query.pagina || 1;

  try {
    const url = `https://api.tiny.com.br/api2/produtos.pesquisa.php?token=${token}&formato=JSON&pagina=${pagina}&situacao=A`;
    const response = await fetch(url);
    const data = await response.json();

    // Cabeçalhos CORS para o frontend conseguir chamar
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=120'); // cache de 2 min na Vercel
    return res.status(200).json(data);
  } catch (err) {
    console.error('Erro Tiny produtos:', err);
    return res.status(500).json({ erro: 'Falha ao buscar produtos do Tiny' });
  }
}
