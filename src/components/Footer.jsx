import React from 'react';
import { Instagram, MessageCircle } from 'lucide-react';

export default function Footer({ customContent }) {
  const instagramUrl = "https://www.instagram.com/infi.nityimpressoes3d/";
  const whatsappUrl = "https://api.whatsapp.com/send?phone=5534988388278";

  return (
    <footer style={{
      backgroundColor: '#030303',
      color: '#ffffff',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      position: 'relative'
    }}>
      {/* Floating WhatsApp Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Atendimento via WhatsApp Empresarial"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#25d366',
          color: '#ffffff',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 20px rgba(37, 211, 102, 0.5)',
          zIndex: 900,
          transition: 'transform 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <MessageCircle size={32} />
      </a>

      {/* Main Footer Container */}
      <div className="container" style={{ padding: '60px 16px 40px 16px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '40px',
          marginBottom: '40px'
        }}>
          {customContent && customContent.length > 0 ? (
            customContent.map((sec) => (
              <div key={sec.id}>
                <h4 style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', color: '#ffffff' }}>
                  {sec.section_title}
                </h4>
                <p style={{ fontSize: '12px', color: '#aaaaaa', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {sec.content}
                </p>
              </div>
            ))
          ) : (
            <>
              {/* Col 1: Brand Info & Official Links */}
              <div>
                <img
                  src="/logo.png"
                  alt="Infinity Impressões 3D"
                  style={{ height: '64px', objectFit: 'contain', marginBottom: '16px' }}
                />
                <p style={{ fontSize: '12px', color: '#aaaaaa', lineHeight: 1.6, marginBottom: '20px' }}>
                  A <strong>Infinity Impressões 3D</strong> é especializada na criação, fabricação e venda de impressões em 3D de alta qualidade, oferecendo peças exclusivas e modelos personalizados com acabamento impecável.
                </p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram Oficial Infinity Impressões 3D"
                    style={{
                      backgroundColor: '#111111',
                      color: '#ffffff',
                      padding: '12px 18px',
                      borderRadius: '30px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: '1px solid #222222',
                      fontSize: '12px',
                      fontWeight: '700',
                      textDecoration: 'none'
                    }}
                  >
                    <Instagram size={18} color="#e1306c" /> Instagram
                  </a>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp Empresarial Infinity Impressões 3D"
                    style={{
                      backgroundColor: '#111111',
                      color: '#ffffff',
                      padding: '12px 18px',
                      borderRadius: '30px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: '1px solid #222222',
                      fontSize: '12px',
                      fontWeight: '700',
                      textDecoration: 'none'
                    }}
                  >
                    <MessageCircle size={18} color="#25d366" /> WhatsApp
                  </a>
                </div>
              </div>

              {/* Col 2: Coleções */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', marginBottom: '16px', letterSpacing: '1px' }}>
                  COLEÇÕES
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: '#888888' }}>
                  <li><a href="#/colecao/porta-monster" style={{ color: '#888888', textDecoration: 'none' }}>Porta Monster</a></li>
                  <li><a href="#/colecao/porta-chaveiro" style={{ color: '#888888', textDecoration: 'none' }}>Porta Chaveiro</a></li>
                  <li><a href="#/colecao/miniaturas" style={{ color: '#888888', textDecoration: 'none' }}>Miniaturas</a></li>
                </ul>
              </div>

              {/* Col 3: Atendimento via WhatsApp */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', marginBottom: '16px', letterSpacing: '1px' }}>
                  ATENDIMENTO EXCLUSIVO
                </h4>
                <p style={{ fontSize: '12px', color: '#888888', marginBottom: '16px', lineHeight: 1.5 }}>
                  Faça orçamentos de impressões em 3D personalizadas ou tire dúvidas diretamente no nosso WhatsApp oficial.
                </p>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    backgroundColor: '#25d366',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '800',
                    padding: '12px 20px',
                    borderRadius: '30px',
                    textDecoration: 'none',
                    boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)'
                  }}
                >
                  <MessageCircle size={18} /> CHAMAR NO WHATSAPP
                </a>
              </div>
            </>
          )}
        </div>

        {/* Bottom Payment Methods Image & Copyright */}
        <div style={{
          paddingTop: '30px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          textAlign: 'center'
        }}>
          <div>
            <span style={{ fontSize: '11px', color: '#888888', fontWeight: '700', display: 'block', marginBottom: '12px', letterSpacing: '1px' }}>
              FORMAS DE PAGAMENTO
            </span>
            <img
              src="/payment-methods.png"
              alt="Formas de Pagamento Aceitas"
              style={{
                maxWidth: '100%',
                maxHeight: '36px',
                objectFit: 'contain',
                borderRadius: '4px'
              }}
            />
          </div>

          <p style={{ fontSize: '11px', color: '#555555', marginTop: '8px' }}>
            © 2026 <strong>Infinity Impressões 3D</strong> - Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
