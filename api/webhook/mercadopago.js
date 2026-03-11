import crypto from 'crypto';
import config from '../_lib/config.js';
import { getPayment, isApprovedPayment } from '../_lib/mercadopago.js';
import { buildTinyPedidoPayload, tinyRequest } from '../_lib/tiny.js';

const processedPayments = new Set();

function validateWebhookSignature(req) {
  if (!config.mpWebhookSecret) return true;

  const signature = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];

  if (!signature || !requestId) return false;

  const payload = `${requestId}:${JSON.stringify(req.body || {})}`;
  const expected = crypto.createHmac('sha256', config.mpWebhookSecret).update(payload).digest('hex');

  return signature.includes(`v1=${expected}`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    if (!validateWebhookSignature(req)) {
      return res.status(401).json({ error: 'Assinatura inválida no webhook do Mercado Pago' });
    }

    const paymentId = req.query?.['data.id'] || req.body?.data?.id || req.body?.id;

    if (!paymentId) {
      return res.status(200).json({ ok: true, ignorado: 'Webhook sem payment id' });
    }

    if (processedPayments.has(String(paymentId))) {
      return res.status(200).json({ ok: true, duplicado: true });
    }

    const payment = await getPayment(paymentId);

    if (!isApprovedPayment(payment)) {
      return res.status(200).json({ ok: true, status: payment.status, tiny: 'não enviado' });
    }

    const pedidoTiny = payment?.metadata?.pedidoTiny;
    if (!pedidoTiny) {
      return res.status(200).json({ ok: true, aviso: 'Pagamento aprovado sem metadata pedidoTiny' });
    }

    await tinyRequest('pedido.incluir', buildTinyPedidoPayload(pedidoTiny));
    processedPayments.add(String(paymentId));

    return res.status(200).json({ ok: true, status: payment.status, tiny: 'pedido incluído' });
  } catch (error) {
    console.error('Erro /api/webhook/mercadopago:', error);
    return res.status(500).json({ error: error.message || 'Erro no webhook do Mercado Pago' });
  }
}
