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
const mcache = require('memory-cache');

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

// Simple cache
const cache = (duration) => {
  return (req, res, next) => {
    let key = '__express__' + req.originalUrl || req.url
    let cachedBody = mcache.get(key)
    if (cachedBody) {
      res.send(cachedBody)
      return
    } else {
      res.sendResponse = res.send
      res.send = (body) => {
        mcache.put(key, body, duration * 1000);
        res.sendResponse(body)
      }
      next()
    }
  }
}

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'yourSecretKey',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/vibecart' }),
  cookie: { httpOnly: true, sameSite: 'lax', secure: false }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Body parser
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/vibecart')
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// ---------- Authentication Routes ----------
// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const u = await User.findById(id);
    done(null, u || false);
  } catch (e) {
    done(e);
  }
});

passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID || 'dummy',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy',
    callbackURL:  `${process.env.API_BASE_URL || 'https://vibecart-eo6e.onrender.com'}/api/auth/google/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let gmail = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
      if (!gmail) return done(new Error('No email found from Google'), false);

      let user = await User.findOne({ $or: [{ googleId: profile.id }, { gmail }] });
      if (user) {
        user.googleId = profile.id;
        user.name     = user.name || profile.displayName;
        await user.save();
      } else {
        user = await User.create({
          googleId: profile.id,
          gmail,
          name:     profile.displayName
        });
      }
      return done(null, user);
    } catch (err) {
      return done(err, false);
    }
  }
));

const api = express.Router();

api.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
api.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL || 'https://vibecart-eo6e.onrender.com'}/`);
});


api.post('/check-gmail', async (req, res) => {
  try {
    const existing = await User.findOne({ gmail: req.body.gmail });
    res.json({ exists: !!existing });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

api.post('/auth/signup', async (req, res) => {
  try {
    const { name, gmail, pass, role } = req.body;
    let existing = await User.findOne({ gmail });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hashed = await bcrypt.hash(pass, 10);
    const u = await User.create({ name, gmail, pass: hashed, role });
    req.login(u, err => {
      if (err) return res.status(500).json({ message: 'Error logging in after signup' });
      res.json({ message: 'Signup successful', user: u });
    });
  } catch (err) {
    res.status(500).json({ message: 'Signup error', error: err.message });
  }
});

api.post('/auth/login', async (req, res) => {
  try {
    const { gmail, pass } = req.body;
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

api.post('/auth/logout', (req, res) => {
  req.logout(() => {
    res.json({ message: 'Logged out successfully' });
  });
});

// Helper for protected routes
const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: 'Unauthorized' });
};

// ---------- Listings / Products ----------
api.post('/listings', ensureAuth, async (req, res) => {
  if (req.user.role !== 'seller') return res.status(403).json({ message: 'Only sellers can add listings' });
  try {
    const newListing = await Listing.create({ ...req.body, seller: req.user._id });
    res.status(201).json(newListing);
  } catch (err) {
    res.status(500).json({ message: 'Error creating listing' });
  }
});

api.get('/listings/price-bounds', async (req, res) => {
  const { category, search } = req.query;
  let matchQuery = {};
  if (category && category !== 'all') {
    matchQuery.category = { $regex: new RegExp(`^${category}$`, 'i') };
  }
  if (search) {
    matchQuery.title = { $regex: search, $options: 'i' };
  }

  try {
    const result = await Listing.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          count: { $sum: 1 }
        }
      }
    ]);

    if (result.length > 0 && result[0].minPrice !== null && result[0].maxPrice !== null) {
      res.json({
        minPrice: Math.floor(result[0].minPrice),
        maxPrice: Math.ceil(result[0].maxPrice),
        count: result[0].count
      });
    } else {
      res.json({ minPrice: 0, maxPrice: 10000, count: 0 });
    }
  } catch (err) {
    console.error('Error fetching price bounds:', err);
    res.status(500).json({ message: 'Error fetching price bounds' });
  }
});

api.get('/listings', async (req, res) => {
  const { page = 1, limit = 10, search, sort, minPrice, maxPrice, category, size, brand } = req.query;
  let query = {};
  if (search) query.title = { $regex: search, $options: 'i' };
  if (category && category !== 'all') {
    query.category = { $regex: new RegExp(`^${category}$`, 'i') };
  }
  if (brand) {
    query.$or = [
      { tags: { $regex: brand, $options: 'i' } },
      { title: { $regex: brand, $options: 'i' } }
    ];
  }
  if (size) {
    query[`inventory.${size}`] = { $gt: 0 };
  }

  // MongoDB price range query
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceFilter = {};
    const parsedMin = parseFloat(minPrice);
    const parsedMax = parseFloat(maxPrice);
    if (!isNaN(parsedMin)) priceFilter.$gte = parsedMin;
    if (!isNaN(parsedMax)) priceFilter.$lte = parsedMax;
    if (Object.keys(priceFilter).length > 0) {
      query.price = priceFilter;
    }
  }
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

api.get('/products/search', cache(60), async (req, res) => {
  const { q, sort, minPrice, maxPrice, size, brand, page = 1, limit = 10 } = req.query;
  let query = {};

  if (q) query.$text = { $search: q };

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  if (brand) query.brand = brand;

  if (size) {
    query[`inventory.${size}`] = { $gt: 0 };
  }

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
    res.status(500).json({ message: 'Error fetching products' });
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

api.post('/listings/:id/reviews', ensureAuth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const listing = await Listing.findById(req.params.id);

    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    const review = {
      user: req.user._id,
      name: req.user.name,
      rating: Number(rating),
      comment
    };

    listing.reviews.push(review);
    listing.ratingCount = listing.reviews.length;
    listing.rating = listing.reviews.reduce((acc, item) => item.rating + acc, 0) / listing.reviews.length;

    await listing.save();
    res.status(201).json({ message: 'Review added' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});


api.get('/trendings', cache(60), async (req, res) => {
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
    let item = await CartItem.findOne({ user: req.user._id, listing: req.body.listingId, size: req.body.size });
    if (item) item.quantity += req.body.quantity;
    else item = new CartItem({ user: req.user._id, listing: req.body.listingId, size: req.body.size, quantity: req.body.quantity });
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

// ---------- Address Routes ----------
api.put('/user/address', ensureAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.address = req.body.address;
    await user.save();
    res.json({ message: 'Address updated successfully', address: user.address });
  } catch (err) {
    res.status(500).json({ message: 'Error updating address', error: err.message });
  }
});

// ---------- Order Routes ----------
api.post('/orders', ensureAuth, async (req, res) => {
  try {
    const newOrder = await Order.create({ ...req.body, user: req.user._id });
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(500).json({ message: 'Server error creating order' });
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

// User route
api.get('/me', ensureAuth, (req, res) => res.json({ user: req.user }));

// ---------- Customer Support Chatbot Route ----------
const { handleChatStream } = require('./chatbot');
api.post('/chat', handleChatStream);

// Mount API router
app.use('/api', api);

// ---------- Payment API (Razorpay) ----------
const paymentApi = require('./payment');
app.use('/api/payment', paymentApi);


// Fallback for SPA
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
