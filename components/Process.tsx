import React from 'react';
import { Lightbulb, Footprints } from 'lucide-react';

const Process: React.FC = () => {
  return (
    <section className="bg-gray-50 py-24 px-6 overflow-hidden">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center gap-2 mb-16 justify-center">
            <div className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center">
                <span className="text-sm">+</span>
            </div>
            <span className="text-lg text-gray-600">Our Process</span>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between mb-16 px-4">
             <h2 className="text-6xl md:text-8xl font-semibold tracking-tight text-gray-900">How we work</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Step 1 */}
            <div className="bg-white p-12 rounded-[2rem] h-[500px] flex flex-col justify-between shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                    <span className="text-6xl font-serif italic text-gray-900">01</span>
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <Lightbulb className="w-8 h-8 text-blue-500" />
                    </div>
                </div>
                
                <div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                        <h3 className="text-3xl font-semibold text-gray-900">Discover & Strategize</h3>
                    </div>
                    <p className="text-xl text-gray-500 leading-relaxed">
                        We start by understanding your goals, audience, and brand voice. Then we design a data-driven strategy built to deliver measurable results.
                    </p>
                </div>
            </div>

             {/* Step 2 */}
             <div className="bg-white p-12 rounded-[2rem] h-[500px] flex flex-col justify-between shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                    <span className="text-6xl font-serif italic text-gray-900">02</span>
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <Footprints className="w-8 h-8 text-blue-500" />
                    </div>
                </div>
                
                 <div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                        <h3 className="text-3xl font-semibold text-gray-900">Execution & Management</h3>
                    </div>
                    <p className="text-xl text-gray-500 leading-relaxed">
                        Our team handles the heavy lifting, from outreach to contracting, ensuring a seamless collaboration process with top-tier talent.
                    </p>
                </div>
            </div>
        </div>
      </div>
    </section>
  );
};

export default Process;