import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#07051A]"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Ambient center glow */}
      <motion.div 
        className="absolute w-[40vw] h-[40vw] bg-[var(--color-primary)] rounded-full blur-[100px] mix-blend-screen opacity-20"
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.2] }}
        transition={{ duration: 4, ease: "easeInOut" }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          className="w-[10vw] h-[10vw] mb-6 relative"
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <img 
            src={`${import.meta.env.BASE_URL}images/logo.png`} 
            alt="Customize Duniya Logo" 
            className="w-full h-full object-contain" 
          />
        </motion.div>

        <motion.h1
          className="text-[4vw] font-display font-bold tracking-tight text-white mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          Customize Duniya
        </motion.h1>

        <motion.p
          className="text-[1.5vw] font-body text-[var(--color-text-muted)] tracking-wide uppercase"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          Run your business, beautifully.
        </motion.p>
      </div>

    </motion.div>
  );
}