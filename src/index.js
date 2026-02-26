require('dotenv').config();
const express = require('express');
const path = require('path');
const paymentRoutes = require('./routes/payment');
const webhookRoutes = require('./routes/webhook');
const gdprRoutes = require('./routes/gdpr');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/payment', paymentRoutes);
app.use('/webhook', webhookRoutes);
app.use('/gdpr', gdprRoutes);

app.get('/', (req, res) => res.json({ status: 'QPay Shopify App running' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`QPay Shopify app on port ${PORT}`));
