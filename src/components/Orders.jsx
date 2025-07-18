// src/components/Orders.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import './Orders.css';

const Orders = () => {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get('/orders')
      .then(res => setOrders(res.data))
      .catch(() => setError('Could not load orders'))
      .finally(() => setLoading(false));
  }, []);

  const cancelOrder = id => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    api.delete(`/orders/${id}`)
      .then(() => setOrders(prev => prev.filter(o => o._id !== id)))
      .catch(() => alert('Could not cancel order'));
  };

  const clearHistory = id => {
    if (!window.confirm('Are you sure you want to clear this order history?')) return;
    api.delete(`/orders/${id}`)
      .then(() => setOrders(prev => prev.filter(o => o._id !== id)))
      .catch(() => alert('Could not clear order history'));
  };

  if (loading) return <p>Loading orders…</p>;
  if (error)   return <p className="error">{error}</p>;
  if (!orders.length) return <p>No orders yet.</p>;

  return (
    <div className="orders-page">
      <h2>Your Orders</h2>
      <ul className="orders-list">
        {orders.map(order => {
          const firstItem = order.items?.[0];
          const listing   = firstItem?.listing;
          const imageUrl  = listing?.imageUrl;
          const createdDate = new Date(order.createdAt);
          const arriveDate  = new Date(createdDate);
          arriveDate.setDate(arriveDate.getDate() + 7);
          const now = new Date();
          const isDelivered = now > arriveDate;

          return (
            <li key={order._id} className="order-item">
              {imageUrl ? (
                <Link to={`/purchase/${listing._id}`}>
                  <img
                    src={imageUrl}
                    alt={listing.title || 'Ordered product'}
                    className="order-image"
                    loading="lazy"
                  />
                </Link>
              ) : (
                <div className="order-image placeholder">No Image</div>
              )}

              <div className="order-details">
                <div className="arrival-date">
                  {isDelivered ? (
                    <>
                      <div>
                        Ordered: {createdDate.toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </div>
                      <div>
                        Delivered: {arriveDate.toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </div>
                    </>
                  ) : (
                    <div>
                      Arrives on: {arriveDate.toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </div>
                  )}
                </div>

                <div className="order-meta">
                  <span className="order-total">Total: ₹{order.totalAmount}</span>
                </div>

                {isDelivered ? (
                  <button className="cancel-btn" onClick={() => clearHistory(order._id)}>
                    {/* SVG icon omitted for brevity */}
                    Clear History
                  </button>
                ) : (
                  <button className="cancel-btn" onClick={() => cancelOrder(order._id)}>
                    {/* SVG icon omitted for brevity */}
                    Cancel Order
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Orders;

