import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 z-10 bg-[#07051A]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Cinematic Background Video */}
      <video
        src={`${import.meta.env.BASE_URL}videos/gold_particles.mp4`}
        className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-screen"
        autoPlay
        muted
        playsInline
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          className="text-center px-20 max-w-5xl"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.95 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-[5vw] font-display font-medium text-white leading-tight drop-shadow-2xl">
            Deliver <span className="italic text-[var(--color-accent)]">premium</span> experiences.
          </h2>
        </motion.div>
        
        <motion.div
          className="mt-8 w-[15vw] h-[1px] bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-50"
          initial={{ scaleX: 0 }}
          animate={phase >= 2 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

    </motion.div>
  );
}