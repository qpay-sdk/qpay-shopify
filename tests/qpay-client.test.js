const config = require('../src/config');

// Mock global fetch
global.fetch = jest.fn();

// We need to reset module cache for each test to clear cached token
beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

describe('qpay-client', () => {
  describe('getToken (via createInvoice)', () => {
    it('should authenticate and get access token', async () => {
      global.fetch
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              access_token: 'test_token_123',
              expires_in: 3600,
            }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              invoice_id: 'INV_001',
              qr_text: 'qr_data',
            }),
        });

      const qpayClient = require('../src/qpay-client');
      const result = await qpayClient.createInvoice({ amount: 1000 });

      // First call should be auth
      expect(global.fetch).toHaveBeenCalledTimes(2);
      const authCall = global.fetch.mock.calls[0];
      expect(authCall[0]).toBe(`${config.qpay.baseUrl}/v2/auth/token`);
      expect(authCall[1].method).toBe('POST');
      expect(authCall[1].headers['Authorization']).toMatch(/^Basic /);

      expect(result).toEqual({ invoice_id: 'INV_001', qr_text: 'qr_data' });
    });

    it('should encode username:password as base64 for auth', async () => {
      global.fetch
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              access_token: 'token',
              expires_in: 3600,
            }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({}),
        });

      const qpayClient = require('../src/qpay-client');
      await qpayClient.createInvoice({});

      const authCall = global.fetch.mock.calls[0];
      const expectedBasic =
        'Basic ' +
        Buffer.from(`${config.qpay.username}:${config.qpay.password}`).toString(
          'base64'
        );
      expect(authCall[1].headers['Authorization']).toBe(expectedBasic);
    });

    it('should reuse cached token if not expired', async () => {
      global.fetch
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              access_token: 'cached_token',
              expires_in: 3600,
            }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ invoice_id: 'INV_1' }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ invoice_id: 'INV_2' }),
        });

      const qpayClient = require('../src/qpay-client');
      await qpayClient.createInvoice({ amount: 100 });
      await qpayClient.createInvoice({ amount: 200 });

      // Auth should only be called once (first call)
      // Then two API calls = 3 total fetch calls
      expect(global.fetch).toHaveBeenCalledTimes(3);
      // Only one auth call
      const authCalls = global.fetch.mock.calls.filter((call) =>
        call[0].includes('/v2/auth/token')
      );
      expect(authCalls).toHaveLength(1);
    });
  });

  describe('createInvoice', () => {
    it('should call POST /v2/invoice with correct data', async () => {
      global.fetch
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              access_token: 'test_token',
              expires_in: 3600,
            }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              invoice_id: 'INV_001',
              qr_image: 'base64img',
              urls: [],
            }),
        });

      const qpayClient = require('../src/qpay-client');
      const invoiceData = {
        invoice_code: 'TEST_CODE',
        sender_invoice_no: 'ORD-001',
        amount: 5000,
        invoice_description: 'Test order',
      };

      const result = await qpayClient.createInvoice(invoiceData);

      // Second call should be create invoice
      const invoiceCall = global.fetch.mock.calls[1];
      expect(invoiceCall[0]).toBe(`${config.qpay.baseUrl}/v2/invoice`);
      expect(invoiceCall[1].method).toBe('POST');
      expect(invoiceCall[1].headers['Authorization']).toBe(
        'Bearer test_token'
      );
      expect(JSON.parse(invoiceCall[1].body)).toEqual(invoiceData);
      expect(result).toEqual({
        invoice_id: 'INV_001',
        qr_image: 'base64img',
        urls: [],
      });
    });
  });

  describe('checkPayment', () => {
    it('should call POST /v2/payment/check with correct data', async () => {
      global.fetch
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              access_token: 'test_token',
              expires_in: 3600,
            }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              rows: [{ payment_id: 'PAY_1', amount: 5000 }],
            }),
        });

      const qpayClient = require('../src/qpay-client');
      const result = await qpayClient.checkPayment('INV_001');

      const checkCall = global.fetch.mock.calls[1];
      expect(checkCall[0]).toBe(`${config.qpay.baseUrl}/v2/payment/check`);
      expect(checkCall[1].method).toBe('POST');
      expect(JSON.parse(checkCall[1].body)).toEqual({
        object_type: 'INVOICE',
        object_id: 'INV_001',
      });
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].payment_id).toBe('PAY_1');
    });

    it('should return empty rows when no payment found', async () => {
      global.fetch
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              access_token: 'test_token',
              expires_in: 3600,
            }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ rows: [] }),
        });

      const qpayClient = require('../src/qpay-client');
      const result = await qpayClient.checkPayment('INV_NONE');

      expect(result.rows).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should throw when auth fetch fails', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const qpayClient = require('../src/qpay-client');
      await expect(qpayClient.createInvoice({})).rejects.toThrow(
        'Network error'
      );
    });

    it('should throw when API fetch fails', async () => {
      global.fetch
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              access_token: 'token',
              expires_in: 3600,
            }),
        })
        .mockRejectedValueOnce(new Error('Server error'));

      const qpayClient = require('../src/qpay-client');
      await expect(qpayClient.createInvoice({})).rejects.toThrow(
        'Server error'
      );
    });
  });
});
