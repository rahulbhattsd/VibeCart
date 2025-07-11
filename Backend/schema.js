// schema.js
const mongoose = require('mongoose');

// --- USER SCHEMA ---
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: function() { return !!this.googleId; }
  },
  gmail: {
    type: String,
    required: true,
    unique: true
  },
  pass: { type: String },
  googleId: { type: String },
  role: {
    type: String,
    enum: ['buyer', 'seller'],
    default: 'buyer'
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  phone: String
}, { timestamps: true });

// --- LISTING SCHEMA ---
const listingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  imageUrl: String,
  discount: { type: Boolean, default: false },
  originalPrice: Number, // Store the original price when discounted
  inventory: {
    type: Map,
    of: Number,
    default: {
      '4': 10, '5': 10, '6': 10, '7': 10, '8': 10,
      '9': 10, '10': 10, '11': 10, '12': 10, '13': 10
    }
  },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: String,
  tags: [String],
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 }
}, { timestamps: true });

// --- CART ITEM SCHEMA ---
const cartItemSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  size: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  addedAt: { type: Date, default: Date.now }
});

// --- ORDER SCHEMA ---
// schema.js (only the Order part shown)
const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      listing:  { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
      quantity: { type: Number, required: true },
      size:     { type: String },
      price:    { type: Number, required: true }
    }
  ],
  shippingAddress: { /* … */ },
  totalAmount:   { type: Number, required: true },
  paymentMethod: { 
    type: String, 
    enum: ['COD', 'razorpay', 'creditCard'],   // replaced 'paypal' with 'razorpay'
    required: true 
  },
  paymentResult: {                           // new field for storing razorpay response
    id:        String,
    orderId:   String,
    signature: String
  }
}, { timestamps: true });


const User = mongoose.model('User', userSchema);
const Listing = mongoose.model('Listing', listingSchema);
const CartItem = mongoose.model('CartItem', cartItemSchema);
const Order = mongoose.model('Order', orderSchema);

module.exports = { User, Listing, CartItem, Order };



