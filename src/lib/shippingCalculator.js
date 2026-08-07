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
  let distanceKm = 150;
  let regionName = 'São Paulo (Sudeste)';
  let daysSedex = '1 a 2 dias úteis';
  let daysPac = '2 a 4 dias úteis';
  let daysTrans = '2 a 3 dias úteis';

  if (['SP'].includes(stateUf)) {
    distanceFactor = 1.0;
    distanceKm = 180;
    regionName = 'São Paulo (Local)';
    daysSedex = '1 a 2 dias úteis';
    daysPac = '2 a 4 dias úteis';
    daysTrans = '2 a 3 dias úteis';
  } else if (['RJ', 'MG', 'ES'].includes(stateUf)) {
    distanceFactor = 1.25;
    distanceKm = 520;
    regionName = 'Região Sudeste';
    daysSedex = '2 a 3 dias úteis';
    daysPac = '3 a 5 dias úteis';
    daysTrans = '3 a 4 dias úteis';
  } else if (['PR', 'SC', 'RS'].includes(stateUf)) {
    distanceFactor = 1.45;
    distanceKm = 890;
    regionName = 'Região Sul';
    daysSedex = '3 a 4 dias úteis';
    daysPac = '4 a 6 dias úteis';
    daysTrans = '3 a 5 dias úteis';
  } else if (['DF', 'GO', 'MT', 'MS'].includes(stateUf)) {
    distanceFactor = 1.65;
    distanceKm = 1150;
    regionName = 'Região Centro-Oeste';
    daysSedex = '3 a 5 dias úteis';
    daysPac = '5 a 8 dias úteis';
    daysTrans = '4 a 6 dias úteis';
  } else if (['BA', 'PE', 'CE', 'RN', 'PB', 'AL', 'SE', 'MA', 'PI'].includes(stateUf)) {
    distanceFactor = 2.05;
    distanceKm = 2150;
    regionName = 'Região Nordeste';
    daysSedex = '4 a 6 dias úteis';
    daysPac = '7 a 10 dias úteis';
    daysTrans = '5 a 7 dias úteis';
  } else if (['AM', 'PA', 'AC', 'RO', 'RR', 'AP', 'TO'].includes(stateUf)) {
    distanceFactor = 2.45;
    distanceKm = 3100;
    regionName = 'Região Norte';
    daysSedex = '5 a 7 dias úteis';
    daysPac = '8 a 12 dias úteis';
    daysTrans = '6 a 9 dias úteis';
  }

  // 3. Fórmula de Cálculo: (Base + Adicional por Kg Extra) * Fator Distância
  const pacPrice = Math.round(((14.90 + (extraWeightKg * 4.50)) * distanceFactor) * 100) / 100;
  const sedexPrice = Math.round(((21.90 + (extraWeightKg * 7.50)) * distanceFactor) * 100) / 100;
  const transPrice = Math.round(((17.50 + (extraWeightKg * 5.50)) * distanceFactor) * 100) / 100;

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
