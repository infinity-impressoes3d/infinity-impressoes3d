import React from 'react';

export default function HeroSlider() {
  const slide = {
    id: 1,
    image: "/banner1.png",
    alt: "Infinity Impressões 3D - Nova Coleção de Bonecos Gangster"
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      backgroundColor: '#000000',
      overflow: 'hidden'
    }}>
      {/* Responsive Banner Container matching 16:7 / widescreen aspect ratio */}
      <div style={{
        position: 'relative',
        width: '100%',
        paddingBottom: '42%',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
      }}>
        <img
          src={slide.image}
          alt={slide.alt}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
          }}
        />
      </div>
    </div>
  );
}
