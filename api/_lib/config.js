const config = {
  tinyBaseUrl: process.env.TINY_API_BASE_URL || 'https://api.tiny.com.br/api2',
  tinyToken: process.env.TINY_API_TOKEN || '',
  tinyDefaultFormato: 'json',
  mpBaseUrl: process.env.MERCADO_PAGO_API_BASE_URL || 'https://api.mercadopago.com',
  mpAccessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
  mpWebhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET || '',
};

export default config;
