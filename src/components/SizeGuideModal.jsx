import React from 'react';
import { X, Ruler } from 'lucide-react';

export default function SizeGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 300,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#0a0a0a',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '12px',
        maxWidth: '560px',
        width: '100%',
        padding: '24px',
        color: '#ffffff',
        position: 'relative',
        boxShadow: '0 20px 50px rgba(0,0,0,0.9)'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #222', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Ruler size={22} color="#3498db" />
            <h3 style={{ fontSize: '18px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Guia de Medidas
            </h3>
          </div>
          <button onClick={onClose} style={{ color: '#888888', hover: { color: '#fff' } }}>
            <X size={24} />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: '#aaaaaa', marginBottom: '16px' }}>
          Compare as medidas abaixo com uma peça do seu guarda-roupa para escolher o tamanho ideal (Modelagem Boxy Streetwear).
        </p>

        {/* Table */}
        <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#141414', color: '#ffffff', borderBottom: '1px solid #333' }}>
                <th style={{ padding: '10px', fontWeight: '700' }}>Tamanho</th>
                <th style={{ padding: '10px', fontWeight: '700' }}>Altura (cm)</th>
                <th style={{ padding: '10px', fontWeight: '700' }}>Largura (cm)</th>
                <th style={{ padding: '10px', fontWeight: '700' }}>Manga (cm)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #222' }}>
                <td style={{ padding: '10px', fontWeight: '800', color: '#3498db' }}>P</td>
                <td style={{ padding: '10px' }}>72 cm</td>
                <td style={{ padding: '10px' }}>54 cm</td>
                <td style={{ padding: '10px' }}>64 cm</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #222' }}>
                <td style={{ padding: '10px', fontWeight: '800', color: '#3498db' }}>M</td>
                <td style={{ padding: '10px' }}>75 cm</td>
                <td style={{ padding: '10px' }}>57 cm</td>
                <td style={{ padding: '10px' }}>66 cm</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #222' }}>
                <td style={{ padding: '10px', fontWeight: '800', color: '#3498db' }}>G</td>
                <td style={{ padding: '10px' }}>78 cm</td>
                <td style={{ padding: '10px' }}>60 cm</td>
                <td style={{ padding: '10px' }}>68 cm</td>
              </tr>
              <tr>
                <td style={{ padding: '10px', fontWeight: '800', color: '#3498db' }}>GG</td>
                <td style={{ padding: '10px' }}>81 cm</td>
                <td style={{ padding: '10px' }}>63 cm</td>
                <td style={{ padding: '10px' }}>70 cm</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ backgroundColor: '#111', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#888' }}>
          💡 <strong>Dica:</strong> Para caimento mais solto (Over-sized streetwear), selecione 1 tamanho acima do seu habitual.
        </div>
      </div>
    </div>
  );
}
