import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Loader2, Truck } from 'lucide-react';
import { formatPrice, handleImageError, DEFAULT_FALLBACK_IMAGE } from '../lib/formatters';
import { fetchMelhorEnvioRates } from '../lib/shippingCalculator';

export default function CartDrawer({ isOpen, onClose, cartItems, items, onUpdateQuantity, onRemoveItem, onCheckout, onOpenCheckout }) {
  const handleCheckout = onCheckout || onOpenCheckout;
  const [cep, setCep] = useState('');
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShippingOption, setSelectedShippingOption] = useState(null);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [shippingError, setShippingError] = useState('');

  const activeCartItems = cartItems || items || [];

  if (!isOpen) return null;

  const subtotal = activeCartItems.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0);
  const shippingCost = selectedShippingOption ? selectedShippingOption.price : null;

  const handleCepChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (val.length > 5) {
      val = `${val.slice(0, 5)}-${val.slice(5)}`;
    }
    setCep(val);
    setShippingError('');
  };

  const handleCalculateShipping = async (e) => {
    e.preventDefault();
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setShippingError('Digite um CEP válido com 8 dígitos.');
      return;
    }

    setLoadingShipping(true);
    setShippingError('');
    try {
      const res = await fetchMelhorEnvioRates(cleanCep, activeCartItems);
      if (res && Array.isArray(res.options) && res.options.length > 0) {
        setShippingOptions(res.options);
        // Default to the first (usually PAC or lowest cost)
        setSelectedShippingOption(res.options[0]);
      } else {
        setShippingError('Não foi possível cotar o frete para este CEP.');
      }
    } catch (err) {
      console.error('Erro ao calcular frete no carrinho:', err);
      setShippingError('Erro ao consultar frete. Tente novamente.');
    } finally {
      setLoadingShipping(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'flex-end'
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)'
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#0a0a0a',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.9)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 1010
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #1a1a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingBag size={20} color="#3498db" />
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>SEU CARRINHO INFINITY</h3>
            <span style={{
              backgroundColor: '#090476',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              {activeCartItems.reduce((acc, curr) => acc + curr.quantity, 0)} itens
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Fechar carrinho"
            style={{
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
              transition: 'all 0.2s ease'
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
        </div>

        {/* Cart Items List */}
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '20px' }}>
          {activeCartItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#666666' }}>
              <ShoppingBag size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ fontSize: '14px', fontWeight: '600' }}>Seu carrinho está vazio.</p>
              <button
                onClick={onClose}
                style={{
                  marginTop: '16px',
                  backgroundColor: '#090476',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '700',
                  padding: '10px 20px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                IR ÀS COMPRAS
              </button>
            </div>
          ) : (
            activeCartItems.map((item, idx) => (
              <div
                key={`${item.id}-${item.selectedSize}-${idx}`}
                style={{
                  display: 'flex',
                  gap: '14px',
                  marginBottom: '16px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid #181818'
                }}
              >
                <img
                  src={item.image || DEFAULT_FALLBACK_IMAGE}
                  alt={item.name}
                  onError={handleImageError}
                  style={{
                    width: '70px',
                    height: '70px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    backgroundColor: '#141414'
                  }}
                />
                <div style={{ flexGrow: 1 }}>
                  <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>
                    {item.name}
                  </h4>
                  <div style={{ fontSize: '11px', color: '#888888', marginBottom: '8px' }}>
                    Opção: <span style={{ color: '#ffffff', fontWeight: '700' }}>{item.selectedSize}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Quantity Controls */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid #2a2a2a',
                      borderRadius: '4px',
                      backgroundColor: '#121212'
                    }}>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.selectedSize, item.quantity - 1)}
                        style={{ padding: '4px 8px', color: '#ffffff', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ padding: '0 8px', fontSize: '12px', fontWeight: '700', color: '#ffffff' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.selectedSize, item.quantity + 1)}
                        style={{ padding: '4px 8px', color: '#ffffff', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <span style={{ fontSize: '13px', fontWeight: '900', color: '#ffffff' }}>
                      R$ {formatPrice(Number(item.price || 0) * item.quantity)}
                    </span>

                    <button
                      onClick={() => onRemoveItem(item.id, item.selectedSize)}
                      style={{ color: '#e74c3c', padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Checkout Summary */}
        {cartItems.length > 0 && (
          <div style={{ padding: '20px', borderTop: '1px solid #1a1a1a', backgroundColor: '#080808' }}>
            {/* CEP Calculator */}
            <form onSubmit={handleCalculateShipping} style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Calcular CEP (ex: 01001-000)"
                value={cep}
                onChange={handleCepChange}
                maxLength={9}
                style={{
                  flexGrow: 1,
                  backgroundColor: '#141414',
                  border: '1px solid #2a2a2a',
                  color: '#ffffff',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={loadingShipping}
                style={{
                  backgroundColor: '#14175d',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '0 14px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: loadingShipping ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {loadingShipping ? <Loader2 size={12} className="animate-spin" /> : 'CALCULAR'}
              </button>
            </form>

            {shippingError && (
              <div style={{ color: '#e74c3c', fontSize: '11px', marginBottom: '10px' }}>
                {shippingError}
              </div>
            )}

            {/* Shipping Options Selector */}
            {shippingOptions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                {shippingOptions.map((opt) => {
                  const isSelected = selectedShippingOption?.id === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedShippingOption(opt)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        backgroundColor: isSelected ? 'rgba(52, 152, 219, 0.1)' : '#111111',
                        border: isSelected ? '1px solid #3498db' : '1px solid #222222',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          border: isSelected ? '4px solid #3498db' : '2px solid #555',
                          backgroundColor: '#000'
                        }} />
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {opt.name}
                            {opt.badge && (
                              <span style={{
                                fontSize: '9px',
                                fontWeight: '800',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                backgroundColor: opt.id === 'sedex' ? '#e67e22' : '#27ae60',
                                color: '#ffffff'
                              }}>
                                {opt.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: isSelected ? '#3498db' : '#ffffff' }}>
                        R$ {formatPrice(opt.price)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {shippingCost !== null && shippingOptions.length === 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#aaaaaa', marginBottom: '10px' }}>
                <span>Frete Estimado:</span>
                <span style={{ color: '#ffffff', fontWeight: '700' }}>
                  R$ {formatPrice(shippingCost)}
                </span>
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              paddingTop: '10px',
              borderTop: '1px dashed #222222'
            }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>SUBTOTAL:</span>
              <span style={{ fontSize: '20px', fontWeight: '900', color: '#ffffff' }}>
                R$ {formatPrice(subtotal + (shippingCost || 0))}
              </span>
            </div>

            <button
              onClick={() => {
                onClose();
                if (handleCheckout) handleCheckout();
              }}
              style={{
                width: '100%',
                backgroundColor: '#090476',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '800',
                letterSpacing: '1px',
                padding: '16px 0',
                borderRadius: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 6px 20px rgba(9, 4, 118, 0.6)',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              FINALIZAR COMPRA <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
