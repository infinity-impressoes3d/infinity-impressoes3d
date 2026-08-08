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

  // Mercado Pago Credentials loaded from Supabase store_settings
  const [mercadoPagoPublicKey, setMercadoPagoPublicKey] = useState('');
  const [mercadoPagoAccessToken, setMercadoPagoAccessToken] = useState('');

  useEffect(() => {
    async function loadPaymentSettings() {
      try {
        let pubKey = '';
        let token = '';

        const { data } = await supabase
          .from('store_settings')
          .select('mercadopago_public_key, mercadopago_access_token, mercadopago_access_token_encrypted')
          .single();
        if (data) {
          if (data.mercadopago_public_key) pubKey = data.mercadopago_public_key;
          token = data.mercadopago_access_token || data.mercadopago_access_token_encrypted || '';
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
        console.log('Busca de credenciais do Mercado Pago concluída.');
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
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Coupon Discount
  const couponDiscount = appliedCoupon ? subtotal * (appliedCoupon.discountPercent / 100) : 0;

  // Shipping Cost
  const shippingCost = selectedShipping ? selectedShipping.price : 0;

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
    setStep1Error('');

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

  // Fetch Address from ViaCEP and calculate rate by Weight + Distance (UF)
  const fetchAddressFromViaCep = async (cleanCep) => {
    setLoadingCep(true);
    setCepError('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError('CEP inexistente na base dos Correios. Verifique o número digitado.');
        return null;
      } else {
        setAddressData(data);
        const calculation = calculateShippingRates(data.uf, 300, cartItems);
        setShippingOptionsList(calculation.options);
        setShippingDetailsInfo(calculation);
        if (calculation.options.length > 0) {
          setSelectedShipping(calculation.options[0]);
        }
        return data;
      }
    } catch (err) {
      setCepError('Erro ao consultar CEP. Tente novamente.');
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
  // Generate valid RFC4122 v4 UUID
  const generateValidUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      try {
        return crypto.randomUUID();
      } catch (e) {}
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const activeOrderIdRef = useRef(generateValidUUID());

  // Save Lead Helper Function (Triggers on Step 1, Step 2, and Order Place)
  const saveLeadData = (stage = 'etapa_1_contato', customStatus = null) => {
    if (!email.trim() && !phone.trim()) return null;

    if (!activeOrderIdRef.current || !activeOrderIdRef.current.includes('-')) {
      activeOrderIdRef.current = generateValidUUID();
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const customerName = fullName || (email.trim() ? email.trim().split('@')[0] : '') || phone.trim() || 'Cliente em Checkout';
    const customerEmail = email.trim() || 'sem-email@cliente.com';

    const itemsSummary = cartItems.map(item => `${item.title || item.name} (${item.selectedSize}) x${item.quantity}`).join(' | ');
    const addressStr = addressData ? `${addressData.logradouro || ''}, ${addressData.bairro || ''} - ${addressData.localidade || ''}/${addressData.uf || ''}` : '';
    
    let status = customStatus;
    if (!status) {
      if (stage === 'etapa_1_contato') status = 'CARRINHO ABANDONADO (Etapa 1 - Contato)';
      else if (stage === 'etapa_2_entrega') status = 'CARRINHO ABANDONADO (Etapa 2 - Endereço)';
      else if (stage === 'pedido_concluido') status = 'PEDIDO CONCLUÍDO';
    }

    const leadPayload = {
      id: activeOrderIdRef.current,
      timestamp: new Date().toISOString(),
      dataHora: new Date().toLocaleString('pt-BR'),
      etapa: stage,
      status: status,
      email: customerEmail,
      whatsapp: phone.trim(),
      nome: customerName,
      cpf: cpf.trim(),
      cep: cep.trim(),
      endereco: addressStr,
      numero: streetNumber.trim(),
      complemento: complement.trim(),
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
      console.error('Erro ao salvar lead:', e);
    }

    // Send/Update Supabase Orders Table (Checkouts & Abandoned Checkouts)
    try {
      const orderRecord = {
        id: activeOrderIdRef.current,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: phone.trim() || null,
        customer_cpf: cpf.trim() || null,
        shipping_address: {
          cep: cep.trim(),
          street: addressData ? (addressData.logradouro || '') : '',
          number: streetNumber.trim() || (noNumber ? 'S/N' : ''),
          complement: complement.trim() || '',
          neighborhood: addressData ? (addressData.bairro || '') : '',
          city: addressData ? (addressData.localidade || '') : '',
          state: addressData ? (addressData.uf || '') : ''
        },
        shipping_method: selectedShipping ? selectedShipping.name : 'Correios SEDEX',
        shipping_cost: shippingCost || 0,
        items: cartItems.map(i => ({
          name: i.title || i.name,
          price: i.price,
          quantity: i.quantity,
          size: i.selectedSize || 'Único',
          image: i.image || (i.images && i.images[0]) || ''
        })),
        total_amount: grandTotal || 0,
        payment_method: paymentMethod || 'pix',
        status: stage === 'pedido_concluido' ? 'paid' : 'abandoned',
        comments: comments ? comments.trim() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      supabase
        .from('orders')
        .upsert([orderRecord], { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.error('Erro ao registrar/atualizar checkout no Supabase:', error.message);
          else console.log('✅ Checkout gravado/atualizado no Supabase (ID:', activeOrderIdRef.current, ')');
        });
    } catch (err) {
      console.error('Erro de integração Supabase:', err);
    }

    setLeadNotice(`⚡ Lead capturado com sucesso! (Etapa ${stage === 'etapa_1_contato' ? '1: Contato & WhatsApp' : stage === 'etapa_2_entrega' ? '2: Endereço' : '3: Concluído'})`);
    setTimeout(() => setLeadNotice(null), 4000);

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
    // Mantém o MESMO ID para a mesma compra (1 única linha que vai se atualizando)
    if (!activeOrderIdRef.current) {
      activeOrderIdRef.current = generateValidUUID();
    }

    try {
      saveLeadData('etapa_1_contato', 'CARRINHO ABANDONADO (Etapa 1 - E-mail & WhatsApp Capturados)');
    } catch (err) {
      console.error('Erro ao salvar lead:', err);
    }

    setStep(2);
  };

  // Step 2 Validation & Direct Order Placement (No separate payment step)
  const handleContinueStep2 = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const errors = {};

    if (!firstName.trim()) {
      errors.firstName = 'Informe seu nome para a entrega.';
    }
    if (!lastName.trim()) {
      errors.lastName = 'Informe seu sobrenome para a entrega.';
    }

    if (!noNumber && !streetNumber.trim()) {
      errors.streetNumber = 'Informe o número do endereço ou marque "Sem número".';
    }

    if (!cpf.trim()) {
      errors.cpf = 'Informe seu CPF ou CNPJ para emissão da nota fiscal.';
    } else if (!validateCpfOrCnpj(cpf)) {
      errors.cpf = 'CPF/CNPJ deve conter 11 dígitos (CPF) ou 14 dígitos (CNPJ).';
    }

    setStep2Errors(errors);

    if (Object.keys(errors).length === 0) {
      try {
        saveLeadData('etapa_2_entrega', 'ENTREGA & DESTINATÁRIO');
      } catch (err) {
        console.error('Erro ao salvar lead:', err);
      }
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Step 3 Submit Order Placement (InfinitePay Integration com Preço 100% Travado e Bloqueado)
  const handlePlaceOrder = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setPaymentError('');
    setIsSubmitting(true);

    try {
      saveLeadData('pedido_concluido', 'PEDIDO CONCLUÍDO');

      const apiItems = cartItems.map(i => ({
        quantity: Number(i.quantity) || 1,
        price: Math.round(Number(i.price) * 100),
        description: String(i.title || i.name || 'Produto Impressão 3D').substring(0, 60)
      }));

      if (shippingCost > 0) {
        apiItems.push({
          quantity: 1,
          price: Math.round(Number(shippingCost) * 100),
          description: `Frete (${selectedShipping ? selectedShipping.name : 'Envio'})`
        });
      }

      // 1. Gera o Checkout Oficial da InfinitePay com preço FIXO, TRAVADO e BLOQUEADO ao cliente
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fldwlpktqjmqimpfaviw.supabase.co';
      const cleanPhone = phone.replace(/\D/g, '');
      const formattedPhone = cleanPhone ? `+55${cleanPhone}` : '+5511999999999';
      const customerFullName = `${firstName.trim()} ${lastName.trim()}`.trim() || 'Cliente Infinity 3D';

      const apiRes = await fetch('https://api.checkout.infinitepay.io/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: 'lays-moreira-rodrigues',
          redirect_url: `${window.location.origin}/#/sucesso`,
          webhook_url: `${supabaseUrl}/functions/v1/infinitepay-webhook?secret=infinity_3d_secret_token_2026`,
          order_nsu: activeOrderIdRef.current || `ord_${Date.now()}`,
          customer: {
            name: customerFullName,
            email: email.trim() || 'cliente@email.com',
            phone_number: formattedPhone
          },
          items: apiItems
        })
      });

      if (apiRes.ok) {
        const apiData = await apiRes.json();
        const checkoutUrl = apiData.url || apiData.checkout_url;
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
          return;
        }
      }

      // 2. Se a API retornar erro de validação, tenta via Edge Function do Supabase
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fldwlpktqjmqimpfaviw.supabase.co';
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
          orderId: activeOrderIdRef.current,
          redirectUrl: `${window.location.origin}/#/sucesso`
        })
      });

      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (fallbackData.checkoutUrl) {
          window.location.href = fallbackData.checkoutUrl;
          return;
        }
      }

      setPaymentError('Não foi possível gerar a cobrança travada da InfinitePay. Verifique sua conexão e tente novamente.');
      setIsSubmitting(false);
    } catch (err) {
      console.error('Erro ao gerar pagamento travado da InfinitePay:', err);
      setPaymentError('Erro de comunicação com a InfinitePay. Por favor, tente novamente.');
      setIsSubmitting(false);
    }
  };


  // Apply Coupon
  const handleApplyCoupon = (e) => {
    e.preventDefault();
    setCouponError('');
    const code = couponCode.trim().toUpperCase();
    if (code === 'INFINITY10') {
      setAppliedCoupon({ code: 'INFINITY10', discountPercent: 10 });
      setCouponCode('');
    } else if (code === 'PROMO15') {
      setAppliedCoupon({ code: 'PROMO15', discountPercent: 15 });
      setCouponCode('');
    } else {
      setCouponError('Cupom inválido ou expirado.');
    }
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
        
        {/* TOP STEPPER HEADER (Matching Screenshots 1-4) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '36px',
          position: 'relative',
          width: '100%',
          maxWidth: '480px',
          margin: '0 auto 36px auto',
          padding: '0 8px',
          boxSizing: 'border-box'
        }}>
          {/* Stepper Progress Line */}
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '32px',
            right: '32px',
            height: '2px',
            backgroundColor: '#222222',
            zIndex: 1
          }}>
            <div style={{
              width: step === 1 ? '0%' : step === 2 ? '50%' : '100%',
              height: '100%',
              backgroundColor: '#ffffff',
              transition: 'width 0.3s ease'
            }} />
          </div>

          {/* Step 1: Carrinho */}
          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', flex: 1 }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: step >= 1 ? '#000000' : '#111111',
              border: step >= 1 ? '2px solid #ffffff' : '2px solid #333333',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px auto',
              fontSize: '12px',
              fontWeight: '800'
            }}>
              <Check size={16} />
            </div>
            <span style={{ fontSize: '12px', color: step >= 1 ? '#ffffff' : '#666666', fontWeight: step >= 1 ? '700' : '400' }}>
              Carrinho
            </span>
          </div>

          {/* Step 2: Entrega */}
          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', flex: 1 }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: step >= 2 ? '#000000' : '#111111',
              border: step >= 2 ? '2px solid #ffffff' : '2px solid #333333',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px auto',
              fontSize: '12px',
              fontWeight: '800'
            }}>
              {step > 2 ? <Check size={16} /> : <Truck size={16} />}
            </div>
            <span style={{ fontSize: '12px', color: step >= 2 ? '#ffffff' : '#666666', fontWeight: step >= 2 ? '700' : '400' }}>
              Entrega
            </span>
          </div>

          {/* Step 3: Pagamento */}
          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', flex: 1 }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: step === 3 ? '#000000' : '#111111',
              border: step === 3 ? '2px solid #ffffff' : '2px solid #333333',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px auto',
              fontSize: '12px',
              fontWeight: '800'
            }}>
              <CreditCard size={16} />
            </div>
            <span style={{ fontSize: '12px', color: step === 3 ? '#ffffff' : '#666666', fontWeight: step === 3 ? '700' : '400' }}>
              Pagamento
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
            
            {/* ------------------------------------------------------------- */}
            {/* STEP 1: CONTACT & CEP                                        */}
            {/* ------------------------------------------------------------- */}
            {step === 1 && (
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
            {step === 2 && (
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

                {/* CONCLUIR PEDIDO BUTTON */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  onClick={handleContinueStep2}
                  style={{
                    width: '100%',
                    backgroundColor: isSubmitting ? '#222222' : '#090476',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '14px',
                    padding: '16px 0',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: isSubmitting ? 'wait' : 'pointer',
                    transition: 'background-color 0.2s',
                    marginTop: '20px',
                    opacity: isSubmitting ? 0.7 : 1
                  }}
                  onMouseOver={(e) => { if (!isSubmitting) e.currentTarget.style.backgroundColor = '#0f4592'; }}
                  onMouseOut={(e) => { if (!isSubmitting) e.currentTarget.style.backgroundColor = '#090476'; }}
                >
                  {isSubmitting ? 'IR PARA PAGAMENTO...' : 'Ir para Pagamento (Etapa 3)'}
                </button>
              </form>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 3: PAYMENT METHOD (CARD MODAL & PIX)                    */}
            {/* ------------------------------------------------------------- */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* RECAP OF STEP 1 & STEP 2 */}
                <div style={{
                  backgroundColor: '#0a0a0c',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  fontSize: '13px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ color: '#888888', fontWeight: '600' }}>Contato: </span>
                      <span style={{ color: '#ffffff', fontWeight: '700' }}>{email}</span> • <span style={{ color: '#ffffff' }}>{phone}</span>
                    </div>
                    <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#3498db', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>
                      Alterar
                    </button>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ color: '#888888', fontWeight: '600' }}>Enviar para: </span>
                      <span style={{ color: '#ffffff', fontWeight: '700' }}>{firstName} {lastName}</span>, {addressData ? `${addressData.logradouro}, ${streetNumber} - ${addressData.bairro}, ${addressData.localidade}/${addressData.uf}` : `CEP ${cep}`}
                    </div>
                    <button type="button" onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: '#3498db', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>
                      Alterar
                    </button>
                  </div>
                </div>

                {/* INFINITE PAY CHECKOUT BLOCK */}
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>
                    PAGAMENTO SEGURO
                  </h3>

                  {paymentError && (
                    <div style={{
                      backgroundColor: 'rgba(231, 76, 60, 0.12)',
                      border: '1px solid #e74c3c',
                      color: '#e74c3c',
                      padding: '14px 16px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '18px'
                    }}>
                      <AlertCircle size={18} /> {paymentError}
                    </div>
                  )}

                  <form noValidate onSubmit={handlePlaceOrder}>
                    <div style={{
                      backgroundColor: '#09090d',
                      border: '1px solid rgba(39, 174, 96, 0.3)',
                      borderRadius: '16px',
                      padding: '24px',
                      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                        <div style={{
                          padding: '12px',
                          backgroundColor: 'rgba(39, 174, 96, 0.15)',
                          border: '1px solid #27ae60',
                          borderRadius: '12px',
                          color: '#27ae60'
                        }}>
                          <ShieldCheck size={28} />
                        </div>
                        <div>
                          <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                            Checkout Seguro InfinitePay
                          </h2>
                          <p style={{ fontSize: '12px', color: '#27ae60', fontWeight: '700', margin: '2px 0 0 0' }}>
                            PIX Instantâneo ou Cartão em até 12x
                          </p>
                        </div>
                      </div>

                      <p style={{ fontSize: '13px', color: '#aaaaaa', lineHeight: 1.5, marginBottom: '24px' }}>
                        Ao clicar no botão abaixo, você será redirecionado para a tela oficial e criptografada da <strong>InfinitePay</strong> para concluir seu pagamento com total segurança por <strong>PIX</strong> ou <strong>Cartão de Crédito</strong>.
                      </p>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          backgroundColor: '#27ae60',
                          backgroundImage: 'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)',
                          color: '#ffffff',
                          fontWeight: '800',
                          fontSize: '15px',
                          letterSpacing: '0.3px',
                          padding: '16px 0',
                          borderRadius: '12px',
                          border: 'none',
                          cursor: isSubmitting ? 'wait' : 'pointer',
                          boxShadow: '0 8px 24px rgba(39, 174, 96, 0.4)',
                          transition: 'all 0.2s ease',
                          opacity: isSubmitting ? 0.7 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                        onMouseOver={(e) => { if (!isSubmitting) e.currentTarget.style.filter = 'brightness(1.15)'; }}
                        onMouseOut={(e) => { if (!isSubmitting) e.currentTarget.style.filter = 'brightness(1)'; }}
                      >
                        {isSubmitting ? 'REDIRECIONANDO PARA INFINITEPAY...' : 'Ir para Pagamento Seguro (InfinitePay)'}
                      </button>
                    </div>
                  </form>
                </div>

              </div>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#3498db', fontWeight: '700' }}>
                    <span>Desconto Cupom ({appliedCoupon.discountPercent}%):</span>
                    <span>- R$ {couponDiscount.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cccccc' }}>
                  <span>Custo de frete</span>
                  <span>
                    {shippingCost > 0 ? `R$ ${shippingCost.toFixed(2).replace('.', ',')}` : '--'}
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
                {!showCouponInput ? (
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
                ) : (
                  <form onSubmit={handleApplyCoupon} style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Cupom (ex: INFINITY10)"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        style={{
                          flex: 1,
                          backgroundColor: '#0a0a0a',
                          border: '1px solid #333333',
                          color: '#ffffff',
                          padding: '10px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="submit"
                        style={{
                          backgroundColor: '#090476',
                          color: '#ffffff',
                          fontWeight: '800',
                          fontSize: '11px',
                          padding: '0 14px',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        APLICAR
                      </button>
                    </div>
                    {couponError && <span style={{ fontSize: '11px', color: '#e74c3c', marginTop: '4px', display: 'block' }}>{couponError}</span>}
                  </form>
                )}
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
