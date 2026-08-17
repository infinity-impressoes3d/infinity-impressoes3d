import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Token de Produção do Melhor Envio (Fornecido pelo cliente)
const DEFAULT_MELHOR_ENVIO_TOKEN =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiNGMzMWI5ODgzM2I2ZDA4MGRiMjE0NzYzM2Y4NjcyZTA0YTJlMGE5NWJlYzAwMDBmMzYwM2U0MTNmMTNkZWE3ZjI2MDRmYTNhNjk2MDA0YTUiLCJpYXQiOjE3ODY5MDg2MTcuNDQ2NTA5LCJuYmYiOjE3ODY5MDg2MTcuNDQ2NTExLCJleHAiOjE4MTg0NDQ2MTcuNDM0Mzk4LCJzdWIiOiJhMjg0YTFjOC01ZWEzLTRlYzItOTBlYy1iZWFkMjUxYWJlMjAiLCJzY29wZXMiOlsiY2FydC1yZWFkIiwiY2FydC13cml0ZSIsImNvbXBhbmllcy1yZWFkIiwiY29tcGFuaWVzLXdyaXRlIiwiY291cG9ucy1yZWFkIiwiY291cG9ucy13cml0ZSIsIm5vdGlmaWNhdGlvbnMtcmVhZCIsIm9yZGVycy1yZWFkIiwicHJvZHVjdHMtcmVhZCIsInByb2R1Y3RzLWRlc3Ryb3kiLCJwcm9kdWN0cy13cml0ZSIsInB1cmNoYXNlcy1yZWFkIiwic2hpcHBpbmctY2FsY3VsYXRlIiwic2hpcHBpbmctY2FuY2VsIiwic2hpcHBpbmctY2hlY2tvdXQiLCJzaGlwcGluZy1jb21wYW5pZXMiLCJzaGlwcGluZy1nZW5lcmF0ZSIsInNoaXBwaW5nLXByZXZpZXciLCJzaGlwcGluZy1wcmludCIsInNoaXBwaW5nLXNoYXJlIiwic2hpcHBpbmctdHJhY2tpbmciLCJlY29tbWVyY2Utc2hpcHBpbmciLCJ0cmFuc2FjdGlvbnMtcmVhZCIsInVzZXJzLXJlYWQiLCJ1c2Vycy13cml0ZSIsIndlYmhvb2tzLXJlYWQiLCJ3ZWJob29rcy13cml0ZSIsIndlYmhvb2tzLWRlbGV0ZSIsInRkZWFsZXItd2ViaG9vayJdfQ.mEE3-iD6UeL3KXEwWKSLGGvxsRP29rQbbp7UyLDUSjMXH8_cwjjmmfXoGaQtZ83FxRu1mUid6jzK4Ij_zGKCxTySfZ-w2PujduTRmp221asDY7FtX0GVA8gSl7aIC0wV3fZgG5cRUH6fm57j_JoyXr9XQ3Tgww3JHRLR_DnXhW6b4I1z4ehmNtWoF2Z23H3O_ilNis-ZLoUEwNKj0Ag7jGW7pgId9JsAaEYxRfYEfbT6YG_UqlXfDWMolOkBgqyK4yudfH5JPGdgwAAg1v4Vs2sLcAq4-8OeDrOWDn0PUXlTrHSJ1fe5VylmRizLS4inzWUUAZae26iBAtYi1rPg_41A2rz0CWPfxpQTZ6P78tC2vyi-pE5f-OCyvl2gW7-y61m6QCGjgevqC1CxfXfnR1TGrkwxQeHq-2-NNh93pgvYVRIBEocOZC_dCA6nhw1R0dncp0GHkpNRGnW5bfG5fLUmh3MF38Cb5SWxyuq6y0lYBfteJGX4sNE_trMjaPj3OrPRKRaADvmEpPsOBzIaC9XhUwqCYNcOOaBs_DP3IkMKT_yJUgraFYQwbL58Ka_FJ092FDLXpc3Pu445o7OaWEPE-35eyyCMESZw-DgxnDqCaBDfs-pK16P4rYJgJyOigUfR5KtsB1vJOf5lAwwapHWC_G6xqAX39InNqwNfq8g";

// CEP de Origem oficial da Infinity 3D (Uberlândia - MG)
const DEFAULT_ORIGIN_CEP = "38414012";

serve(async (req) => {
  // Preflight OPTIONS para CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const token = Deno.env.get("MELHOR_ENVIO_TOKEN") || DEFAULT_MELHOR_ENVIO_TOKEN;
    const originCepEnv = Deno.env.get("STORE_ORIGIN_CEP") || DEFAULT_ORIGIN_CEP;

    const body = await req.json().catch(() => ({}));
    const { postalCode, items = [], fromPostalCode } = body;

    // 1. Sanitização estrita do CEP de Destino
    const cleanToCep = String(postalCode || "").replace(/\D/g, "");
    if (cleanToCep.length !== 8) {
      return new Response(
        JSON.stringify({
          error: "CEP inválido. Por favor, forneça um CEP com 8 dígitos.",
          options: [],
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Sanitização do CEP de Origem
    const cleanFromCep = String(fromPostalCode || originCepEnv).replace(/\D/g, "");

    // 3. Montagem dos Produtos com Validação Mínima Obrigatória pelos Correios
    const formattedProducts = (Array.isArray(items) && items.length > 0 ? items : [{}]).map(
      (item: any, index: number) => {
        const weightGrams = Number(item.weight_grams || item.weightGrams || item.weight || 300);
        const weightKg = Math.max(0.05, weightGrams / 1000); // Mínimo 50g

        const widthCm = Math.max(8, Number(item.width_cm || item.width || 11)); // Mínimo 8cm
        const heightCm = Math.max(1, Number(item.height_cm || item.height || 6)); // Mínimo 1cm
        const lengthCm = Math.max(13, Number(item.length_cm || item.length || 16)); // Mínimo 13cm
        const quantity = Math.max(1, Number(item.quantity || 1));

        return {
          id: String(item.id || `item-${index + 1}`),
          width: widthCm,
          height: heightCm,
          length: lengthCm,
          weight: Number(weightKg.toFixed(3)),
          quantity: quantity,
          insurance_value: 0, // Sem seguro extra conforme regra da loja
        };
      }
    );

    // 4. Payload para o Melhor Envio (Exclusivo Correios PAC e SEDEX: services "1,2")
    const melhorEnvioPayload = {
      from: {
        postal_code: cleanFromCep,
      },
      to: {
        postal_code: cleanToCep,
      },
      services: "1,2", // 1 = Correios PAC, 2 = Correios SEDEX
      products: formattedProducts,
      options: {
        receipt: false,
        own_hand: false,
      },
    };

    // 5. Chamada para a API do Melhor Envio com Timeout de 5 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let melhorEnvioResponse: Response;
    try {
      melhorEnvioResponse = await fetch("https://melhorenvio.com.br/api/v2/me/shipment/calculate", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "Infinity3D (contato@infinity3d.com.br)",
        },
        body: JSON.stringify(melhorEnvioPayload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!melhorEnvioResponse.ok) {
      const errorText = await melhorEnvioResponse.text();
      console.warn("Melhor Envio API error response:", melhorEnvioResponse.status, errorText);
      // Dispara fallback de contingência para não travar o checkout
      return handleFallback(cleanToCep, items);
    }

    const rates = await melhorEnvioResponse.json();

    if (!Array.isArray(rates)) {
      console.warn("Melhor Envio did not return an array:", rates);
      return handleFallback(cleanToCep, items);
    }

    // 6. Filtrar e formatar apenas Correios válidos e sem erros
    const options = rates
      .filter((rate: any) => {
        const hasNoFatalError = !rate.error;
        const hasPrice = Number(rate.price || rate.custom_price) > 0;
        const isCorreios =
          String(rate.company?.name || "").toLowerCase().includes("correio") ||
          rate.id === 1 ||
          rate.id === 2 ||
          rate.name?.toLowerCase().includes("sedex") ||
          rate.name?.toLowerCase().includes("pac");
        return hasNoFatalError && hasPrice && isCorreios;
      })
      .map((rate: any) => {
        const price = Number(rate.custom_price || rate.price || 0);
        const deliveryDays = Number(rate.custom_delivery_time || rate.delivery_time || 0);
        const isSedex = rate.id === 2 || String(rate.name || "").toUpperCase().includes("SEDEX");

        return {
          id: isSedex ? "sedex" : "pac",
          serviceId: rate.id,
          name: isSedex ? "Correios SEDEX (Expresso)" : "Correios PAC (Econômico)",
          company: "Correios",
          price: Number(price.toFixed(2)),
          deliveryDays: deliveryDays,
          deliveryText: `${deliveryDays} ${deliveryDays === 1 ? "dia útil" : "dias úteis"}`,
          badge: isSedex ? "⚡ MAIS RÁPIDO" : "ECONÔMICO",
        };
      })
      .sort((a, b) => {
        // Ordena SEDEX primeiro ou PAC primeiro
        if (a.id === "sedex") return -1;
        if (b.id === "sedex") return 1;
        return 0;
      });

    // Se nenhuma opção válida retornou da API, usa o fallback de contingência
    if (options.length === 0) {
      return handleFallback(cleanToCep, items);
    }

    return new Response(
      JSON.stringify({
        success: true,
        originCep: cleanFromCep,
        destinationCep: cleanToCep,
        options,
        isFallback: false,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Critical error in calculate-shipping Edge Function:", error);
    return handleFallback("", []);
  }
});

// 7. Fallback Regional Seguro caso a API dos Correios / Melhor Envio oscile
function handleFallback(cep: string, items: any[]) {
  const totalWeightGrams = (Array.isArray(items) ? items : []).reduce((acc: number, item: any) => {
    return acc + (Number(item.weight_grams || item.weightGrams || 300) * Number(item.quantity || 1));
  }, 0) || 300;

  const extraWeightKg = Math.max(0, (totalWeightGrams / 1000) - 0.5);
  const pacPrice = Math.round((14.90 + extraWeightKg * 4.0) * 100) / 100;
  const sedexPrice = Math.round((22.90 + extraWeightKg * 6.0) * 100) / 100;

  const fallbackOptions = [
    {
      id: "sedex",
      serviceId: 2,
      name: "Correios SEDEX (Expresso)",
      company: "Correios",
      price: sedexPrice,
      deliveryDays: 3,
      deliveryText: "2 a 4 dias úteis",
      badge: "⚡ MAIS RÁPIDO",
    },
    {
      id: "pac",
      serviceId: 1,
      name: "Correios PAC (Econômico)",
      company: "Correios",
      price: pacPrice,
      deliveryDays: 7,
      deliveryText: "5 a 8 dias úteis",
      badge: "ECONÔMICO",
    },
  ];

  return new Response(
    JSON.stringify({
      success: true,
      options: fallbackOptions,
      isFallback: true,
    }),
    {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    }
  );
}
