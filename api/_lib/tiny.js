import config from './config.js';

const TINY_MAX_LIMIT = 100;

const parseTinyResponse = async (response) => {
  const data = await response.json();
  const retorno = data?.retorno;

  if (!retorno) {
    throw new Error('Resposta inválida da API Tiny');
  }

  if (retorno.status === 'Erro') {
    const erros = retorno?.erros?.map((item) => item?.erro || item).filter(Boolean) || [];
    throw new Error(erros.join(' | ') || 'Erro retornado pela API Tiny');
  }

  return retorno;
};

const normalizeValue = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  return [value];
};

function normalizeImageList(produto) {
  const imagensTiny = produto?.imagens?.map((x) => x?.imagem_externa || x?.url || x?.src).filter(Boolean) || [];
  const imagensPesquisa = toArray(produto?.ProdutoImagem || produto?.ProductImage)
    .map((x) => x?.https || x?.http || x?.url)
    .filter(Boolean);

  return [...new Set([...imagensTiny, ...imagensPesquisa])];
}

function normalizeVariacoes(produto) {
  const variants = toArray(produto?.variacoes || produto?.Variant || produto?.variant || produto?.Variacao)
    .map((v) => v?.Variacao || v?.Variant || v)
    .filter(Boolean);

  return variants.map((v) => ({
    id: toNumber(v.id, null),
    sku: normalizeValue(v.codigo || v.sku),
    preco: toNumber(v.preco || v.price, 0),
    estoque: toNumber(v.estoque || v.saldo || v.stock, 0),
    nome: normalizeValue(v.nome || v.grade || v.variacao || v.value),
  }));
}

export async function tinyRequest(method, payload = {}) {
  if (!config.tinyToken) {
    throw new Error('TINY_API_TOKEN não configurado');
  }

  const url = `${config.tinyBaseUrl.replace(/\/+$/, '')}/${method}.php`;
  const body = new URLSearchParams({
    token: config.tinyToken,
    formato: config.tinyDefaultFormato,
    ...Object.fromEntries(
      Object.entries(payload).map(([key, value]) => [
        key,
        typeof value === 'string' ? value : JSON.stringify(value),
      ]),
    ),
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ao chamar Tiny (${method})`);
  }

  return parseTinyResponse(response);
}

export async function fetchTinyProdutosPagina({ pagina = 1, limite = 50, pesquisa = '' } = {}) {
  const payload = {
    pagina: Math.max(1, Number(pagina) || 1),
    limite: Math.min(TINY_MAX_LIMIT, Math.max(1, Number(limite) || 50)),
  };

  if (pesquisa) {
    payload.pesquisa = pesquisa;
  }

  return tinyRequest('produtos.pesquisa', payload);
}

export async function fetchTinyProdutosTodos({ limite = 100, pesquisa = '' } = {}) {
  const safeLimit = Math.min(TINY_MAX_LIMIT, Math.max(1, Number(limite) || 100));

  const primeira = await fetchTinyProdutosPagina({ pagina: 1, limite: safeLimit, pesquisa });
  const totalPaginas = Math.max(1, toNumber(primeira?.numero_paginas, 1));
  const produtos = [...(primeira?.produtos || [])];

  for (let pagina = 2; pagina <= totalPaginas; pagina += 1) {
    const retorno = await fetchTinyProdutosPagina({ pagina, limite: safeLimit, pesquisa });
    produtos.push(...(retorno?.produtos || []));
  }

  return {
    pagina: 1,
    limite: safeLimit,
    totalPaginas,
    totalRegistros: produtos.length,
    produtos,
  };
}

export function mapTinyProduto(item) {
  const p = item?.produto || item?.Produto || item || {};

  return {
    id: toNumber(p.id, null),
    nome: normalizeValue(p.nome || p.name),
    sku: normalizeValue(p.codigo || p.sku || p.referencia),
    preco: toNumber(p.preco || p.preco_promocional || p.price, 0),
    precoPromocional: toNumber(p.preco_promocional || p.promotional_price, 0),
    descricao: normalizeValue(p.descricao || p.description),
    descricaoComplementar: normalizeValue(p.descricao_complementar || p.description_small),
    imagens: normalizeImageList(p),
    categoria: normalizeValue(p.categoria || p.category || p.nome_categoria),
    categoriaId: toNumber(p.idCategoria || p.categoria_id, 0),
    peso: toNumber(p.peso_bruto || p.peso_liquido || p.weight, 0),
    marca: normalizeValue(p.marca || p.brand),
    estoqueAtual: toNumber(p.saldo || p.estoque || p.stock, 0),
    estoqueMinimo: toNumber(p.estoque_minimo || 0, 0),
    status: normalizeValue(p.situacao || p.status || 'ativo'),
    unidade: normalizeValue(p.unidade || p.unidade_por_caixa),
    ean: normalizeValue(p.ean || p.gtin),
    ncm: normalizeValue(p.ncm),
    origem: normalizeValue(p.origem),
    garantia: normalizeValue(p.garantia || p.warranty),
    largura: toNumber(p.largura_embalagem || p.largura, 0),
    altura: toNumber(p.altura_embalagem || p.altura, 0),
    comprimento: toNumber(p.comprimento_embalagem || p.comprimento, 0),
    variacoes: normalizeVariacoes(p),
    raw: p,
  };
}

export function buildTinyContatoPayload(cliente) {
  return {
    contato: {
      nome: cliente.nome,
      tipo_pessoa: cliente.cpfCnpj?.length > 11 ? 'J' : 'F',
      cpf_cnpj: cliente.cpfCnpj,
      telefone: cliente.telefone,
      email: cliente.email,
      endereco: cliente.endereco,
      numero: cliente.numero,
      bairro: cliente.bairro,
      cep: cliente.cep,
      cidade: cliente.cidade,
      uf: cliente.estado,
    },
  };
}

export function buildTinyPedidoPayload(pedido) {
  return {
    pedido: {
      cliente: {
        nome: pedido.cliente.nome,
        tipo_pessoa: pedido.cliente.cpfCnpj?.length > 11 ? 'J' : 'F',
        cpf_cnpj: pedido.cliente.cpfCnpj,
        email: pedido.cliente.email,
        telefone: pedido.cliente.telefone,
        endereco: pedido.cliente.endereco,
        numero: pedido.cliente.numero,
        bairro: pedido.cliente.bairro,
        cep: pedido.cliente.cep,
        cidade: pedido.cliente.cidade,
        uf: pedido.cliente.estado,
      },
      itens: (pedido.itens || []).map((item) => ({
        item: {
          codigo: item.sku,
          descricao: item.nome,
          quantidade: item.quantidade,
          valor_unitario: item.preco,
        },
      })),
      frete: pedido.frete || 0,
      forma_pagamento: pedido.formaPagamento || 'Mercado Pago',
      obs: `Pagamento: ${pedido.statusPagamento || 'pendente'}`,
    },
  };
}
