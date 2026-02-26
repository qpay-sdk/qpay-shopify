const express = require('express');
const request = require('supertest');

// Mock qpay-client module
jest.mock('../../src/qpay-client', () => ({
  createInvoice: jest.fn(),
  checkPayment: jest.fn(),
}));

const qpayClient = require('../../src/qpay-client');
const webhookRoutes = require('../../src/routes/webhook');

describe('Webhook Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/webhook', webhookRoutes);
  });

  describe('POST /webhook/qpay', () => {
    it('should return paid status when payment is confirmed', async () => {
      qpayClient.checkPayment.mockResolvedValue({
        rows: [{ payment_id: 'PAY_1', amount: 50000 }],
      });

      const res = await request(app)
        .post('/webhook/qpay')
        .send({ invoice_id: 'INV_001' })
        .expect(200);

      expect(qpayClient.checkPayment).toHaveBeenCalledWith('INV_001');
      expect(res.body).toEqual({ status: 'paid' });
    });

    it('should return unpaid status when no payment rows', async () => {
      qpayClient.checkPayment.mockResolvedValue({ rows: [] });

      const res = await request(app)
        .post('/webhook/qpay')
        .send({ invoice_id: 'INV_002' })
        .expect(200);

      expect(res.body).toEqual({ status: 'unpaid' });
    });

    it('should return unpaid when rows is null', async () => {
      qpayClient.checkPayment.mockResolvedValue({ rows: null });

      const res = await request(app)
        .post('/webhook/qpay')
        .send({ invoice_id: 'INV_003' })
        .expect(200);

      expect(res.body).toEqual({ status: 'unpaid' });
    });

    it('should return 400 when invoice_id is missing', async () => {
      const res = await request(app)
        .post('/webhook/qpay')
        .send({})
        .expect(400);

      expect(res.body).toEqual({ error: 'Missing invoice_id' });
    });

    it('should return 400 when body is empty', async () => {
      const res = await request(app)
        .post('/webhook/qpay')
        .send()
        .expect(400);

      expect(res.body).toEqual({ error: 'Missing invoice_id' });
    });

    it('should return 500 on checkPayment error', async () => {
      qpayClient.checkPayment.mockRejectedValue(
        new Error('QPay API unreachable')
      );

      const res = await request(app)
        .post('/webhook/qpay')
        .send({ invoice_id: 'INV_ERR' })
        .expect(500);

      expect(res.body).toEqual({ error: 'QPay API unreachable' });
    });

    it('should pass the correct invoiceId to checkPayment', async () => {
      qpayClient.checkPayment.mockResolvedValue({ rows: [] });

      await request(app)
        .post('/webhook/qpay')
        .send({ invoice_id: 'SPECIFIC_INV_ID' })
        .expect(200);

      expect(qpayClient.checkPayment).toHaveBeenCalledWith('SPECIFIC_INV_ID');
    });

    it('should handle multiple payment rows as paid', async () => {
      qpayClient.checkPayment.mockResolvedValue({
        rows: [
          { payment_id: 'PAY_1', amount: 25000 },
          { payment_id: 'PAY_2', amount: 25000 },
        ],
      });

      const res = await request(app)
        .post('/webhook/qpay')
        .send({ invoice_id: 'INV_MULTI' })
        .expect(200);

      expect(res.body).toEqual({ status: 'paid' });
    });

    it('should not call checkPayment when invoice_id is missing', async () => {
      await request(app).post('/webhook/qpay').send({}).expect(400);

      expect(qpayClient.checkPayment).not.toHaveBeenCalled();
    });
  });
});
