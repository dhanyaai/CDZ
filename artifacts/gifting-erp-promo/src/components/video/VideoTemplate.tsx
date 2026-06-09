import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

// Pacing shape: Steady atmospheric build -> dynamic feature reveals -> majestic resolve
export const SCENE_DURATIONS = {
  open: 4000,       // 4.0s
  reveal: 4500,     // 4.5s
  pillars: 5500,    // 5.5s
  experience: 5800, // 5.8s
  close: 5000,      // 5.0s
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  open: Scene1,
  reveal: Scene2,
  pillars: Scene3,
  experience: Scene4,
  close: Scene5,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    out[key] = cumulativeMs / 1000;
    cumulativeMs += ms;
  }
  return out;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const currentScene = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
      audio.currentTime = targetTime;
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted]);

  return (
    <div className="w-full h-screen overflow-hidden relative" style={{ backgroundColor: 'var(--color-bg-dark)' }}>
      {/* Persistent Background Layer */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute inset-0 opacity-40 mix-blend-screen"
          style={{
            backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-texture.png)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
          animate={{
            scale: currentScene === 0 ? 1.05 : currentScene === 4 ? 1 : 1.1,
            rotate: currentScene === 3 ? 2 : 0,
            opacity: currentScene === 3 ? 0 : 0.4
          }}
          transition={{ duration: 4, ease: 'easeInOut' }}
        />
        
        {/* Deep Indigo gradient sweep */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-tr from-[#07051A]/80 via-transparent to-[#3B30C9]/20 mix-blend-multiply"
          animate={{
            opacity: [0.6, 0.8, 0.4, 0.9, 0.6][currentScene] || 0.6
          }}
          transition={{ duration: 2 }}
        />
        
        {/* Subtle noise texture */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\\"0 0 200 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cfilter id=\\"noiseFilter\\"%3E%3CfeTurbulence type=\\"fractalNoise\\" baseFrequency=\\"0.65\\" numOctaves=\\"3\\" stitchTiles=\\"stitch\\"%3E%3C/feTurbulence%3E%3C/filter%3E%3Crect width=\\"100%25\\" height=\\"100%25\\" filter=\\"url(%23noiseFilter)\\"/%3E%3C/svg%3E")' }} 
        />
      </div>

      {/* Persistent abstract gold rings */}
      <motion.div
        className="absolute left-[80%] top-[10%] w-[30vw] h-[30vw] rounded-full border border-[var(--color-accent)] opacity-20 blur-[1px]"
        animate={{
          scale: [1, 1.2, 0.8, 1.5, 1][currentScene],
          x: ['0vw', '-20vw', '-40vw', '10vw', '0vw'][currentScene],
          y: ['0vh', '10vh', '40vh', '-10vh', '0vh'][currentScene],
        }}
        transition={{ duration: 4, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute left-[10%] top-[70%] w-[40vw] h-[40vw] rounded-full border-[2px] border-[var(--color-primary)] opacity-30"
        animate={{
          scale: [0.8, 1.5, 1, 0.6, 0.8][currentScene],
          x: ['0vw', '30vw', '10vw', '-10vw', '0vw'][currentScene],
          opacity: currentScene === 4 ? 0 : 0.3,
        }}
        transition={{ duration: 5, ease: 'easeInOut' }}
      />

      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>

      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
      />
    </div>
  );
}
