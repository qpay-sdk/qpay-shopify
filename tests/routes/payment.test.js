const express = require('express');
const request = require('supertest');

// Mock qpay-client module
jest.mock('../../src/qpay-client', () => ({
  createInvoice: jest.fn(),
  checkPayment: jest.fn(),
}));

// Mock config
jest.mock('../../src/config', () => ({
  qpay: {
    baseUrl: 'https://merchant.qpay.mn',
    username: 'test_user',
    password: 'test_pass',
    invoiceCode: 'TEST_CODE',
    callbackUrl: 'https://example.com/webhook',
  },
  shopify: {
    apiKey: 'test_key',
    apiSecret: 'test_secret',
    scopes: 'write_payment_gateways',
  },
}));

const qpayClient = require('../../src/qpay-client');
const paymentRoutes = require('../../src/routes/payment');

describe('Payment Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.set('view engine', 'ejs');
    app.set('views', require('path').join(__dirname, '../../src/views'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/payment', paymentRoutes);
  });

  describe('POST /payment/initiate', () => {
    it('should create invoice and render payment page', async () => {
      const invoiceResponse = {
        invoice_id: 'INV_001',
        qr_image: 'base64_qr_data',
        qr_text: 'qr_text_data',
        urls: [
          { name: 'Khan Bank', link: 'https://khan.link/pay', logo: 'logo.png' },
        ],
      };

      qpayClient.createInvoice.mockResolvedValue(invoiceResponse);

      const res = await request(app)
        .post('/payment/initiate')
        .send({
          orderId: '1001',
          amount: 50000,
          email: 'test@example.com',
        })
        .expect(200);

      expect(qpayClient.createInvoice).toHaveBeenCalledWith({
        invoice_code: 'TEST_CODE',
        sender_invoice_no: '1001',
        invoice_receiver_code: 'test@example.com',
        invoice_description: 'Shopify Order #1001',
        amount: 50000,
        callback_url: 'https://example.com/webhook',
      });

      // Should render HTML (EJS template)
      expect(res.text).toContain('QPay');
    });

    it('should handle missing email gracefully', async () => {
      qpayClient.createInvoice.mockResolvedValue({
        invoice_id: 'INV_002',
        qr_image: 'qr_data',
        urls: [],
      });

      const res = await request(app)
        .post('/payment/initiate')
        .send({ orderId: '1002', amount: 10000 })
        .expect(200);

      expect(qpayClient.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          invoice_receiver_code: '',
        })
      );
    });

    it('should return 500 on invoice creation error', async () => {
      qpayClient.createInvoice.mockRejectedValue(
        new Error('Authentication failed')
      );

      const res = await request(app)
        .post('/payment/initiate')
        .send({ orderId: '1003', amount: 5000 })
        .expect(500);

      expect(res.body).toEqual({ error: 'Authentication failed' });
    });

    it('should convert amount to number', async () => {
      qpayClient.createInvoice.mockResolvedValue({
        invoice_id: 'INV_003',
        qr_image: 'qr_data',
        urls: [],
      });

      await request(app)
        .post('/payment/initiate')
        .send({ orderId: '1004', amount: '25000' })
        .expect(200);

      expect(qpayClient.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 25000,
        })
      );
    });
  });

  describe('GET /payment/check/:invoiceId', () => {
    it('should return paid=true when payment rows exist', async () => {
      qpayClient.checkPayment.mockResolvedValue({
        rows: [{ payment_id: 'PAY_1', amount: 50000 }],
      });

      const res = await request(app)
        .get('/payment/check/INV_001')
        .expect(200);

      expect(qpayClient.checkPayment).toHaveBeenCalledWith('INV_001');
      expect(res.body).toEqual({ paid: true });
    });

    it('should return paid=false when no payment rows', async () => {
      qpayClient.checkPayment.mockResolvedValue({ rows: [] });

      const res = await request(app)
        .get('/payment/check/INV_002')
        .expect(200);

      expect(res.body).toEqual({ paid: false });
    });

    it('should return paid=false when rows is null', async () => {
      qpayClient.checkPayment.mockResolvedValue({ rows: null });

      const res = await request(app)
        .get('/payment/check/INV_003')
        .expect(200);

      expect(res.body).toEqual({ paid: false });
    });

    it('should return 500 on checkPayment error', async () => {
      qpayClient.checkPayment.mockRejectedValue(new Error('API timeout'));

      const res = await request(app)
        .get('/payment/check/INV_ERR')
        .expect(500);

      expect(res.body).toEqual({ error: 'API timeout' });
    });
  });
});
