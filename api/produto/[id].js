import { mapTinyProduto, tinyRequest } from '../_lib/tiny.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID do produto é obrigatório' });
    }

    const retorno = await tinyRequest('produto.obter', { id });
    const produto = mapTinyProduto(retorno.produto);

    return res.status(200).json(produto);
  } catch (error) {
    console.error('Erro /api/produto/:id:', error);
    return res.status(500).json({ error: error.message || 'Erro ao buscar produto' });
  }
}
