module.exports = {
  shopify: {
    apiKey: process.env.SHOPIFY_API_KEY || '',
    apiSecret: process.env.SHOPIFY_API_SECRET || '',
    scopes: 'write_payment_gateways,read_orders,write_orders',
  },
  qpay: {
    baseUrl: process.env.QPAY_BASE_URL || 'https://merchant.qpay.mn',
    username: process.env.QPAY_USERNAME || '',
    password: process.env.QPAY_PASSWORD || '',
    invoiceCode: process.env.QPAY_INVOICE_CODE || '',
    callbackUrl: process.env.QPAY_CALLBACK_URL || '',
  },
};
