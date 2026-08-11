import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  CheckCircle2, 
  PackageCheck, 
  ShieldCheck, 
  Truck, 
  Calendar, 
  ArrowRight, 
  ShoppingBag, 
  MessageCircle, 
  Home, 
  Copy, 
  Check, 
  Clock, 
  MapPin, 
  FileText,
  Sparkles
} from 'lucide-react';

export default function SuccessPage({ onGoHome, onClearCart }) {
  const [order, setOrder] = useState(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 1. Limpa o carrinho e qualquer rascunho de preenchimento pendente
    if (typeof onClearCart === 'function') {
      onClearCart();
    }
    try {
      localStorage.removeItem('infinity_cart_items');
      localStorage.removeItem('infinity_checkout_draft');
      localStorage.removeItem('infinity_last_order_id');
    } catch (e) {}

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 2. Localiza o ID do pedido via URL hash ou localStorage
    let orderId = null;

    try {
      const hash = window.location.hash || '';
      if (hash.includes('order_id=')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        orderId = params.get('order_id');
      } else if (window.location.search.includes('order_id=')) {
        const params = new URLSearchParams(window.location.search);
        orderId = params.get('order_id');
      }
    } catch (err) {
      console.warn('Erro ao ler URL params:', err);
    }

    if (!orderId) {
      try {
        orderId = localStorage.getItem('infinity_last_order_id');
      } catch (err) {}
    }

    // 3. Processa a confirmação do pedido no Supabase
    async function confirmAndFetchOrder() {
      try {
        setLoading(true);

        let activeOrder = null;

        if (orderId) {
          // Atualiza o status do pedido IMEDIATAMENTE para "paid" no Supabase
          const { data, error } = await supabase
            .from('orders')
            .update({ 
              status: 'paid', 
              updated_at: new Date().toISOString() 
            })
            .eq('id', orderId)
            .select('*')
            .single();

          if (!error && data) {
            activeOrder = data;
          } else {
            // Se update direto falhou ou não retornou single, faz select
            const { data: fetchedOrder } = await supabase
              .from('orders')
              .select('*')
              .eq('id', orderId)
              .single();
            
            if (fetchedOrder) {
              activeOrder = fetchedOrder;
              // Garante status pago
              await supabase
                .from('orders')
                .update({ status: 'paid', updated_at: new Date().toISOString() })
                .eq('id', orderId);
            }
          }
        }

        // Se não encontrou por ID específico, busca o último pedido recente
        if (!activeOrder) {
          const { data: latestOrders } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

          if (latestOrders && latestOrders.length > 0) {
            activeOrder = latestOrders[0];
            await supabase
              .from('orders')
              .update({ status: 'paid', updated_at: new Date().toISOString() })
              .eq('id', activeOrder.id);
          }
        }

        // Calcula o número do pedido iniciando em 30 (1ª compra = #30, 2ª = #31, 15ª = #44/#45, etc.)
        let calculatedDisplayNum = '30';

        if (activeOrder) {
          // Auto-recuperação e integridade do endereço de entrega
          if (!activeOrder.shipping_address || Object.keys(activeOrder.shipping_address).length === 0) {
            try {
              const lastOrderBackup = JSON.parse(localStorage.getItem('infinity_last_order_data') || 'null');
              const lastLeadBackup = JSON.parse(localStorage.getItem('infinity_last_captured_lead') || 'null');
              const backupAddr = lastOrderBackup?.shipping_address || lastLeadBackup?.shipping_address;

              if (backupAddr && Object.keys(backupAddr).length > 0) {
                activeOrder.shipping_address = backupAddr;
                await supabase
                  .from('orders')
                  .update({ 
                    shipping_address: backupAddr,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', activeOrder.id);
                console.log('✅ Endereço recuperado do backup seguro e sincronizado no Supabase');
              }
            } catch (backupErr) {
              console.warn('Aviso sincronização de backup:', backupErr);
            }
          }

          setOrder(activeOrder);

          try {
            // Conta quantos pedidos existem criados até a data deste pedido para achar o índice sequencial
            const { count, error: countErr } = await supabase
              .from('orders')
              .select('id', { count: 'exact', head: true })
              .lte('created_at', activeOrder.created_at || new Date().toISOString());

            if (!countErr && typeof count === 'number' && count > 0) {
              calculatedDisplayNum = String(29 + count);
            } else {
              // Fallback numérico com base no ID
              const idNum = Math.abs(activeOrder.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 50 + 30);
              calculatedDisplayNum = String(idNum);
            }
          } catch (e) {
            calculatedDisplayNum = '30';
          }
        } else {
          // Fallback se nenhum pedido no banco
          calculatedDisplayNum = '30';
        }

        setOrderNumber(calculatedDisplayNum);

      } catch (err) {
        console.error('Erro ao confirmar pedido na página de sucesso:', err);
        setOrderNumber('30');
      } finally {
        setLoading(false);
      }
    }

    confirmAndFetchOrder();
  }, []);

  const handleCopyOrderNumber = () => {
    if (!orderNumber) return;
    navigator.clipboard.writeText(`#${orderNumber}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getWhatsAppSupportLink = () => {
    const phone = '5534998919211'; // WhatsApp da Infinity 3D
    const msg = `Olá! 👋 Acabei de concluir meu pedido na Infinity 3D (Pedido #${orderNumber || '30'}). Gostaria de acompanhar as etapas de produção e envio!`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const itemsList = order && Array.isArray(order.items) ? order.items : [];
  const shippingAddr = order?.shipping_address || {};

  return (
    <div style={{ backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh', padding: '40px 16px 80px 16px' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto' }}>
        
        {/* Card Principal de Sucesso */}
        <div style={{
          backgroundColor: '#070709',
          border: '1px solid rgba(39, 174, 96, 0.35)',
          borderRadius: '24px',
          padding: '40px 24px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 40px rgba(39, 174, 96, 0.15)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          
          {/* Efeito luminoso superior */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '300px',
            height: '100px',
            backgroundColor: 'rgba(39, 174, 96, 0.2)',
            filter: 'blur(50px)',
            pointerEvents: 'none'
          }} />

          {/* Ícone de Sucesso Animado */}
          <div style={{
            width: '84px',
            height: '84px',
            borderRadius: '50%',
            backgroundColor: 'rgba(39, 174, 96, 0.15)',
            border: '2px solid #27ae60',
            color: '#27ae60',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            boxShadow: '0 0 30px rgba(39, 174, 96, 0.4)'
          }}>
            <CheckCircle2 size={46} strokeWidth={2.5} />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(39, 174, 96, 0.12)',
            border: '1px solid rgba(39, 174, 96, 0.3)',
            borderRadius: '999px',
            padding: '6px 16px',
            fontSize: '12px',
            fontWeight: '800',
            color: '#2ecc71',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            marginBottom: '16px'
          }}>
            <ShieldCheck size={16} /> Pagamento Aprovado & Confirmado
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', margin: '0 0 10px 0', letterSpacing: '-0.5px' }}>
            Pedido Concluído com Sucesso! 🎉
          </h1>

          <p style={{ fontSize: '14px', color: '#aaaaaa', maxWidth: '520px', margin: '0 auto 28px auto', lineHeight: 1.6 }}>
            Obrigado por comprar na <strong>Infinity Impressões 3D</strong>! O seu pagamento foi processado com total segurança e o seu pedido já está na nossa fila de produção.
          </p>

          {/* Destaque do Número do Pedido com o dígito "3" na frente */}
          <div style={{
            backgroundColor: '#0e0e14',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            maxWidth: '380px',
            margin: '0 auto 32px auto'
          }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#888888', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Número do seu Pedido
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '32px', fontWeight: '900', color: '#ffffff', letterSpacing: '2px' }}>
                #{orderNumber || '30'}
              </span>
              <button
                type="button"
                onClick={handleCopyOrderNumber}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: copied ? '#2ecc71' : '#ffffff',
                  padding: '8px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Etapas de Acompanhamento */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            textAlign: 'left',
            marginBottom: '36px'
          }}>
            <div style={{
              backgroundColor: '#0c0c10',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '14px',
              padding: '18px'
            }}>
              <div style={{ color: '#27ae60', marginBottom: '8px' }}><CheckCircle2 size={22} /></div>
              <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff', margin: '0 0 4px 0' }}>1. Pagamento Confirmado</h4>
              <p style={{ fontSize: '12px', color: '#888888', margin: 0, lineHeight: 1.4 }}>Seu pagamento foi aprovado e registrado no sistema.</p>
            </div>

            <div style={{
              backgroundColor: '#0c0c10',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '14px',
              padding: '18px'
            }}>
              <div style={{ color: '#3498db', marginBottom: '8px' }}><PackageCheck size={22} /></div>
              <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff', margin: '0 0 4px 0' }}>2. Impressão 3D & Preparação</h4>
              <p style={{ fontSize: '12px', color: '#888888', margin: 0, lineHeight: 1.4 }}>Seus produtos já estão na fila de modelagem e acabamento.</p>
            </div>
          </div>

          {/* Resumo do Pedido */}
          {order && (
            <div style={{
              backgroundColor: '#0a0a0e',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'left',
              marginBottom: '32px'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>
                Resumo da sua Compra
              </h3>

              {itemsList.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  {itemsList.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', paddingBottom: '10px' }}>
                      <div>
                        <span style={{ fontWeight: '700', color: '#ffffff' }}>{item.name || item.title || 'Produto 3D'}</span>
                        <span style={{ color: '#888888', fontSize: '12px', marginLeft: '6px' }}>({item.size || 'Único'}) × {item.quantity || 1}</span>
                      </div>
                      <span style={{ fontWeight: '800', color: '#ffffff' }}>
                        R$ {((Number(item.price) || 0) * (Number(item.quantity) || 1)).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', fontSize: '12px', color: '#aaaaaa', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
                <div>
                  <span style={{ color: '#ffffff', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Destinatário:</span>
                  <span>{order.customer_name}</span><br />
                  <span>{order.customer_email}</span> • <span>{order.customer_phone}</span>
                </div>
                <div>
                  <span style={{ color: '#ffffff', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Endereço de Entrega:</span>
                  <span>
                    {(shippingAddr.street || shippingAddr.logradouro) 
                      ? `${shippingAddr.street || shippingAddr.logradouro}, ${shippingAddr.number || shippingAddr.numero || 'S/N'}${shippingAddr.complement || shippingAddr.complemento ? ' (' + (shippingAddr.complement || shippingAddr.complemento) + ')' : ''}` 
                      : 'Endereço cadastrado'}
                  </span><br />
                  <span>
                    {shippingAddr.neighborhood || shippingAddr.bairro || ''}
                    {(shippingAddr.city || shippingAddr.localidade) ? ` - ${shippingAddr.city || shippingAddr.localidade}/${shippingAddr.state || shippingAddr.uf || ''}` : ''}
                    {shippingAddr.cep ? ` (CEP: ${shippingAddr.cep})` : ''}
                  </span>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                paddingTop: '16px',
                marginTop: '16px'
              }}>
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff' }}>Total Pago:</span>
                <span style={{ fontSize: '24px', fontWeight: '900', color: '#2ecc71' }}>
                  R$ {Number(order.total_amount || 0).toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '14px',
            justifyContent: 'center'
          }}>
            <a
              href={getWhatsAppSupportLink()}
              target="_blank"
              rel="noreferrer"
              style={{
                backgroundColor: '#25d366',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '14px',
                padding: '16px 28px',
                borderRadius: '12px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 8px 24px rgba(37, 211, 102, 0.35)',
                transition: 'all 0.2s ease'
              }}
            >
              <MessageCircle size={18} /> Acompanhar no WhatsApp
            </a>

            <button
              type="button"
              onClick={onGoHome}
              style={{
                backgroundColor: '#111115',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                fontWeight: '700',
                fontSize: '14px',
                padding: '16px 28px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <Home size={16} /> Voltar para a Loja
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
