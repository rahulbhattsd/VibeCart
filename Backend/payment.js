// Backend/payments.js
const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Order, CartItem } = require('./schema');  // or './models'
require('dotenv').config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Razorpay order (no auth guard)
router.post('/razorpay/order', async (req, res) => {
  console.log('→ POST /api/payments/razorpay/order', req.body);
  const { amount, currency } = req.body;
  try {
    const response = await razorpay.orders.create({
      amount,      // in paise
      currency,
      receipt: `rcpt_${Date.now()}`
    });
    res.json({ id: response.id, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error('Order create error:', err);
    res.status(500).json({ message: 'Payment order creation failed', error: err.message });
  }
});

// Verify payment and save order (no auth guard)
router.post('/razorpay/verify', async (req, res) => {
  console.log('→ POST /api/payments/razorpay/verify', req.body);
  const {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    items,
    shippingAddress,
    totalAmount,
    paymentMethod
  } = req.body;

  // Validate signature
  const generatedSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (generatedSig !== razorpaySignature) {
    console.warn('Invalid signature:', generatedSig, razorpaySignature);
    return res.status(400).json({ message: 'Invalid signature' });
  }

  try {
    const order = new Order({
      // you’ll need to set a dummy or known user ID here for testing:
      user: req.body.userId || null,
      items,
      shippingAddress,
      totalAmount,
      paymentMethod,
      paymentResult: {
        id: razorpayPaymentId,
        orderId: razorpayOrderId,
        signature: razorpaySignature
      }
    });
    await order.save();
    await CartItem.deleteMany({ user: order.user });
    res.json({ message: 'Order placed successfully', orderId: order._id });
  } catch (err) {
    console.error('Order save error:', err);
    res.status(500).json({ message: 'Order processing failed', error: err.message });
  }
});

module.exports = router;

