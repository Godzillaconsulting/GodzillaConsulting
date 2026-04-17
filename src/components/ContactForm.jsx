import React, { useState } from'react';
import { CheckCircle, ArrowRight, Video, MapPin } from'lucide-react';
import godzillaLogoCircle from'../assets/images/logo-godzilla-circle.png';
import instagramIcon from'../assets/icons/1725819461instagram-logo.png';
import facebookIcon from'../assets/icons/1730342312_facebook-logo-2024.png';
import tiktokIcon from'../assets/icons/tik-tok-png-logo-dad7.png';
import youtubeIcon from'../assets/icons/1701508703YouTube-Icon-PNG.png';
import linkedinIcon from'../assets/icons/1715491568linkedin-icon-png.png';
import { useTranslation } from 'react-i18next';

const ContactForm = ({ showNewsletter = true }) => {
 const { t, i18n } = useTranslation();
 const isEng = i18n.resolvedLanguage?.startsWith('en');
 const [isSubmitted, setIsSubmitted] = useState(false);
 const [sessionType, setSessionType] = useState('video'); //'video' |'presencial'
 const [calendarLink, setCalendarLink] = useState('');

 // Estados para los campos de captura
 const [nombre, setNombre] = useState('');
 const [email, setEmail] = useState('');
 const [telefono, setTelefono] = useState('');
 const [fecha, setFecha] = useState('');
 const [hora, setHora] = useState('');
 const [isLoading, setIsLoading] = useState(false);

 // Estados para el newsletter
 const [nlEmail, setNlEmail] = useState('');
 const [nlStatus, setNlStatus] = useState('idle'); // idle, loading, success, error
 const [nlMsg, setNlMsg] = useState('');

 const handleSubmit = async (e) => {
 e.preventDefault();
 setIsLoading(true);

 const API_URL = import.meta.env.VITE_BACKEND_URL ||'/api/contact';

 const fallbackSilent = () => {
 setIsSubmitted(true);
 setNombre('');
 setEmail('');
 setTelefono('');
 setFecha('');
 setHora('');
 };

 try {
 const res = await fetch(API_URL, {
 method:'POST',
 headers: {'Content-Type':'application/json' },
 body: JSON.stringify({ nombre, email, telefono, preferencia_sesion: sessionType, fecha, hora })
 });

 if (!res.ok) {
 const errorText = await res.text();
 // Si es un error controlado (400, 409, 429), parsearlo y mostrar el mensaje amigable
 if (res.status === 400 || res.status === 409 || res.status === 429) {
 try {
 const errData = JSON.parse(errorText);
 alert(`${errData.message}`);
 } catch (e) {
 alert(`Aviso: ${errorText}`);
 }
 } else {
 alert(`Error interno (${res.status}). Por favor, intenta más tarde.`);
 }
 return;
 }

 const data = await res.json();

 if (data.success) {
 if (window.fbq) {
 window.fbq('track','Lead');
 window.fbq('track','Schedule');
 }
 // Guardar link personal del calendario si vino en la respuesta
 if (data.personal_calendar_link) {
 setCalendarLink(data.personal_calendar_link);
 }
 fallbackSilent();
 } else {
 alert(data.message ||'Error del servidor');
 }
 } catch (error) {
 console.error('Fetch error:', error);
 alert(`Error de conexión: ${error.message}`);
 } finally {
 setIsLoading(false);
 }
 };

 const handleNewsletterSubmit = async (e) => {
  e.preventDefault();
  if (!nlEmail.trim()) return;
  setNlStatus('loading');
  try {
  const base = '' || (import.meta.env.DEV ? 'http://localhost:3000' : '');
  const res = await fetch(`${base}/api/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: nlEmail, source: 'website' })
  });
  const data = await res.json();
  if (data.success) {
      setNlStatus('success');
      setNlMsg(t('contact.subscribedOk'));
      setNlEmail('');
  } else {
      setNlStatus('error');
      setNlMsg(data.message || t('contact.subscribedError'));
  }
  } catch (err) {
      setNlStatus('error');
      setNlMsg(t('contact.networkError'));
  }
  // Auto-hide success/error message after 5 seconds
  setTimeout(() => { setNlStatus('idle'); setNlMsg(''); }, 5000);
  };

  const resetForm = () => {
 setIsSubmitted(false);
 window.scrollTo({ top: 0, behavior:'smooth' });
 };

 const today = new Date();
 // Ajustar a la zona horaria local para evitar desfasajes en minDate
 const minDateStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

 // Verifica si la cadena YYYY-MM-DD cae en fin de semana o feriado en EE. UU.
 const isWeekendOrHoliday = (dateString) => {
 const d = new Date(`${dateString}T00:00:00`);
 const dayOfWeek = d.getDay();
 if (dayOfWeek === 0 || dayOfWeek === 6) return true; // Sábado o Domingo

 const month = d.getMonth() + 1;
 const day = d.getDate();
 const year = d.getFullYear();

 const getNthDayOfMonth = (n, targetDayOfWeek, m, y) => {
 let count = 0;
 for (let i = 1; i <= 31; i++) {
 const temp = new Date(y, m - 1, i);
 if (temp.getMonth() !== m - 1) break;
 if (temp.getDay() === targetDayOfWeek) {
 count++;
 if (count === n) return i;
 }
 }
 return -1;
 };

 const getLastDayOfMonth = (targetDayOfWeek, m, y) => {
 let lastDay = -1;
 for (let i = 1; i <= 31; i++) {
 const temp = new Date(y, m - 1, i);
 if (temp.getMonth() !== m - 1) break;
 if (temp.getDay() === targetDayOfWeek) {
 lastDay = i;
 }
 }
 return lastDay;
 };

 // Fijos
 if (month === 1 && day === 1) return true;
 if (month === 6 && day === 19) return true;
 if (month === 7 && day === 4) return true;
 if (month === 11 && day === 11) return true;
 if (month === 12 && day === 25) return true;

 // Variables
 if (month === 1 && day === getNthDayOfMonth(3, 1, 1, year)) return true; // MLK
 if (month === 2 && day === getNthDayOfMonth(3, 1, 2, year)) return true; // Presidents
 if (month === 5 && day === getLastDayOfMonth(1, 5, year)) return true; // Memorial
 if (month === 9 && day === getNthDayOfMonth(1, 1, 9, year)) return true; // Labor 
 if (month === 10 && day === getNthDayOfMonth(2, 1, 10, year)) return true; // Columbus 
 if (month === 11 && day === getNthDayOfMonth(4, 4, 11, year)) return true; // Thanksgiving

 return false;
 };

 const handleFechaChange = (e) => {
 const val = e.target.value;
 if (!val) {
 setFecha('');
 return;
 }

 if (isWeekendOrHoliday(val)) {
 alert('Por favor selecciona una fecha válida: de Lunes a Viernes y que no sea un día feriado en EE. UU.');
 setFecha('');
 e.target.value ='';
 } else {
 setFecha(val);
 }
 };

 return (
 <section id="contacto" className="py-24 bg-[#F4F4F4]">
 <div className="container mx-auto px-6 max-w-7xl">
 <div className="flex flex-col lg:flex-row gap-16">

 {/* Left Text Column */}
 <div className="lg:w-1/2 flex flex-col justify-start lg:pt-4">
 <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#CC0000] mb-8 leading-tight tracking-tighter drop-shadow-sm">
 {t('contact.title')}
 </h2>
 <h3 className="text-3xl font-bold text-[#111111] mb-6 tracking-tight">
 {t('contact.h3')}
 </h3>
 <p className="text-xl text-gray-700 leading-relaxed font-medium mb-12">
 {t('contact.subtitle')}
 </p>

 <div className="mt-8">
 <p className="text-lg italic text-gray-600 mb-2 font-medium">{t('contact.noOffice')}</p>
 <h4 className="text-2xl font-black text-[#111111] tracking-wide">
 {t('contact.visitText')}
 </h4>
 </div>
 </div>

 {/* Right Form Column */}
 <div className="lg:w-1/2">
 <div className="bg-[#18181b] p-8 md:p-12 rounded-[2rem] shadow-2xl relative border-[6px] border-[#CC0000] w-full">
 {!isSubmitted ? (
 <form className="text-white flex flex-col gap-6" onSubmit={handleSubmit}>

 {/* Nombre */}
 <div>
 <label className="flex items-center text-sm font-bold mb-2">
 {t('contact.name')} <span className="text-[#CC0000] mx-1">*</span>
 </label>
 <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Juan José Pérez Rojas" className="w-full bg-white text-gray-800 placeholder-gray-500 italic px-4 py-3 outline-none focus:ring-2 focus:ring-[#CC0000]" />
 </div>

 {/* Email */}
 <div>
 <label className="flex items-center text-sm font-bold mb-2">
 {t('contact.email')} <span className="text-[#CC0000] mx-1">*</span>
 </label>
 <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Juanjoseprojas@outlook.com" className="w-full bg-white text-gray-800 placeholder-gray-500 italic px-4 py-3 outline-none focus:ring-2 focus:ring-[#CC0000]" />
 </div>

 {/* Teléfono */}
 <div>
 <label className="flex items-center text-sm font-bold mb-2">
 {t('contact.phone')} <span className="text-[#CC0000] mx-1">*</span>
 </label>
 <div className="flex bg-white">
 <select className="bg-transparent text-gray-700 px-3 py-3 border-r border-gray-300 outline-none appearance-none cursor-pointer text-center" style={{ backgroundImage:"url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundRepeat:'no-repeat', backgroundPosition:'right 0.5rem center', backgroundSize:'1em', paddingRight:'2rem' }}>
 <option>+52</option>
 <option>+1</option>
 </select>
 <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} required placeholder="656 958 4728" className="w-full bg-transparent text-gray-800 placeholder-gray-500 italic px-4 py-3 outline-none focus:ring-2 focus:ring-[#CC0000]" />
 </div>
 </div>

 {/* Preferencia de sesión */}
 <div className="pt-2">
 <label className="flex items-center text-sm font-bold mb-4">
 {t('contact.sessionLabel')} <span className="text-[#CC0000] mx-1">*</span>
 </label>
 <div className="flex flex-col gap-4">
 <button
 type="button"
 onClick={() => setSessionType('video')}
 className={`group flex items-center justify-center gap-3 py-4 rounded-full font-bold italic transition-all ${sessionType ==='video' ?'bg-[#CC0000] text-white shadow-[0_4px_14px_rgba(204,0,0,0.4)] hover:bg-white hover:text-[#CC0000]' :'bg-transparent text-white border border-white hover:bg-white hover:border-white hover:text-[#CC0000]'}`}
 >
 <Video size={20} className={sessionType ==='video' ?'text-current fill-current' :'text-current group-hover:fill-current'} />
 {t('contact.sessionVideo')}
 </button>
 <button
 type="button"
 onClick={() => setSessionType('presencial')}
 className={`group flex items-center justify-center gap-3 py-4 rounded-full font-bold italic transition-all ${sessionType ==='presencial' ?'bg-[#CC0000] text-white shadow-[0_4px_14px_rgba(204,0,0,0.4)] hover:bg-white hover:text-[#CC0000]' :'bg-transparent text-white border border-white hover:bg-white hover:border-white hover:text-[#CC0000]'}`}
 >
 <MapPin size={20} className={sessionType ==='presencial' ?'text-current fill-current' :'text-current group-hover:fill-current'} />
 {t('contact.sessionInPerson')}
 </button>
 </div>
 </div>

 {/* Fecha y Hora */}
 <div className="grid grid-cols-2 gap-6 pt-2">
 <div>
 <label className="flex items-center text-sm font-bold mb-2">
 {t('contact.dateLabel')} <span className="text-[#CC0000] mx-1">*</span>
 </label>
 <input
 type="date"
 required
 min={minDateStr}
 value={fecha}
 onChange={handleFechaChange}
 className="w-full bg-white text-gray-800 italic px-4 py-3 outline-none focus:ring-2 focus:ring-[#CC0000] appearance-none cursor-pointer"
 />
 </div>
 <div>
 <label className="flex items-center text-sm font-bold mb-2">
 {t('contact.timeLabel')} <span className="text-[#CC0000] mx-1">*</span>
 </label>
 <select required value={hora} onChange={(e) => setHora(e.target.value)} className="w-full bg-white text-gray-800 italic px-4 py-3 outline-none focus:ring-2 focus:ring-[#CC0000] appearance-none cursor-pointer" style={{ backgroundImage:"url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundRepeat:'no-repeat', backgroundPosition:'right 1rem center', backgroundSize:'1em' }}>
 <option value="" disabled className="text-gray-500">{t('contact.timePlaceholder')}</option>
 <option value="09:00">09:00 AM</option>
 <option value="12:00">12:00 PM</option>
 <option value="15:00">03:00 PM</option>
 <option value="18:00">06:00 PM</option>
 </select>
 </div>
 </div>

 {/* Submit */}
 <div className="flex flex-col items-center pt-8">
 <button type="submit" disabled={isLoading} className={`hover:bg-white text-white hover:text-[#CC0000] px-10 py-4 rounded-full font-bold text-lg w-auto transition-all hover:scale-105 shadow-[0_4px_14px_rgba(204,0,0,0.4)] ${isLoading ?'bg-gray-500 cursor-not-allowed' :'bg-[#CC0000]'}`}>
 {isLoading ? t('contact.submitting') : t('contact.submit')}
 </button>
 <p className="mt-6 text-sm font-bold italic text-white flex items-center">
 {t('contact.required')} <span className="text-[#CC0000] text-lg leading-none ml-1">*</span>
 </p>
 </div>
 </form>
 ) : (
 <div className="flex flex-col items-center justify-center py-20 animate-fadeIn text-center">
 <CheckCircle size={80} className="text-[#25D366] mb-8 animate-bounce" />
 <p className="text-[#25D366] font-bold text-sm tracking-widest mb-4">
 {t('contact.confirmed')}
 </p>
 <h3 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight">
 {t('contact.thankyou')}
 </h3>
 <p className="text-gray-300 text-lg mb-8 max-w-sm mx-auto">
 {t('contact.appointmentSet')}
 </p>
 {calendarLink && (
 <a
 href={calendarLink}
 target="_blank"
 rel="noopener noreferrer"
 className="flex items-center gap-2 bg-[#CC0000] text-white px-8 py-4 rounded-full font-bold text-base mb-8 hover:bg-white hover:text-[#CC0000] transition-all shadow-lg"
 >
 📅 {t('contact.addCalendar')}
 </a>
 )}
 <button onClick={resetForm} className="bg-transparent text-white border-2 border-white px-10 py-3 rounded-full font-bold hover:bg-white hover:text-[#111111] transition-colors">
 {t('contact.backForm')}
 </button>
 </div>
 )}
 </div>
 </div>
 </div>

 {showNewsletter && (
 <div className="mt-28 max-w-[350px] mx-auto flex flex-col items-center justify-center text-center">
 <img src={godzillaLogoCircle} alt="Godzilla Consulting Logo" className="w-[124px] h-[124px] object-contain mb-8" />
  <h4 className="text-3xl font-black text-[#111111] mb-8 leading-tight tracking-tight">
  {t('contact.newsletter')}
  </h4>
  <form onSubmit={handleNewsletterSubmit} className="w-full flex items-center border-b border-gray-400 pb-2 mb-2 group cursor-pointer focus-within:border-[#CC0000] focus-within:border-b-2 transition-all">
  <input
  type="email"
  value={nlEmail}
  onChange={e => setNlEmail(e.target.value)}
  required
  disabled={nlStatus === 'loading'}
  placeholder={t('contact.newsletterPlaceholder')}
  className="w-full bg-transparent outline-none text-[#111111] placeholder-gray-500 font-medium text-sm disabled:opacity-50"
  />
  <button type="submit" disabled={nlStatus === 'loading'} className="text-[#111111] group-hover:text-[#CC0000] transition-colors focus:outline-none ml-2 disabled:opacity-50">
  <ArrowRight size={20} />
  </button>
  </form>
  <div className="h-6 w-full text-left">
    {nlStatus === 'success' && <p className="text-[10px] text-green-600 font-bold tracking-wide">{nlMsg}</p>}
    {nlStatus === 'error' && <p className="text-[10px] text-red-600 font-bold tracking-wide">{nlMsg}</p>}
    {nlStatus === 'idle' && <p className="text-[10px] text-gray-500 font-medium tracking-wide">{t('contact.newsletterLatest')}</p>}
  </div>

  <div className="mb-16"></div>

  <h5 className="font-bold text-[#111111] mb-6">{t('contact.followUs')}</h5>
 <div className="flex justify-center items-center gap-8">
 <a href="https://www.instagram.com/godzilla_consulting/" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
 <img src={instagramIcon} alt="Instagram" className="w-10 h-10 object-contain" />
 </a>
 <a href="https://www.facebook.com/godzillajuarez" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
 <img src={facebookIcon} alt="Facebook" className="w-10 h-10 object-contain" />
 </a>
 <a href="https://www.tiktok.com/@godzilla_co_jrz" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
 <img src={tiktokIcon} alt="TikTok" className="w-10 h-10 object-contain" />
 </a>
 <a href="https://www.youtube.com/channel/UCNg0_UUqZCt4SFdE3TxutLw" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
 <img src={youtubeIcon} alt="YouTube" className="w-10 h-10 object-contain" />
 </a>
 </div>
 </div>
 )}

 </div>
 </section >
 );
};

export default ContactForm;
