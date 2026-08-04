import React, { useState } from 'react';
import { Truck, MapPin, Check, Loader2, Info } from 'lucide-react';

export default function ShippingCalculator({
  subtotal = 0,
  onSelectShipping,
  selectedShippingOption = null,
  compact = false
}) {
  const [cep, setCep] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addressData, setAddressData] = useState(null);
  const [shippingOptions, setShippingOptions] = useState([]);

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
    setShippingOptions([]);

    try {
      // 1. Fetch address details from ViaCEP API
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();

      if (data.erro) {
        setError('CEP não encontrado. Por favor verifique e tente novamente.');
        setLoading(false);
        return;
      }

      setAddressData(data);

      // 2. Determine realistic Correios rates based on region (UF)
      const isSP = data.uf === 'SP';
      const isSudeste = ['SP', 'RJ', 'MG', 'ES'].includes(data.uf);
      const isSul = ['PR', 'SC', 'RS'].includes(data.uf);
      const isCentroOeste = ['DF', 'GO', 'MT', 'MS'].includes(data.uf);
      // Base pricing calculation
      let pacBase = isSP ? 14.90 : isSudeste ? 19.90 : isSul ? 24.90 : isCentroOeste ? 29.90 : 34.90;
      let sedexBase = isSP ? 22.90 : isSudeste ? 29.90 : isSul ? 36.90 : isCentroOeste ? 44.90 : 54.90;
      let transBase = isSP ? 18.50 : isSudeste ? 22.50 : isSul ? 27.50 : 32.50;

      const options = [
        {
          id: 'pac',
          name: 'Correios PAC (Econômico)',
          price: pacBase,
          isFree: false,
          originalPrice: pacBase,
          days: isSP ? '3 a 5 dias úteis' : isSudeste ? '4 a 6 dias úteis' : '6 a 9 dias úteis',
          badge: 'ECONÔMICO'
        },
        {
          id: 'sedex',
          name: 'Correios SEDEX (Expresso)',
          price: sedexBase,
          isFree: false,
          originalPrice: sedexBase,
          days: isSP ? '1 a 2 dias úteis' : isSudeste ? '2 a 3 dias úteis' : '3 a 5 dias úteis',
          badge: '⚡ MAIS RÁPIDO'
        },
        {
          id: 'transportadora',
          name: 'Transportadora Express (Jadlog / Loggi)',
          price: transBase,
          isFree: false,
          originalPrice: transBase,
          days: isSP ? '2 a 3 dias úteis' : isSudeste ? '3 a 4 dias úteis' : '4 a 6 dias úteis',
          badge: 'SEGURO'
        }
      ];

      setShippingOptions(options);

      // Auto-select first option if callback provided
      if (onSelectShipping && options.length > 0) {
        onSelectShipping(options[0], data);
      }
    } catch (err) {
      setError('Erro ao consultar o CEP. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (opt) => {
    if (onSelectShipping) {
      onSelectShipping(opt, addressData);
    }
  };

  return (
    <div style={{
      backgroundColor: compact ? 'transparent' : '#0a0a0a',
      border: compact ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '8px',
      padding: compact ? '0' : '16px',
      marginTop: '12px'
    }}>
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Truck size={18} color="#3498db" />
          <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', margin: 0 }}>
            Calculadora de Frete Correios
          </h4>
        </div>
      )}

      {/* Input form */}
      <form onSubmit={calculateShipping} style={{ display: 'flex', gap: '8px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            placeholder="Informe seu CEP (ex: 01001-000)"
            value={cep}
            onChange={handleCepChange}
            maxLength={9}
            style={{
              width: '100%',
              backgroundColor: '#111111',
              border: error ? '1px solid #e74c3c' : '1px solid #333333',
              borderRadius: '4px',
              padding: '10px 12px 10px 36px',
              color: '#ffffff',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666666' }} />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: '#090476',
            color: '#ffffff',
            fontWeight: '800',
            fontSize: '12px',
            padding: '0 16px',
            borderRadius: '4px',
            border: '1px solid #3498db',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0f4592'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#090476'}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'CALCULAR'}
        </button>
      </form>

      {/* Error display */}
      {error && (
        <p style={{ fontSize: '11px', color: '#e74c3c', marginTop: '6px', marginBotton: 0 }}>
          {error}
        </p>
      )}

      {/* Address summary */}
      {addressData && (
        <div style={{
          marginTop: '10px',
          padding: '8px 10px',
          backgroundColor: 'rgba(52, 152, 219, 0.08)',
          border: '1px solid rgba(52, 152, 219, 0.2)',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#3498db',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <MapPin size={14} />
          <span>
            Destino: <strong>{addressData.logradouro ? `${addressData.logradouro}, ` : ''}{addressData.bairro ? `${addressData.bairro} - ` : ''}{addressData.localidade}/{addressData.uf}</strong>
          </span>
        </div>
      )}

      {/* Options list */}
      {shippingOptions.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {shippingOptions.map((opt) => {
            const isSelected = selectedShippingOption?.id === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => handleSelectOption(opt)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  backgroundColor: isSelected ? 'rgba(9, 4, 118, 0.4)' : '#121212',
                  border: isSelected ? '1px solid #3498db' : '1px solid #222222',
                  borderRadius: '6px',
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
                    backgroundColor: isSelected ? '#ffffff' : 'transparent'
                  }} />

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '12px', color: '#ffffff' }}>{opt.name}</strong>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: '800',
                        backgroundColor: opt.isFree ? '#27ae60' : '#222222',
                        color: opt.isFree ? '#ffffff' : '#aaaaaa',
                        padding: '1px 6px',
                        borderRadius: '3px'
                      }}>
                        {opt.badge}
                      </span>
                    </div>
                    <div style={{ color: '#888888', fontSize: '11px', marginTop: '2px' }}>
                      Entrega estimada: {opt.days}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  {opt.isFree ? (
                    <span style={{ fontSize: '13px', fontWeight: '900', color: '#27ae60' }}>
                      GRÁTIS
                    </span>
                  ) : (
                    <span style={{ fontSize: '13px', fontWeight: '900', color: '#ffffff' }}>
                      R$ {opt.price.toFixed(2).replace('.', ',')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
