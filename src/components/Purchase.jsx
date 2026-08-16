import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import './Purchase.css';

const Purchase = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [mainImage, setMainImage] = useState('');

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    document.body.appendChild(script);

    axios.get(`/api/listings/${id}`)
      .then(res => {
        setListing(res.data);
        setMainImage(res.data.imageUrl);
        const firstSize = Object.keys(res.data.inventory)[0];
        setSize(firstSize);
        // Fetch related products (same category, excluding current)
        axios.get(`/api/listings?category=${res.data.category}&limit=5`)
          .then(relRes => {
            setRelatedProducts(relRes.data.filter(p => p._id !== id).slice(0, 4));
          })
          .catch(e => console.error("Error fetching related products", e));

        // Add to recently viewed in localStorage
        let viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
        viewed = viewed.filter(item => item.id !== id); // Remove duplicate if exists
        viewed.unshift({ id, title: res.data.title, imageUrl: res.data.imageUrl });
        viewed = viewed.slice(0, 5); // Keep only last 5
        localStorage.setItem('recentlyViewed', JSON.stringify(viewed));
      })
      .catch(() => setError('Failed to load product'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = () => {
    axios.post(
      '/api/cart',
      { listingId: id, size, quantity },
      { withCredentials: true }
    )
    .then(() => {
      alert('Added to cart');
      window.dispatchEvent(new Event('cartUpdated'));
    })
    .catch((err) => {
      // If unauthorized, save to guestCart in localStorage
      if (err.response && err.response.status === 401) {
        const guestCart = JSON.parse(localStorage.getItem('guestCart')) || [];
        const existingItem = guestCart.find(i => i.listing._id === id && i.size === size);

        if (existingItem) {
          existingItem.quantity += quantity;
        } else {
          // Store listing object shape similar to backend population
          guestCart.push({
            _id: Date.now().toString(), // fake cart item ID
            listing: { _id: id, title: listing.title, price: listing.price, imageUrl: listing.imageUrl, inventory: listing.inventory },
            size,
            quantity
          });
        }
        localStorage.setItem('guestCart', JSON.stringify(guestCart));
        alert('Added to cart (Guest)');
        window.dispatchEvent(new Event('cartUpdated'));
      } else {
        alert('Could not add to cart');
      }
    });
  };

  const handleBuyNow = async () => {
    if (paymentMethod === 'razorpay') {
      try {
        // 1. Create order
        const orderRes = await axios.post(
          'http://localhost:5000/api/payments/razorpay/order',
          { amount: listing.price * quantity * 100, currency: 'INR' },
          { withCredentials: true }
        );
        const { id: razorpayOrderId, key: razorpayKeyId } = orderRes.data;

        // 2. Setup options
        const options = {
          key: razorpayKeyId,
          amount: listing.price * quantity * 100,
          currency: 'INR',
          name: listing.title,
          description: `UK ${size} × ${quantity}`,
          order_id: razorpayOrderId,
          handler: async (response) => {
            // 3. Verify & place order
            const { data: verifyData } = await axios.post(
              'http://localhost:5000/api/payments/razorpay/verify',
              {
                razorpayOrderId,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                items: [{ listing: id, size, quantity, price: listing.price }],
                shippingAddress: {},    // replace with actual address data
                totalAmount: listing.price * quantity,
                paymentMethod: 'razorpay'
              },
              { withCredentials: true }
            );
            navigate(`/order-confirmation/${verifyData._id || 'razorpay-order'}`, { state: { summary: { totalAmount: listing.price * quantity, itemsCount: 1 } } });
          }
        };
        new window.Razorpay(options).open();
      } catch (err) {
        console.error(err);
        alert('Payment initiation failed');
      }
    } else {
      // COD fallback
      const order = {
        items: [{ listing: id, size, quantity, price: listing.price }],
        shippingAddress: {},      // replace with actual address data
        totalAmount: listing.price * quantity,
        paymentMethod: 'COD'
      };
      axios.post('/api/orders', order, { withCredentials: true })
        .then((res) => { navigate(`/order-confirmation/${res.data._id}`, { state: { summary: { totalAmount: order.totalAmount, itemsCount: 1 } } }); })
        .catch(() => alert('Order failed'));
    }
  };

  if (loading) return <p>Loading…</p>;
  if (error)   return <p className="error">{error}</p>;

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) return alert('Please write a comment');

    try {
      const res = await axios.post(`/api/listings/${id}/reviews`, { rating: reviewRating, comment: reviewComment }, { withCredentials: true });
      setListing(res.data.listing);
      setReviewComment('');
      alert('Review added successfully');
    } catch {
      alert('Must be logged in to leave a review.');
    }
  };

  const availableStock = listing.inventory[size] || 0;

  return (
    <div className="purchase" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div className="purchase-content" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
        <div className="image-gallery">
          <div style={{ overflow: 'hidden', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <img loading="lazy"
              src={mainImage}
              alt={listing.title}

              style={{ width: '100%', display: 'block', transition: 'transform 0.3s ease' }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.5)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            />
          </div>
          <div className="thumbnails" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <img loading="lazy"
              src={listing.imageUrl}
              alt="Thumbnail"
              style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: mainImage === listing.imageUrl ? '2px solid #6a0dad' : '2px solid transparent' }}
              onClick={() => setMainImage(listing.imageUrl)}
            />
            {/* Additional thumbnails can be added here if listing.images array exists */}
          </div>
        </div>

      <div className="details">
        <h2>{listing.title}</h2>
        <p>{listing.description}</p>
        <p className="price">₹{listing.price.toFixed(2)}</p>

        <div className="options" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Size (UK):</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {Object.keys(listing.inventory).map(sz => (
                <button
                  key={sz}
                  onClick={() => setSize(sz)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: size === sz ? '2px solid #6a0dad' : '1px solid #ccc',
                    background: size === sz ? '#6a0dad' : '#fff',
                    color: size === sz ? '#fff' : '#333',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 'bold' }}>Qty:</span>
            <input
              type="number"
              min="1"
              max={availableStock}
              value={quantity}
              onChange={e => setQuantity(Math.min(Number(e.target.value), availableStock))}
              style={{ width: '60px', padding: '0.25rem' }}
            />
          </label>

          <label>
            Payment:
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="COD">Cash on Delivery</option>
              <option value="razorpay">Razorpay</option>
            </select>
          </label>
        </div>

        <p style={{ marginTop: '0.5rem', fontWeight: '500', color: availableStock > 0 ? (availableStock <= 3 ? '#f59e0b' : '#10b981') : '#ef4444' }}>
          {availableStock > 0 ? (availableStock <= 3 ? `Only ${availableStock} left!` : 'In Stock') : 'Out of stock'}
        </p>

        <div className="actions" style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button className="btn btn-secondary" onClick={handleAddToCart} disabled={availableStock === 0} style={{ flex: 1, padding: '1rem', borderRadius: '8px', background: '#f3f4f6', color: '#111', fontWeight: 'bold', border: 'none', cursor: availableStock === 0 ? 'not-allowed' : 'pointer' }}>
            Add to Cart
          </button>
          <button className="btn btn-primary" onClick={handleBuyNow} disabled={availableStock === 0} style={{ flex: 1, padding: '1rem', borderRadius: '8px', background: '#6a0dad', color: '#fff', fontWeight: 'bold', border: 'none', cursor: availableStock === 0 ? 'not-allowed' : 'pointer' }}>
            Buy Now
          </button>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: '#555' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🔒</span> <span>Secure Checkout</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🔄</span> <span><a href="/privacy" style={{ color: '#555', textDecoration: 'underline' }}>Free returns within 30 days</a></span>
          </div>
        </div>

      </div>
      </div>

      {relatedProducts.length > 0 && (
        <div className="related-products" style={{ marginTop: '4rem', borderTop: '1px solid #eee', paddingTop: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Related Products</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '2rem' }}>
            {relatedProducts.map(prod => (
              <a key={prod._id} href={`/purchase/${prod._id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <img loading="lazy"  src={prod.imageUrl} alt={prod.title} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.5rem' }} />
                <h4 style={{ margin: '0', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prod.title}</h4>
                <p style={{ margin: '0.25rem 0 0 0', fontWeight: 'bold', color: '#6a0dad' }}>₹{prod.price}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <div className="reviews-section" style={{ marginTop: '3rem', borderTop: '1px solid #eee', paddingTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.5rem', margin: 0 }}>Customer Reviews</h3>
          {listing.rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#f59e0b', fontSize: '1.25rem' }}>{'⭐'.repeat(Math.round(listing.rating))}</span>
              <span style={{ color: '#666', fontSize: '1rem' }}>({listing.rating.toFixed(1)} / 5)</span>
            </div>
          )}
        </div>

        <div className="reviews-list" style={{ marginBottom: '2rem' }}>
          {listing.reviews && listing.reviews.length > 0 ? (
            listing.reviews.map((r, i) => (
              <div key={i} className="review-item" style={{ padding: '1rem', borderBottom: '1px solid #eee', marginBottom: '1rem', background: '#fafafa', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold' }}>{r.name || 'User'}</span>
                  <span style={{ color: '#f59e0b' }}>{'⭐'.repeat(r.rating)}</span>
                </div>
                <p style={{ margin: 0, color: '#444' }}>{r.comment}</p>
                <small style={{ color: '#999', display: 'block', marginTop: '0.5rem' }}>{new Date(r.createdAt).toLocaleDateString()}</small>
              </div>
            ))
          ) : (
            <p>No reviews yet. Be the first to review!</p>
          )}
        </div>

        <form onSubmit={submitReview} style={{ background: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', maxWidth: '600px' }}>
          <h4 style={{ marginTop: 0 }}>Write a Review</h4>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Rating</label>
            <select value={reviewRating} onChange={e => setReviewRating(Number(e.target.value))} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="5">5 - Excellent</option>
              <option value="4">4 - Good</option>
              <option value="3">3 - Average</option>
              <option value="2">2 - Poor</option>
              <option value="1">1 - Terrible</option>
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Comment</label>
            <textarea
              rows="3"
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
              placeholder="Tell us what you think..."
            ></textarea>
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem', background: '#6a0dad', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Submit Review
          </button>
        </form>
      </div>

    </div>
  );
};

export default Purchase;
