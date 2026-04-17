import React from'react';
import { useTranslation } from 'react-i18next';

const Responsabilidades = () => {
 const { t } = useTranslation();
 const points = t('responsibilities.points', { returnObjects: true });

 return (
 <section className="bg-[#111111] pt-24 pb-12">
 <div className="container mx-auto px-6 max-w-5xl">
 <div className="bg-[#1A1A1A] rounded-t-[2rem] p-10 md:p-16 border-b-8 border-[#CC0000]">
 <h2 className="text-3xl sm:text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter leading-none break-words hyphens-auto">
 {t('responsibilities.title')} <br className="hidden md:block" />
 <span className="text-gray-400">{t('responsibilities.subtitle')}</span>
 </h2>
 <h3 className="text-2xl font-bold text-white mb-6">{t('responsibilities.h3')}</h3>
 <p className="text-xl text-gray-300 font-medium leading-relaxed max-w-4xl">
 {t('responsibilities.p')}
 </p>
 </div>

 <div className="bg-white rounded-b-[2rem] p-10 md:p-16 shadow-2xl">
 <ul className="space-y-6">
 {points.map((point, index) => (
 <li key={index} className="flex items-start gap-4">
 <span className="text-[#CC0000] font-black text-2xl leading-none mt-1">•</span>
 <span className="text-[#111111] text-lg font-medium leading-relaxed">
 {/* Split the first few words to bold them since the PDF highlights the start of the sentence */}
 {(() => {
 const boldPart = point.split(' ').slice(0, 3).join(' ');
 const restPart = point.substring(boldPart.length);
 return (
 <>
 <strong className="font-black">{boldPart}</strong>{restPart}
 </>
 );
 })()}
 </span>
 </li>
 ))}
 </ul>
 <div className="mt-10 pt-8 border-t border-gray-200">
 <p className="text-[#111111] font-bold text-lg">
 {t('responsibilities.warning')}
 </p>
 </div>
 </div>
 </div>
 </section>
 );
};

export default Responsabilidades;
