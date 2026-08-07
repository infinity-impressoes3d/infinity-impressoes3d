import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const DEFAULT_SLIDES = [
  { id: 'def-1', image: '/banner1.png' }
];

export default function HeroSlider() {
  const [slides, setSlides] = useState(DEFAULT_SLIDES);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchActiveSlides();

    // Supabase Realtime subscription
    let channel;
    try {
      channel = supabase
        .channel('storefront-hero-slides')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'hero_slides' }, () => fetchActiveSlides())
        .subscribe();
    } catch (e) {
      console.log('Realtime offline');
    }

    // Polling automático a cada 4 segundos e refresh no foco da aba
    const pollInterval = setInterval(fetchActiveSlides, 4000);
    const handleFocus = () => fetchActiveSlides();
    window.addEventListener('focus', handleFocus);

    return () => {
      if (channel) supabase.removeChannel(channel);
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);


  const fetchActiveSlides = async () => {
    try {
      const { data, error } = await supabase
        .from('hero_slides')
        .select('*')
        .or('active.eq.true,active.is.null')
        .order('display_order', { ascending: true });


      if (!error && data && data.length > 0) {
        setSlides(data);
      }
    } catch (err) {
      console.log('Supabase offline, usando slides locais');
    }
  };

  // Auto-play timer if multiple slides exist
  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length]);

  if (!slides || slides.length === 0) {
    return null;
  }


  const activeSlide = slides[currentIndex] || slides[0];

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      backgroundColor: '#000000',
      overflow: 'hidden'
    }}>
      {/* Responsive Banner Container matching 16:7 / widescreen aspect ratio */}
      <div 
        style={{
          display: 'block',
          position: 'relative',
          width: '100%',
          paddingBottom: '42%',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
        }}
      >
        <img
          src={activeSlide.image}
          alt={`Banner ${currentIndex + 1}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            transition: 'opacity 0.6s ease-in-out'
          }}
        />
      </div>

      {/* Navigation Indicators if multiple slides */}
      {slides.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '15px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
          zIndex: 10
        }}>
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              style={{
                width: idx === currentIndex ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: idx === currentIndex ? '#ffffff' : 'rgba(255,255,255,0.4)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
