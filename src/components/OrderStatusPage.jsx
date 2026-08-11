import React, { useState, useEffect } from 'react';
import { Search, Package, Printer, Truck, CheckCircle2, AlertCircle, ArrowLeft, LogOut, Clock, ShieldCheck, XCircle, AlertTriangle, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const SESSION_KEY = 'infinity_order_tracking_session';
const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hora de retenção na memória local do navegador

export default function OrderStatusPage({ onGoHome }) {
  const [emailInput, setEmailInput] = useState('');
  const [cpfInput, setCpfInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ordersFound, setOrdersFound] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeSession, setActiveSession] = useState(null);

  // Auto-login se houver sessão recente no localStorage (menos de 1 hora)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.expiresAt && Date.now() < parsed.expiresAt) {
          setEmailInput(parsed.email || '');
          setCpfInput(parsed.cpf || '');
          setActiveSession(parsed);
          executeSearch(parsed.email, parsed.cpf);
        } else {
          // Sessão expirada (> 1h) - remove da memória
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch (e) {
      console.error('Erro ao ler sessão de consulta:', e);
    }
  }, []);

  const isPaidOrder = (status) => {
    if (!status) return false;
    const s = String(status).trim().toLowerCase();
    return [
      'paid', 
      'shipped', 
      'approved', 
      'completed', 
      'succeeded', 
      'pago', 
      'entregue', 
      'aprovado',
      'pedido_concluido',
      'pedido concluído',
      'pedido concluido',
      'concluido',
      'concluído',
      'finalizado'
    ].includes(s);
  };

  // Escuta alterações no Supabase Realtime para atualizar instantaneamente se o Admin trocar o status no painel
  useEffect(() => {
    if (!emailInput || !cpfInput) return;

    let channel;
    try {
      channel = supabase
        .channel('client-order-status-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
          if (payload.new && payload.new.id) {
            const updated = payload.new;
            const dbCpfDigits = String(updated.customer_cpf || '').replace(/\D/g, '');
            const dbEmail = String(updated.customer_email || '').trim().toLowerCase();
            const cleanCpfDigits = String(cpfInput || '').replace(/\D/g, '');
            const cleanEmail = String(emailInput || '').trim().toLowerCase();

            if (dbCpfDigits === cleanCpfDigits && dbEmail === cleanEmail) {
              if (isPaidOrder(updated.status)) {
                setOrdersFound(prev => {
                  const exists = prev.some(o => o.id === updated.id);
                  if (exists) {
                    return prev.map(o => o.id === updated.id ? { ...o, ...updated } : o);
                  }
                  return [updated, ...prev];
                });
              } else {
                setOrdersFound(prev => prev.filter(o => o.id !== updated.id));
              }
            }
          }
        })
        .subscribe();
    } catch (e) {}

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [ordersFound, emailInput, cpfInput]);

  // Helper para formatar CPF dinamicamente na digitação
  const handleCpfChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.slice(0, 11);
    
    if (val.length > 9) {
      val = val.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (val.length > 6) {
      val = val.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (val.length > 3) {
      val = val.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    setCpfInput(val);
  };

  const executeSearch = async (email, cpf) => {
    setErrorMessage('');
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanCpfDigits = String(cpf || '').replace(/\D/g, '');

    if (!cleanEmail || !cleanCpfDigits || cleanCpfDigits.length !== 11) {
      setErrorMessage('Por favor, informe um E-mail e CPF válidos (11 dígitos).');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .ilike('customer_email', cleanEmail)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setErrorMessage('Nenhum pedido pago foi localizado com os dados informados.');
        setOrdersFound([]);
      } else {
        // Filtra estritamente pedidos do mesmo CPF e com status PAGO
        const matchingOrders = data.filter(order => {
          const dbCpfDigits = String(order.customer_cpf || '').replace(/\D/g, '');
          const isMatchingCpf = dbCpfDigits === cleanCpfDigits;
          const isPaid = isPaidOrder(order.status);
          return isMatchingCpf && isPaid;
        });

        if (matchingOrders.length === 0) {
          setErrorMessage('Nenhum pedido pago foi localizado com os dados informados.');
          setOrdersFound([]);
        } else {
          setOrdersFound(matchingOrders);
          // Salva ou renova a sessão no localStorage por 1 hora
          const sessionData = {
            email: cleanEmail,
            cpf: cpf,
            expiresAt: Date.now() + SESSION_DURATION_MS
          };
          localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
          setActiveSession(sessionData);
        }
      }
    } catch (err) {
      console.error('Erro ao consultar pedido:', err);
      setErrorMessage('Nenhum pedido pago foi localizado com os dados informados.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchOrderForm = (e) => {
    e.preventDefault();
    executeSearch(emailInput, cpfInput);
  };

  const handleLogoutSession = () => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
    setActiveSession(null);
    setOrdersFound([]);
    setEmailInput('');
    setCpfInput('');
    setErrorMessage('');
  };

  const getStageStep = (orderOrStatus) => {
    let s = typeof orderOrStatus === 'string' ? orderOrStatus : orderOrStatus?.status_entrega;
    
    // Se não veio na coluna, extrai dos comentários <!--DELIVERY:...-->
    if (!s && typeof orderOrStatus === 'object' && orderOrStatus?.comments && orderOrStatus.comments.includes('<!--DELIVERY:')) {
      const match = orderOrStatus.comments.match(/<!--DELIVERY:(imprimindo|a_caminho|entregue)-->/i);
      if (match && match[1]) s = match[1];
    }
    
    const str = String(s || 'imprimindo').trim().toLowerCase();
    if (str === 'entregue') return 3;
    if (str === 'a_caminho' || str === 'enviado' || str === 'a caminho') return 2;
    return 1; // 'imprimindo' por padrão
  };

  // Helper de badges para Status de Pagamento / Venda
  const getPaymentStatusBadge = (status) => {
    const s = String(status || '').trim().toLowerCase();
    if (s === 'paid' || s === 'shipped' || s === 'approved' || s === 'completed' || s === 'pago') {
      return { label: 'Pagamento Confirmado', color: '#2ecc71', bg: 'rgba(46, 204, 113, 0.15)', border: 'rgba(46, 204, 113, 0.4)', icon: ShieldCheck };
    }
    if (s === 'cancelled' || s === 'cancelado') {
      return { label: 'Pedido Cancelado', color: '#e74c3c', bg: 'rgba(231, 76, 60, 0.15)', border: 'rgba(231, 76, 60, 0.4)', icon: XCircle };
    }
    if (s === 'abandoned' || s === 'abandonado') {
      return { label: 'Pagamento Pendente', color: '#f39c12', bg: 'rgba(243, 156, 18, 0.15)', border: 'rgba(243, 156, 18, 0.4)', icon: AlertTriangle };
    }
    return { label: 'Em Processamento', color: '#3498db', bg: 'rgba(52, 152, 219, 0.15)', border: 'rgba(52, 152, 219, 0.4)', icon: Clock };
  };

  const STAGES = [
    { id: 1, label: 'Imprimindo', desc: 'Pedido confirmado, produto em produção 3D', icon: Printer },
    { id: 2, label: 'A caminho', desc: 'Produto pronto, saiu para entrega', icon: Truck },
    { id: 3, label: 'Entregue', desc: 'Produto entregue com sucesso', icon: CheckCircle2 },
  ];

  const getRemainingMinutes = () => {
    if (!activeSession || !activeSession.expiresAt) return 0;
    const diff = activeSession.expiresAt - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60)));
  };

  return (
    <div style={{
      minHeight: '80vh',
      backgroundColor: '#050505',
      color: '#ffffff',
      padding: '40px 16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{ width: '100%', maxWidth: '740px' }}>
        
        {/* Header Superior / Botão Voltar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button
            onClick={onGoHome}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'transparent',
              border: 'none',
              color: '#a0aec0',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.color = '#3498db'}
            onMouseOut={(e) => e.target.style.color = '#a0aec0'}
          >
            <ArrowLeft size={18} /> Voltar para a loja
          </button>

          {/* Botão discreto para consultar outro pedido se já houver busca ativa */}
          {(activeSession || ordersFound.length > 0) && (
            <button
              onClick={handleLogoutSession}
              title="Realizar nova consulta"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#111111',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#a0aec0',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = '#a0aec0';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              }}
            >
              <LogOut size={13} /> Consultar outro pedido
            </button>
          )}
        </div>

        {/* Título & Cabeçalho da Página */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '900', letterSpacing: '-0.5px', marginBottom: '8px' }}>
            Acompanhar Status do Pedido
          </h1>
          <p style={{ color: '#a0aec0', fontSize: '15px' }}>
            Informe seu e-mail e CPF cadastrados no momento da compra para consultar o andamento do seu pedido.
          </p>
        </div>

        {/* Formulário de Busca */}
        <div style={{
          backgroundColor: '#111111',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          marginBottom: '32px'
        }}>
          <form onSubmit={handleSearchOrderForm}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#cbd5e0', marginBottom: '8px' }}>
                  E-mail do Comprador *
                </label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    backgroundColor: '#0a0a0a',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3498db'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#cbd5e0', marginBottom: '8px' }}>
                  CPF do Comprador *
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpfInput}
                  onChange={handleCpfChange}
                  maxLength={14}
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    backgroundColor: '#0a0a0a',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3498db'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: loading ? '#2c3e50' : '#3498db',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '800',
                letterSpacing: '0.5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'background-color 0.2s'
              }}
            >
              {loading ? (
                <span>Consultando pedido...</span>
              ) : (
                <>
                  <Search size={20} />
                  <span>CONSULTAR PEDIDO</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Mensagem de Erro Genérica */}
        {errorMessage && (
          <div style={{
            backgroundColor: 'rgba(231, 76, 60, 0.15)',
            border: '1px solid rgba(231, 76, 60, 0.4)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#ff6b6b',
            fontSize: '15px',
            marginBottom: '32px'
          }}>
            <AlertCircle size={22} style={{ shrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Resultado(s) Encontrado(s) */}
        {ordersFound.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {ordersFound.map((order) => {
              const currentStep = getStageStep(order);
              const payBadge = getPaymentStatusBadge(order.status);
              const PayIcon = payBadge.icon;
              const isCancelled = String(order.status || '').toLowerCase() === 'cancelled' || String(order.status || '').toLowerCase() === 'cancelado';
              const isAbandoned = String(order.status || '').toLowerCase() === 'abandoned' || String(order.status || '').toLowerCase() === 'abandonado';

              let rawItems = [];
              if (Array.isArray(order.items)) rawItems = order.items;
              else if (typeof order.items === 'string') {
                try { rawItems = JSON.parse(order.items); } catch(e) {}
              }

              return (
                <div key={order.id} style={{
                  backgroundColor: '#111111',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '20px',
                  padding: '28px',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.6)'
                }}>

                  {/* Cabeçalho do Card */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingBottom: '18px',
                    marginBottom: '24px',
                    flexWrap: 'wrap',
                    gap: '14px'
                  }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '700' }}>
                        Cliente
                      </span>
                      <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '2px 0 6px 0', color: '#ffffff' }}>
                        {order.customer_name || 'Cliente Infinity'}
                      </h3>
                      
                      {/* Badge de Status de Pagamento/Venda */}
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: payBadge.bg,
                        border: `1px solid ${payBadge.border}`,
                        color: payBadge.color,
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '700'
                      }}>
                        <PayIcon size={14} />
                        <span>Status da Venda: {payBadge.label}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '700' }}>
                        Valor Pago
                      </span>
                      <div style={{ fontSize: '22px', fontWeight: '900', color: '#2ecc71', marginTop: '2px' }}>
                        R$ {Number(order.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Avisos especiais de Pagamento Abandonado ou Cancelado */}
                  {isCancelled && (
                    <div style={{
                      backgroundColor: 'rgba(231, 76, 60, 0.12)',
                      border: '1px solid rgba(231, 76, 60, 0.3)',
                      borderRadius: '12px',
                      padding: '14px 18px',
                      color: '#ff6b6b',
                      fontSize: '14px',
                      marginBottom: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <XCircle size={20} />
                      <span>Este pedido consta como <strong>Cancelado</strong>. Entre em contato com o suporte caso haja dúvidas.</span>
                    </div>
                  )}

                  {isAbandoned && (
                    <div style={{
                      backgroundColor: 'rgba(243, 156, 18, 0.12)',
                      border: '1px solid rgba(243, 156, 18, 0.3)',
                      borderRadius: '12px',
                      padding: '14px 18px',
                      color: '#f39c12',
                      fontSize: '14px',
                      marginBottom: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <AlertTriangle size={20} />
                      <span>Aguardando confirmação do pagamento. Assim que o pagamento for concluído, a impressão 3D iniciará imediatamente.</span>
                    </div>
                  )}

                  {/* Progress Bar / Timeline Visual de Entrega */}
                  <div style={{
                    marginBottom: '32px',
                    padding: '10px 0',
                    opacity: isCancelled ? 0.4 : 1,
                    filter: isCancelled ? 'grayscale(0.8)' : 'none'
                  }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      color: '#3498db',
                      marginBottom: '16px'
                    }}>
                      Status do Envio & Produção:
                    </div>

                    <div style={{
                      position: 'relative',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      zIndex: 1
                    }}>
                      {/* Linha de Fundo */}
                      <div style={{
                        position: 'absolute',
                        top: '22px',
                        left: '40px',
                        right: '40px',
                        height: '4px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        zIndex: 0
                      }} />

                      {/* Linha Ativa */}
                      <div style={{
                        position: 'absolute',
                        top: '22px',
                        left: '40px',
                        width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%',
                        height: '4px',
                        backgroundColor: '#3498db',
                        transition: 'width 0.5s ease',
                        zIndex: 0
                      }} />

                      {STAGES.map((stage) => {
                        const Icon = stage.icon;
                        const isCurrent = currentStep === stage.id;
                        const isActive = currentStep >= stage.id;

                        return (
                          <div key={stage.id} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            zIndex: 1,
                            flex: 1,
                            textAlign: 'center'
                          }}>
                            <div style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '50%',
                              backgroundColor: isActive ? '#3498db' : '#1a1a1a',
                              border: isCurrent ? '3px solid #ffffff' : (isActive ? '3px solid #3498db' : '2px solid rgba(255, 255, 255, 0.2)'),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: isCurrent ? '0 0 20px rgba(52, 152, 219, 0.6)' : 'none',
                              transition: 'all 0.3s ease',
                              marginBottom: '10px'
                            }}>
                              <Icon size={22} color={isActive ? '#ffffff' : '#718096'} />
                            </div>

                            <span style={{
                              fontSize: '14px',
                              fontWeight: isActive ? '800' : '600',
                              color: isActive ? '#ffffff' : '#718096',
                              marginBottom: '2px'
                            }}>
                              {stage.label}
                            </span>

                            <span style={{ fontSize: '11px', color: '#a0aec0', maxWidth: '140px', lineHeight: '1.3' }}>
                              {stage.desc}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Lista de Produtos Comprados */}
                  <div>
                    <h4 style={{
                      fontSize: '13px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      color: '#a0aec0',
                      marginBottom: '14px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      paddingBottom: '8px'
                    }}>
                      Produto(s) Comprado(s)
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {rawItems.length > 0 ? (
                        rawItems.map((item, idx) => (
                          <div key={idx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            backgroundColor: '#0a0a0a',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                          }}>
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.name || 'Produto'}
                                style={{
                                  width: '56px',
                                  height: '56px',
                                  objectFit: 'cover',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                              />
                            )}

                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff' }}>
                                {item.name || item.title || 'Produto 3D'}
                              </div>
                              <div style={{ fontSize: '13px', color: '#a0aec0', marginTop: '2px' }}>
                                Qtd: {item.quantity || 1} {item.size ? `• Tamanho: ${item.size}` : ''}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: '14px', color: '#a0aec0', fontStyle: 'italic' }}>
                          Nenhum detalhe adicional do produto encontrado.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Endereço de Entrega Completo */}
                  {order.shipping_address && Object.keys(order.shipping_address).length > 0 && (
                    <div style={{
                      marginTop: '20px',
                      paddingTop: '16px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        color: '#3498db',
                        marginBottom: '8px'
                      }}>
                        <MapPin size={14} />
                        <span>Endereço de Entrega</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.5 }}>
                        {(order.shipping_address.street || order.shipping_address.logradouro) && (
                          <div>
                            <strong>Rua:</strong> {order.shipping_address.street || order.shipping_address.logradouro}, Nº {order.shipping_address.number || order.shipping_address.numero || 'S/N'}
                            {(order.shipping_address.complement || order.shipping_address.complemento) && (
                              <span> ({order.shipping_address.complement || order.shipping_address.complemento})</span>
                            )}
                          </div>
                        )}
                        <div>
                          {order.shipping_address.neighborhood || order.shipping_address.bairro ? `${order.shipping_address.neighborhood || order.shipping_address.bairro} • ` : ''}
                          {order.shipping_address.city || order.shipping_address.localidade || ''} - {order.shipping_address.state || order.shipping_address.uf || ''}
                          {order.shipping_address.cep ? ` (CEP: ${order.shipping_address.cep})` : ''}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
