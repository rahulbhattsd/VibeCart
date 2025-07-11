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

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    document.body.appendChild(script);

    axios.get(`/api/listings/${id}`)
      .then(res => {
        setListing(res.data);
        const firstSize = Object.keys(res.data.inventory)[0];
        setSize(firstSize);
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
    .then(() => alert('Added to cart'))
    .catch(() => alert('Could not add to cart'));
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
            await axios.post(
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
            alert('Payment successful');
            navigate('/orders');
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
        .then(() => { alert('Order placed'); navigate('/orders'); })
        .catch(() => alert('Order failed'));
    }
  };

  if (loading) return <p>Loading…</p>;
  if (error)   return <p className="error">{error}</p>;

  const availableStock = listing.inventory[size] || 0;

  return (
    <div className="purchase">
      <img src={listing.imageUrl} alt={listing.title} />
      <div className="details">
        <h2>{listing.title}</h2>
        <p>{listing.description}</p>
        <p className="price">₹{listing.price.toFixed(2)}</p>

        <div className="options">
          <label>
            Size:
            <select value={size} onChange={e => setSize(e.target.value)}>
              {Object.keys(listing.inventory).map(sz => (
                <option key={sz} value={sz}>UK {sz}</option>
              ))}
            </select>
          </label>

          <label>
            Qty:
            <input
              type="number"
              min="1"
              max={availableStock}
              value={quantity}
              onChange={e => setQuantity(Math.min(Number(e.target.value), availableStock))}
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

        <div className="actions">
          <button className="btn btn-secondary" onClick={handleAddToCart} disabled={availableStock === 0}>
            Add to Cart
          </button>
          <button className="btn btn-primary" onClick={handleBuyNow} disabled={availableStock === 0}>
            Buy Now
          </button>
        </div>

        {availableStock === 0 && <p className="error">Out of stock</p>}
      </div>
    </div>
  );
};

export default Purchase;
