import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const MELHOR_ENVIO_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiNGMzMWI5ODgzM2I2ZDA4MGRiMjE0NzYzM2Y4NjcyZTA0YTJlMGE5NWJlYzAwMDBmMzYwM2U0MTNmMTNkZWE3ZjI2MDRmYTNhNjk2MDA0YTUiLCJpYXQiOjE3ODY5MDg2MTcuNDQ2NTA5LCJuYmYiOjE3ODY5MDg2MTcuNDQ2NTExLCJleHAiOjE4MTg0NDQ2MTcuNDM0Mzk4LCJzdWIiOiJhMjg0YTFjOC01ZWEzLTRlYzItOTBlYy1iZWFkMjUxYWJlMjAiLCJzY29wZXMiOlsiY2FydC1yZWFkIiwiY2FydC13cml0ZSIsImNvbXBhbmllcy1yZWFkIiwiY29tcGFuaWVzLXdyaXRlIiwiY291cG9ucy1yZWFkIiwiY291cG9ucy13cml0ZSIsIm5vdGlmaWNhdGlvbnMtcmVhZCIsIm9yZGVycy1yZWFkIiwicHJvZHVjdHMtcmVhZCIsInByb2R1Y3RzLWRlc3Ryb3kiLCJwcm9kdWN0cy13cml0ZSIsInB1cmNoYXNlcy1yZWFkIiwic2hpcHBpbmctY2FsY3VsYXRlIiwic2hpcHBpbmctY2FuY2VsIiwic2hpcHBpbmctY2hlY2tvdXQiLCJzaGlwcGluZy1jb21wYW5pZXMiLCJzaGlwcGluZy1nZW5lcmF0ZSIsInNoaXBwaW5nLXByZXZpZXciLCJzaGlwcGluZy1wcmludCIsInNoaXBwaW5nLXNoYXJlIiwic2hpcHBpbmctdHJhY2tpbmciLCJlY29tbWVyY2Utc2hpcHBpbmciLCJ0cmFuc2FjdGlvbnMtcmVhZCIsInVzZXJzLXJlYWQiLCJ1c2Vycy13cml0ZSIsIndlYmhvb2tzLXJlYWQiLCJ3ZWJob29rcy13cml0ZSIsIndlYmhvb2tzLWRlbGV0ZSIsInRkZWFsZXItd2ViaG9vayJdfQ.mEE3-iD6UeL3KXEwWKSLGGvxsRP29rQbbp7UyLDUSjMXH8_cwjjmmfXoGaQtZ83FxRu1mUid6jzK4Ij_zGKCxTySfZ-w2PujduTRmp221asDY7FtX0GVA8gSl7aIC0wV3fZgG5cRUH6fm57j_JoyXr9XQ3Tgww3JHRLR_DnXhW6b4I1z4ehmNtWoF2Z23H3O_ilNis-ZLoUEwNKj0Ag7jGW7pgId9JsAaEYxRfYEfbT6YG_UqlXfDWMolOkBgqyK4yudfH5JPGdgwAAg1v4Vs2sLcAq4-8OeDrOWDn0PUXlTrHSJ1fe5VylmRizLS4inzWUUAZae26iBAtYi1rPg_41A2rz0CWPfxpQTZ6P78tC2vyi-pE5f-OCyvl2gW7-y61m6QCGjgevqC1CxfXfnR1TGrkwxQeHq-2-NNh93pgvYVRIBEocOZC_dCA6nhw1R0dncp0GHkpNRGnW5bfG5fLUmh3MF38Cb5SWxyuq6y0lYBfteJGX4sNE_trMjaPj3OrPRKRaADvmEpPsOBzIaC9XhUwqCYNcOOaBs_DP3IkMKT_yJUgraFYQwbL58Ka_FJ092FDLXpc3Pu445o7OaWEPE-35eyyCMESZw-DgxnDqCaBDfs-pK16P4rYJgJyOigUfR5KtsB1vJOf5lAwwapHWC_G6xqAX39InNqwNfq8g";
const DEFAULT_ORIGIN_CEP = "38414012";

function shippingDevPlugin() {
  return {
    name: 'vite-plugin-shipping-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/shipping/calculate' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const parsed = JSON.parse(body || '{}');
              const destinationCep = String(parsed.postalCode || '').replace(/\D/g, '');
              const items = Array.isArray(parsed.items) ? parsed.items : [];

              if (destinationCep.length !== 8) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'CEP de destino inválido' }));
                return;
              }

              const products = items.length > 0
                ? items.map((item, idx) => ({
                    id: String(item.id || `item_${idx + 1}`),
                    width: Math.max(8, Number(item.width_cm || item.width || 11)),
                    height: Math.max(1, Number(item.height_cm || item.height || 6)),
                    length: Math.max(13, Number(item.length_cm || item.length || 16)),
                    weight: Math.max(0.05, (Number(item.weight_grams || item.weightGrams || item.weight || 300)) / 1000),
                    quantity: Math.max(1, Number(item.quantity || 1)),
                    insurance_value: Number(item.price || 0)
                  }))
                : [{
                    id: 'default_package',
                    width: 11,
                    height: 6,
                    length: 16,
                    weight: 0.3,
                    quantity: 1,
                    insurance_value: 0
                  }];

              const melhorEnvioPayload = {
                from: { postal_code: DEFAULT_ORIGIN_CEP },
                to: { postal_code: destinationCep },
                services: "1,2", // 1 = PAC Correios, 2 = SEDEX Correios
                products: products,
                options: {
                  receipt: false,
                  own_hand: false
                }
              };

              const meResponse = await fetch('https://melhorenvio.com.br/api/v2/me/shipment/calculate', {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${MELHOR_ENVIO_TOKEN}`,
                  'User-Agent': 'Infinity3D (contato@infinity3d.com.br)'
                },
                body: JSON.stringify(melhorEnvioPayload)
              });

              if (!meResponse.ok) {
                const errText = await meResponse.text();
                console.error('[Melhor Envio Dev API Error]', meResponse.status, errText);
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Erro ao consultar Melhor Envio', details: errText }));
                return;
              }

              const data = await meResponse.json();
              
              const options = (Array.isArray(data) ? data : [])
                .filter(service => !service.error && service.price)
                .map(service => {
                  const isSedex = String(service.id) === '2' || service.name.toLowerCase().includes('sedex');
                  const deliveryDays = service.custom_delivery_time || service.delivery_time;
                  
                  return {
                    id: isSedex ? 'sedex' : 'pac',
                    serviceId: service.id,
                    name: isSedex ? 'SEDEX (Correios)' : 'PAC (Correios)',
                    company: 'Correios',
                    price: Number(service.custom_price || service.price),
                    deliveryDays: deliveryDays,
                    deliveryText: deliveryDays ? `${deliveryDays} dias úteis` : 'Consulte o prazo',
                    badge: isSedex ? '⚡ MAIS RÁPIDO' : 'ECONÔMICO'
                  };
                });

              // Ordena: PAC primeiro, depois SEDEX
              options.sort((a, b) => a.price - b.price);

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                originCep: DEFAULT_ORIGIN_CEP,
                destinationCep,
                options
              }));
            } catch (err) {
              console.error('[Shipping Dev Middleware Error]', err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }
        next();
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), shippingDevPlugin()],
  server: {
    port: 5173,
    open: false
  }
})
