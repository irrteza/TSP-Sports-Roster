import React from 'react';
import { ArrowUpRight } from 'lucide-react';

const Testimonials: React.FC = () => {
  return (
    <section className="relative py-32 px-6 overflow-hidden bg-gradient-to-br from-[#4a6fa5] via-[#5d83b6] to-[#8fb3e0] text-white">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/noise.png')] opacity-10 pointer-events-none"></div>

      <div className="max-w-[1400px] mx-auto relative z-10">
        <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
                 <div className="w-6 h-6 rounded-full border border-white/30 flex items-center justify-center">
                    <span className="text-xs">+</span>
                 </div>
                 <span className="text-lg font-medium opacity-90">Testimonials</span>
            </div>
        </div>

        <h2 className="text-6xl md:text-8xl font-semibold text-center mb-6 tracking-tight">What Our Partners Say</h2>
        
        <p className="text-xl md:text-2xl text-center max-w-3xl mx-auto opacity-90 mb-16 font-light">
            We've helped brands of all sizes connect with the right creators, craft authentic campaigns, and drive real conversions.
        </p>

        <div className="flex justify-center mb-24">
            <button className="flex items-center gap-3 px-8 py-4 border border-white/40 rounded-none hover:bg-white hover:text-[#4a6fa5] transition-all duration-300 uppercase tracking-widest text-sm font-semibold">
                Launch Your Campaign
                <ArrowUpRight className="w-5 h-5" />
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white/10 backdrop-blur-md p-10 rounded-3xl border border-white/10 hover:bg-white/20 transition-colors">
                <p className="text-xl leading-relaxed font-light mb-8">
                    "TSP handled our influencer campaign from start to finish. The content quality and conversions were beyond our expectations — our product sold out within two weeks."
                </p>
                <div className="h-px w-full bg-white/20 mb-4"></div>
                <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-white/20 rounded-full"></div>
                     <span className="font-medium text-sm">Marketing Director, FitLife</span>
                </div>
            </div>

            {/* Testimonial 2 */}
             <div className="bg-white/10 backdrop-blur-md p-10 rounded-3xl border border-white/10 hover:bg-white/20 transition-colors">
                <p className="text-xl leading-relaxed font-light mb-8">
                    "We've worked with a few influencer agencies before, but none matched TSP's transparency and communication. Their reporting and analytics were spot-on."
                </p>
                <div className="h-px w-full bg-white/20 mb-4"></div>
                <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-white/20 rounded-full"></div>
                     <span className="font-medium text-sm">CEO, Urban Wear</span>
                </div>
            </div>

             {/* Testimonial 3 */}
             <div className="bg-white/10 backdrop-blur-md p-10 rounded-3xl border border-white/10 hover:bg-white/20 transition-colors">
                <p className="text-xl leading-relaxed font-light mb-8">
                    "TSP helped us identify the right creators for our niche audience. The collaboration felt seamless and authentic — we saw a 40% lift in brand awareness."
                </p>
                <div className="h-px w-full bg-white/20 mb-4"></div>
                <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-white/20 rounded-full"></div>
                     <span className="font-medium text-sm">Brand Manager, TechGear</span>
                </div>
            </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;