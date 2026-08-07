import React from 'react';
import { X, CreditCard, QrCode, ShieldCheck } from 'lucide-react';
import { formatPrice } from '../lib/formatters';

export default function PaymentDetailsModal({ isOpen, onClose, price }) {
  if (!isOpen) return null;

  const numPrice = Number(price || 0);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 300,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#0a0a0a',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '12px',
        maxWidth: '520px',
        width: '100%',
        padding: '24px',
        color: '#ffffff',
        position: 'relative',
        boxShadow: '0 20px 50px rgba(0,0,0,0.9)'
      }} onClick={(e) => e.stopPropagation()}>

        {/* Small X Close Button in Top Right Corner */}
        <button
          onClick={onClose}
          aria-label="Fechar modal"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #333333',
            color: '#ffffff',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            zIndex: 10
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#e74c3c';
            e.currentTarget.style.borderColor = '#e74c3c';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#1a1a1a';
            e.currentTarget.style.borderColor = '#333333';
          }}
        >
          <X size={18} />
        </button>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #222', paddingBottom: '12px', paddingRight: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CreditCard size={22} color="#3498db" />
            <h3 style={{ fontSize: '18px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Formas de Pagamento
            </h3>
          </div>
        </div>

        {/* Pix Section */}
        <div style={{
          backgroundColor: '#071d2b',
          border: '1px solid #3498db',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <QrCode size={36} color="#3498db" />
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#3498db', textTransform: 'uppercase' }}>
              PIX À VISTA
            </div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#ffffff' }}>
              R$ {formatPrice(numPrice)}
            </div>
            <div style={{ fontSize: '11px', color: '#aaaaaa' }}>
              Aprovação instantânea do pedido e envio imediato
            </div>
          </div>
        </div>

        {/* Credit Card Installments Table */}
        <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: '#eeeeee' }}>
          Cartão de Crédito (Até 12x)
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '20px' }}>
          {[1, 2, 3, 4, 5, 6, 10, 12].map((inst) => {
            const instVal = numPrice / inst;
            return (
              <div key={inst} style={{
                backgroundColor: '#141414',
                padding: '8px 12px',
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px'
              }}>
                <span style={{ color: '#aaa' }}>{inst}x de</span>
                <strong style={{ color: '#fff' }}>R$ {formatPrice(instVal)}</strong>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#27ae60' }}>
          <ShieldCheck size={16} /> Pagamento 100% seguro processado via criptografia de ponta a ponta.
        </div>
      </div>
    </div>
  );
}
