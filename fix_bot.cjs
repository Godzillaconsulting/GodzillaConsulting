const fs = require('fs');

// 1. Fix en.json
const enPath = 'c:/Users/GODZILLA.IA/GodzillaConsulting/src/locales/en.json';
let enTxt = fs.readFileSync(enPath, 'utf8');

enTxt = enTxt.replace(/Ciudad Juárez, Chihuahua\.\\\\n\\\\nWe have worked/g, 'Ciudad Juárez, Chihuahua.\\n\\nWe have worked');
enTxt = enTxt.replace(/restaurants, and more\.\\\\n\\\\nWe design/g, 'restaurants, and more.\\n\\nWe design');

const servicesAcordions = {
  "bots": {
    "accTitle1": "Real-time Lead Qualification",
    "accDesc1": "Filter window-shoppers from clients with a real budget automatically.",
    "accTitle2": "Direct Scheduling without Intervention",
    "accDesc2": "Full synchronization with your calendar to fill your appointment schedule.",
    "accTitle3": "Multichannel AI Support",
    "accDesc3": "Simultaneous support on WhatsApp, Instagram, and Web.",
    "accTitle4": "Automated Nurturing",
    "accDesc4": "Intelligent follow-up for prospects who didn't buy on the first contact.",
    "accTitle5": "Native CRM Integration",
    "accDesc5": "Data from each conversation go straight to your database."
  },
  "video": {
    "accTitle1": "Strategic Storytelling",
    "accDesc1": "Scripts designed with the 'Epiphany Bridge' to connect emotionally.",
    "accTitle2": "High-Retention Editing",
    "accDesc2": "Content optimized to capture attention in the first 3 seconds.",
    "accTitle3": "Cinematic Aesthetics",
    "accDesc3": "Visual quality that justifies premium pricing and attracts high-value clients.",
    "accTitle4": "Video Sales Letters (VSL)",
    "accDesc4": "Production focused 100% on your sales funnel conversion.",
    "accTitle5": "Viral Micro-Content",
    "accDesc5": "Optimized snippets for Reels, TikTok, and YouTube Shorts."
  },
  "funnels": {
    "accTitle1": "Value Ladder Architecture",
    "accDesc1": "Designing stepping stones from lead magnet to your premium offer.",
    "accTitle2": "Optimized Landing Pages",
    "accDesc2": "Optimized with neuro-marketing principles for High Conversion.",
    "accTitle3": "Follow-up Email Marketing",
    "accDesc3": "'Soap Opera' sequences to nurture and convert.",
    "accTitle4": "Payment Gateway Integration",
    "accDesc4": "Smooth and secure one-click purchasing experience.",
    "accTitle5": "Continuous A/B Testing",
    "accDesc5": "Constant split-testing of headlines and offers to maximize your ROI."
  },
  "social": {
    "accTitle1": "Omnichannel Content Strategy",
    "accDesc1": "Presence where your 'Dream 100' interacts daily.",
    "accTitle2": "Direct Response Copywriting",
    "accDesc2": "Texts that prompt action, not just a like.",
    "accTitle3": "Active Community Management",
    "accDesc3": "We turn comments and DMs into real sales opportunities.",
    "accTitle4": "Organic Growth Hacking",
    "accDesc4": "Tactics to scale your reach without purely relying on ads.",
    "accTitle5": "Sentiment Analysis & KPIs",
    "accDesc5": "Monthly audience growth and real engagement reports."
  },
  "seo": {
    "accTitle1": "Keyword Audit",
    "accDesc1": "We identify terms that generate transactions, not just volume.",
    "accTitle2": "Technical & On-Page SEO",
    "accDesc2": "Speed and structure optimization so Google loves you.",
    "accTitle3": "Link Building Strategy",
    "accDesc3": "Quality backlinks that elevate your competitive relevance.",
    "accTitle4": "Content Marketing",
    "accDesc4": "Thematic articles that answer questions and position your expertise.",
    "accTitle5": "Google Business Profile",
    "accDesc5": "Local map dominance to capture nearby, ready-to-buy clients."
  },
  "crm": {
    "accTitle1": "Visual Sales Pipeline",
    "accDesc1": "Total control over which stage each potential client is in.",
    "accTitle2": "Workflow Automation",
    "accDesc2": "Automatic triggers for emails, SMS, and tasks for your team.",
    "accTitle3": "Real-Time Metrics Dashboard",
    "accDesc3": "Visualize your CAC, LTV, and closing rates instantly.",
    "accTitle4": "Channel Centralization",
    "accDesc4": "Answer WhatsApp, Instagram, and Email from a single inbox.",
    "accTitle5": "Intelligent Lead Assignment",
    "accDesc5": "Automatic distribution of prospects to your best salespeople."
  }
};

const enJSON = JSON.parse(enTxt);

if (enJSON.packages && enJSON.packages.landing) {
  enJSON.packages.landing['posicionamiento-social'].heroTopText = "Position your brand where your audience really interacts";
  enJSON.packages.landing['posicionamiento-social'].heroDisclaimer = "If in <span class=\"font-bold text-white not-italic\">14 days</span> you don't see a real increase in engagement and the quality of your brand, the next month is <span class=\"font-bold text-[#CC0000] not-italic\">FREE</span>.";
  
  enJSON.packages.landing['control-ia'].heroTopText = "Attend, qualify, and schedule automatically 24 hours a day";
  enJSON.packages.landing['control-ia'].heroDisclaimer = "If in <span class=\"font-bold text-white not-italic\">7 business days</span> your system is not installed, responding to messages, and capturing customer data automatically, we will give you the next month of service completely <span class=\"font-bold text-white not-italic\">FREE</span>.";
  
  enJSON.packages.landing['expansion'].heroTopText = "Organize a system that captures, attends, and organizes your prospects without you lifting a finger";
  enJSON.packages.landing['expansion'].heroDisclaimer = "If in <span class=\"font-bold text-[#CC0000] not-italic\">30 business days</span> we do not generate a single lead, we will refund <span class=\"font-bold text-[#CC0000] not-italic\">100%</span> of your money.";
  
  if (enJSON.packages.landing['elite']) {
    enJSON.packages.landing['elite'].heroTopText = "The complete system to dominate your market in all aspects";
    enJSON.packages.landing['elite'].heroDisclaimer = "If we do not increase your appointments by <span class=\"font-bold text-white not-italic\">20% in 90 business days</span>, we will work for <span class=\"font-bold text-white not-italic\">free</span>.";
  }
}

if (enJSON.services && enJSON.services.items) {
  for (let key in servicesAcordions) {
    if (enJSON.services.items[key]) {
      Object.assign(enJSON.services.items[key], servicesAcordions[key]);
    }
  }
}

fs.writeFileSync(enPath, JSON.stringify(enJSON, null, 2), 'utf8');

// 2. Fix LandingPaqueteDynamic.jsx
const landingPath = 'c:/Users/GODZILLA.IA/GodzillaConsulting/src/components/LandingPaqueteDynamic.jsx';
let landingTxt = fs.readFileSync(landingPath, 'utf8');

landingTxt = landingTxt.replace(
  "dangerouslySetInnerHTML={renderHTML(content.heroDisclaimer)}",
  "dangerouslySetInnerHTML={renderHTML(isIntl && localizedLanding.heroDisclaimer ? localizedLanding.heroDisclaimer : content.heroDisclaimer)}"
);
landingTxt = landingTxt.replace(
  "{content.heroTopText}",
  "{isIntl && localizedLanding.heroTopText ? localizedLanding.heroTopText : content.heroTopText}"
);
landingTxt = landingTxt.replace(
    /opacity-0 group-hover:opacity-100 transition-opacity duration-300/g,
    "opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300"
);
fs.writeFileSync(landingPath, landingTxt, 'utf8');

// 3. Fix the 6 Service Components
const files = [
  'Bots.jsx', 'ProduccionAudiovisual.jsx', 'EmbudosDeVenta.jsx', 
  'GestionRedesSociales.jsx', 'OptimizacionWebSeo.jsx', 'CrmSaas.jsx'
];
const idMap = {
  'Bots.jsx': 'bots',
  'ProduccionAudiovisual.jsx': 'video',
  'EmbudosDeVenta.jsx': 'funnels',
  'GestionRedesSociales.jsx': 'social',
  'OptimizacionWebSeo.jsx': 'seo',
  'CrmSaas.jsx': 'crm'
};

files.forEach(file => {
  let p = 'c:/Users/GODZILLA.IA/GodzillaConsulting/src/components/' + file;
  if (!fs.existsSync(p)) return;
  
  let txt = fs.readFileSync(p, 'utf8');
  
  if (!txt.includes('useTranslation')) {
    txt = txt.replace(
      "import { useSiteData } from '../context/SiteContext';",
      "import { useSiteData } from '../context/SiteContext';\\nimport { useTranslation } from 'react-i18next';"
    );
  }
  
  if (!txt.includes('const { t, i18n } = useTranslation();')) {
    txt = txt.replace(
      "const { getNodeData } = useSiteData();",
      "const { t, i18n } = useTranslation();\\n    const isEng = !i18n.resolvedLanguage?.startsWith('es');\\n    const { getNodeData } = useSiteData();"
    );
  }
  
  const compId = idMap[file];
  
  for(let i=1; i<=5; i++) {
    let titleMatch = new RegExp(`title: content\\.accTitle${i} \\|\\| "(.*?)"`);
    let titleRes = txt.match(titleMatch);
    if(titleRes) {
      txt = txt.replace(titleMatch, `title: isEng ? t("services.items.${compId}.accTitle${i}") : (content.accTitle${i} || "${titleRes[1]}")`);
    }
    
    let descMatch = new RegExp(`desc: content\\.accDesc${i} \\|\\| "(.*?)"`);
    let descRes = txt.match(descMatch);
    if (descRes) {
      txt = txt.replace(descMatch, `desc: isEng ? t("services.items.${compId}.accDesc${i}") : (content.accDesc${i} || "${descRes[1]}")`);
    }
  }

  // Use string references to avoid JS execution parsing errors
  let targetHtmlStr = `__html: content.title.replace(/\\n/g, '<br />')`;
  let replacementHtmlStr = `__html: (isEng ? t('services.items.${compId}.title') : content.title).replace(/\\n/g, '<br />')`;
  
  if (txt.includes(targetHtmlStr)) {
      txt = txt.replace(targetHtmlStr, replacementHtmlStr);
  }
  
  let targetHtmlStr2 = `__html: content.title.replace(/\\\\n/g, '<br />')`;
  let replacementHtmlStr2 = `__html: (isEng ? t('services.items.${compId}.title') : content.title).replace(/\\\\n/g, '<br />')`;
  
  if (txt.includes(targetHtmlStr2)) {
      txt = txt.replace(targetHtmlStr2, replacementHtmlStr2);
  }
  
  if (txt.includes('{content.subtitle}')) {
      txt = txt.replace(
          "{content.subtitle}",
          `{isEng ? t('services.items.${compId}.desc') : content.subtitle}`
      );
  }
  
  if (txt.includes('{content.ctaText}')) {
      txt = txt.replace(
          "{content.ctaText}",
          `{isEng ? 'Schedule appointment' : content.ctaText}`
      );
  }

  txt = txt.replace(
    /opacity-0 group-hover:opacity-100 transition-opacity duration-300/g,
    "opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300"
  );

  fs.writeFileSync(p, txt, 'utf8');
});

console.log('Script execution completed successfully.');
