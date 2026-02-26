const { Router } = require('express');
const qpay = require('../qpay-client');

const router = Router();

router.post('/qpay', async (req, res) => {
  const invoiceId = req.body.invoice_id;
  if (!invoiceId) return res.status(400).json({ error: 'Missing invoice_id' });

  try {
    const result = await qpay.checkPayment(invoiceId);
    const paid = result.rows && result.rows.length > 0;
    res.json({ status: paid ? 'paid' : 'unpaid' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
