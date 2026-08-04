import React, { useState, useEffect } from 'react';
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
  AlertCircle
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
  const clean = val.replace(/\D/g, '');
  if (clean.length === 11) return validateCPF(clean);
  if (clean.length === 14) return validateCNPJ(clean);
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
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [cardData, setCardData] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
    installments: '1'
  });

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

  // Fetch Address from ViaCEP
  const fetchAddressFromViaCep = async (cleanCep) => {
    setLoadingCep(true);
    setCepError('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError('CEP inexistente na base dos Correios. Verifique o número digitado.');
      } else {
        setAddressData(data);
        const isSP = data.uf === 'SP';
        setSelectedShipping({
          id: 'sedex',
          name: 'Correios SEDEX',
          price: isSP ? 18.90 : 24.90,
          days: isSP ? 'Chega em 1 a 2 dias úteis' : 'Chega em 3 a 5 dias úteis'
        });
      }
    } catch (err) {
      setCepError('Erro ao consultar CEP. Tente novamente.');
    } finally {
      setLoadingCep(false);
    }
  };

  // Step 1 Validation & Continue
  const handleContinueStep1 = (e) => {
    e.preventDefault();
    setStep1Error('');

    if (!validateEmail(email)) {
      setStep1Error('Por favor informe um e-mail válido.');
      return;
    }

    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setStep1Error('Por favor informe um CEP válido com 8 dígitos.');
      return;
    }

    if (cepError) {
      setStep1Error('Por favor corrija o CEP antes de prosseguir.');
      return;
    }

    if (!addressData) {
      fetchAddressFromViaCep(cleanCep);
    }

    setStep(2);
  };

  // Step 2 Validation & Continue (Strict Validations)
  const handleContinueStep2 = (e) => {
    e.preventDefault();
    const errors = {};

    if (!firstName.trim()) {
      errors.firstName = 'Informe seu nome.';
    }
    if (!lastName.trim()) {
      errors.lastName = 'Informe seu sobrenome.';
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!validatePhone(phone)) {
      if (cleanPhone.length >= 3 && cleanPhone.charAt(2) !== '9') {
        errors.phone = 'O celular deve obrigatoriamente começar com o dígito 9 após o DDD (ex: (34) 98888-7777).';
      } else {
        errors.phone = 'Telefone celular inválido. Digite um DDD válido + 9 dígitos (ex: (11) 98888-7777).';
      }
    }

    if (!noNumber && !streetNumber.trim()) {
      errors.streetNumber = 'Informe o número do endereço ou marque "Sem número".';
    }

    if (!cpf.trim()) {
      errors.cpf = 'Informe seu CPF ou CNPJ.';
    } else if (!validateCpfOrCnpj(cpf)) {
      errors.cpf = 'CPF/CNPJ inválido ou inexistente. Verifique os dígitos digitados.';
    }

    setStep2Errors(errors);

    if (Object.keys(errors).length === 0) {
      setStep(3);
    }
  };

  // Step 3 Submit Order Placement
  const handlePlaceOrder = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsCompleted(true);
      if (onClearCart) onClearCart();
    }, 1500);
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
              <form onSubmit={handleContinueStep1}>
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
                    DADOS DE CONTATO
                  </h3>

                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      required
                      placeholder="E-mail"
                      value={email}
                      onChange={handleEmailChange}
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
                      marginTop: '8px',
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

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginTop: '12px',
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
                    Receber ofertas e novidades por e-mail
                  </label>
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
                  style={{
                    width: '100%',
                    backgroundColor: '#090476',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '14px',
                    padding: '16px 0',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0f4592'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#090476'}
                >
                  Continuar
                </button>
              </form>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 2: SHIPPING OPTION & RECIPIENT                          */}
            {/* ------------------------------------------------------------- */}
            {step === 2 && (
              <form onSubmit={handleContinueStep2}>
                {/* DADOS DE CONTATO SUMMARY */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '12px', color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                    DADOS DE CONTATO
                  </div>
                  <div style={{
                    position: 'relative',
                    backgroundColor: '#000000',
                    border: '1px solid #333333',
                    borderRadius: '4px',
                    padding: '14px 16px',
                    fontSize: '14px',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span>{email}</span>
                    <div style={{
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
                  </div>
                </div>

                {/* ENTREGA - SHIPPING OPTIONS */}
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ fontSize: '12px', color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                    ENTREGA
                  </div>

                  {/* SEDEX Option */}
                  <div
                    onClick={() => setSelectedShipping({
                      id: 'sedex',
                      name: 'Correios SEDEX',
                      price: 24.90,
                      days: 'Chega entre quinta-feira e sexta-feira'
                    })}
                    style={{
                      backgroundColor: '#0a0a0a',
                      border: selectedShipping.id === 'sedex' ? '1px solid #ffffff' : '1px solid #222222',
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
                        border: selectedShipping.id === 'sedex' ? '5px solid #ffffff' : '2px solid #555',
                        backgroundColor: '#000'
                      }} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>
                          Correios SEDEX
                        </div>
                        <div style={{ fontSize: '11px', color: '#aaaaaa', marginTop: '2px' }}>
                          Chega rápido no seu endereço
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>
                      R$ 24,90
                    </span>
                  </div>

                  {/* Collapsible More Options */}
                  {showMoreShipping && (
                    <div
                      onClick={() => setSelectedShipping({
                        id: 'pac',
                        name: 'Correios PAC (Econômico)',
                        price: 14.90,
                        days: 'Chega em 4 a 6 dias úteis'
                      })}
                      style={{
                        backgroundColor: '#0a0a0a',
                        border: selectedShipping.id === 'pac' ? '1px solid #ffffff' : '1px solid #222222',
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
                          border: selectedShipping.id === 'pac' ? '5px solid #ffffff' : '2px solid #555',
                          backgroundColor: '#000'
                        }} />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>
                            Correios PAC (Econômico)
                          </div>
                          <div style={{ fontSize: '11px', color: '#aaaaaa', marginTop: '2px' }}>
                            Chega em 4 a 6 dias úteis
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>
                        R$ 14,90
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowMoreShipping(!showMoreShipping)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginTop: '4px'
                    }}
                  >
                    Mais opções {showMoreShipping ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
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

                    {/* Telefone com DDD */}
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        required
                        placeholder="Telefone celular com DDD (ex: 34 98888-7777)"
                        value={phone}
                        onChange={handlePhoneChange}
                        maxLength={15}
                        style={{
                          width: '100%',
                          backgroundColor: '#000000',
                          border: step2Errors.phone ? '1px solid #e74c3c' : validatePhone(phone) ? '1px solid #27ae60' : '1px solid #333333',
                          color: '#ffffff',
                          padding: '14px 16px',
                          fontSize: '14px',
                          borderRadius: '4px',
                          outline: 'none'
                        }}
                      />
                      {validatePhone(phone) && (
                        <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#27ae60', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={12} />
                        </div>
                      )}
                      {step2Errors.phone && (
                        <span style={{ fontSize: '11px', color: '#e74c3c', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={14} /> {step2Errors.phone}
                        </span>
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

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#aaaaaa', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={sameAsDelivery}
                      onChange={(e) => setSameAsDelivery(e.target.checked)}
                      style={{ accentColor: '#090476' }}
                    />
                    Usar as mesmas informações da entrega
                  </label>
                </div>

                {/* CONTINUAR PARA PAGAMENTO BUTTON */}
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    backgroundColor: '#090476',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '14px',
                    padding: '16px 0',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0f4592'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#090476'}
                >
                  Continuar para pagamento
                </button>
              </form>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 3: PAYMENT SELECTION                                     */}
            {/* ------------------------------------------------------------- */}
            {step === 3 && (
              <form onSubmit={handlePlaceOrder}>
                {/* SUMMARY ROWS FROM PREVIOUS STEPS */}
                <div style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  
                  {/* Email summary */}
                  <div style={{
                    backgroundColor: '#000000',
                    borderBottom: '1px solid #1c1c1c',
                    paddingBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#dddddd', flex: 1, minWidth: 0, wordBreak: 'break-all' }}>
                      <span style={{ flexShrink: 0 }}>✉</span> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</span>
                    </div>
                  </div>

                  {/* Address summary */}
                  <div style={{
                    backgroundColor: '#000000',
                    borderBottom: '1px solid #1c1c1c',
                    paddingBottom: '12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', gap: '10px', color: '#dddddd', flex: 1, minWidth: 0 }}>
                      <MapPin size={16} color="#888888" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                        <div style={{ color: '#ffffff', fontWeight: '600' }}>{addressData ? addressData.logradouro : ''} {noNumber ? 'SN' : streetNumber} {complement && `- ${complement}`}</div>
                        <div style={{ fontSize: '11px', color: '#aaaaaa', marginTop: '2px', wordBreak: 'break-word' }}>
                          CEP {cep} - {addressData ? `${addressData.bairro}, ${addressData.localidade}/${addressData.uf}` : ''} - {phone}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
                    >
                      Alterar
                    </button>
                  </div>

                  {/* Shipping summary */}
                  <div style={{
                    backgroundColor: '#000000',
                    borderBottom: '1px solid #1c1c1c',
                    paddingBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#dddddd', flex: 1, minWidth: 0 }}>
                      <Truck size={16} color="#888888" style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                        <strong>{selectedShipping.name}</strong> · R$ {selectedShipping.price.toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
                    >
                      Alterar
                    </button>
                  </div>

                  {/* Additional comments */}
                  <div style={{
                    backgroundColor: '#000000',
                    borderBottom: '1px solid #1c1c1c',
                    paddingBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    gap: '12px'
                  }}>
                    <span style={{ color: '#dddddd', flex: 1, minWidth: 0 }}>💬 Comentários adicionais</span>
                    <button
                      type="button"
                      onClick={() => setShowCommentsInput(!showCommentsInput)}
                      style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
                    >
                      Adicionar
                    </button>
                  </div>
                  {showCommentsInput && (
                    <textarea
                      placeholder="Alguma observação sobre seu pedido? (opcional)"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={3}
                      style={{
                        width: '100%',
                        backgroundColor: '#0c0c0c',
                        border: '1px solid #333333',
                        color: '#ffffff',
                        padding: '10px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        outline: 'none'
                      }}
                    />
                  )}
                </div>

                {/* FORMA DE PAGAMENTO */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '12px', color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>
                    FORMA DE PAGAMENTO
                  </h3>

                  {/* Credit Card Button */}
                  <div
                    onClick={() => setPaymentMethod('card')}
                    style={{
                      backgroundColor: '#0a0a0a',
                      border: paymentMethod === 'card' ? '1px solid #ffffff' : '1px solid #222222',
                      borderRadius: '6px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      marginBottom: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <CreditCard size={20} color="#ffffff" />
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>
                        Cartão de crédito
                      </span>
                    </div>
                    <span>›</span>
                  </div>

                  {/* Card Expanded Input Form */}
                  {paymentMethod === 'card' && (
                    <div style={{
                      backgroundColor: '#080808',
                      border: '1px solid #222222',
                      borderRadius: '6px',
                      padding: '18px',
                      marginBottom: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      boxSizing: 'border-box',
                      width: '100%'
                    }}>
                      <input
                        type="text"
                        placeholder="Número do Cartão"
                        value={cardData.number}
                        onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                        style={{ backgroundColor: '#000', border: '1px solid #333', color: '#fff', padding: '12px', borderRadius: '4px', fontSize: '13px', width: '100%', boxSizing: 'border-box', outline: 'none' }}
                      />
                      <input
                        type="text"
                        placeholder="Nome impresso no Cartão"
                        value={cardData.name}
                        onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                        style={{ backgroundColor: '#000', border: '1px solid #333', color: '#fff', padding: '12px', borderRadius: '4px', fontSize: '13px', width: '100%', boxSizing: 'border-box', outline: 'none' }}
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                        <input
                          type="text"
                          placeholder="Validade (MM/AA)"
                          value={cardData.expiry}
                          onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                          style={{ backgroundColor: '#000', border: '1px solid #333', color: '#fff', padding: '12px', borderRadius: '4px', fontSize: '13px', width: '100%', minWidth: 0, boxSizing: 'border-box', outline: 'none' }}
                        />
                        <input
                          type="text"
                          placeholder="CVV"
                          value={cardData.cvv}
                          onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                          style={{ backgroundColor: '#000', border: '1px solid #333', color: '#fff', padding: '12px', borderRadius: '4px', fontSize: '13px', width: '100%', minWidth: 0, boxSizing: 'border-box', outline: 'none' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Pix Button */}
                  <div
                    onClick={() => setPaymentMethod('pix')}
                    style={{
                      backgroundColor: '#0a0a0a',
                      border: paymentMethod === 'pix' ? '1px solid #ffffff' : '1px solid #222222',
                      borderRadius: '6px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <QrCode size={20} color="#ffffff" />
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>
                        Pix
                      </span>
                    </div>
                    <span>›</span>
                  </div>

                </div>

                {/* FAZER PEDIDO BUTTON */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    backgroundColor: '#090476',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '14px',
                    padding: '16px 0',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0f4592'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#090476'}
                >
                  {isSubmitting ? 'Processando pedido...' : 'Fazer pedido'}
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
