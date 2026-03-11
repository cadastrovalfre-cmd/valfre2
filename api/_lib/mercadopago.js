import config from './config.js';

async function mpRequest(path, options = {}) {
  if (!config.mpAccessToken) {
    throw new Error('MERCADO_PAGO_ACCESS_TOKEN não configurado');
  }

  const response = await fetch(`${config.mpBaseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.mpAccessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || `Erro Mercado Pago (${response.status})`);
  }

  return data;
}

export async function createCardPayment({
  token,
  transactionAmount,
  installments,
  paymentMethodId,
  payer,
  metadata,
}) {
  return mpRequest('/v1/payments', {
    method: 'POST',
    body: JSON.stringify({
      token,
      transaction_amount: Number(transactionAmount),
      installments: Number(installments) || 1,
      payment_method_id: paymentMethodId,
      payer,
      metadata,
    }),
  });
}

export async function getPayment(id) {
  return mpRequest(`/v1/payments/${id}`);
}

export function isApprovedPayment(payment) {
  return payment?.status === 'approved';
}
