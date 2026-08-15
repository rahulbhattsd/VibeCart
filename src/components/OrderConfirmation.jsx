import React from 'react';
import { useLocation, Link, useParams } from 'react-router-dom';

const OrderConfirmation = () => {
  const { id } = useParams();
  const location = useLocation();
  const summary = location.state?.summary || { totalAmount: 0, itemsCount: 0 };

  return (
    <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '2rem', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
      <h1 style={{ color: '#10b981', marginBottom: '1rem' }}>Order Confirmed!</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>Thank you for your purchase.</p>

      <div style={{ background: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', textAlign: 'left' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Order Summary</h3>
        <p><strong>Order ID:</strong> {id}</p>
        {summary.itemsCount > 0 && <p><strong>Items:</strong> {summary.itemsCount}</p>}
        {summary.totalAmount > 0 && <p><strong>Total Amount:</strong> ₹{summary.totalAmount.toFixed(2)}</p>}
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <Link to="/" style={{ padding: '0.75rem 1.5rem', background: '#f3f4f6', color: '#111', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
          Back to Home
        </Link>
        <Link to="/orders" style={{ padding: '0.75rem 1.5rem', background: '#6a0dad', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
          View All Orders
        </Link>
      </div>
    </div>
  );
};

export default OrderConfirmation;
