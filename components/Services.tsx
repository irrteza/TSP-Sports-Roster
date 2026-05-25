import React from 'react';
import { Minus } from 'lucide-react';

const Services: React.FC = () => {
  return (
    <section className="py-24 px-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-2 mb-12">
        <div className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center">
          <div className="w-2 h-2 bg-gray-900 rounded-full"></div>
        </div>
        <span className="text-lg text-gray-600">What we do</span>
      </div>

      <h2 className="text-7xl md:text-9xl font-semibold mb-24 tracking-tight text-center">Our Services</h2>

      <div className="space-y-6">
        {/* Service Item 01 */}
        <div className="bg-[#1e293b] rounded-[2.5rem] p-10 md:p-16 text-white relative overflow-hidden">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12">
             <div className="flex items-start gap-8">
               <span className="text-xl font-light opacity-60 mt-1">01</span>
               <div className="w-2 h-2 bg-blue-400 rounded-full mt-3"></div>
               <h3 className="text-4xl md:text-6xl font-semibold tracking-tight">Influencer Campaign Management</h3>
             </div>
             <button className="bg-white text-black w-12 h-12 rounded-full flex items-center justify-center mt-6 md:mt-0">
               <Minus className="w-6 h-6" />
             </button>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
             <div className="space-y-8">
               <p className="text-xl text-gray-300 font-light leading-relaxed max-w-xl">
                 From strategy to execution, we handle every stage of your influencer campaign.
               </p>
               <div className="flex flex-wrap gap-3">
                 {['Strategy Development', 'Brief Creation', 'Campaign Coordination', 'Performance Tracking', '+2'].map((tag) => (
                   <span key={tag} className="px-4 py-2 bg-white/10 rounded-full text-sm font-medium backdrop-blur-sm">
                     {tag}
                   </span>
                 ))}
               </div>
             </div>
             
             {/* Collage Image Mockup */}
             <div className="relative h-64 md:h-80 w-full max-w-md ml-auto transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <img 
                   src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=800" 
                   className="absolute top-0 right-0 w-48 h-64 object-cover rounded-2xl shadow-2xl z-10 border-4 border-[#1e293b]"
                   alt="Creator 1"
                />
                 <img 
                   src="https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&q=80&w=800" 
                   className="absolute top-8 right-32 w-48 h-64 object-cover rounded-2xl shadow-2xl opacity-80 border-4 border-[#1e293b]"
                   alt="Creator 2"
                />
             </div>
           </div>
        </div>

        {/* Service Item 02 */}
        <div className="bg-[#1e293b] rounded-[2.5rem] p-10 md:p-16 text-white flex justify-between items-center cursor-pointer hover:bg-[#26334a] transition-colors">
            <div className="flex items-center gap-8">
               <span className="text-xl font-light opacity-60">02</span>
               <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
               <h3 className="text-4xl md:text-5xl font-semibold tracking-tight">Creator Sourcing</h3>
            </div>
             <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
               <Minus className="w-6 h-6 rotate-90" />
             </div>
        </div>
      </div>
    </section>
  );
};

export default Services;