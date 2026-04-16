import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useSiteData } from '../context/SiteContext';
import DynamicMedia from './DynamicMedia';
import { useTranslation } from 'react-i18next';
const API_URL = import.meta.env.DEV ? 'http://localhost:3000' : 'https://bot.godzillaconsulting.ai';
                </div>

            </div>
        </section>
    );
};

export default Servicios;
