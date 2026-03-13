const { Router } = require('express');
const qpay = require('../qpay-client');

const router = Router();

router.get('/qpay', async (req, res) => {
  const paymentId = req.query.qpay_payment_id;
  if (!paymentId) return res.status(400).type('text/plain').send('Missing qpay_payment_id');

  try {
    const payment = await qpay.getPayment(paymentId);
    if (!payment || !payment.payment_id) {
      return res.status(400).type('text/plain').send('Payment not found');
    }
    res.status(200).type('text/plain').send('SUCCESS');
  } catch (err) {
    res.status(500).type('text/plain').send('ERROR');
  }
});

module.exports = router;
