import React, { useState } from 'react';
import { Truck, MapPin, Check, Loader2, Info } from 'lucide-react';
import { fetchMelhorEnvioRates, calculateShippingRates } from '../lib/shippingCalculator';

export default function ShippingCalculator({
  subtotal = 0,
  cartItems = [],
  onSelectShipping,
  selectedShippingOption = null,
  compact = false
}) {
  const [cep, setCep] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addressData, setAddressData] = useState(null);
  const [shippingResult, setShippingResult] = useState(null);

  // Mask CEP input: 00000-000
  const handleCepChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (raw.length > 8) raw = raw.slice(0, 8);
    
    if (raw.length > 5) {
      setCep(`${raw.slice(0, 5)}-${raw.slice(5)}`);
    } else {
      setCep(raw);
    }
    setError('');
  };

  const calculateShipping = async (e) => {
    if (e) e.preventDefault();
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
      setError('Por favor, informe um CEP válido com 8 dígitos.');
      return;
    }

    setLoading(true);
    setError('');
    setShippingResult(null);

    try {
      // 1. Consulta ViaCEP para obter a localidade e UF da entrega
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();

      if (data.erro) {
        setError('CEP não encontrado nos Correios. Verifique o número digitado.');
        setLoading(false);
        return;
      }

      setAddressData(data);

      // 2. Consulta cotação oficial do Melhor Envio (Correios PAC e SEDEX)
      const calculation = await fetchMelhorEnvioRates(cleanCep, cartItems, data.uf);
      setShippingResult(calculation);

      // Seleciona opção mais rápida ou padrão automaticamente
      if (onSelectShipping && calculation.options && calculation.options.length > 0) {
        onSelectShipping(calculation.options[0], data);
      }
    } catch (err) {
      console.error('Erro ao calcular frete:', err);
      setError('Erro ao calcular frete. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      backgroundColor: compact ? 'transparent' : '#111111',
      border: compact ? 'none' : '1px solid #222222',
      borderRadius: '14px',
      padding: compact ? '0' : '20px',
      color: '#ffffff'
    }}>
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Truck size={18} color="#3498db" />
          <h3 style={{ fontSize: '14px', fontWeight: '800', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Calcular Frete dos Correios
          </h3>
        </div>
      )}

      {/* Form Input CEP */}
      <form onSubmit={calculateShipping} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <MapPin size={16} color="#888888" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={cep}
            onChange={handleCepChange}
            placeholder="Digite seu CEP (ex: 01001-000)"
            maxLength={9}
            style={{
              width: '100%',
              backgroundColor: '#0a0a0a',
              border: '1px solid #333333',
              borderRadius: '8px',
              padding: '10px 12px 10px 36px',
              fontSize: '13px',
              color: '#ffffff',
              outline: 'none'
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: '#090476',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '0 18px',
            fontSize: '13px',
            fontWeight: '700',
            cursor: loading ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Calcular'}
        </button>
      </form>

      {error && (
        <div style={{ fontSize: '12px', color: '#e74c3c', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {/* Resultado do Frete */}
      {shippingResult && addressData && (
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {shippingResult.options.map((opt) => {
            const isSelected = selectedShippingOption?.id === opt.id;

            return (
              <div
                key={opt.id}
                onClick={() => onSelectShipping && onSelectShipping(opt, addressData)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: isSelected ? 'rgba(52, 152, 219, 0.12)' : '#0d0d0d',
                  border: isSelected ? '1px solid #3498db' : '1px solid #222222',
                  borderRadius: '8px',
                  padding: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: isSelected ? '5px solid #3498db' : '2px solid #555555',
                    backgroundColor: isSelected ? '#ffffff' : 'transparent',
                    flexShrink: 0
                  }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {opt.name}
                      {opt.badge && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: opt.id === 'sedex' ? '#e67e22' : '#27ae60',
                          color: '#ffffff'
                        }}>
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {opt.deliveryText && (
                      <div style={{ fontSize: '11px', color: '#888888', marginTop: '2px' }}>
                        Chega em {opt.deliveryText}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#27ae60' }}>
                    R$ {opt.price.toFixed(2).replace('.', ',')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
