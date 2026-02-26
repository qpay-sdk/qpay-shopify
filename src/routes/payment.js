const { Router } = require('express');
const qpay = require('../qpay-client');
const config = require('../config');

const router = Router();

router.post('/initiate', async (req, res) => {
  try {
    const { orderId, amount, email } = req.body;
    const invoice = await qpay.createInvoice({
      invoice_code: config.qpay.invoiceCode,
      sender_invoice_no: String(orderId),
      invoice_receiver_code: email || '',
      invoice_description: `Shopify Order #${orderId}`,
      amount: Number(amount),
      callback_url: config.qpay.callbackUrl,
    });

    res.render('payment', {
      invoice,
      orderId,
      checkUrl: `/payment/check/${invoice.invoice_id}`,
      returnUrl: req.body.returnUrl || '/',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/check/:invoiceId', async (req, res) => {
  try {
    const result = await qpay.checkPayment(req.params.invoiceId);
    const paid = result.rows && result.rows.length > 0;
    res.json({ paid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
