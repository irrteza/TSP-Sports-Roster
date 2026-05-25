import React from 'react';
import { ArrowUpRight } from 'lucide-react';

const About: React.FC = () => {
  return (
    <section id="about" className="bg-[#5072a7] py-24 px-6 text-white">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center gap-2 mb-8">
           <div className="w-6 h-6 rounded-full border border-white/30 flex items-center justify-center">
             <div className="w-2 h-2 bg-white rounded-full"></div>
           </div>
           <span className="text-lg">Who we are</span>
        </div>

        <h2 className="text-7xl md:text-9xl font-semibold mb-24 tracking-tight">About us</h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
          {/* Left Text Block */}
          <div className="lg:col-span-4 space-y-12">
            <p className="text-2xl md:text-3xl leading-snug font-light">
              TSP Talent was founded by Joe and Moe — two creators turned entrepreneurs who saw a gap in how brands and influencers worked together.
            </p>
            
            <button className="group flex items-center gap-4 border border-white/30 pl-6 pr-2 py-2 rounded-full hover:bg-white hover:text-[#5072a7] transition-all duration-300">
              <span className="text-sm font-semibold tracking-wide">LEARN MORE ABOUT US</span>
              <div className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center group-hover:border-[#5072a7]">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </button>
          </div>

          {/* Right Cards Grid */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Joe Card */}
            <div className="relative h-[600px] rounded-3xl overflow-hidden bg-gray-800">
               <img 
                 src="https://images.unsplash.com/photo-1549476464-37392f717541?q=80&w=800&auto=format&fit=crop" 
                 alt="Joe Co-Founder" 
                 className="w-full h-full object-cover opacity-80"
               />
               <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black/80 to-transparent">
                 <h3 className="text-3xl font-bold mb-1">Joe — Co-Founder</h3>
                 <p className="text-sm font-medium tracking-wider opacity-80">MARKETING DIRECTOR</p>
               </div>
            </div>

            {/* Moe Card */}
            <div className="relative h-[600px] rounded-3xl overflow-hidden bg-gray-800">
               <img 
                 src="https://images.unsplash.com/photo-1545996124-0501ebae84d0?q=80&w=800&auto=format&fit=crop" 
                 alt="Moe Co-Founder" 
                 className="w-full h-full object-cover opacity-80"
               />
               <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black/80 to-transparent">
                 <h3 className="text-3xl font-bold mb-1">Moe — Co-Founder</h3>
                 <p className="text-sm font-medium tracking-wider opacity-80">OPERATIONS DIRECTOR</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;