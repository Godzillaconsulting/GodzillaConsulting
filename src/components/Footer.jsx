import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone } from 'lucide-react';
import logo from '../assets/Blanco_Logo.png';
import { useSiteData } from '../context/SiteContext';
import { useTranslation } from 'react-i18next';

const Footer = () => {
    const { t } = useTranslation();
    const { getNodeData } = useSiteData();
    const fd = getNodeData('footer') || {};
    return (
        <footer className="bg-gradient-to-t from-[#ba0000] via-[#850000] to-[#4a0000]">


            {/* Main Footer Links */}
            <div className="container mx-auto px-6 max-w-[1400px] py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-12 lg:gap-0 text-white">

                    {/* Contact Info */}
                    <div className="space-y-6 lg:pr-8 xl:pr-12 whitespace-pre-line">
                        <h4 className="text-2xl font-bold tracking-tight mb-8">{fd.contactTitle || t('footer.contact')}</h4>
                        <a href={`mailto:${fd.contactEmail || 'info@godzillaconsulting.ai'}`} className="flex items-center gap-3 hover:text-red-200 transition-colors">
                            <Mail size={18} />
                            <span className="font-medium">{fd.contactEmail || 'info@godzillaconsulting.ai'}</span>
                        </a>
                        <a href={`tel:+52${(fd.contactPhone || '6565818912').replace(/\s+/g,'')}`} className="flex items-center gap-3 hover:text-red-200 transition-colors">
                            <Phone size={18} />
                            <span className="font-medium">{fd.contactPhone || '656 581 8912'}</span>
                        </a>
                    </div>

                    {/* Navigation */}
                    <div className="lg:px-8 xl:px-12 lg:border-l border-white/30">
                        <h4 className="text-2xl font-bold tracking-tight mb-8">{fd.navTitle || t('footer.nav')}</h4>
                        <div className="grid grid-cols-2 gap-y-4">
                            <div className="flex flex-col gap-4">
                                <Link to="/#inicio" className="hover:text-red-200 transition-colors font-medium text-sm">{fd.navLink1 || t('footer.home')}</Link>
                                <Link to="/#cultura" className="hover:text-red-200 transition-colors font-medium text-sm">{fd.navLink2 || t('footer.culture')}</Link>
                                <Link to="/#servicios" className="hover:text-red-200 transition-colors font-medium text-sm">{fd.navLink3 || t('footer.services')}</Link>
                            </div>
                            <div className="flex flex-col gap-4">
                                <Link to="/#paquetes" className="hover:text-red-200 transition-colors font-medium text-sm">{fd.navLink4 || t('footer.packages')}</Link>
                                <Link to="/#portafolio" className="hover:text-red-200 transition-colors font-medium text-sm">{fd.navLink5 || t('footer.portfolio')}</Link>
                                <Link to="/#recursos" className="hover:text-red-200 transition-colors font-medium text-sm">{fd.navLink6 || t('footer.resources')}</Link>
                            </div>
                        </div>
                    </div>

                    {/* Legal Links */}
                    <div className="lg:px-8 xl:px-12 lg:border-l border-white/30 pt-12 lg:pt-0">
                        <h4 className="text-2xl font-bold tracking-tight mb-8">{fd.legalTitle || t('footer.legal')}</h4>
                        <div className="flex flex-col gap-4">
                            <Link to={fd.legalUrl1 || '/terminos'} className="hover:text-red-200 transition-colors font-medium text-sm">{fd.legalLink1 || t('footer.terms')}</Link>
                            <Link to={fd.legalUrl2 || '/aviso-privacidad'} className="hover:text-red-200 transition-colors font-medium text-sm">{fd.legalLink2 || t('footer.privacy')}</Link>
                            <Link to={fd.legalUrl3 || '/politica-cookies'} className="hover:text-red-200 transition-colors font-medium text-sm">{fd.legalLink3 || t('footer.cookies')}</Link>
                        </div>
                    </div>

                    {/* Logo */}
                    <div className="flex items-center justify-start lg:justify-center lg:pl-12 lg:border-l border-white/30 pt-12 lg:pt-0">
                        <Link to="/#inicio" className="transition-transform duration-300 hover:scale-105">
                            <img src={logo} alt="Godzilla Consulting" className="h-10 lg:h-12 object-contain" />
                        </Link>
                    </div>

                </div>

                {/* Copyright */}
                <div className="text-center mt-12 pt-8 text-sm font-medium text-white/70">
                    © {new Date().getFullYear()} {fd.copyrightText || t('footer.copyright')}
                </div>
            </div>
        </footer>
    );
};

export default Footer;
