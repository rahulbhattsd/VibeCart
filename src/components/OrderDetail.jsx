// src/components/OrderDetail.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import './OrderDetail.css';

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios
      .get(`/api/orders/${id}`, { withCredentials: true })
      .then(res => setOrder(res.data))
      .catch(() => setError('Could not load order'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p>Loading order…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!order) return null;

  return (
    <div className="order-detail">
      <h2>Order #{order._id.slice(-6).toUpperCase()}</h2>
      <p><strong>Total:</strong> ₹{order.totalAmount}</p>
      <p><strong>Payment:</strong> {order.paymentMethod}</p>

      <h3>Items:</h3>
      <ul className="order-items-list">
        {order.items.map(item => (
          <li key={item._id} className="order-item">
            <div className="order-item-image">
              <Link to={`/purchase/${item.listing._id}`}>
                <img
                  src={item.listing.imageUrl}
                  alt={item.listing.title}
                  loading="lazy"
                />
              </Link>
            </div>
            <div className="order-item-info">
              <Link to={`/purchase/${item.listing._id}`} className="item-title">
                {item.listing.title}
              </Link>
              <div className="item-meta">
                <span>Size: UK {item.size}</span>
                <span>Qty: {item.quantity}</span>
                <span>Price: ₹{item.price}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <h3>Shipping Address:</h3>
      <div className="shipping-address">
        <p>{order.shippingAddress.address}</p>
        <p>
          {order.shippingAddress.city}, {order.shippingAddress.postalCode}
        </p>
        <p>{order.shippingAddress.country}</p>
      </div>
    </div>
  );
};

export default OrderDetail;

