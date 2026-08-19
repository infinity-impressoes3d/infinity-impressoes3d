export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { postalCode, items = [], fromPostalCode } = req.body || {};
    const cleanToCep = String(postalCode || '').replace(/\D/g, '');
    if (cleanToCep.length !== 8) {
      return res.status(400).json({ error: 'CEP inválido' });
    }

    const cleanFromCep = String(fromPostalCode || '38414012').replace(/\D/g, '');
    const token = process.env.MELHOR_ENVIO_TOKEN || "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiNGMzMWI5ODgzM2I2ZDA4MGRiMjE0NzYzM2Y4NjcyZTA0YTJlMGE5NWJlYzAwMDBmMzYwM2U0MTNmMTNkZWE3ZjI2MDRmYTNhNjk2MDA0YTUiLCJpYXQiOjE3ODY5MDg2MTcuNDQ2NTA5LCJuYmYiOjE3ODY5MDg2MTcuNDQ2NTExLCJleHAiOjE4MTg0NDQ2MTcuNDM0Mzk4LCJzdWIiOiJhMjg0YTFjOC01ZWEzLTRlYzItOTBlYy1iZWFkMjUxYWJlMjAiLCJzY29wZXMiOlsiY2FydC1yZWFkIiwiY2FydC13cml0ZSIsImNvbXBhbmllcy1yZWFkIiwiY29tcGFuaWVzLXdyaXRlIiwiY291cG9ucy1yZWFkIiwiY291cG9ucy13cml0ZSIsIm5vdGlmaWNhdGlvbnMtcmVhZCIsIm9yZGVycy1yZWFkIiwicHJvZHVjdHMtcmVhZCIsInByb2R1Y3RzLWRlc3Ryb3kiLCJwcm9kdWN0cy13cml0ZSIsInB1cmNoYXNlcy1yZWFkIiwic2hpcHBpbmctY2FsY3VsYXRlIiwic2hpcHBpbmctY2FuY2VsIiwic2hpcHBpbmctY2hlY2tvdXQiLCJzaGlwcGluZy1jb21wYW5pZXMiLCJzaGlwcGluZy1nZW5lcmF0ZSIsInNoaXBwaW5nLXByZXZpZXciLCJzaGlwcGluZy1wcmludCIsInNoaXBwaW5nLXNoYXJlIiwic2hpcHBpbmctdHJhY2tpbmciLCJlY29tbWVyY2Utc2hpcHBpbmciLCJ0cmFuc2FjdGlvbnMtcmVhZCIsInVzZXJzLXJlYWQiLCJ1c2Vycy13cml0ZSIsIndlYmhvb2tzLXJlYWQiLCJ3ZWJob29rcy13cml0ZSIsIndlYmhvb2tzLWRlbGV0ZSIsInRkZWFsZXItd2ViaG9vayJdfQ.mEE3-iD6UeL3KXEwWKSLGGvxsRP29rQbbp7UyLDUSjMXH8_cwjjmmfXoGaQtZ83FxRu1mUid6jzK4Ij_zGKCxTySfZ-w2PujduTRmp221asDY7FtX0GVA8gSl7aIC0wV3fZgG5cRUH6fm57j_JoyXr9XQ3Tgww3JHRLR_DnXhW6b4I1z4ehmNtWoF2Z23H3O_ilNis-ZLoUEwNKj0Ag7jGW7pgId9JsAaEYxRfYEfbT6YG_UqlXfDWMolOkBgqyK4yudfH5JPGdgwAAg1v4Vs2sLcAq4-8OeDrOWDn0PUXlTrHSJ1fe5VylmRizLS4inzWUUAZae26iBAtYi1rPg_41A2rz0CWPfxpQTZ6P78tC2vyi-pE5f-OCyvl2gW7-y61m6QCGjgevqC1CxfXfnR1TGrkwxQeHq-2-NNh93pgvYVRIBEocOZC_dCA6nhw1R0dncp0GHkpNRGnW5bfG5fLUmh3MF38Cb5SWxyuq6y0lYBfteJGX4sNE_trMjaPj3OrPRKRaADvmEpPsOBzIaC9XhUwqCYNcOOaBs_DP3IkMKT_yJUgraFYQwbL58Ka_FJ092FDLXpc3Pu445o7OaWEPE-35eyyCMESZw-DgxnDqCaBDfs-pK16P4rYJgJyOigUfR5KtsB1vJOf5lAwwapHWC_G6xqAX39InNqwNfq8g";

    const formattedProducts = (Array.isArray(items) && items.length > 0 ? items : [{}]).map(
      (item, index) => {
        const weightGrams = Number(item.weight_grams || item.weightGrams || item.weight || 300);
        const weightKg = Math.max(0.05, weightGrams / 1000);
        const widthCm = Math.max(8, Number(item.width_cm || item.width || 11));
        const heightCm = Math.max(1, Number(item.height_cm || item.height || 6));
        const lengthCm = Math.max(13, Number(item.length_cm || item.length || 16));
        const quantity = Math.max(1, Number(item.quantity || 1));

        return {
          id: String(item.id || `item-${index + 1}`),
          width: widthCm,
          height: heightCm,
          length: lengthCm,
          weight: Number(weightKg.toFixed(3)),
          quantity: quantity,
          insurance_value: 0
        };
      }
    );

    const melhorEnvioPayload = {
      from: { postal_code: cleanFromCep },
      to: { postal_code: cleanToCep },
      services: "1,2",
      products: formattedProducts,
      options: { receipt: false, own_hand: false }
    };

    const resME = await fetch("https://melhorenvio.com.br/api/v2/me/shipment/calculate", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "Infinity3D (contato@infinity3d.com.br)"
      },
      body: JSON.stringify(melhorEnvioPayload)
    });

    if (!resME.ok) {
      const errTxt = await resME.text();
      return res.status(resME.status).json({ error: errTxt });
    }

    const rates = await resME.json();
    if (!Array.isArray(rates)) {
      return res.status(500).json({ error: 'Resposta inválida do Melhor Envio' });
    }

    const options = rates
      .filter((rate) => {
        const hasNoFatalError = !rate.error;
        const hasPrice = Number(rate.price || rate.custom_price) > 0;
        return hasNoFatalError && hasPrice;
      })
      .map((rate) => {
        const price = Number(rate.custom_price || rate.price || 0);
        const deliveryDays = Number(rate.custom_delivery_time || rate.delivery_time || 0);
        const isSedex = rate.id === 2 || String(rate.name || '').toUpperCase().includes('SEDEX');

        return {
          id: isSedex ? 'sedex' : 'pac',
          serviceId: rate.id,
          name: isSedex ? 'Correios SEDEX (Expresso)' : 'Correios PAC (Econômico)',
          company: 'Correios',
          price: Number(price.toFixed(2)),
          deliveryDays: deliveryDays,
          deliveryText: `${deliveryDays} ${deliveryDays === 1 ? 'dia útil' : 'dias úteis'}`,
          badge: isSedex ? '⚡ MAIS RÁPIDO' : 'ECONÔMICO'
        };
      })
      .sort((a, b) => (a.id === 'sedex' ? -1 : 1));

    return res.status(200).json({
      success: true,
      originCep: cleanFromCep,
      destinationCep: cleanToCep,
      options,
      isFallback: false
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
