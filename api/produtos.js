import {
  fetchTinyProdutosPagina,
  fetchTinyProdutosTodos,
  mapTinyProduto,
  tinyRequest,
} from './_lib/tiny.js';

async function enrichProdutoDetalhado(item) {
  const id = item?.id || item?.produto?.id;
  if (!id) return mapTinyProduto(item);

  const retornoDetalhe = await tinyRequest('produto.obter', { id });
  return mapTinyProduto(retornoDetalhe?.produto || item);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const pagina = Number(req.query.page || 1);
    const limite = Number(req.query.limit || 50);
    const termo = req.query.q || '';
    const all = ['1', 'true', 'yes'].includes(String(req.query.all || '').toLowerCase());
    const detalhes = ['1', 'true', 'yes'].includes(String(req.query.detalhes || '').toLowerCase());

    const resultado = all
      ? await fetchTinyProdutosTodos({ limite, pesquisa: termo })
      : await fetchTinyProdutosPagina({ pagina, limite, pesquisa: termo });

    const baseProdutos = resultado?.produtos || [];

    const produtos = detalhes
      ? await Promise.all(baseProdutos.map((item) => enrichProdutoDetalhado(item)))
      : baseProdutos.map(mapTinyProduto);

    return res.status(200).json({
      pagina: all ? 1 : pagina,
      limite,
      totalPaginas: Number(resultado?.numero_paginas || resultado?.totalPaginas || 1),
      totalRegistros: produtos.length,
      origem: 'tiny',
      produtos,
    });
  } catch (error) {
    console.error('Erro /api/produtos:', error);
    return res.status(500).json({ error: error.message || 'Erro ao listar produtos no Tiny' });
  }
}
