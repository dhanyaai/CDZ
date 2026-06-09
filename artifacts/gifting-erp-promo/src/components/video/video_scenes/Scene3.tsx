import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const PILLARS = ["CRM", "PRODUCTS", "INVENTORY", "ORDERS"];

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),   // CRM
      setTimeout(() => setPhase(2), 1200),  // Products
      setTimeout(() => setPhase(3), 2100),  // Inventory
      setTimeout(() => setPhase(4), 3000),  // Orders
      setTimeout(() => setPhase(5), 4500),  // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 z-10 bg-[#07051A]"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 flex flex-col justify-center pl-[15vw]">
        {PILLARS.map((word, i) => {
          const isVisible = phase >= i + 1;
          return (
            <div key={word} className="overflow-hidden mb-2 relative">
              <motion.div
                className="absolute left-[-4vw] top-1/2 -translate-y-1/2 w-[2vw] h-[2px] bg-[var(--color-accent)]"
                initial={{ scaleX: 0, originX: 0 }}
                animate={isVisible ? { scaleX: 1 } : { scaleX: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              />
              <motion.h2
                className="text-[6vw] font-display font-bold tracking-wider text-white"
                initial={{ y: '100%', opacity: 0, rotateX: 45 }}
                animate={isVisible ? { y: '0%', opacity: 1, rotateX: 0 } : { y: '100%', opacity: 0, rotateX: 45 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                {word}
              </motion.h2>
            </div>
          );
        })}
      </div>

      {/* Graphic abstract UI element on the right */}
      <motion.div 
        className="absolute right-[10vw] top-[30vh] w-[35vw] h-[40vh] border border-white/10 rounded-xl bg-white/5 backdrop-blur-md flex flex-col gap-4 p-8"
        initial={{ opacity: 0, x: 100 }}
        animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 100 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div className="h-4 w-1/3 bg-[var(--color-primary)] rounded-full" 
          animate={phase >= 2 ? { width: ['0%', '33%'] } : { width: '0%' }} transition={{ duration: 1 }} />
        <motion.div className="h-4 w-2/3 bg-white/20 rounded-full" 
          animate={phase >= 3 ? { width: ['0%', '66%'] } : { width: '0%' }} transition={{ duration: 1 }} />
        <motion.div className="h-4 w-1/2 bg-[var(--color-accent)] rounded-full" 
          animate={phase >= 4 ? { width: ['0%', '50%'] } : { width: '0%' }} transition={{ duration: 1 }} />
        <div className="flex-1 border-t border-white/10 mt-4 relative">
          <motion.div className="absolute left-0 top-1/2 w-16 h-16 rounded bg-[var(--color-primary)]/50 blur-xl" 
            animate={{ x: [0, 200, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}/>
        </div>
      </motion.div>

    </motion.div>
  );
}