import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1600),
      setTimeout(() => setPhase(3), 3200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative flex flex-col items-center w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-[12vw] h-[12vw] mb-8 relative"
        >
          {/* Logo glow */}
          <div className="absolute inset-0 bg-[var(--color-accent)] blur-3xl opacity-20 rounded-full" />
          <img 
            src={`${import.meta.env.BASE_URL}images/logo.png`} 
            alt="Logo" 
            className="w-full h-full object-contain relative z-10" 
          />
        </motion.div>
        
        <motion.div className="overflow-hidden">
          <motion.h1 
            className="text-[4.5vw] font-display font-medium text-[var(--color-text-primary)] leading-tight text-center"
            initial={{ y: '100%' }}
            animate={phase >= 2 ? { y: '0%' } : { y: '100%' }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            The all-in-one ERP for
          </motion.h1>
        </motion.div>

        <motion.div className="overflow-hidden mt-2">
          <motion.h1 
            className="text-[5vw] font-display font-bold text-[var(--color-accent)] italic leading-tight text-center"
            initial={{ y: '100%' }}
            animate={phase >= 2 ? { y: '0%' } : { y: '100%' }}
            transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            Corporate Gifting.
          </motion.h1>
        </motion.div>
      </div>
    </motion.div>
  );
}