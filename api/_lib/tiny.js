import config from './config.js';

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

export function mapTinyProduto(item) {
  const p = item?.produto || item || {};

  return {
    id: Number(p.id) || null,
    nome: p.nome || '',
    sku: p.codigo || '',
    preco: Number(p.preco || p.preco_promocional || 0),
    descricao: p.descricao || p.descricao_complementar || '',
    imagens: Array.isArray(p.imagens)
      ? p.imagens.map((img) => img?.imagem_externa || img?.url || '').filter(Boolean)
      : [],
    categoria: p.categoria || '',
    peso: p.peso_bruto || p.peso_liquido || '',
    marca: p.marca || '',
    estoqueAtual: Number(p.saldo || p.estoque || 0),
    status: p.situacao || 'ativo',
    ean: p.ean || '',
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
