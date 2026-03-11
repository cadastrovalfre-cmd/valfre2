import { mapTinyProduto, tinyRequest } from './_lib/tiny.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const pagina = Number(req.query.page || 1);
    const limite = Number(req.query.limit || 50);
    const termo = req.query.q || '';

    const retorno = await tinyRequest('produtos.pesquisa', {
      pagina,
      limite,
      pesquisa: termo,
    });

    const produtos = (retorno.produtos || []).map(mapTinyProduto);

    return res.status(200).json({
      pagina,
      limite,
      total: Number(retorno.numero_paginas || 1),
      produtos,
    });
  } catch (error) {
    console.error('Erro /api/produtos:', error);
    return res.status(500).json({ error: error.message || 'Erro ao listar produtos' });
  }
}
