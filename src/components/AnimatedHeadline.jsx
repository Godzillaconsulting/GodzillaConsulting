import Lottie from 'lottie-react';
import lottieData from '../assets/lottie-hero.json';

/**
 * AnimatedHeadline
 * Renders the Scene-1 Lottie animation (animated GODZILLA letters) 
 * in the Hero section, replacing the static h1 text.
 * Positioned above the ColorBends background.
 */
export default function AnimatedHeadline({ className = '', style = {} }) {
  return (
    <div
      className={className}
      style={{ width: '100%', maxWidth: 900, margin: '0 auto', ...style }}

      role="heading"
      aria-level={1}
      aria-label="Detén la fuga de leads y escala tu facturación con inteligencia artificial"
    >
      <Lottie
        animationData={lottieData}
        loop={true}
        autoplay={true}
        style={{ width: '100%', height: 'auto' }}
      />
    </div>
  );
}
