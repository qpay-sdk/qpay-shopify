const config = require('./config');

let accessToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  const res = await fetch(`${config.qpay.baseUrl}/v2/auth/token`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${config.qpay.username}:${config.qpay.password}`).toString('base64'),
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 30) * 1000;
  return accessToken;
}

async function apiRequest(method, endpoint, body) {
  const token = await getToken();
  const opts = {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${config.qpay.baseUrl}${endpoint}`, opts);
  return res.json();
}

module.exports = {
  createInvoice: (data) => apiRequest('POST', '/v2/invoice', data),
  checkPayment: (invoiceId) => apiRequest('POST', '/v2/payment/check', {
    object_type: 'INVOICE', object_id: invoiceId,
  }),
};
