// Backend/chatbot.js
const { Groq } = require('groq-sdk');
const mongoose = require('mongoose');
const { Order, Listing } = require('./schema');

// In-memory token bucket rate limiter (20 requests per 10 minutes per IP/session)
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;
const rateLimitMap = new Map();

// Periodic cleanup of stale rate limiter records
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.resetTime > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

function checkRateLimit(clientId) {
  const now = Date.now();
  let record = rateLimitMap.get(clientId);

  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(clientId, record);
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  record.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.count };
}

// Extract relevant context from MongoDB based on user query
async function retrieveStoreContext(userMessage, reqUser) {
  if (mongoose.connection.readyState !== 1) {
    return '';
  }

  const contextNotes = [];
  const text = (userMessage || '').toLowerCase();

  // 1. Order lookup by ID or recent user orders
  const objectIdMatch = userMessage.match(/[a-f\d]{24}/i);
  if (objectIdMatch) {
    try {
      const order = await Order.findById(objectIdMatch[0]).populate('items.listing', 'title price imageUrl');
      if (order) {
        const itemSummary = order.items.map(item => 
          `â€¢ ${item.listing?.title || 'Product'} (Size: ${item.size || 'Standard'}, Qty: ${item.quantity}, Price: â‚¹${item.price})`
        ).join('\n');

        contextNotes.push(
          `[DATABASE CONTEXT: ORDER #${order._id}]\n` +
          `Order ID: ${order._id}\n` +
          `Status: Confirmed / Processing for Dispatch\n` +
          `Order Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}\n` +
          `Total Amount: â‚¹${order.totalAmount}\n` +
          `Payment Method: ${order.paymentMethod}\n` +
          `Items Ordered:\n${itemSummary}`
        );
      }
    } catch (err) {
      console.warn('Error querying order context:', err.message);
    }
  } else if (reqUser && /order|track|purchase|delivery|status|history/i.test(text)) {
    // If authenticated user asks about orders without specific ID, fetch their recent 3 orders
    try {
      const recentOrders = await Order.find({ user: reqUser._id })
        .sort({ createdAt: -1 })
        .limit(3)
        .populate('items.listing', 'title price');

      if (recentOrders.length > 0) {
        const ordersList = recentOrders.map(o => {
          const itemsDesc = o.items.map(i => `${i.listing?.title || 'Item'} (x${i.quantity})`).join(', ');
          return `â€¢ Order #${o._id} | Placed: ${new Date(o.createdAt).toLocaleDateString('en-IN')} | Total: â‚¹${o.totalAmount} | Method: ${o.paymentMethod} | Items: ${itemsDesc}`;
        }).join('\n');

        contextNotes.push(`[DATABASE CONTEXT: USER'S RECENT ORDERS]\n${ordersList}`);
      }
    } catch (err) {
      console.warn('Error querying user recent orders:', err.message);
    }
  }

  // 2. Product availability / search context
  const productTriggers = ['product', 'shoe', 'sneaker', 'price', 'cost', 'available', 'stock', 'buy', 'have', 'size', 'collection', 'catalog', 'recommend'];
  const hasProductQuery = productTriggers.some(trigger => text.includes(trigger));

  if (hasProductQuery || text.length > 2) {
    try {
      // Clean query tokens to search in title/category/tags
      const cleanTokens = text
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length >= 3 && !['what', 'where', 'when', 'which', 'have', 'does', 'show', 'with', 'your', 'about', 'need', 'want', 'tell', 'help'].includes(word));

      let listings = [];
      if (cleanTokens.length > 0) {
        const regexQueries = cleanTokens.slice(0, 3).map(token => ({
          $or: [
            { title: { $regex: token, $options: 'i' } },
            { category: { $regex: token, $options: 'i' } },
            { tags: { $regex: token, $options: 'i' } },
            { description: { $regex: token, $options: 'i' } },
          ]
        }));
        listings = await Listing.find({ $or: regexQueries }).limit(5).select('_id title price category inventory tags rating');
      }

      // If no keyword match or general request, fetch 4 featured products
      if (listings.length === 0 && hasProductQuery) {
        listings = await Listing.find().sort({ rating: -1, createdAt: -1 }).limit(4).select('_id title price category inventory tags rating');
      }

      if (listings.length > 0) {
        const productsSummary = listings.map(p => {
          let sizes = [];
          if (p.inventory) {
            if (p.inventory instanceof Map) {
              sizes = Array.from(p.inventory.entries()).filter(([_, qty]) => qty > 0).map(([sz]) => `UK ${sz}`);
            } else if (typeof p.inventory === 'object') {
              sizes = Object.entries(p.inventory).filter(([_, qty]) => qty > 0).map(([sz]) => `UK ${sz}`);
            }
          }
          const availableSizesStr = sizes.length > 0 ? sizes.join(', ') : 'UK 6, UK 7, UK 8, UK 9, UK 10';
          const frontendUrl = process.env.FRONTEND_URL || 'https://vibecart-eo6e.onrender.com';
          const productLink = frontendUrl + '/purchase/' + String(p._id);
          return '* "' + p.title + '" - Rs.' + p.price + ' | Sizes: ' + availableSizesStr + ' | Direct Link: ' + productLink;
        }).join('\n');

        contextNotes.push(`[DATABASE CONTEXT: AVAILABLE PRODUCTS]\n${productsSummary}`);
      }
    } catch (err) {
      console.warn('Error querying product catalog context:', err.message);
    }
  }

  return contextNotes.join('\n\n');
}

// Build the system prompt
function buildSystemPrompt(retrievedContext, userName) {
  return `You are "VibeBot", the official AI customer support assistant for VibeCart â€” a premier footwear and lifestyle e-commerce store in India.

ROLE & SCOPE:
- You ONLY handle customer support for VibeCart.
- Strictly answer questions about:
  1. Order tracking, order status, and order cancellation.
  2. Shipping and delivery policies.
  3. Returns, refunds, and exchange guidelines.
  4. Shoe sizing guide (UK sizes) and fit advice.
  5. Product catalog, availability, pricing, and stock.
  6. Payment methods (Razorpay, COD, UPI, Cards).
  7. Store contacts and human agent escalation.
- IF THE USER ASKS ABOUT ANYTHING UNRELATED TO VIBECART (e.g. general knowledge, coding, writing essays, math, personal chat, politics, weather, recipes):
  POLITELY REFUSE: "I'm VibeCart's customer support assistant. I can only assist with questions regarding VibeCart orders, products, sizing, shipping, and store policies. How may I help you with your shopping today?"

STORE POLICIES & KNOWLEDGE BASE:
- Store Name: VibeCart
- Customer Greeting: ${userName ? `The customer's name is ${userName}. Address them warmly.` : 'Address the customer warmly and professionally.'}
- Shipping Policy: Standard delivery takes 3 to 5 business days across India. Free shipping on all orders above â‚¹999. Express delivery (1-2 business days) available in metro areas.
- Return & Exchange Policy: 7-day hassle-free return and exchange window starting from the delivery date. Items must be unworn, in pristine original condition with tags and shoebox intact. Refunds are initiated to original payment source within 5-7 business days upon inspection.
- Footwear Size Guide: VibeCart uses standard UK sizing (UK 4 to UK 13). If a customer is between sizes, suggest half-size up for athletic/running shoes or true-to-size for casual sneakers.
- Payment Methods: Cash on Delivery (COD) and Online Payments via Razorpay (Credit/Debit Cards, UPI, Net Banking, EMI).
- Human Support Escalation:
  â€¢ Email: support@vibecart.com
  â€¢ WhatsApp: +91-9876543210 (Hours: Mon - Sat, 9:00 AM - 7:00 PM IST)

FORMATTING GUIDELINES:
- Keep answers concise, clear, and helpful.
- Use bolding, bullet points, and markdown for readable lists.
- Mention prices in Indian Rupees (â‚¹).

${retrievedContext ? `LIVE STORE DATA:\n${retrievedContext}\n` : ''}
Use the live store data above to answer accurately when applicable. If an order ID was provided and matches database context, give its specific status. If asked for products, suggest items from the available products list and ALWAYS include the direct product link so the customer can view or buy immediately.`;
}

// Controller for POST /api/chat
async function handleChatStream(req, res) {
  // Rate limiting check
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  const clientId = req.user ? `user_${req.user._id}` : `ip_${clientIp}`;

  const rateCheck = checkRateLimit(clientId);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: `You have sent too many messages. Please wait ${rateCheck.retryAfterSeconds || 60} seconds before trying again.`
    });
  }

  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid request: messages array required.' });
  }

  const apiKey = process.env.GROQ_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('GROQ_KEY or GROQ_API_KEY is not set in environment variables.');
    return res.status(500).json({
      error: 'Chatbot service configuration error',
      message: 'Support chat is currently offline. Please reach out to support@vibecart.com.'
    });
  }

  // Get last user query for context extraction
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';

  // Retrieve MongoDB store context based on query
  let storeContext = '';
  try {
    storeContext = await retrieveStoreContext(lastUserMessage, req.user);
  } catch (err) {
    console.error('Failed to gather store context:', err);
  }

  // Build system prompt with store context
  const userName = req.user?.name || '';
  const systemPrompt = buildSystemPrompt(storeContext, userName);

  // Pass last 6-8 messages as conversational context
  const trimmedHistory = messages
    .slice(-8)
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content }));

  const conversationMessages = [
    { role: 'system', content: systemPrompt },
    ...trimmedHistory
  ];

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  try {
    const groq = new Groq({ apiKey });
    const preferredModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    let completionStream;
    try {
      completionStream = await groq.chat.completions.create({
        model: preferredModel,
        messages: conversationMessages,
        temperature: 0.4,
        max_completion_tokens: 1024,
        stream: true,
      });
    } catch (modelErr) {
      if (modelErr?.status === 404 || modelErr?.code === 'model_not_found') {
        console.warn(`Model ${preferredModel} not found on this Groq key. Falling back to groq/compound-mini.`);
        completionStream = await groq.chat.completions.create({
          model: 'groq/compound-mini',
          messages: conversationMessages,
          temperature: 0.4,
          max_completion_tokens: 1024,
          stream: true,
        });
      } else {
        throw modelErr;
      }
    }

    for await (const chunk of completionStream) {
      const deltaText = chunk.choices[0]?.delta?.content || '';
      if (deltaText) {
        res.write(`data: ${JSON.stringify({ content: deltaText })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Groq streaming error:', err);
    // If streaming has already started, send SSE error event
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: 'Sorry, I encountered an issue generating a response. Please try again shortly.' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      res.status(500).json({
        error: 'Chat error',
        message: 'Unable to reach support service right now. Please try again later.'
      });
    }
  }
}

module.exports = {
  handleChatStream,
  checkRateLimit,
  retrieveStoreContext,
  buildSystemPrompt
};


