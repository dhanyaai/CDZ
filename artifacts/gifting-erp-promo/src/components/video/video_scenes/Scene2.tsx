import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 3600),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, x: '5vw' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '-5vw', filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Background Dashboard visual floating up */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pt-[15vh] opacity-60"
        initial={{ y: '20vh', scale: 0.9, rotateX: 15 }}
        animate={{ y: '-5vh', scale: 1.05, rotateX: 0 }}
        transition={{ duration: 5, ease: 'easeOut' }}
        style={{ perspective: 1000 }}
      >
        <div className="w-[80vw] h-[60vw] relative shadow-[0_0_80px_rgba(59,48,201,0.5)] rounded-2xl overflow-hidden border border-white/10">
          <img 
            src={`${import.meta.env.BASE_URL}images/dashboard.png`} 
            className="w-full h-full object-cover" 
            alt="Dashboard" 
          />
          {/* Overlay gradient so text is readable */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#07051A]/80 to-transparent" />
        </div>
      </motion.div>

      {/* Foreground Text */}
      <div className="absolute top-[25vh] text-center w-full px-12 z-20">
        <motion.p 
          className="text-[1.2vw] font-bold tracking-[0.3em] uppercase text-[var(--color-accent)] mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          End-to-End Visibility
        </motion.p>
        <motion.h2 
          className="text-[4.5vw] font-display font-medium text-white leading-tight drop-shadow-2xl"
          initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
          animate={phase >= 2 ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 30, filter: 'blur(8px)' }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          Scale your <span className="italic">operations.</span>
        </motion.h2>
      </div>

    </motion.div>
  );
}