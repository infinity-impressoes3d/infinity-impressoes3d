import React from 'react';

export default function AnnouncementBar() {
  const announcements = [
    "🔥 FRETE GRÁTIS PARA COMPRAS ACIMA DE R$399,9 🔥",
    "⚡ PARCELAMENTO EM ATÉ 10X SEM JUROS NO CARTÃO ⚡",
    "🏆 CAMISETAS SELEÇÃO BRASILEIRA 2026 E RETRÔS EXCLUSIVAS 🏆",
    "👟 TÊNIS NK AIR MAX TN & CORTEIZ COM ENVIOS RÁPIDOS PARA TODO O BRASIL 👟"
  ];

  return (
    <div style={{
      backgroundColor: '#0f4592',
      color: '#ffffff',
      fontSize: '12px',
      fontWeight: '600',
      letterSpacing: '1px',
      overflow: 'hidden',
      padding: '8px 0',
      borderBottom: '1px solid rgba(255,255,255,0.1)'
    }}>
      <div className="animate-marquee">
        {announcements.concat(announcements).map((text, idx) => (
          <span key={idx} style={{ padding: '0 32px' }}>
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
