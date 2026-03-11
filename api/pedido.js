import { createCardPayment, isApprovedPayment } from './_lib/mercadopago.js';
import { buildTinyPedidoPayload, tinyRequest } from './_lib/tiny.js';

function validarPedido(pedido) {
  if (!pedido?.cliente) return 'cliente é obrigatório';
  if (!Array.isArray(pedido?.itens) || pedido.itens.length === 0) return 'itens é obrigatório';
  return null;
}

async function incluirPedidoNoTiny(pedido) {
  const retornoTiny = await tinyRequest('pedido.incluir', buildTinyPedidoPayload(pedido));
  return retornoTiny;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const pedido = req.body || {};
    const erroValidacao = validarPedido(pedido);

    if (erroValidacao) {
      return res.status(400).json({ error: erroValidacao });
    }

    const pagamento = pedido.pagamento || {};
    let resultadoPagamento = null;

    if (pagamento.token && pagamento.paymentMethodId) {
      resultadoPagamento = await createCardPayment({
        token: pagamento.token,
        transactionAmount: pedido.total,
        installments: pagamento.parcelas,
        paymentMethodId: pagamento.paymentMethodId,
        payer: {
          email: pedido.cliente.email,
          first_name: pedido.cliente.nome,
          identification: {
            type: pedido.cliente.cpfCnpj?.length > 11 ? 'CNPJ' : 'CPF',
            number: pedido.cliente.cpfCnpj,
          },
        },
        metadata: {
          external_reference: pedido.referencia || '',
        },
      });
    }

    const pagamentoAprovado =
      pedido.statusPagamento === 'approved' ||
      (resultadoPagamento && isApprovedPayment(resultadoPagamento));

    if (!pagamentoAprovado) {
      return res.status(202).json({
        mensagem: 'Pagamento ainda não aprovado. Pedido não foi enviado ao Tiny.',
        pagamento: resultadoPagamento,
      });
    }

    const retornoTiny = await incluirPedidoNoTiny({
      ...pedido,
      statusPagamento: 'approved',
    });

    return res.status(201).json({
      mensagem: 'Pedido criado no Tiny com sucesso',
      pagamento: resultadoPagamento,
      tiny: retornoTiny,
    });
  } catch (error) {
    console.error('Erro /api/pedido:', error);
    return res.status(500).json({ error: error.message || 'Erro ao criar pedido' });
  }
}
