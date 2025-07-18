// ======= server.js =======
const express = require('express');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import Mongoose models
const { User, Listing, CartItem, Order } = require('./schema');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'https://vibecart-eo6e.onrender.com'
];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'yourSecretKey',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { httpOnly: true, sameSite: 'lax', secure: false }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Body parser
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Passport Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    let user = await User.findOne({ $or: [{ googleId: profile.id }, { gmail: email }] });
    if (user) {
      user.googleId = profile.id;
      user.name = user.name || profile.displayName;
      await user.save();
    } else {
      user = new User({ googleId: profile.id, gmail: email, name: profile.displayName });
      await user.save();
    }
    done(null, user);
  } catch (err) {
    done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const u = await User.findById(id);
    done(null, u || false);
  } catch (e) {
    done(e);
  }
});

// Auth check middleware
function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: 'Unauthorized' });
}

// Create API router
const api = express.Router();

// Payments routes
const paymentsRouter = require('./payment.js');
api.use('/payments', paymentsRouter);

// ---------- Auth Routes ----------
api.post('/check-gmail', async (req, res) => {
  const { gmail } = req.body;
  const exists = await User.exists({ gmail });
  res.json({ exists: !!exists });
});

api.post('/signup', async (req, res) => {
  const { name, gmail, pass, role } = req.body;
  try {
    if (await User.exists({ gmail })) return res.status(400).json({ message: 'User already exists' });
    const hashed = await bcrypt.hash(pass, 10);
    const newUser = await User.create({ name, gmail, pass: hashed, role });
    res.status(201).json({ message: 'Signup successful', user: newUser });
  } catch (err) {
    res.status(500).json({ message: 'Signup error', error: err.message });
  }
});

api.post('/login', async (req, res) => {
  const { gmail, pass } = req.body;
  try {
    const user = await User.findOne({ gmail });
    if (!user || !user.pass) return res.status(400).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(pass, user.pass);
    if (!ok) return res.status(400).json({ message: 'Wrong password' });
    req.login(user, err => {
      if (err) return res.status(500).json({ message: 'Login error' });
      res.json({ message: 'Login successful', user });
    });
  } catch (err) {
    res.status(500).json({ message: 'Login error', error: err.message });
  }
});

api.get('/auth/google', passport.authenticate('google', { scope: ['profile','email'] }));

const CLIENT_HOME_URL = process.env.CLIENT_HOME_URL || 'http://localhost:5173';
api.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => res.redirect(`${CLIENT_HOME_URL}/login?google=success`)
);

api.get('/logout', (req, res) => {
  req.logout(err => {
    if (err) return res.status(500).json({ message: 'Logout failed' });
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ message: 'Logout successful' });
    });
  });
});

// ---------- Listing Routes ----------
api.post('/listings', ensureAuth, async (req, res) => {
  if (req.user.role !== 'seller') return res.status(403).json({ message: 'Only sellers can add listings' });
  try {
    const newListing = await Listing.create({ ...req.body, seller: req.user._id });
    res.status(201).json(newListing);
  } catch (err) {
    res.status(500).json({ message: 'Error creating listing' });
  }
});

api.get('/listings', async (req, res) => {
  const { page = 1, limit = 10, search, sort } = req.query;
  let query = {};
  if (search) query.title = { $regex: search, $options: 'i' };
  let sortOptions = { createdAt: -1 };
  if (sort === 'priceAsc') sortOptions = { price: 1 };
  else if (sort === 'priceDesc') sortOptions = { price: -1 };
  else if (sort === 'rating') sortOptions = { rating: -1 };
  try {
    const listings = await Listing.find(query)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('seller', 'name gmail');
    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching listings' });
  }
});

api.get('/listings/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate('seller', 'name gmail');
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- Trending Route ----------
api.get('/trendings', async (req, res) => {
  try {
    const trendings = await Listing.aggregate([
      { $sample: { size: 8 } },
      { $lookup: { from: 'users', localField: 'seller', foreignField: '_id', as: 'seller' } },
      { $unwind: '$seller' },
      { $project: { title: 1, description: 1, price: 1, imageUrl: 1, 'seller.name': 1, createdAt: 1 } }
    ]);
    res.json(trendings);
  } catch (err) {
    console.error('Error fetching trendings:', err);
    res.status(500).json({ message: 'Error fetching trending listings' });
  }
});

// ---------- Cart Routes ----------
api.get('/cart', ensureAuth, async (req, res) => {
  try {
    const items = await CartItem.find({ user: req.user._id }).populate('listing');
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching cart', error: err.message });
  }
});

api.post('/cart', ensureAuth, async (req, res) => {
  try {
    let	item = await CartItem.findOne({ user: req.user._id, listing: req.body.listingId, size: req.body.size });
    if (item) item.quantity += req.body.quantity;
    else item = new CartItem({ user: req.user.__id, listing: req.body.listingId, size: req.body.size, quantity: req.body.quantity });
    const saved = await item.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Could not add to cart', error: err.message });
  }
});

api.patch('/cart/:id', ensureAuth, async (req, res) => {
  try {
    const item = await CartItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Cart item not found' });
    item.quantity = req.body.quantity;
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Error updating cart item' });
  }
});

api.delete('/cart/:id', ensureAuth, async (req, res) => {
  try {
    await CartItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item removed' });
  } catch (err) {
    res.status(500).json({ message: 'Error removing item' });
  }
});

api.delete('/cart', ensureAuth, async (req, res) => {
  try {
    await CartItem.deleteMany({ user: req.user._id });
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ message: 'Error clearing cart' });
  }
});

// ---------- Order Routes ----------
api.post('/orders', ensureAuth, async (req, res) => {
  try {
    const { items, shippingAddress, totalAmount, paymentMethod } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ message: 'Cart is empty. Cannot place order.' });
    const order = new Order({ user: req.user._id, items, shippingAddress, totalAmount, paymentMethod });
    await order.save();
    await CartItem.deleteMany({ user: req.user._id });
    res.status(201).json(order);
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

api.get('/orders', ensureAuth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).populate('items.listing');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching orders' });
  }
});

api.get('/orders/:id', ensureAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.listing');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching order' });
  }
});

api.delete('/orders/:id', ensureAuth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found or not authorized' });
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Order cancelled successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error cancelling order' });
  }
});

// ---------- User Route ----------
api.get('/me', ensureAuth, (req, res) => res.json({ user: req.user }));

// Mount API router under /api
app.use('/api', api);

// Serve frontend in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// SPA fallback route
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});








