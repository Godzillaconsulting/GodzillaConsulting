import React, { Suspense, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Lazy load lottie-react + heavy JSON data (300KB runtime + 247KB JSON)
const LottiePlayer = React.lazy(() => import('lottie-react'));

// Wrapper that dynamically imports the heavy JSON animation data
function LazyLottieWrapper({ isSpanish }) {
  const [animData, setAnimData] = useState(null);

  useEffect(() => {
    const loader = isSpanish
      ? import('../assets/lottie-hero.json')
      : import('../assets/lottie-hero-en.json');
    loader.then(mod => setAnimData(mod.default || mod));
  }, [isSpanish]);

  if (!animData) return null;

  return (
    <LottiePlayer
      animationData={animData}
      loop={true}
      autoplay={true}
      style={{ width: '100%', height: 'auto' }}
    />
  );
}

/**
 * AnimatedHeadline — lazy-loads Lottie so Hero paints instantly with a static h1 fallback.
 */
export default function AnimatedHeadline({ className = '', style = {} }) {
  const { i18n } = useTranslation();
  const isSpanish = i18n.resolvedLanguage?.startsWith('es') || !i18n.resolvedLanguage;

  return (
    <div
      className={className}
      style={{ width: '100%', maxWidth: 900, margin: '0 auto', ...style }}
      role="heading"
      aria-level={1}
      aria-label="Detén la fuga de leads y escala tu facturación con inteligencia artificial"
    >
      <Suspense fallback={
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight text-center animate-pulse">
          GODZILLA<span className="text-[#CC0000]">.</span>
        </h1>
      }>
        <LazyLottieWrapper isSpanish={isSpanish} />
      </Suspense>
    </div>
  );
}

