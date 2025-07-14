// ======= server.js (all routes in one file) =======
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
dotenv.config();
const { User, Listing, CartItem, Order } = require('./schema');

const app = express();
const PORT = process.env.PORT || 5000;

//build paths 
const path = require('path');
const fs = require('fs');
// Serve frontend build files from Vite's dist directory
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const allowedOrigins = [
  'http://localhost:5173',
  'https://your-render-frontend-url.onrender.com', // Replace with actual domain after deploy
  'https://your-render-backend-url.onrender.com'
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
  cookie: { httpOnly: true, sameSite: 'lax', secure: false }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Body parser
app.use(express.json());
const api = express.Router();
app.use('/api', api);
// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Passport Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback',
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
    return done(null, user);
  } catch (err) {
    return done(err);
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
//payment 

const paymentsRouter = require('./payment.js');
app.use('/api/payments', paymentsRouter);


// ---------- Auth Routes ----------
app.post('/check-gmail', async (req, res) => {
  const { gmail } = req.body;
  const exists = await User.exists({ gmail });
  res.json({ exists: !!exists });
});

app.post('/signup', async (req, res) => {
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

app.post('/login', async (req, res) => {
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

app.get('/auth/google', passport.authenticate('google', { scope: ['profile','email'] }));
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => res.redirect('http://localhost:5173/login?google=success')
);

app.get('/logout', (req, res) => {
  req.logout(err => {
    if (err) return res.status(500).json({ message: 'Logout failed' });
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ message: 'Logout successful' });
    });
  });
});

// ---------- Listing Routes ----------
app.post('/listings', ensureAuth, async (req, res) => {
  if (req.user.role !== 'seller') return res.status(403).json({ message: 'Only sellers can add listings' });
  try {
    const newListing = await Listing.create({ ...req.body, seller: req.user._id });
    res.status(201).json(newListing);
  } catch (err) {
    res.status(500).json({ message: 'Error creating listing' });
  }
});
// app.get('/listings', async (req, res) => {
//   const { page = 1, limit = 10 } = req.query;
//   try {
//     const listings = await Listing.find()
//       .sort({ createdAt: -1 })
//       .skip((page - 1) * limit)
//       .limit(Number(limit))
//       .populate('seller', 'name gmail');
//     res.json(listings);
//   } catch (err) {
//     res.status(500).json({ message: 'Error fetching listings' });
//   }
// });

app.get('/listings', async (req, res) => {
  const { page = 1, limit = 10, search, sort } = req.query;

  let query = {};
  if (search) {
    query.title = { $regex: search, $options: 'i' };
  }

  let sortOptions = { createdAt: -1 }; // default: latest
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

app.get('/listings/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate('seller', 'name gmail');
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});



// ---------- Trending Route ----------
app.get('/trendings', async (req, res) => {
  try {
    const trendings = await Listing.aggregate([
      // 1) randomly pick 8 documents  
      { $sample: { size: 8 } },                             // unbiased random sampling :contentReference[oaicite:0]{index=0}
      // 2) join seller info  
      { $lookup: {
          from: 'users',
          localField: 'seller',
          foreignField: '_id',
          as: 'seller'
      }},
      { $unwind: '$seller' },
      // 3) only return the fields we need  
      { $project: {
          title: 1, description: 1, price: 1, imageUrl: 1,
          'seller.name': 1, createdAt: 1
      }}
    ]);
    res.json(trendings);
  } catch (err) {
    console.error('Error fetching trendings:', err);
    res.status(500).json({ message: 'Error fetching trending listings' });
  }
});





//cart

app.get('/cart', ensureAuth, async (req, res) => {
  console.log('🔔 GET /cart hit; isAuthenticated=', req.isAuthenticated(), 'user=', req.user && req.user._id);
  try {
    const items = await CartItem.find({ user: req.user._id }).populate('listing');
    console.log('  ↳ found', items.length, 'items');
    return res.json(items);
  } catch (err) {
    console.error('❌ GET /cart error', err);
    return res.status(500).json({ message: 'Error fetching cart', error: err.message });
  }
});

app.post('/cart', ensureAuth, async (req, res) => {
  console.log('🔔 POST /cart; user=', req.user && req.user._id, 'body=', req.body);
  try {
    let item = await CartItem.findOne({
      user:   req.user._id,
      listing:req.body.listingId,
      size:   req.body.size
    });
    console.log('  ↳ existing item =', item);
    if (item) {
      item.quantity += req.body.quantity;
    } else {
      item = new CartItem({
        user:    req.user._id,
        listing: req.body.listingId,
        size:    req.body.size,
        quantity:req.body.quantity
      });
    }
    const saved = await item.save();
    console.log('  ↳ saved =', saved);
    return res.json(saved);
  } catch (err) {
    console.error('❌ POST /cart error:', err);
    return res.status(500).json({ message: 'Could not add to cart', error: err.message });
  }
});


// Update quantity
app.patch('/cart/:id', ensureAuth, async (req, res) => {
  const { quantity } = req.body;
  try {
    const item = await CartItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Cart item not found' });
    item.quantity = quantity;
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Error updating cart item' });
  }
});
// Remove item
app.delete('/cart/:id', ensureAuth, async (req, res) => {
  try {
    await CartItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item removed' });
  } catch (err) {
    res.status(500).json({ message: 'Error removing item' });
  }
});
// Clear cart
app.delete('/cart', ensureAuth, async (req, res) => {
  try {
    await CartItem.deleteMany({ user: req.user._id });
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ message: 'Error clearing cart' });
  }
});

// ---------- Order Routes ----------
 // Create a new order
 app.post('/orders', ensureAuth, async (req, res) => {
  try {
    const { items, shippingAddress, totalAmount, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty. Cannot place order.' });
    }

    const order = new Order({
      user: req.user._id,
      items,
      shippingAddress,
      totalAmount,
      paymentMethod
    });

    await order.save();

    await CartItem.deleteMany({ user: req.user._id });

    res.status(201).json(order);
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// Get all orders of a user
app.get('/orders', ensureAuth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).populate('items.listing');
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ message: 'Server error fetching orders' });
  }
});

// Get a specific order by ID
app.get('/orders/:id', ensureAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.listing');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ message: 'Server error fetching order' });
  }
});


app.delete('/orders/:id', ensureAuth, async (req, res) => {
  console.log('🔔 DELETE /orders/:id', 'user=', req.user?._id, 'id=', req.params.id);
  try {
    // First verify this order belongs to the current user
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found or not authorized' });
    
    // Then delete it directly
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Order cancelled successfully' });
  } catch (err) {
    console.error('Error cancelling order:', err);
    res.status(500).json({ message: 'Server error cancelling order' });
  }
});


// ---------- User Route ----------
app.get('/me', ensureAuth, (req, res) => res.json({ user: req.user }));

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));// schema.js







