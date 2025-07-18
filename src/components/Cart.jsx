
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
      .catch(() => setError('Could not load cart'))
      .finally(() => setLoading(false));
  }, []);

  const updateQty = async (id, qty) => {
    if (qty < 1) return;
    try {
      const { data } = await api.patch(`/cart/${id}`, { quantity: qty });
      setItems(curr => curr.map(i => i._id === id ? data : i));
    } catch {
      alert('Update failed');
    }
  };

  const removeItem = async id => {
    try {
      await api.delete(`/cart/${id}`);
      setItems(curr => curr.filter(i => i._id !== id));
    } catch {
      alert('Remove failed');
    }
  };

  const clearCart = async () => {
    try {
      await api.delete('/cart');
      setItems([]);
    } catch {
      alert('Clear failed');
    }
  };

  const subtotal = items.reduce((sum, i) => sum + i.listing.price * i.quantity, 0);

  const handleCheckout = async () => {
    if (!items.length) return alert('Cart is empty');
    if (!window.confirm('Proceed to payment?')) return;

    const orderPayload = {
      items: items.map(i => ({
        listing:  i.listing._id,
        quantity: i.quantity,
        size:     i.size,
        price:    i.listing.price
      })),
      totalAmount: subtotal
    };

    try {
      if (payMethod === 'COD') {
        // Cash on Delivery
        await api.post('/orders', { ...orderPayload, paymentMethod: 'COD' });
        await api.delete('/cart');
        setItems([]);
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
              shippingAddress: {},              // TODO: actual user address
              totalAmount: subtotal,
              paymentMethod: 'razorpay'
            });

            // 4) clear cart and navigate
            await api.delete('/cart');
            setItems([]);
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
        <h1>Your Shopping Cart</h1>
        {items.length > 0 && (
          <button className="clear-cart-btn" onClick={clearCart}>
            Clear Cart
          </button>
        )}
      </div>

      {!items.length ? (
        <div className="empty-cart">
          {/* ...empty state SVG & link... */}
          <p>Your cart is empty</p>
          <Link to="/" className="continue-shopping-btn">Continue Shopping</Link>
        </div>
      ) : (
        <div className="cart-content">
          {/* ...list items, quantity controls, remove buttons... */}
          <div className="cart-summary">
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
                💳 Pay Online
              </label>
            </div>

            <button
              className="checkout-btn"
              onClick={handleCheckout}
              disabled={!items.length}
            >
              {payMethod === 'COD' ? 'Place Order' : 'Pay with Razorpay'}
            </button>

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


