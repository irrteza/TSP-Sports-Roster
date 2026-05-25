import React from 'react';
import { motion } from 'framer-motion';

const Footer: React.FC = () => {
  return (
    <motion.footer 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="bg-white py-12 px-6 border-t border-gray-100"
    >
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <span className="font-bold text-xl tracking-tight text-gray-900">TSP TALENT</span>
            <div className="flex gap-8 text-sm text-gray-500">
                <a href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-gray-900 transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-gray-900 transition-colors">Contact</a>
            </div>
            <p className="text-gray-400 text-sm">&copy; {new Date().getFullYear()} TSP Talent. All rights reserved.</p>
        </div>
    </motion.footer>
  );
};

export default Footer;