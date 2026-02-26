# QPay Shopify Payment App

[![CI](https://github.com/qpay-sdk/qpay-shopify/actions/workflows/ci.yml/badge.svg)](https://github.com/qpay-sdk/qpay-shopify/actions)

QPay V2 payment integration for Shopify stores.

## Setup

```bash
cp .env.example .env
# Fill in credentials
npm install
npm start
```

## Endpoints

- `POST /payment/initiate` - Create payment with QR + bank links
- `GET /payment/check/:invoiceId` - Check payment status
- `POST /webhook/qpay` - QPay webhook callback
- `POST /gdpr/*` - Shopify GDPR endpoints

## License

MIT
