import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { calculateShippingRates } from '../lib/shippingCalculator';
import {
  ArrowLeft,
  Check,
  Truck,
  CreditCard,
  QrCode,
  MapPin,
  Tag,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Info,
  AlertCircle,
  Phone,
  Database,
  Download,
  Trash2,
  ExternalLink,
  X,
  ShieldCheck
} from 'lucide-react';

// ============================================================================
// REAL-TIME VALIDATION HELPER ALGORITHMS
// ============================================================================

// Official Módulo 11 CPF Checksum Validation
function validateCPF(cpfString) {
  const clean = cpfString.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false; // Catches 000.000.000-00, 111.111.111-11, etc.

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(clean.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(clean.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(10, 11))) return false;

  return true;
}

// Official Módulo 11 CNPJ Checksum Validation
function validateCNPJ(cnpjString) {
  const clean = cnpjString.replace(/\D/g, '');
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;

  let size = clean.length - 2;
  let numbers = clean.substring(0, size);
  const digits = clean.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  size = size + 1;
  numbers = clean.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

function validateCpfOrCnpj(val) {
  if (!val) return false;
  const clean = val.replace(/\D/g, '');
  if (clean.length === 11) return true;
  if (clean.length === 14) return true;
  return false;
}

// Official Brazilian Area Codes (DDDs)
const VALID_DDDS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99];

// Real Brazilian Mobile Phone Validation (MUST be 11 digits, start with valid DDD, and 3rd digit MUST be '9')
function validatePhone(phoneString) {
  const clean = phoneString.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false; // Rejects 99999999999, 00000000000, 11111111111

  const ddd = parseInt(clean.substring(0, 2), 10);
  if (!VALID_DDDS.includes(ddd)) return false; // Must be an existent Brazilian area code

  // Mobile cell phone MUST start with '9' right after DDD (clean[2] === '9')
  if (clean.charAt(2) !== '9') return false;

  return true;
}

// Email Format & Typo Detector
function validateEmail(emailString) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(emailString.trim());
}

function getEmailTypoSuggestion(emailString) {
  const typos = {
    'gamil.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'gmel.com': 'gmail.com',
    'hotmal.com': 'hotmail.com',
    'homail.com': 'hotmail.com',
    'outlok.com': 'outlook.com',
    'yaho.com': 'yahoo.com'
  };
  const parts = emailString.toLowerCase().trim().split('@');
  if (parts.length === 2 && typos[parts[1]]) {
    return `${parts[0]}@${typos[parts[1]]}`;
  }
  return null;
}

export default function CheckoutPage({
  cartItems,
  onGoHome,
  onClearCart,
  onUpdateQuantity,
  onRemoveItem
}) {
  // Stepper State: 1 = Contact & CEP, 2 = Shipping Method & Recipient, 3 = Payment
  const [step, setStep] = useState(1);

  // Form Fields State
  const [email, setEmail] = useState('');
  const [newsletter, setNewsletter] = useState(false);
  const [emailSuggestion, setEmailSuggestion] = useState(null);

  const [cep, setCep] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState('');
  const [addressData, setAddressData] = useState(null);

  // Recipient info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [noNumber, setNoNumber] = useState(false);
  const [complement, setComplement] = useState('');
  const [cpf, setCpf] = useState('');
  const [sameAsDelivery, setSameAsDelivery] = useState(true);

  // Validation Error States
  const [step1Error, setStep1Error] = useState('');
  const [step2Errors, setStep2Errors] = useState({});
  const [leadNotice, setLeadNotice] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState('');

  // Shipping selection
  const [selectedShipping, setSelectedShipping] = useState({
    id: 'sedex',
    name: 'Correios SEDEX',
    price: 24.90,
    days: 'Chega em 2 a 4 dias úteis'
  });
  const [showMoreShipping, setShowMoreShipping] = useState(false);

  // Payment selection: 'pix' | 'card'
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardData, setCardData] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
    installments: '1'
  });
  const [paymentError, setPaymentError] = useState('');

  // Mercado Pago & InfinitePay Credentials loaded from Supabase store_settings
  const [mercadoPagoPublicKey, setMercadoPagoPublicKey] = useState('');
  const [mercadoPagoAccessToken, setMercadoPagoAccessToken] = useState('');
  const [infinitePayHandle, setInfinitePayHandle] = useState('lays-moreira-rodrigues');

  useEffect(() => {
    async function loadPaymentSettings() {
      try {
        let pubKey = '';
        let token = '';

        const { data } = await supabase
          .from('store_settings')
          .select('mercadopago_public_key, mercadopago_access_token, mercadopago_access_token_encrypted, infinitepay_handle')
          .single();
        if (data) {
          if (data.mercadopago_public_key) pubKey = data.mercadopago_public_key;
          token = data.mercadopago_access_token || data.mercadopago_access_token_encrypted || '';
          if (data.infinitepay_handle) setInfinitePayHandle(data.infinitepay_handle);
        }

        if (!pubKey) {
          const { data: creds } = await supabase
            .from('payment_credentials')
            .select('public_key, access_token')
            .eq('provider', 'mercado_pago')
            .single();
          if (creds) {
            if (creds.public_key) pubKey = creds.public_key;
            if (creds.access_token) token = creds.access_token;
          }
        }

        if (pubKey) setMercadoPagoPublicKey(pubKey);
        if (token) setMercadoPagoAccessToken(token);
      } catch (e) {
        console.log('Busca de credenciais concluída.');
      }
    }
    loadPaymentSettings();
  }, []);


  // Detect card brand automatically from number
  const getCardBrand = (numberString) => {
    const clean = (numberString || '').replace(/\D/g, '');
    if (/^4/.test(clean)) return 'VISA';
    if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(clean)) return 'MASTERCARD';
    if (/^(4011|4389|4514|4576|5041|5066|5067|5090|6277|6362|6363|6500|6504|6505|6516|6550)/.test(clean)) return 'ELO';
    if (/^(34|37)/.test(clean)) return 'AMEX';
    if (/^(606282|3841)/.test(clean)) return 'HIPERCARD';
    return null;
  };

  const cardBrand = getCardBrand(cardData.number);

  const handleCardNumberChange = (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 16);
    let formatted = v.replace(/(\d{4})/g, '$1 ').trim();
    setCardData(prev => ({ ...prev, number: formatted }));
    setPaymentError('');
  };

  const handleCardExpiryChange = (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 3) {
      v = `${v.slice(0, 2)} / ${v.slice(2)}`;
    }
    setCardData(prev => ({ ...prev, expiry: v }));
    setPaymentError('');
  };

  // Additional comments
  const [comments, setComments] = useState('');
  const [showCommentsInput, setShowCommentsInput] = useState(false);

  // Coupon state
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [loadingCoupon, setLoadingCoupon] = useState(false);

  // Order Placement & Completion State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [stripePublishableKey, setStripePublishableKey] = useState(null);


  // Load active Stripe Publishable Key from Supabase database
  useEffect(() => {
    async function loadStripeKey() {
      try {
        const { data } = await supabase
          .from('store_settings')
          .select('stripe_publishable_key')
          .single();
        if (data && data.stripe_publishable_key) {
          setStripePublishableKey(data.stripe_publishable_key);
        }
      } catch (e) {
        console.error('Erro ao carregar chave Stripe:', e);
      }
    }
    loadStripeKey();
  }, []);

  // 1. Restauração Automática da Memória de Rascunho (se o cliente saiu e voltou)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('infinity_checkout_draft');
      const savedOrderId = localStorage.getItem('infinity_active_checkout_order_id');
      if (savedOrderId && savedOrderId.includes('-')) {
        activeOrderIdRef.current = savedOrderId;
      }

      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.orderId && draft.orderId.includes('-')) {
          activeOrderIdRef.current = draft.orderId;
        }
        if (draft.email) setEmail(draft.email);
        if (draft.phone) setPhone(draft.phone);
        if (draft.firstName) setFirstName(draft.firstName);
        if (draft.lastName) setLastName(draft.lastName);
        if (draft.cpf) setCpf(draft.cpf);
        if (draft.cep) setCep(draft.cep);
        if (draft.addressData) {
          setAddressData(draft.addressData);
        } else if (draft.cep && draft.cep.replace(/\D/g, '').length === 8) {
          fetchAddressFromViaCep(draft.cep.replace(/\D/g, ''));
        }
        if (draft.streetNumber) setStreetNumber(draft.streetNumber);
        if (draft.complement) setComplement(draft.complement);
        if (draft.noNumber !== undefined) setNoNumber(draft.noNumber);
        if (draft.comments) {
          setComments(draft.comments);
          setShowCommentsInput(true);
        }
        if (draft.selectedShipping) setSelectedShipping(draft.selectedShipping);
        if (draft.step && draft.step === 2 && draft.cep) setStep(2);
      }
    } catch (e) {
      console.warn('Aviso rascunho checkout:', e);
    }
  }, []);

  // 2. Salvamento Automático Contínuo da Memória em Tempo Real e Sincronização Supabase
  useEffect(() => {
    if (email || phone || firstName || lastName || cpf || cep || streetNumber || complement || comments) {
      try {
        const draft = {
          orderId: activeOrderIdRef.current,
          email,
          phone,
          firstName,
          lastName,
          cpf,
          cep,
          addressData,
          streetNumber,
          complement,
          noNumber,
          comments,
          selectedShipping,
          step
        };
        localStorage.setItem('infinity_checkout_draft', JSON.stringify(draft));
        if (activeOrderIdRef.current) {
          localStorage.setItem('infinity_active_checkout_order_id', activeOrderIdRef.current);
        }
      } catch (e) {}
    }

    // Auto-sincronização com o Supabase sempre que o cliente digita qualquer dado (debounced 500ms)
    if (email.trim() || phone.trim()) {
      const timer = setTimeout(() => {
        const currentStage = step === 1 ? 'etapa_1_contato' : 'etapa_2_entrega';
        saveLeadData(currentStage);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [email, phone, firstName, lastName, cpf, cep, addressData, streetNumber, complement, noNumber, comments, selectedShipping, step]);

  // Auto scroll to top on mount and step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, isCompleted]);

  // Handle Email Change & Typo Detection
  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setStep1Error('');
    const sug = getEmailTypoSuggestion(val);
    setEmailSuggestion(sug);
  };

  // Subtotal Calculation
  const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);

  // Coupon Discount & Effective Shipping Calculation
  let couponDiscount = 0;
  const baseShippingCost = selectedShipping ? Number(selectedShipping.price) || 0 : 0;
  let effectiveShippingCost = baseShippingCost;

  if (appliedCoupon) {
    if (appliedCoupon.type === 'percentage') {
      couponDiscount = subtotal * ((Number(appliedCoupon.value) || 0) / 100);
    } else if (appliedCoupon.type === 'fixed') {
      couponDiscount = Math.min(subtotal, Number(appliedCoupon.value) || 0);
    } else if (appliedCoupon.type === 'free_shipping') {
      effectiveShippingCost = 0;
    }
  }

  // Shipping Cost used in summary and payloads
  const shippingCost = effectiveShippingCost;

  // Grand Total
  const grandTotal = Math.max(0, subtotal - couponDiscount + shippingCost);

  // Format CEP mask
  const handleCepChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (raw.length > 8) raw = raw.slice(0, 8);
    let masked = raw;
    if (raw.length > 5) {
      masked = `${raw.slice(0, 5)}-${raw.slice(5)}`;
    }
    setCep(masked);
    setCepError('');
    if (raw.length === 8) {
      fetchAddressFromViaCep(raw);
    }
  };

  const [shippingOptionsList, setShippingOptionsList] = useState([]);
  const [shippingDetailsInfo, setShippingDetailsInfo] = useState(null);

  // Recalculates shipping options whenever cart items or address changes
  useEffect(() => {
    if (addressData && addressData.uf) {
      const calc = calculateShippingRates(addressData.uf, 300, cartItems);
      setShippingOptionsList(calc.options);
      setShippingDetailsInfo(calc);
      if (calc.options.length > 0) {
        const found = calc.options.find(o => o.id === selectedShipping.id);
        setSelectedShipping(found || calc.options[0]);
      }
    }
  }, [cartItems, addressData]);

  // Fetch Address from ViaCEP with timeout and error handling
  const fetchAddressFromViaCep = async (cleanCep) => {
    if (cleanCep.length !== 8) return null;
    setLoadingCep(true);
    setCepError('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error('Falha ao conectar com o serviço de CEP.');
      const data = await res.json();
      if (data.erro) {
        setCepError('CEP não encontrado. Verifique o número digitado.');
        setAddressData(null);
        return null;
      }
      setAddressData(data);
      if (email.trim() || phone.trim()) {
        saveLeadData(step === 1 ? 'etapa_1_contato' : 'etapa_2_entrega', null, { addressData: data, cep: cleanCep });
      }
      return data;
    } catch (err) {
      console.error('Erro na consulta do CEP:', err);
      setCepError('Não foi possível carregar o endereço automaticamente. Digite o CEP novamente.');
      return null;
    } finally {
      setLoadingCep(false);
    }
  };

  // Real-time Lead Capture & Abandoned Cart State
  const [capturedLeads, setCapturedLeads] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('infinity_captured_leads') || '[]');
    } catch (e) {
      return [];
    }
  });

  // Unique session identifier for the order / checkout lead
  const generateValidUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const getInitialOrderId = () => {
    try {
      const saved = localStorage.getItem('infinity_active_checkout_order_id');
      if (saved && saved.includes('-')) return saved;
    } catch (e) {}
    const newId = generateValidUUID();
    try {
      localStorage.setItem('infinity_active_checkout_order_id', newId);
    } catch (e) {}
    return newId;
  };

  const activeOrderIdRef = useRef(getInitialOrderId());

  // Save Lead Helper Function (Triggers in real-time as user types, Step 1, Step 2, and Order Place)
  const saveLeadData = async (stage = 'etapa_1_contato', customStatus = null, overrides = {}) => {
    const currentEmail = overrides.email !== undefined ? overrides.email : email;
    const currentPhone = overrides.phone !== undefined ? overrides.phone : phone;
    const currentFirstName = overrides.firstName !== undefined ? overrides.firstName : firstName;
    const currentLastName = overrides.lastName !== undefined ? overrides.lastName : lastName;
    const currentCpf = overrides.cpf !== undefined ? overrides.cpf : cpf;
    const currentCep = overrides.cep !== undefined ? overrides.cep : cep;
    const currentStreetNumber = overrides.streetNumber !== undefined ? overrides.streetNumber : streetNumber;
    const currentComplement = overrides.complement !== undefined ? overrides.complement : complement;
    const currentAddressData = overrides.addressData !== undefined ? overrides.addressData : addressData;
    const currentNoNumber = overrides.noNumber !== undefined ? overrides.noNumber : noNumber;

    if (!currentEmail.trim() && !currentPhone.trim()) return null;

    if (!activeOrderIdRef.current || !activeOrderIdRef.current.includes('-')) {
      activeOrderIdRef.current = generateValidUUID();
    }

    const rawFullName = `${currentFirstName.trim()} ${currentLastName.trim()}`.trim();
    let customerName = rawFullName;
    if (!customerName && currentEmail.trim()) {
      const userPart = currentEmail.trim().split('@')[0];
      customerName = userPart.replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    if (!customerName && currentPhone.trim()) {
      customerName = `Cliente (${currentPhone.trim()})`;
    }
    if (!customerName) {
      customerName = 'Cliente em Checkout';
    }

    const customerEmail = currentEmail.trim() || null;
    const customerPhone = currentPhone.trim() || null;
    const customerCpf = currentCpf.trim() || null;
    const cleanCepVal = currentCep.trim() || null;
    const cleanNumber = currentStreetNumber.trim() || (currentNoNumber ? 'S/N' : '');
    const cleanComplement = currentComplement.trim();

    const streetAddress = currentAddressData ? (currentAddressData.logradouro || '') : '';
    const neighborhoodAddress = currentAddressData ? (currentAddressData.bairro || '') : '';
    const cityAddress = currentAddressData ? (currentAddressData.localidade || '') : '';
    const stateAddress = currentAddressData ? (currentAddressData.uf || '') : '';

    const itemsSummary = cartItems.map(item => `${item.title || item.name} (${item.selectedSize}) x${item.quantity}`).join(' | ');
    const addressStr = currentAddressData ? `${streetAddress}, ${cleanNumber || 'S/N'}${cleanComplement ? ' (' + cleanComplement + ')' : ''} - ${neighborhoodAddress} - ${cityAddress}/${stateAddress}` : '';
    
    let status = customStatus;
    if (!status) {
      if (stage === 'etapa_1_contato') status = 'CARRINHO ABANDONADO (Etapa 1 - Contato)';
      else if (stage === 'etapa_2_entrega') status = 'CARRINHO ABANDONADO (Etapa 2 - Endereço)';
      else if (stage === 'pedido_concluido') status = 'PEDIDO CONCLUÍDO';
      else status = 'abandoned';
    }

    const shippingAddressObj = {
      cep: cleanCepVal,
      street: streetAddress,
      logradouro: streetAddress,
      number: cleanNumber,
      numero: cleanNumber,
      complement: cleanComplement,
      complemento: cleanComplement,
      neighborhood: neighborhoodAddress,
      bairro: neighborhoodAddress,
      city: cityAddress,
      localidade: cityAddress,
      state: stateAddress,
      uf: stateAddress
    };

    const leadPayload = {
      id: activeOrderIdRef.current,
      timestamp: new Date().toISOString(),
      dataHora: new Date().toLocaleString('pt-BR'),
      etapa: stage,
      status: status,
      email: customerEmail || 'sem-email@cliente.com',
      whatsapp: customerPhone || '',
      phone: customerPhone || '',
      nome: customerName,
      name: customerName,
      cpf: customerCpf || '',
      cep: cleanCepVal || '',
      endereco: addressStr,
      numero: cleanNumber,
      complemento: cleanComplement,
      shipping_address: shippingAddressObj,
      itens: itemsSummary,
      subtotal: subtotal.toFixed(2),
      frete: shippingCost.toFixed(2),
      total: grandTotal.toFixed(2),
      formaPagamento: paymentMethod ? paymentMethod.toUpperCase() : 'PIX'
    };

    try {
      const existing = JSON.parse(localStorage.getItem('infinity_captured_leads') || '[]');
      const idx = existing.findIndex(l => l.id === activeOrderIdRef.current);
      if (idx > -1) {
        existing[idx] = { ...existing[idx], ...leadPayload };
      } else {
        existing.unshift(leadPayload);
      }
      localStorage.setItem('infinity_captured_leads', JSON.stringify(existing));
      localStorage.setItem('infinity_last_captured_lead', JSON.stringify(leadPayload));
      setCapturedLeads(existing);
    } catch (e) {
      console.error('Erro ao salvar lead local:', e);
    }

    // Send/Update Supabase Orders Table (Checkouts & Abandoned Checkouts)
    try {
      const baseComments = comments ? comments.trim() : '';
      const taggedComments = baseComments ? `${baseComments}\n<!--DELIVERY:imprimindo-->` : '<!--DELIVERY:imprimindo-->';

      const orderRecord = {
        id: activeOrderIdRef.current,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_cpf: customerCpf,
        shipping_address: shippingAddressObj,
        shipping_method: selectedShipping ? selectedShipping.name : 'Padrão',
        shipping_cost: shippingCost || 0,
        items: cartItems.map(i => ({
          name: i.title || i.name,
          price: i.price,
          quantity: i.quantity,
          size: i.selectedSize || 'Único',
          image: i.image || (i.images && i.images[0]) || ''
        })),
        total_amount: grandTotal || 0,
        payment_method: paymentMethod || 'infinitepay',
        status: 'abandoned',
        status_entrega: 'imprimindo',
        comments: taggedComments,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Backup do pedido completo no localStorage
      try {
        localStorage.setItem('infinity_last_order_data', JSON.stringify(orderRecord));
      } catch (e) {}

      const { error } = await supabase
        .from('orders')
        .upsert([orderRecord], { onConflict: 'id' });

      if (error && error.message && error.message.includes('status_entrega')) {
        const fallbackRecord = { ...orderRecord };
        delete fallbackRecord.status_entrega;
        await supabase.from('orders').upsert([fallbackRecord], { onConflict: 'id' });
      }

      // Notifica abas do painel admin instantaneamente
      try {
        const bc = new BroadcastChannel('infinity-orders-channel');
        bc.postMessage({ type: 'order_updated', id: activeOrderIdRef.current });
        bc.close();
      } catch (e) {}
    } catch (err) {
      console.error('Erro de integração Supabase:', err);
    }

    return leadPayload;
  };

  // Export Captured Leads to CSV
  const handleExportCSV = () => {
    if (capturedLeads.length === 0) return;
    const headers = ['ID', 'Data/Hora', 'Etapa', 'Status', 'Nome', 'E-mail', 'WhatsApp', 'CPF', 'CEP', 'Endereço', 'Número', 'Complemento', 'Itens', 'Total (R$)', 'Pagamento'];
    const rows = capturedLeads.map(l => [
      l.id,
      `"${l.dataHora}"`,
      `"${l.etapa}"`,
      `"${l.status}"`,
      `"${l.nome}"`,
      `"${l.email}"`,
      `"${l.whatsapp}"`,
      `"${l.cpf}"`,
      `"${l.cep}"`,
      `"${l.endereco}"`,
      `"${l.numero}"`,
      `"${l.complemento}"`,
      `"${l.itens}"`,
      `"${l.total}"`,
      `"${l.formaPagamento}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leads_infinity_3d_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveWebhook = (e) => {
    e.preventDefault();
    localStorage.setItem('infinity_webhook_url', webhookUrl.trim());
    setLeadNotice('✓ URL do Webhook do Excel / Google Sheets salva com sucesso!');
    setTimeout(() => setLeadNotice(null), 3000);
  };

  const handleClearLeads = () => {
    if (window.confirm('Tem certeza que deseja limpar a lista local de leads?')) {
      localStorage.removeItem('infinity_captured_leads');
      setCapturedLeads([]);
    }
  };

  // Step 1 Validation & Continue (Captures E-mail, WhatsApp & CEP)
  const handleContinueStep1 = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setStep1Error('');

    if (!cartItems || cartItems.length === 0) {
      setStep1Error('Seu carrinho está vazio. Adicione pelo menos um produto na loja antes de continuar.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!validateEmail(email)) {
      setStep1Error('Por favor informe um e-mail válido (ex: seu@email.com).');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!validatePhone(phone)) {
      if (cleanPhone.length >= 3 && cleanPhone.charAt(2) !== '9') {
        setStep1Error('O celular/WhatsApp deve obrigatoriamente começar com o dígito 9 após o DDD (ex: (34) 98888-7777).');
      } else {
        setStep1Error('Telefone WhatsApp inválido. Digite um DDD válido com 9 dígitos (ex: (11) 98888-7777).');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setStep1Error('Por favor informe um CEP válido com 8 dígitos (ex: 69905-118).');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    let currentAddress = addressData;
    if (!currentAddress) {
      currentAddress = await fetchAddressFromViaCep(cleanCep);
    }

    if (!currentAddress || currentAddress.erro) {
      setStep1Error('CEP inexistente ou não encontrado. Verifique os números digitados.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Capture Lead at Step 1 (Etapa 1 - Email + WhatsApp + CEP + Carrinho)
    if (!activeOrderIdRef.current) {
      activeOrderIdRef.current = generateValidUUID();
    }

    try {
      await saveLeadData('etapa_1_contato', 'CARRINHO ABANDONADO (Etapa 1 - E-mail & WhatsApp Capturados)', {
        addressData: currentAddress,
        cep: cleanCep,
        phone: cleanPhone,
        email: email.trim()
      });
    } catch (err) {
      console.error('Erro ao salvar lead:', err);
    }

    setStep(2);
  };

  // Step 2 Validation & Direct Order Placement (Redirects directly to InfinitePay)
  const handleContinueStep2 = async (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    setPaymentError('');
    const errors = {};

    if (!cartItems || cartItems.length === 0) {
      setPaymentError('Seu carrinho está vazio. Adicione produtos na loja antes de prosseguir.');
      return;
    }

    if (!firstName || !firstName.trim()) {
      errors.firstName = 'Informe seu nome para a entrega.';
    }
    if (!lastName || !lastName.trim()) {
      errors.lastName = 'Informe seu sobrenome para a entrega.';
    }

    if (!noNumber && (!streetNumber || !streetNumber.trim())) {
      errors.streetNumber = 'Informe o número do endereço ou marque "Sem número".';
    }

    if (!cpf || !cpf.trim()) {
      errors.cpf = 'Informe seu CPF ou CNPJ para emissão da nota fiscal.';
    } else if (!validateCpfOrCnpj(cpf)) {
      errors.cpf = 'CPF/CNPJ deve conter 11 dígitos (CPF) ou 14 dígitos (CNPJ).';
    }

    setStep2Errors(errors);

    if (Object.keys(errors).length === 0) {
      try {
        await saveLeadData('etapa_2_entrega', 'ENTREGA & DESTINATÁRIO');
      } catch (err) {
        console.warn('Lead notice:', err);
      }
      
      // Prossegue diretamente para o checkout seguro da InfinitePay sem tela intermediária
      await handlePlaceOrder();
    } else {
      setPaymentError('Por favor, preencha os campos obrigatórios acima (Nome, Sobrenome, Número e CPF) para prosseguir.');
      const firstErrEl = document.querySelector('input[placeholder="Nome"], input[placeholder="Sobrenome"], input[placeholder="Número"], input[placeholder="CPF ou CNPJ"]');
      if (firstErrEl) {
        firstErrEl.focus();
      }
    }
  };

  // Submit Order Placement (InfinitePay Integration com Preço 100% Travado e Bloqueado)
  const handlePlaceOrder = async (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    setPaymentError('');

    if (!cartItems || cartItems.length === 0) {
      setPaymentError('Seu carrinho está vazio. Adicione pelo menos um produto para continuar.');
      return;
    }

    setIsSubmitting(true);

    const targetHandle = (infinitePayHandle || 'lays-moreira-rodrigues').replace(/^[@$]/, '').trim();
    const cleanHandle = targetHandle || 'lays-moreira-rodrigues';
    const orderIdentifier = activeOrderIdRef.current || `ord_${Date.now()}`;
    const successRedirectUrl = `${window.location.origin}/#/sucesso?order_id=${encodeURIComponent(orderIdentifier)}`;

    try {
      try {
        await saveLeadData('etapa_2_entrega', 'CARRINHO ABANDONADO (Aguardando Pagamento InfinitePay)');
      } catch (leadErr) {
        console.warn('Lead notice:', leadErr);
      }

      try {
        localStorage.setItem('infinity_last_order_id', orderIdentifier);
      } catch (e) {}

      // Se houver cupom com contador de usos, incrementa no Supabase
      if (appliedCoupon && appliedCoupon.id) {
        try {
          await supabase
            .from('coupons')
            .update({ 
              used_count: (appliedCoupon.used_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', appliedCoupon.id);
        } catch (couponErr) {
          console.warn('Erro ao atualizar contador do cupom:', couponErr);
        }
      }

      // Calcular itens para a InfinitePay com o valor total travado
      let apiItems = [];
      const productsTargetCents = Math.round(Math.max(0, subtotal - couponDiscount) * 100);

      if (cartItems.length > 0 && subtotal > 0) {
        let allocatedCents = 0;
        apiItems = cartItems.map((item, idx) => {
          const itemSubtotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
          let itemTotalCents;
          if (idx === cartItems.length - 1) {
            itemTotalCents = productsTargetCents - allocatedCents;
          } else {
            itemTotalCents = Math.round((itemSubtotal / subtotal) * productsTargetCents);
            allocatedCents += itemTotalCents;
          }

          const qty = Number(item.quantity) || 1;
          const unitPriceCents = Math.max(100, Math.round(itemTotalCents / qty));
          return {
            quantity: qty,
            price: unitPriceCents,
            description: String(item.title || item.name || 'Produto Impressão 3D').substring(0, 60)
          };
        });
      }

      if (effectiveShippingCost > 0) {
        apiItems.push({
          quantity: 1,
          price: Math.round(Number(effectiveShippingCost) * 100),
          description: `Frete (${selectedShipping ? selectedShipping.name : 'Envio'})`
        });
      }

      if (apiItems.length === 0) {
        const fallbackPriceCents = Math.max(100, Math.round((Number(grandTotal) || 50) * 100));
        apiItems = [{
          quantity: 1,
          price: fallbackPriceCents,
          description: 'Pedido Infinity 3D'
        }];
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fldwlpktqjmqimpfaviw.supabase.co';
      const cleanDigitsPhone = phone.replace(/\D/g, '');
      const validPhone = (cleanDigitsPhone.length === 10 || cleanDigitsPhone.length === 11) ? `+55${cleanDigitsPhone}` : null;
      const customerFullName = `${firstName.trim()} ${lastName.trim()}`.trim() || 'Cliente Infinity 3D';

      const cleanCep = cep.replace(/\D/g, '');
      const streetAddress = addressData ? (addressData.logradouro || '') : '';
      const neighborhoodAddress = addressData ? (addressData.bairro || '') : '';
      const numberAddress = streetNumber.trim() || (noNumber ? 'S/N' : '');
      const complementAddress = complement.trim() || '';

      const addressPayload = {
        cep: cleanCep || '69905118',
        street: streetAddress || 'Endereço de Entrega',
        number: numberAddress || 'S/N',
        neighborhood: neighborhoodAddress || 'Centro',
        complement: complementAddress
      };

      const payload = {
        handle: cleanHandle,
        redirect_url: successRedirectUrl,
        webhook_url: `${supabaseUrl}/functions/v1/infinitepay-webhook?secret=infinity_3d_secret_token_2026`,
        order_nsu: orderIdentifier,
        items: apiItems,
        address: addressPayload
      };

      if (validPhone && email.trim()) {
        payload.customer = {
          name: customerFullName,
          email: email.trim(),
          phone_number: validPhone
        };
      }

      let checkoutUrl = null;

      // 1. Gera o Checkout Oficial da InfinitePay com preço FIXO e BLOQUEADO
      try {
        const apiRes = await fetch('https://api.checkout.infinitepay.io/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (apiRes.ok) {
          const apiData = await apiRes.json();
          checkoutUrl = apiData.url || apiData.checkout_url;
        } else {
          // Se falhou por validação de campos do customer, tenta imediatamente com itens essenciais e endereço
          const retryRes = await fetch('https://api.checkout.infinitepay.io/links', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              handle: cleanHandle,
              redirect_url: successRedirectUrl,
              webhook_url: `${supabaseUrl}/functions/v1/infinitepay-webhook?secret=infinity_3d_secret_token_2026`,
              order_nsu: orderIdentifier,
              items: apiItems,
              address: addressPayload
            })
          });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            checkoutUrl = retryData.url || retryData.checkout_url;
          }
        }
      } catch (apiErr) {
        console.warn('Tentativa direta InfinitePay avisou:', apiErr);
      }

      // 2. Se a API externa não respondeu, tenta via Edge Function do Supabase
      if (!checkoutUrl) {
        try {
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
          const fallbackRes = await fetch(`${supabaseUrl}/functions/v1/create-infinitepay-checkout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': anonKey,
              'Authorization': `Bearer ${anonKey}`
            },
            body: JSON.stringify({
              items: apiItems,
              totalAmount: grandTotal,
              orderId: orderIdentifier,
              redirectUrl: successRedirectUrl,
              customer: payload.customer,
              address: addressPayload
            })
          });

          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            if (fallbackData.checkoutUrl) {
              checkoutUrl = fallbackData.checkoutUrl;
            }
          }
        } catch (edgeErr) {
          console.warn('Edge function fallback avisou:', edgeErr);
        }
      }

      if (checkoutUrl) {
        // Limpa a memória de rascunho do checkout para que novas compras comecem 100% limpas
        try {
          localStorage.removeItem('infinity_checkout_draft');
        } catch (e) {}
        if (typeof onClearCart === 'function') {
          onClearCart();
        }
        window.location.href = checkoutUrl;
        return;
      }

      setPaymentError('Não foi possível gerar o link de pagamento seguro da InfinitePay. Por favor, tente novamente.');
      setIsSubmitting(false);

    } catch (err) {
      console.error('Erro ao gerar pagamento da InfinitePay:', err);
      setPaymentError('Erro de comunicação com a InfinitePay. Por favor, tente novamente.');
      setIsSubmitting(false);
    }
  };

  // Apply Coupon from Supabase Database
  const handleApplyCoupon = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setCouponError('');
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponError('Digite o código do cupom.');
      return;
    }

    setLoadingCoupon(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .ilike('code', code)
        .maybeSingle();

      if (error || !data) {
        setCouponError('Cupom inválido ou não encontrado.');
        return;
      }

      if (!data.active) {
        setCouponError('Este cupom está inativo no momento.');
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setCouponError('Este cupom expirou.');
        return;
      }

      if (data.max_uses !== null && data.used_count >= data.max_uses) {
        setCouponError('Este cupom atingiu o limite de utilizações.');
        return;
      }

      if (data.min_order_value > 0 && subtotal < Number(data.min_order_value)) {
        setCouponError(`Este cupom exige um pedido mínimo de R$ ${Number(data.min_order_value).toFixed(2).replace('.', ',')}.`);
        return;
      }

      setAppliedCoupon(data);
      setCouponCode('');
    } catch (err) {
      console.error('Erro ao validar cupom:', err);
      setCouponError('Erro ao consultar cupom. Tente novamente.');
    } finally {
      setLoadingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  // Format CPF mask
  const handleCpfChange = (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 14) v = v.slice(0, 14);

    if (v.length <= 11) {
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      v = v.replace(/^(\d{2})(\d)/, '$1.$2');
      v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
      v = v.replace(/(\d{4})(\d)/, '$1-$2');
    }

    setCpf(v);
    setStep2Errors(prev => ({ ...prev, cpf: null }));
  };

  // Format Phone mask with strict 9th digit enforcement
  const handlePhoneChange = (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    
    let formatted = v;
    if (v.length > 10) {
      formatted = v.replace(/^(\d\d)(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (v.length > 5) {
      formatted = v.replace(/^(\d\d)(\d{4,5})(\d{0,4}).*/, '($1) $2-$3');
    } else if (v.length > 2) {
      formatted = v.replace(/^(\d\d)(\d{0,5}).*/, '($1) $2');
    }

    setPhone(formatted);

    // Instant real-time 9th-digit check after DDD
    if (v.length >= 3 && v.charAt(2) !== '9') {
      setStep2Errors(prev => ({
        ...prev,
        phone: 'O celular deve obrigatoriamente começar com o dígito 9 após o DDD (ex: (34) 98888-7777).'
      }));
    } else if (v.length === 11 && !validatePhone(v)) {
      setStep2Errors(prev => ({
        ...prev,
        phone: 'Telefone celular inválido ou DDD inexistente.'
      }));
    } else {
      setStep2Errors(prev => ({ ...prev, phone: null }));
    }
  };

  // Order Confirmation View
  if (isCompleted) {
    return (
      <div style={{ backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh', padding: '60px 16px' }}>
        <div className="container" style={{ maxWidth: '650px', textAlign: 'center' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'rgba(39, 174, 96, 0.15)',
            color: '#27ae60',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            border: '2px solid #27ae60'
          }}>
            <Check size={44} />
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', marginBottom: '8px' }}>
            Obrigado pela sua compra!
          </h1>
          <p style={{ fontSize: '14px', color: '#aaaaaa', marginBottom: '32px' }}>
            Seu pedido <strong style={{ color: '#ffffff' }}>#INF-{Math.floor(100000 + Math.random() * 900000)}</strong> foi verificado com sucesso e já está sendo preparado.
          </p>

          <div style={{
            backgroundColor: '#0a0a0a',
            border: '1px solid #222222',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'left',
            marginBottom: '32px'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#3498db', marginBottom: '16px', borderBottom: '1px solid #1a1a1a', paddingBottom: '10px' }}>
              RESUMO DA ENTREGA E PAGAMENTO
            </h3>

            <div style={{ fontSize: '13px', color: '#cccccc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div><strong>Cliente:</strong> {firstName} {lastName} ({email})</div>
              <div><strong>CPF/CNPJ:</strong> {cpf}</div>
              <div><strong>Telefone:</strong> {phone}</div>
              <div>
                <strong>Endereço:</strong> {addressData ? addressData.logradouro : ''} {noNumber ? 'SN' : streetNumber} {complement && `- ${complement}`}, {addressData ? `${addressData.bairro}, ${addressData.localidade}/${addressData.uf}` : ''} (CEP: {cep})
              </div>
              <div><strong>Forma de Envio:</strong> {selectedShipping.name} (R$ {selectedShipping.price.toFixed(2).replace('.', ',')})</div>
              <div><strong>Forma de Pagamento:</strong> {paymentMethod === 'pix' ? 'Pix à Vista' : 'Cartão de Crédito'}</div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#ffffff', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #222' }}>
                Total Pago: R$ {grandTotal.toFixed(2).replace('.', ',')}
              </div>
            </div>

            {/* If Pix was chosen, display instant Pix QR code */}
            {paymentMethod === 'pix' && (
              <div style={{
                marginTop: '20px',
                padding: '20px',
                backgroundColor: '#081622',
                border: '1px solid #3498db',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '13px', fontWeight: '800', color: '#3498db', marginBottom: '10px' }}>
                  Escaneie o QR Code abaixo para pagar via Pix:
                </p>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=00020126580014BR.GOV.BCB.PIX0136infinity3d.suporte@gmail.com520400005303986540${grandTotal.toFixed(2)}5802BR5920INFINITY IMPRESSOES 6009UBERLANDIA62070503***6304`}
                  alt="QR Code Pix"
                  style={{ width: '180px', height: '180px', borderRadius: '8px', margin: '0 auto 12px auto', border: '4px solid #ffffff' }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('00020126580014BR.GOV.BCB.PIX0136infinity3d.suporte@gmail.com5204000053039865405802BR5920INFINITY IMPRESSOES');
                    setCopiedPix(true);
                    setTimeout(() => setCopiedPix(false), 3000);
                  }}
                  style={{
                    backgroundColor: copiedPix ? '#27ae60' : '#090476',
                    color: '#ffffff',
                    padding: '10px 18px',
                    borderRadius: '6px',
                    fontWeight: '800',
                    fontSize: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Copy size={16} /> {copiedPix ? 'CHAVE PIX COPIADA!' : 'COPIAR CHAVE PIX'}
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onGoHome}
            style={{
              backgroundColor: '#090476',
              color: '#ffffff',
              padding: '14px 32px',
              borderRadius: '30px',
              fontWeight: '800',
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            VOLTAR À LOJA
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh', padding: '32px 0 80px 0' }}>
      <div className="container checkout-container-wrapper" style={{ maxWidth: '1100px', padding: '0 16px' }}>
        
        {/* TOP STEPPER HEADER */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '36px',
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          margin: '0 auto 36px auto',
          padding: '0 8px',
          boxSizing: 'border-box'
        }}>
          {/* Stepper Progress Line */}
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '40px',
            right: '40px',
            height: '2px',
            backgroundColor: '#222222',
            zIndex: 1
          }}>
            <div style={{
              width: step === 1 ? '0%' : '100%',
              height: '100%',
              backgroundColor: '#27ae60',
              transition: 'width 0.3s ease'
            }} />
          </div>

          {/* Step 1: Contato & CEP */}
          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', flex: 1 }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: step >= 1 ? '#000000' : '#111111',
              border: step >= 1 ? '2px solid #27ae60' : '2px solid #333333',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px auto',
              fontSize: '12px',
              fontWeight: '800'
            }}>
              {step > 1 ? <Check size={16} color="#27ae60" /> : '1'}
            </div>
            <span style={{ fontSize: '12px', color: step >= 1 ? '#ffffff' : '#666666', fontWeight: step >= 1 ? '700' : '400' }}>
              Contato & CEP
            </span>
          </div>

          {/* Step 2: Entrega & Pagamento */}
          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', flex: 1 }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: step >= 2 ? '#000000' : '#111111',
              border: step >= 2 ? '2px solid #27ae60' : '2px solid #333333',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px auto',
              fontSize: '12px',
              fontWeight: '800'
            }}>
              <ShieldCheck size={16} color={step >= 2 ? '#27ae60' : '#888888'} />
            </div>
            <span style={{ fontSize: '12px', color: step >= 2 ? '#ffffff' : '#666666', fontWeight: step >= 2 ? '700' : '400' }}>
              Entrega & Pagamento
            </span>
          </div>
        </div>

        {/* MAIN 2-COLUMN CHECKOUT LAYOUT */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '36px',
          alignItems: 'start'
        }} className="checkout-grid-layout">
          
          {/* LEFT COLUMN: MULTI-STEP FORM (8 COLS ON DESKTOP) */}
          <div style={{ gridColumn: 'span 12' }} className="checkout-main-form">
            
            {/* Se o carrinho estiver vazio */}
            {(!cartItems || cartItems.length === 0) && (
              <div style={{
                backgroundColor: '#0a0a0e',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '48px 24px',
                textAlign: 'center',
                marginBottom: '32px'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(231, 76, 60, 0.15)',
                  color: '#e74c3c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto'
                }}>
                  <ShoppingBag size={32} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', marginBottom: '8px' }}>
                  Seu carrinho está vazio
                </h3>
                <p style={{ fontSize: '14px', color: '#888888', maxWidth: '420px', margin: '0 auto 24px auto', lineHeight: 1.5 }}>
                  Você não possui nenhum produto no carrinho no momento. Para prosseguir para o pagamento, escolha seus produtos na loja.
                </p>
                <button
                  type="button"
                  onClick={onGoHome}
                  style={{
                    backgroundColor: '#090476',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '14px',
                    padding: '14px 28px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <ShoppingBag size={16} /> Ver Produtos na Loja
                </button>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 1: CONTACT & CEP                                        */}
            {/* ------------------------------------------------------------- */}
            {cartItems && cartItems.length > 0 && step === 1 && (
              <form noValidate onSubmit={handleContinueStep1}>
                {step1Error && (
                  <div style={{
                    backgroundColor: 'rgba(231, 76, 60, 0.12)',
                    border: '1px solid #e74c3c',
                    color: '#e74c3c',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertCircle size={18} /> {step1Error}
                  </div>
                )}

                {/* DADOS DE CONTATO */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>
                    DADOS DE CONTATO (ETAPA 1)
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* E-mail */}
                    <div style={{ position: 'relative' }}>
                      <input
                        type="email"
                        required
                        placeholder="E-mail principal"
                        value={email}
                        onChange={handleEmailChange}
                        onBlur={() => { if (validateEmail(email)) saveLeadData('etapa_1_contato'); }}
                        style={{
                          width: '100%',
                          backgroundColor: '#000000',
                          border: validateEmail(email) ? '1px solid #27ae60' : '1px solid #333333',
                          color: '#ffffff',
                          padding: '14px 16px',
                          fontSize: '14px',
                          borderRadius: '4px',
                          outline: 'none'
                        }}
                      />
                      {validateEmail(email) && (
                        <div style={{
                          position: 'absolute',
                          right: '14px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#27ae60',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Check size={12} />
                        </div>
                      )}
                    </div>

                    {/* Email Typo Auto-Suggestion */}
                    {emailSuggestion && (
                      <div style={{
                        padding: '8px 12px',
                        backgroundColor: 'rgba(52, 152, 219, 0.12)',
                        border: '1px solid rgba(52, 152, 219, 0.3)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#3498db'
                      }}>
                        Você quis dizer <strong style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => { setEmail(emailSuggestion); setEmailSuggestion(null); }}>{emailSuggestion}</strong>?
                      </div>
                    )}

                    {/* WhatsApp / Celular (Gravação imediata para Carrinho Abandonado) */}
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        required
                        placeholder="WhatsApp / Celular com DDD (ex: 34 99888-7777)"
                        value={phone}
                        onChange={handlePhoneChange}
                        onBlur={() => { if (validatePhone(phone)) saveLeadData('etapa_1_contato'); }}
                        maxLength={15}
                        style={{
                          width: '100%',
                          backgroundColor: '#000000',
                          border: validatePhone(phone) ? '1px solid #27ae60' : '1px solid #333333',
                          color: '#ffffff',
                          padding: '14px 16px',
                          fontSize: '14px',
                          borderRadius: '4px',
                          outline: 'none'
                        }}
                      />
                      {validatePhone(phone) && (
                        <div style={{
                          position: 'absolute',
                          right: '14px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#27ae60',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Check size={12} />
                        </div>
                      )}
                    </div>

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '12px',
                      color: '#aaaaaa',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={newsletter}
                        onChange={(e) => setNewsletter(e.target.checked)}
                        style={{ accentColor: '#090476' }}
                      />
                      Receber atualizações de pedido e ofertas exclusivas por WhatsApp/E-mail
                    </label>
                  </div>
                </div>

                {/* ENTREGA (CEP) */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>
                    ENTREGA
                  </h3>

                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      required
                      placeholder="CEP (ex: 22010-000)"
                      value={cep}
                      onChange={handleCepChange}
                      onBlur={() => { if (cep.replace(/\D/g, '').length === 8) saveLeadData('etapa_1_contato'); }}
                      maxLength={9}
                      style={{
                        width: '100%',
                        backgroundColor: '#000000',
                        border: cepError ? '1px solid #e74c3c' : addressData ? '1px solid #27ae60' : '1px solid #333333',
                        color: '#ffffff',
                        padding: '14px 16px',
                        fontSize: '14px',
                        borderRadius: '4px',
                        outline: 'none'
                      }}
                    />
                    {loadingCep && (
                      <span style={{ fontSize: '11px', color: '#3498db', marginTop: '6px', display: 'block' }}>
                        Buscando endereço na base dos Correios...
                      </span>
                    )}
                    {cepError && (
                      <span style={{ fontSize: '11px', color: '#e74c3c', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={14} /> {cepError}
                      </span>
                    )}
                  </div>
                </div>

                {/* CONTINUAR BUTTON */}
                <button
                  type="submit"
                  disabled={loadingCep}
                  onClick={handleContinueStep1}
                  style={{
                    width: '100%',
                    backgroundColor: loadingCep ? '#222222' : '#090476',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '14px',
                    padding: '16px 0',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: loadingCep ? 'wait' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: loadingCep ? 0.7 : 1
                  }}
                  onMouseOver={(e) => { if (!loadingCep) e.currentTarget.style.backgroundColor = '#0f4592'; }}
                  onMouseOut={(e) => { if (!loadingCep) e.currentTarget.style.backgroundColor = '#090476'; }}
                >
                  {loadingCep ? 'BUSCANDO ENDEREÇO DO CEP...' : 'Ir para Opções de Entrega & Destinatário'}
                </button>
              </form>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 2: SHIPPING OPTION & RECIPIENT                          */}
            {/* ------------------------------------------------------------- */}
            {cartItems && cartItems.length > 0 && step === 2 && (
              <form noValidate onSubmit={handleContinueStep2}>
                {/* DADOS DE CONTATO SUMMARY */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '12px', color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                    DADOS DE CONTATO (CAPTURADOS NA ETAPA 1)
                  </div>
                  <div style={{
                    position: 'relative',
                    backgroundColor: '#000000',
                    border: '1px solid #333333',
                    borderRadius: '4px',
                    padding: '14px 16px',
                    fontSize: '13px',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div><strong style={{ color: '#aaaaaa' }}>E-mail:</strong> {email}</div>
                      <div style={{ marginTop: '4px' }}><strong style={{ color: '#aaaaaa' }}>WhatsApp:</strong> {phone}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      style={{ background: 'none', border: 'none', color: '#3498db', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Alterar
                    </button>
                  </div>
                </div>

                {/* ENTREGA */}
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ fontSize: '12px', color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                    ENTREGA
                  </div>

                  {(shippingOptionsList.length > 0 ? shippingOptionsList : calculateShippingRates(addressData?.uf || 'SP', 300, cartItems).options).map((opt) => {
                    const isSelected = selectedShipping?.id === opt.id;

                    return (
                      <div
                        key={opt.id}
                        onClick={() => setSelectedShipping(opt)}
                        style={{
                          backgroundColor: '#0a0a0a',
                          border: isSelected ? '1px solid #ffffff' : '1px solid #222222',
                          borderRadius: '4px',
                          padding: '14px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          marginBottom: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            border: isSelected ? '5px solid #ffffff' : '2px solid #555',
                            backgroundColor: '#000',
                            flexShrink: 0
                          }} />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>
                              {opt.name}
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>
                          R$ {opt.price.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* DADOS PARA ENTREGA */}
                <div style={{ marginBottom: '28px' }}>
                  <h3 style={{ fontSize: '12px', color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
                    DADOS PARA ENTREGA
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Nome */}
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        required
                        placeholder="Nome"
                        value={firstName}
                        onChange={(e) => { setFirstName(e.target.value); setStep2Errors(prev => ({ ...prev, firstName: null })); }}
                        style={{
                          width: '100%',
                          backgroundColor: '#000000',
                          border: step2Errors.firstName ? '1px solid #e74c3c' : firstName.trim() ? '1px solid #27ae60' : '1px solid #333333',
                          color: '#ffffff',
                          padding: '14px 16px',
                          fontSize: '14px',
                          borderRadius: '4px',
                          outline: 'none'
                        }}
                      />
                      {firstName.trim().length > 0 && (
                        <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#27ae60', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={12} />
                        </div>
                      )}
                    </div>

                    {/* Sobrenome */}
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        required
                        placeholder="Sobrenome"
                        value={lastName}
                        onChange={(e) => { setLastName(e.target.value); setStep2Errors(prev => ({ ...prev, lastName: null })); }}
                        style={{
                          width: '100%',
                          backgroundColor: '#000000',
                          border: step2Errors.lastName ? '1px solid #e74c3c' : lastName.trim() ? '1px solid #27ae60' : '1px solid #333333',
                          color: '#ffffff',
                          padding: '14px 16px',
                          fontSize: '14px',
                          borderRadius: '4px',
                          outline: 'none'
                        }}
                      />
                      {lastName.trim().length > 0 && (
                        <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#27ae60', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={12} />
                        </div>
                      )}
                    </div>



                    {/* Auto-filled Address Card */}
                    <div style={{
                      backgroundColor: '#000000',
                      border: '1px solid #333333',
                      borderRadius: '4px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: 0 }}>
                        <MapPin size={18} color="#aaaaaa" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div style={{ fontSize: '13px', color: '#dddddd', lineHeight: 1.4, minWidth: 0, wordBreak: 'break-word' }}>
                          <div>{addressData ? addressData.logradouro : 'Avenida Atlântica'}</div>
                          <div style={{ fontWeight: '800', color: '#ffffff', wordBreak: 'break-word' }}>
                            CEP {cep} - {addressData ? addressData.bairro : 'Bairro'}
                          </div>
                          <div>{addressData ? `${addressData.localidade} - ${addressData.uf}` : 'Cidade - Estado'}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
                      >
                        Alterar
                      </button>
                    </div>

                    {/* Number & Complement row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          required={!noNumber}
                          disabled={noNumber}
                          placeholder="Número"
                          value={noNumber ? 'SN' : streetNumber}
                          onChange={(e) => setStreetNumber(e.target.value)}
                          style={{
                            width: '100%',
                            backgroundColor: noNumber ? '#141414' : '#000000',
                            border: '1px solid #333333',
                            color: '#ffffff',
                            padding: '14px 16px',
                            fontSize: '14px',
                            borderRadius: '4px',
                            outline: 'none'
                          }}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#aaaaaa', marginTop: '6px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={noNumber}
                            onChange={(e) => setNoNumber(e.target.checked)}
                            style={{ accentColor: '#090476' }}
                          />
                          Sem número
                        </label>
                      </div>

                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          placeholder="Apto, Bloco, Referência, etc. (opcional)"
                          value={complement}
                          onChange={(e) => setComplement(e.target.value)}
                          style={{
                            width: '100%',
                            backgroundColor: '#000000',
                            border: '1px solid #333333',
                            color: '#ffffff',
                            padding: '14px 16px',
                            fontSize: '14px',
                            borderRadius: '4px',
                            outline: 'none'
                          }}
                        />
                        {complement.trim().length > 0 && (
                          <div style={{ position: 'absolute', right: '14px', top: '16px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#27ae60', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={12} />
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* DADOS PARA NOTA FISCAL (WITH MÓDULO 11 REAL-TIME CPF/CNPJ VALIDATION) */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '12px', color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
                    DADOS PARA NOTA FISCAL
                  </h3>

                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <input
                      type="text"
                      required
                      placeholder="CPF ou CNPJ"
                      value={cpf}
                      onChange={handleCpfChange}
                      maxLength={18}
                      style={{
                        width: '100%',
                        backgroundColor: '#000000',
                        border: step2Errors.cpf ? '1px solid #e74c3c' : validateCpfOrCnpj(cpf) ? '1px solid #27ae60' : '1px solid #333333',
                        color: '#ffffff',
                        padding: '14px 16px',
                        fontSize: '14px',
                        borderRadius: '4px',
                        outline: 'none'
                      }}
                    />
                    {validateCpfOrCnpj(cpf) && (
                      <div style={{ position: 'absolute', right: '14px', top: '16px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#27ae60', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={12} />
                      </div>
                    )}
                    {step2Errors.cpf && (
                      <span style={{ fontSize: '11px', color: '#e74c3c', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={14} /> {step2Errors.cpf}
                      </span>
                    )}
                  </div>
                </div>

                {/* PAYMENT ERROR ALERT */}
                {paymentError && (
                  <div style={{
                    backgroundColor: 'rgba(231, 76, 60, 0.12)',
                    border: '1px solid #e74c3c',
                    color: '#e74c3c',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginTop: '16px'
                  }}>
                    <AlertCircle size={18} /> {paymentError}
                  </div>
                )}

                {/* PROSSEGUIR DIRETAMENTE PARA PAGAMENTO SEGURO INFINITEPAY */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    backgroundColor: isSubmitting ? '#14532d' : '#27ae60',
                    backgroundImage: isSubmitting ? 'none' : 'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '14px',
                    letterSpacing: '0.3px',
                    padding: '16px 0',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: isSubmitting ? 'wait' : 'pointer',
                    boxShadow: isSubmitting ? 'none' : '0 8px 24px rgba(39, 174, 96, 0.35)',
                    transition: 'all 0.2s ease',
                    marginTop: '20px',
                    opacity: isSubmitting ? 0.8 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseOver={(e) => { if (!isSubmitting) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                  onMouseOut={(e) => { if (!isSubmitting) e.currentTarget.style.filter = 'brightness(1)'; }}
                >
                  {isSubmitting ? (
                    <>
                      <span style={{
                        display: 'inline-block',
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTopColor: '#ffffff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      REDIRECIONANDO PARA INFINITEPAY...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} /> PROSSEGUIR PARA PAGAMENTO SEGURO
                    </>
                  )}
                </button>
              </form>
            )}

          </div>

          {/* ------------------------------------------------------------- */}
          {/* RIGHT COLUMN: ORDER SUMMARY SIDEBAR                            */}
          {/* ------------------------------------------------------------- */}
          <div style={{ gridColumn: 'span 12' }} className="checkout-summary-sidebar">
            <div style={{
              backgroundColor: '#000000',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '24px'
            }}>
              
              {/* Product items list */}
              <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {cartItems.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{
                        width: '64px',
                        height: '64px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        backgroundColor: '#111111'
                      }}
                    />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#ffffff',
                        lineHeight: 1.3,
                        textTransform: 'uppercase',
                        marginBottom: '4px'
                      }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#aaaaaa' }}>
                        ({item.selectedSize || 'Único'}) × {item.quantity}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      {item.oldPrice && (
                        <div style={{ fontSize: '10px', color: '#3498db', fontWeight: '700' }}>
                          -33% <span style={{ textDecoration: 'line-through', color: '#666666' }}>R${(item.oldPrice * item.quantity).toFixed(2).replace('.', ',')}</span>
                        </div>
                      )}
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>
                        R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cccccc' }}>
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>

                {appliedCoupon && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    border: '1px solid rgba(39, 174, 96, 0.3)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '12px'
                  }}>
                    <div>
                      <div style={{ color: '#27ae60', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Tag size={13} /> {appliedCoupon.code}
                      </div>
                      <div style={{ fontSize: '11px', color: '#aaaaaa' }}>
                        {appliedCoupon.type === 'percentage' && `${appliedCoupon.value}% de desconto`}
                        {appliedCoupon.type === 'fixed' && `R$ ${Number(appliedCoupon.value).toFixed(2).replace('.', ',')} de desconto`}
                        {appliedCoupon.type === 'free_shipping' && 'Frete Grátis'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#27ae60', fontWeight: '800' }}>
                        {appliedCoupon.type === 'free_shipping' ? 'GRÁTIS' : `- R$ ${couponDiscount.toFixed(2).replace('.', ',')}`}
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#e74c3c',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Remover cupom"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cccccc' }}>
                  <span>Custo de frete</span>
                  <span>
                    {appliedCoupon?.type === 'free_shipping' ? (
                      <span style={{ color: '#27ae60', fontWeight: '700' }}>Grátis (Cupom)</span>
                    ) : shippingCost > 0 ? (
                      `R$ ${shippingCost.toFixed(2).replace('.', ',')}`
                    ) : (
                      '--'
                    )}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  borderTop: '1px solid #222222',
                  paddingTop: '14px',
                  marginTop: '6px'
                }}>
                  <span style={{ fontSize: '16px', fontWeight: '900', color: '#ffffff' }}>Total</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: '#ffffff' }}>
                      R$ {grandTotal.toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Coupon link/form toggle */}
              <div>
                {!showCouponInput && !appliedCoupon ? (
                  <button
                    type="button"
                    onClick={() => setShowCouponInput(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '12px',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      display: 'block',
                      width: '100%',
                      textAlign: 'center',
                      marginTop: '10px'
                    }}
                  >
                    Adicionar cupom de desconto
                  </button>
                ) : !appliedCoupon ? (
                  <form onSubmit={handleApplyCoupon} style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Código do cupom"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        style={{
                          flex: 1,
                          backgroundColor: '#0a0a0a',
                          border: '1px solid #333333',
                          color: '#ffffff',
                          padding: '10px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          outline: 'none',
                          textTransform: 'uppercase',
                          fontWeight: '700'
                        }}
                      />
                      <button
                        type="submit"
                        disabled={loadingCoupon}
                        style={{
                          backgroundColor: '#090476',
                          color: '#ffffff',
                          fontWeight: '800',
                          fontSize: '11px',
                          padding: '0 14px',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: loadingCoupon ? 'wait' : 'pointer'
                        }}
                      >
                        {loadingCoupon ? '...' : 'APLICAR'}
                      </button>
                    </div>
                    {couponError && <span style={{ fontSize: '11px', color: '#e74c3c', marginTop: '6px', display: 'block' }}>{couponError}</span>}
                  </form>
                ) : null}
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Responsive layout styles matching screenshots */}
      <style>{`
        @media (min-width: 850px) {
          .checkout-main-form {
            grid-column: span 7 !important;
          }
          .checkout-summary-sidebar {
            grid-column: span 5 !important;
          }
        }
        @media (max-width: 849px) {
          .checkout-container-wrapper {
            padding: 0 16px !important;
            max-width: 520px !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
            width: 100% !important;
          }
          .checkout-grid-layout {
            display: flex !important;
            flex-direction: column !important;
            gap: 24px !important;
            width: 100% !important;
          }
          .checkout-main-form,
          .checkout-summary-sidebar {
            width: 100% !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>
    </div>
  );
}
