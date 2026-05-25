
import React from 'react';
import { motion } from 'framer-motion';
import { WavyBackground } from './ui/wavy-background';

const Hero: React.FC = () => {
  return (
    <div className="relative overflow-hidden min-h-[800px] flex items-center justify-center bg-slate-50">
      {/* Background Layer: z-0 ensures it is above global bg but below content */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2.0, ease: "easeInOut" }}
        className="absolute inset-0 z-0"
      >
        <WavyBackground 
            className="hidden" 
            containerClassName="h-full w-full"
            colors={['#e0f2fe', '#bae6fd', '#7dd3fc', '#93c5fd']}
            waveWidth={80}
            blur={10}
            speed="slow"
            waveOpacity={0.8}
            backgroundFill={null} // Ensure transparency
        />
      </motion.div>

      <section className="px-6 max-w-[1400px] mx-auto relative z-10 w-full pt-20">
        <div className="flex flex-col items-center text-center mb-12">
          
          <motion.h1 
            initial={{ opacity: 0, y: 40, filter: 'blur(12px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tighter text-slate-900 max-w-5xl leading-[0.95] mb-8"
          >
            Authentic Voices.<br className="hidden md:block" />
            <span className="text-[#5072a7]">Measurable Results.</span><br className="hidden md:block" />
            Real ROI.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg md:text-2xl text-slate-600 max-w-3xl mx-auto font-medium leading-relaxed mb-12 tracking-tight text-center"
          >
             Every collaboration is built on data, authenticity, and results you can measure.
          </motion.p>
        </div>

        <motion.div 
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 0.6 }}
          transition={{ duration: 1.5, delay: 0.6, ease: "easeOut" }}
          className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-10"
        ></motion.div>
      </section>
    </div>
  );
};

export default Hero;