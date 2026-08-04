import React from 'react';
import { Truck, Printer, ShieldCheck, Headphones } from 'lucide-react';

export default function TrustBadges() {
  const benefits = [
    {
      icon: <Truck size={28} color="#3498db" />,
      title: "Enviamos para todo o Brasil"
    },
    {
      icon: <Printer size={28} color="#3498db" />,
      title: "Impressão 3D personalizada"
    },
    {
      icon: <ShieldCheck size={28} color="#3498db" />,
      title: "COMPRA 100% SEGURA"
    },
    {
      icon: <Headphones size={28} color="#3498db" />,
      title: "SUPORTE ESPECIALIZADO"
    }
  ];

  return (
    <section className="desktop-only-trustbadges" style={{
      backgroundColor: '#080808',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '28px 0'
    }}>
      <div className="container">
        {/* Single Horizontal Row of 4 Cards on Desktop */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px'
        }}>
          {benefits.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '16px 18px',
                backgroundColor: '#111111',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.icon}
              </div>
              <h4 style={{
                fontSize: '12px',
                fontWeight: '800',
                color: '#ffffff',
                letterSpacing: '0.4px',
                lineHeight: 1.25,
                margin: 0
              }}>
                {item.title}
              </h4>
            </div>
          ))}
        </div>
      </div>

      {/* Show only on Desktop (>= 992px), Hide completely on Mobile & Tablet (< 992px) */}
      <style>{`
        @media (max-width: 991px) {
          .desktop-only-trustbadges {
            display: none !important;
          }
        }
        @media (min-width: 992px) {
          .desktop-only-trustbadges {
            display: block !important;
          }
        }
      `}</style>
    </section>
  );
}
