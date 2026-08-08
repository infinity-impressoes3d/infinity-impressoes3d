/**
 * CALCULADORA DE FRETE BASEADA EM PESO + DISTÂNCIA (UF DA ENTREGA)
 * Origem do Envio: Centro Logístico São Paulo / Sudeste
 */

export function calculateShippingRates(uf, totalWeightGrams = 300, cartItems = []) {
  // 1. Calcula o peso total do carrinho em Gramas e Kg
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
  const extraWeightKg = Math.max(0, weightKg - 0.5); // Adicional acima de 500g

  // 2. Fator de Distância (km estimados a partir da origem SP) e Prazos por UF/Região
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

  // 3. Fórmula de Cálculo com Preços Otimizados para E-commerce
  const pacPrice = Math.round(((12.90 + (extraWeightKg * 3.50)) * distanceFactor) * 100) / 100;
  const sedexPrice = Math.round(((18.90 + (extraWeightKg * 5.50)) * distanceFactor) * 100) / 100;

  return {
    uf: stateUf,
    regionName,
    distanceKm,
    weightKg: Number(weightKg.toFixed(2)),
    weightGrams: calculatedWeightGrams,
    options: [
      {
        id: 'sedex',
        name: 'Correios SEDEX (Expresso)',
        price: sedexPrice,
        badge: '⚡ MAIS RÁPIDO'
      },
      {
        id: 'pac',
        name: 'Correios PAC (Econômico)',
        price: pacPrice,
        badge: 'ECONÔMICO'
      }
    ]
  };
}
