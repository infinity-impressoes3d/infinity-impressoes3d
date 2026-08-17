/**
 * CALCULADORA DE FRETE OFICIAL - INFINITY 3D
 * Integração com Melhor Envio (Exclusivo Correios PAC e SEDEX)
 * Com Fallback de Contingência Regional Automático
 */

import { supabase } from './supabaseClient';

/**
 * Consulta em tempo real a API do Melhor Envio via Supabase Edge Function
 * Retorna as opções oficiais dos Correios (PAC e SEDEX)
 */
export async function fetchMelhorEnvioRates(postalCode, cartItems = [], ufFallback = 'SP') {
  const cleanCep = String(postalCode || '').replace(/\D/g, '');

  if (cleanCep.length !== 8) {
    return calculateShippingRates(ufFallback, 300, cartItems);
  }

  const mappedItems = cartItems.map((item) => ({
    id: item.id || item.product_id || 'prod',
    weight_grams: Number(item.weight_grams || item.weightGrams || item.weight || 300),
    width_cm: Number(item.width_cm || item.width || 11),
    height_cm: Number(item.height_cm || item.height || 6),
    length_cm: Number(item.length_cm || item.length || 16),
    quantity: Number(item.quantity || 1),
    price: Number(item.price || 0)
  }));

  // 1. Tenta chamar o endpoint local direto do Vite (ambiente dev / localhost)
  try {
    const localRes = await fetch('/api/shipping/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postalCode: cleanCep, items: mappedItems })
    });

    if (localRes.ok) {
      const localData = await localRes.json();
      if (localData && Array.isArray(localData.options) && localData.options.length > 0) {
        return {
          uf: ufFallback,
          originCep: localData.originCep,
          destinationCep: localData.destinationCep,
          isFallback: false,
          options: localData.options.map(opt => ({
            id: opt.id,
            serviceId: opt.serviceId,
            name: opt.name,
            company: opt.company || 'Correios',
            price: Number(opt.price),
            deliveryDays: opt.deliveryDays || null,
            deliveryText: opt.deliveryText || (opt.deliveryDays ? `${opt.deliveryDays} dias úteis` : ''),
            badge: opt.badge || (opt.id === 'sedex' ? '⚡ MAIS RÁPIDO' : 'ECONÔMICO')
          }))
        };
      }
    }
  } catch (localErr) {
    // Continua para Edge Function
  }

  // 2. Tenta chamar a Edge Function do Supabase (ambiente produção)
  try {
    const { data, error } = await supabase.functions.invoke('calculate-shipping', {
      body: {
        postalCode: cleanCep,
        items: mappedItems
      }
    });

    if (!error && data && Array.isArray(data.options) && data.options.length > 0) {
      return {
        uf: ufFallback,
        originCep: data.originCep,
        destinationCep: data.destinationCep,
        isFallback: data.isFallback || false,
        options: data.options.map(opt => ({
          id: opt.id,
          serviceId: opt.serviceId,
          name: opt.name,
          company: opt.company || 'Correios',
          price: Number(opt.price),
          deliveryDays: opt.deliveryDays || null,
          deliveryText: opt.deliveryText || (opt.deliveryDays ? `${opt.deliveryDays} dias úteis` : ''),
          badge: opt.badge || (opt.id === 'sedex' ? '⚡ MAIS RÁPIDO' : 'ECONÔMICO')
        }))
      };
    }
  } catch (err) {
    console.warn('Falha na chamada da Edge Function do frete, utilizando cálculo de contingência:', err);
  }

  // 3. Se a API externa oscilar ou estiver offline, usa o cálculo regional de contingência
  return calculateShippingRates(ufFallback, 300, cartItems);
}

/**
 * Cálculo regional instantâneo de contingência (caso a API externa oscile)
 */
export function calculateShippingRates(uf, totalWeightGrams = 300, cartItems = []) {
  let calculatedWeightGrams = 0;
  if (Array.isArray(cartItems) && cartItems.length > 0) {
    calculatedWeightGrams = cartItems.reduce((acc, item) => {
      const itemWeight = Number(item.weightGrams || item.weight_grams || item.weight || 300);
      return acc + (itemWeight * (item.quantity || 1));
    }, 0);
  } else {
    calculatedWeightGrams = Number(totalWeightGrams) || 300;
  }

  const weightKg = Math.max(0.3, calculatedWeightGrams / 1000);
  const extraWeightKg = Math.max(0, weightKg - 0.5);

  const stateUf = (uf || 'SP').toUpperCase().trim();
  
  let distanceFactor = 1.0;
  let distanceKm = 180;
  let regionName = 'São Paulo (Local)';

  if (['SP'].includes(stateUf)) {
    distanceFactor = 1.0;
    distanceKm = 180;
    regionName = 'São Paulo (Local)';
  } else if (['RJ', 'MG', 'ES'].includes(stateUf)) {
    distanceFactor = 1.2;
    distanceKm = 520;
    regionName = 'Região Sudeste';
  } else if (['PR', 'SC', 'RS'].includes(stateUf)) {
    distanceFactor = 1.35;
    distanceKm = 890;
    regionName = 'Região Sul';
  } else if (['DF', 'GO', 'MT', 'MS'].includes(stateUf)) {
    distanceFactor = 1.45;
    distanceKm = 1150;
    regionName = 'Região Centro-Oeste';
  } else if (['BA', 'PE', 'CE', 'RN', 'PB', 'AL', 'SE', 'MA', 'PI'].includes(stateUf)) {
    distanceFactor = 1.65;
    distanceKm = 2150;
    regionName = 'Região Nordeste';
  } else if (['AM', 'PA', 'AC', 'RO', 'RR', 'AP', 'TO'].includes(stateUf)) {
    distanceFactor = 1.80;
    distanceKm = 3100;
    regionName = 'Região Norte';
  }

  const pacPrice = Math.round(((14.90 + (extraWeightKg * 4.00)) * distanceFactor) * 100) / 100;
  const sedexPrice = Math.round(((22.90 + (extraWeightKg * 6.00)) * distanceFactor) * 100) / 100;

  return {
    uf: stateUf,
    regionName,
    distanceKm,
    weightKg: Number(weightKg.toFixed(2)),
    weightGrams: calculatedWeightGrams,
    isFallback: true,
    options: [
      {
        id: 'sedex',
        serviceId: 2,
        name: 'Correios SEDEX (Expresso)',
        company: 'Correios',
        price: sedexPrice,
        deliveryDays: ['SP'].includes(stateUf) ? 2 : 4,
        deliveryText: ['SP'].includes(stateUf) ? '1 a 2 dias úteis' : '2 a 4 dias úteis',
        badge: '⚡ MAIS RÁPIDO'
      },
      {
        id: 'pac',
        serviceId: 1,
        name: 'Correios PAC (Econômico)',
        company: 'Correios',
        price: pacPrice,
        deliveryDays: ['SP'].includes(stateUf) ? 4 : 8,
        deliveryText: ['SP'].includes(stateUf) ? '3 a 5 dias úteis' : '5 a 8 dias úteis',
        badge: 'ECONÔMICO'
      }
    ]
  };
}
