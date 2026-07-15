import Lottie from 'lottie-react';
import { useTranslation } from 'react-i18next';
import lottieDataEs from '../assets/lottie-hero.json';
import lottieDataEn from '../assets/lottie-hero-en.json';

/**
 * AnimatedHeadline
 * Renders the Scene-1 Lottie animation (animated GODZILLA letters) 
 * in the Hero section, replacing the static h1 text.
 * Positioned above the ColorBends background.
 */
export default function AnimatedHeadline({ className = '', style = {} }) {
  const { i18n } = useTranslation();
  const isSpanish = i18n.resolvedLanguage?.startsWith('es') || !i18n.resolvedLanguage;
  const currentAnimation = isSpanish ? lottieDataEs : lottieDataEn;

  return (
    <div
      className={className}
      style={{ width: '100%', maxWidth: 900, margin: '0 auto', ...style }}

      role="heading"
      aria-level={1}
      aria-label="Detén la fuga de leads y escala tu facturación con inteligencia artificial"
    >
      <Lottie
        animationData={currentAnimation}
        loop={true}
        autoplay={true}
        style={{ width: '100%', height: 'auto' }}
      />
    </div>
  );
}
