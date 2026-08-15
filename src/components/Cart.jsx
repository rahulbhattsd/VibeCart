
// import React, { useEffect, useState } from 'react';
// import { useNavigate, Link } from 'react-router-dom';
// import api from '../api'
// import './Cart.css';

// const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

// const Cart = () => {
//   const [items, setItems]         = useState([]);
//   const [loading, setLoading]     = useState(true);
//   const [error, setError]         = useState('');
//   const [payMethod, setPayMethod] = useState('COD');
//   const navigate                  = useNavigate();

//   // Load Razorpay script once
//   useEffect(() => {
//     const script = document.createElement('script');
//     script.src  = 'https://checkout.razorpay.com/v1/checkout.js';
//     document.body.appendChild(script);
//   }, []);

//   // Fetch cart items
//   useEffect(() => {
//     axios.get('/api/cart', { withCredentials: true })
//       .then(res => setItems(res.data))
//       .catch(() => setError('Could not load cart'))
//       .finally(() => setLoading(false));
//   }, []);

//   const updateQty = async (id, qty) => {
//     if (qty < 1) return;
//     try {
//       const res = await axios.patch(`/api/cart/${id}`, { quantity: qty }, { withCredentials: true });
//       setItems(curr => curr.map(i => i._id === id ? res.data : i));
//     } catch {
//       alert('Update failed');
//     }
//   };

//   const removeItem = async id => {
//     try {
//       await axios.delete(`/api/cart/${id}`, { withCredentials: true });
//       setItems(curr => curr.filter(i => i._id !== id));
//     } catch {
//       alert('Remove failed');
//     }
//   };

//   const clearCart = async () => {
//     try {
//       await axios.delete('/api/cart', { withCredentials: true });
//       setItems([]);
//     } catch {
//       alert('Clear failed');
//     }
//   };

//   const subtotal = items.reduce((sum, i) => sum + i.listing.price * i.quantity, 0);

//   const handleCheckout = async () => {
//     if (!items.length) return alert('Cart is empty');
//     if (!window.confirm('Proceed to payment?')) return;

//     const orderPayload = {
//       items: items.map(i => ({
//         listing:  i.listing._id,
//         quantity: i.quantity,
//         size:     i.size,
//         price:    i.listing.price
//       })),
//       totalAmount: subtotal
//     };

//     try {
//       if (payMethod === 'COD') {
//         // Cash on Delivery
//         await axios.post('/api/orders', { ...orderPayload, paymentMethod: 'COD' }, { withCredentials: true });
//         await axios.delete('/api/cart', { withCredentials: true });
//         setItems([]);
//         navigate('/orders');
//       } else {
//         // Razorpay flow
//         // 1) create Razorpay order
//         const { data: razorOrder } = await axios.post(
//           `${BACKEND}/api/payments/razorpay/order`,
//           { amount: subtotal * 100, currency: 'INR' },
//           { withCredentials: true }
//         );

//         // 2) open checkout
//         const options = {
//           key: razorOrder.key,
//           amount: razorOrder.amount,
//           currency: razorOrder.currency,
//           order_id: razorOrder.id,
//           name: 'vibeCart',
//           description: 'Your Cart Checkout',
//           handler: async (resp) => {
//             // 3) verify & save payment on backend
//             await axios.post(
//               `${BACKEND}/api/payments/razorpay/verify`,
//               {
//                 razorpayOrderId: razorOrder.id,
//                 razorpayPaymentId: resp.razorpay_payment_id,
//                 razorpaySignature: resp.razorpay_signature,
//                 items: orderPayload.items,
//                 shippingAddress: {},              // TODO: fill actual user address
//                 totalAmount: subtotal,
//                 paymentMethod: 'razorpay'
//               },
//               { withCredentials: true }
//             );

//             // 4) clear cart and navigate
//             await axios.delete('/api/cart', { withCredentials: true });
//             setItems([]);
//             navigate('/orders');
//           }
//         };

//         new window.Razorpay(options).open();
//       }
//     } catch (err) {
//       console.error('Checkout error:', err);
//       alert('Payment/order failed');
//     }
//   };

//   if (loading) return <div className="cart-loading">Loading cart...</div>;
//   if (error) return <div className="cart-error">{error}</div>;
  
//   return (
//     <div className="cart-container">
//       <div className="cart-header">
//         <h1>Your Shopping Cart</h1>
//         {items.length > 0 && (
//           <button className="clear-cart-btn" onClick={clearCart}>
//             Clear Cart
//           </button>
//         )}
//       </div>

//       {!items.length ? (
//         <div className="empty-cart">
//           <svg className="empty-cart-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
//             <path d="M3 3H5L5.4 5M5.4 5H21L17 13H7M5.4 5L7 13M7 13L5.2 15H17M16 18.5C16 19.3284 15.3284 20 14.5 20C13.6716 20 13 19.3284 13 18.5C13 17.6716 13.6716 17 14.5 17C15.3284 17 16 17.6716 16 18.5ZM9 18.5C9 19.3284 8.32843 20 7.5 20C6.67157 20 6 19.3284 6 18.5C6 17.6716 6.67157 17 7.5 17C8.32843 17 9 17.6716 9 18.5Z" 
//               stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
//           </svg>
//           <p>Your cart is empty</p>
//           <Link to="/" className="continue-shopping-btn">Continue Shopping</Link>
//         </div>
//       ) : (
//         <div className="cart-content">
//           <div className="cart-items-container">
//             <div className="cart-items-header">
//               <span className="product-col">Product</span>
//               <span className="price-col">Price</span>
//               <span className="quantity-col">Quantity</span>
//               <span className="total-col">Total</span>
//               <span className="action-col"></span>
//             </div>
            
//             <ul className="cart-items">
//               {items.map(item => {
//                 const itemTotal = item.listing.price * item.quantity;
                
//                 return (
//                   <li key={item._id} className="cart-item">
//                     <div className="product-col">
//                       <Link to={`/purchase/${item.listing._id}`} className="product-image">
//                         <img src={item.listing.imageUrl} alt={item.listing.title} loading="lazy" />
//                       </Link>
//                       <div className="product-info">
//                         <Link to={`/purchase/${item.listing._id}`} className="product-title">
//                           {item.listing.title}
//                         </Link>
//                         {item.size && <span className="product-size">Size: {item.size}</span>}
//                       </div>
//                     </div>
                    
//                     <div className="price-col">
//                       <span className="product-price">₹{item.listing.price.toFixed(2)}</span>
//                     </div>
                    
//                     <div className="quantity-col">
//                       <div className="quantity-control">
//                         <button 
//                           className="qty-btn minus"
//                           onClick={() => updateQty(item._id, Math.max(1, item.quantity - 1))}
//                           disabled={item.quantity <= 1}
//                         >
//                           -
//                         </button>
//                         <input
//                           type="number"
//                           min="1"
//                           max={item.listing.inventory[item.size] || 99}
//                           value={item.quantity}
//                           onChange={(e) => updateQty(item._id, parseInt(e.target.value) || 1)}
//                           className="qty-input"
//                         />
//                         <button 
//                           className="qty-btn plus"
//                           onClick={() => updateQty(item._id, item.quantity + 1)}
//                           disabled={item.quantity >= (item.listing.inventory[item.size] || 99)}
//                         >
//                           +
//                         </button>
//                       </div>
//                     </div>
                    
//                     <div className="total-col">
//                       <span className="item-total">₹{itemTotal.toFixed(2)}</span>
//                     </div>
                    
//                     <div className="action-col">
//                       <button 
//                         className="remove-item-btn"
//                         onClick={() => removeItem(item._id)}
//                         aria-label="Remove item"
//                       >
//                         <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
//                           <path d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" 
//                             stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
//                         </svg>
//                       </button>
//                     </div>
//                   </li>
//                 );
//               })}
//             </ul>
//           </div>

//           <div className="cart-summary">
//             <div className="summary-header">
//               <h2>Order Summary</h2>
//             </div>
            
//             <div className="summary-details">
//               <div className="summary-row">
//                 <span>Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})</span>
//                 <span>₹{subtotal.toFixed(2)}</span>
//               </div>
//               <div className="summary-row">
//                 <span>Shipping</span>
//                 <span>Free</span>
//               </div>
//               <div className="summary-row total">
//                 <span>Total</span>
//                 <span>₹{subtotal.toFixed(2)}</span>
//               </div>
//             </div>

//             <div className="payment-methods">
//               <h3>Payment Method</h3>
//               <div className="payment-options">
//                 <label className={`payment-option ${payMethod === 'COD' ? 'selected' : ''}`}>
//                   <input
//                     type="radio"
//                     name="payment"
//                     value="COD"
//                     checked={payMethod === 'COD'}
//                     onChange={() => setPayMethod('COD')}
//                   />
//                   <div className="option-content">
//                     <span className="option-icon">💵</span>
//                     <span className="option-text">Cash on Delivery</span>
//                   </div>
//                 </label>
                
//                 <label className={`payment-option ${payMethod === 'ONLINE' ? 'selected' : ''}`}>
//                   <input
//                     type="radio"
//                     name="payment"
//                     value="ONLINE"
//                     checked={payMethod === 'ONLINE'}
//                     onChange={() => setPayMethod('ONLINE')}
//                   />
//                   <div className="option-content">
//                     <span className="option-icon">💳</span>
//                     <span className="option-text">Pay Online</span>
//                   </div>
//                 </label>
//               </div>
//             </div>

//             <button 
//               className="checkout-btn"
//               onClick={handleCheckout}
//               disabled={items.length === 0}
//             >
//               {payMethod === 'COD' ? 'Place Order' : 'Pay with Razorpay'}
//             </button>

//             <Link to="/" className="continue-shopping-link">
//               Continue Shopping
//             </Link>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Cart;


// src/components/Cart.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import './Cart.css';

const Cart = () => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [payMethod, setPayMethod] = useState('COD');

  // Checkout flow state
  const [checkoutStep, setCheckoutStep] = useState(1); // 1=Cart, 2=Address, 3=Payment
  const [guestEmail, setGuestEmail] = useState('');
  const [address, setAddress] = useState({
    street: '', city: '', state: '', zip: ''
  });

  const navigate = useNavigate();

  // Load Razorpay script once
  useEffect(() => {
    const script = document.createElement('script');
    script.src  = 'https://checkout.razorpay.com/v1/checkout.js';
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  // Fetch cart items
  useEffect(() => {
    api.get('/cart')
      .then(res => setItems(res.data))
      .catch((err) => {
        if (err.response && err.response.status === 401) {
          // Unauthenticated: load guest cart
          const guestCart = JSON.parse(localStorage.getItem('guestCart')) || [];
          setItems(guestCart);
        } else {
          setError('Could not load cart');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const isGuest = !localStorage.getItem('user');

  const updateQty = async (id, qty) => {
    if (qty < 1) return;

    if (isGuest) {
      const guestCart = JSON.parse(localStorage.getItem('guestCart')) || [];
      const updatedCart = guestCart.map(i => i._id === id ? { ...i, quantity: qty } : i);
      localStorage.setItem('guestCart', JSON.stringify(updatedCart));
      setItems(updatedCart);
      window.dispatchEvent(new Event('cartUpdated'));
      return;
    }

    try {
      const { data } = await api.patch(`/cart/${id}`, { quantity: qty });
      setItems(curr => curr.map(i => i._id === id ? data : i));
      window.dispatchEvent(new Event('cartUpdated'));
    } catch {
      alert('Update failed');
    }
  };

  const removeItem = async id => {
    if (isGuest) {
      const guestCart = JSON.parse(localStorage.getItem('guestCart')) || [];
      const updatedCart = guestCart.filter(i => i._id !== id);
      localStorage.setItem('guestCart', JSON.stringify(updatedCart));
      setItems(updatedCart);
      window.dispatchEvent(new Event('cartUpdated'));
      return;
    }

    try {
      await api.delete(`/cart/${id}`);
      setItems(curr => curr.filter(i => i._id !== id));
      window.dispatchEvent(new Event('cartUpdated'));
    } catch {
      alert('Remove failed');
    }
  };

  const clearCart = async () => {
    if (isGuest) {
      localStorage.removeItem('guestCart');
      setItems([]);
      window.dispatchEvent(new Event('cartUpdated'));
      return;
    }

    try {
      await api.delete('/cart');
      setItems([]);
      window.dispatchEvent(new Event('cartUpdated'));
    } catch {
      alert('Clear failed');
    }
  };

  const subtotal = items.reduce((sum, i) => sum + i.listing.price * i.quantity, 0);

  const proceedToAddress = () => {
    if (!items.length) return alert('Cart is empty');
    setCheckoutStep(2);
  };

  const proceedToPayment = (e) => {
    e.preventDefault();
    if (isGuest && !guestEmail) return alert('Please enter your email');
    if (!address.street || !address.city || !address.state || !address.zip) return alert('Please complete the address form');
    setCheckoutStep(3);
  };

  const handleCheckout = async () => {
    if (!items.length) return alert('Cart is empty');

    const orderPayload = {
      items: items.map(i => ({
        listing:  i.listing._id,
        quantity: i.quantity,
        size:     i.size,
        price:    i.listing.price
      })),
      totalAmount: subtotal,
      shippingAddress: address,
      guestEmail: isGuest ? guestEmail : undefined
    };

    try {
      if (payMethod === 'COD') {
        // Cash on Delivery
        await api.post('/orders', { ...orderPayload, paymentMethod: 'COD' });
        if (isGuest) {
          localStorage.removeItem('guestCart');
          setItems([]);
          window.dispatchEvent(new Event('cartUpdated'));
          alert('Order placed successfully (Guest)');
        } else {
          await api.delete('/cart');
          setItems([]);
          window.dispatchEvent(new Event('cartUpdated'));
        }
        navigate('/orders');
      } else {
        // Razorpay flow
        // 1) create Razorpay order
        const { data: razorOrder } = await api.post('/payments/razorpay/order', {
          amount: subtotal * 100,
          currency: 'INR'
        });

        // 2) open checkout
        const options = {
          key: razorOrder.key,
          amount: razorOrder.amount,
          currency: razorOrder.currency,
          order_id: razorOrder.id,
          name: 'vibeCart',
          description: 'Your Cart Checkout',
          handler: async resp => {
            // 3) verify & save payment on backend
            await api.post('/payments/razorpay/verify', {
              razorpayOrderId: razorOrder.id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
              items: orderPayload.items,
              shippingAddress: address,
              totalAmount: subtotal,
              paymentMethod: 'razorpay',
              guestEmail: isGuest ? guestEmail : undefined
            });

            // 4) clear cart and navigate
            if (isGuest) {
              localStorage.removeItem('guestCart');
              setItems([]);
              window.dispatchEvent(new Event('cartUpdated'));
            } else {
              await api.delete('/cart');
              setItems([]);
              window.dispatchEvent(new Event('cartUpdated'));
            }
            alert('Order placed successfully');
            navigate('/orders');
          }
        };

        new window.Razorpay(options).open();
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Payment/order failed');
    }
  };

  if (loading) return <div className="cart-loading">Loading cart...</div>;
  if (error)   return <div className="cart-error">{error}</div>;

  return (
    <div className="cart-container">
      <div className="cart-header">
        <h1>{checkoutStep === 1 ? 'Your Shopping Cart' : checkoutStep === 2 ? 'Shipping Address' : 'Payment Method'}</h1>
        {items.length > 0 && checkoutStep === 1 && (
          <button className="clear-cart-btn" onClick={clearCart}>
            Clear Cart
          </button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem', background: '#f9f9f9', borderBottom: '1px solid #eee' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontWeight: checkoutStep === 1 ? 'bold' : 'normal', color: checkoutStep >= 1 ? '#6a0dad' : '#999' }}>1. Cart</span>
          <span>→</span>
          <span style={{ fontWeight: checkoutStep === 2 ? 'bold' : 'normal', color: checkoutStep >= 2 ? '#6a0dad' : '#999' }}>2. Address</span>
          <span>→</span>
          <span style={{ fontWeight: checkoutStep === 3 ? 'bold' : 'normal', color: checkoutStep === 3 ? '#6a0dad' : '#999' }}>3. Payment</span>
        </div>
      </div>

      {!items.length ? (
        <div className="empty-cart">
          {/* ...empty state SVG & link... */}
          <p>Your cart is empty</p>
          <Link to="/" className="continue-shopping-btn">Continue Shopping</Link>
        </div>
      ) : (
        <div className="cart-content">

          {checkoutStep === 1 && (
            <div className="cart-items-container">
              <div className="cart-items-header">
                <span className="product-col">Product</span>
                <span className="price-col">Price</span>
                <span className="quantity-col">Quantity</span>
                <span className="total-col">Total</span>
                <span className="action-col"></span>
              </div>

              <ul className="cart-items">
                {items.map(item => {
                  const itemTotal = item.listing.price * item.quantity;

                  return (
                    <li key={item._id} className="cart-item">
                      <div className="product-col">
                        <Link to={`/purchase/${item.listing._id}`} className="product-image">
                          <img src={item.listing.imageUrl} alt={item.listing.title} loading="lazy" />
                        </Link>
                        <div className="product-info">
                          <Link to={`/purchase/${item.listing._id}`} className="product-title">
                            {item.listing.title}
                          </Link>
                          {item.size && <span className="product-size">Size: {item.size}</span>}
                        </div>
                      </div>

                      <div className="price-col">
                        <span className="product-price">₹{item.listing.price.toFixed(2)}</span>
                      </div>

                      <div className="quantity-col">
                        <div className="quantity-control">
                          <button
                            className="qty-btn minus"
                            onClick={() => updateQty(item._id, Math.max(1, item.quantity - 1))}
                            disabled={item.quantity <= 1}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={item.listing.inventory ? item.listing.inventory[item.size] : 99}
                            value={item.quantity}
                            onChange={(e) => updateQty(item._id, parseInt(e.target.value) || 1)}
                            className="qty-input"
                          />
                          <button
                            className="qty-btn plus"
                            onClick={() => updateQty(item._id, item.quantity + 1)}
                            disabled={item.quantity >= (item.listing.inventory ? item.listing.inventory[item.size] : 99)}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="total-col">
                        <span className="item-total">₹{itemTotal.toFixed(2)}</span>
                      </div>

                      <div className="action-col">
                        <button
                          className="remove-item-btn"
                          onClick={() => removeItem(item._id)}
                          aria-label="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {checkoutStep === 2 && (
            <div className="address-container" style={{ padding: '2rem', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <h2>Shipping Address</h2>
              <form onSubmit={proceedToPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {isGuest && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email for Order Updates</label>
                    <input type="email" required value={guestEmail} onChange={e => setGuestEmail(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ddd' }} />
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Street Address</label>
                  <input type="text" required value={address.street} onChange={e => setAddress({...address, street: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ddd' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>City</label>
                    <input type="text" required value={address.city} onChange={e => setAddress({...address, city: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ddd' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>State</label>
                    <input type="text" required value={address.state} onChange={e => setAddress({...address, state: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ddd' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>ZIP Code</label>
                  <input type="text" required value={address.zip} onChange={e => setAddress({...address, zip: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ddd' }} />
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setCheckoutStep(1)} className="btn btn-secondary" style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>Back to Cart</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '1rem', borderRadius: '8px', background: '#6a0dad', color: '#fff', border: 'none', cursor: 'pointer' }}>Continue to Payment</button>
                </div>
              </form>
            </div>
          )}

          {checkoutStep === 3 && (
            <div className="payment-container" style={{ padding: '2rem', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <div className="payment-methods">
                <h3>Payment Method</h3>
                <label className={`payment-option ${payMethod === 'COD' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="COD"
                    checked={payMethod === 'COD'}
                    onChange={() => setPayMethod('COD')}
                  />
                  💵 Cash on Delivery
                </label>
                <label className={`payment-option ${payMethod === 'ONLINE' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="ONLINE"
                    checked={payMethod === 'ONLINE'}
                    onChange={() => setPayMethod('ONLINE')}
                  />
                  💳 Pay Online (Razorpay)
                </label>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setCheckoutStep(2)} className="btn btn-secondary" style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>Back to Address</button>
                <button
                  className="checkout-btn"
                  onClick={handleCheckout}
                  disabled={!items.length}
                  style={{ flex: 1 }}
                >
                  {payMethod === 'COD' ? 'Place Order' : 'Pay with Razorpay'}
                </button>
              </div>
            </div>
          )}

          <div className="cart-summary" style={{ alignSelf: 'start', position: 'sticky', top: '2rem' }}>
            <h2>Order Summary</h2>
            <div className="summary-details">
              <div className="summary-row">
                <span>Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
            </div>

            {checkoutStep === 1 && (
              <button
                className="checkout-btn"
                onClick={proceedToAddress}
                disabled={!items.length}
                style={{ width: '100%', marginTop: '1rem' }}
              >
                Proceed to Checkout
              </button>
            )}

            <Link to="/" className="continue-shopping-link">
              Continue Shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;


