const { Router } = require('express');
const router = Router();

router.post('/customers/data_request', (req, res) => {
  res.json({ message: 'No customer data stored' });
});

router.post('/customers/redact', (req, res) => {
  res.json({ message: 'No customer data to redact' });
});

router.post('/shop/redact', (req, res) => {
  res.json({ message: 'Shop data redacted' });
});

module.exports = router;
