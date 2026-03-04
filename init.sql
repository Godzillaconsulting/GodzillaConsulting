-- Habilitar extensión para UUIDs (requerida en Neon)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLA: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  email_hash VARCHAR(64),
  ip_address VARCHAR(45),
  confirmed BOOLEAN DEFAULT FALSE,
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash);

-- ============================================
-- TABLA: citas
-- ============================================
CREATE TABLE IF NOT EXISTS citas (
  id SERIAL PRIMARY KEY,
  nombre_completo TEXT,
  email TEXT UNIQUE NOT NULL,
  telefono TEXT,
  tipo_sesion TEXT,
  fecha DATE,
  hora TIME WITHOUT TIME ZONE,
  notas_adicionales TEXT,
  creado_el TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citas_email ON citas(email);

-- ============================================
-- TABLA: lead_magnets
-- ============================================
CREATE TABLE IF NOT EXISTS lead_magnets (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  file_url VARCHAR(500),
  email_subject VARCHAR(255),
  email_body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: downloads
-- ============================================
CREATE TABLE IF NOT EXISTS downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_magnet_id INT NOT NULL REFERENCES lead_magnets(id) ON DELETE CASCADE,
  sent BOOLEAN DEFAULT FALSE,
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_lead_magnet_id ON downloads(lead_magnet_id);

-- ============================================
-- TABLA: audit_log
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50),
  user_id UUID,
  ip_address VARCHAR(45),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- ============================================
-- DATOS INICIALES: lead_magnets
-- ============================================
INSERT INTO lead_magnets (slug, title, file_url, email_subject, email_body)
VALUES
(
  'prompts-ia-marketing',
  '7 prompts de IA para marketing que sí funcionan',
  'https://godzillaconsulting.ai/lead-magnets/prompts-ia.pdf',
  '🎁 Aquí están tus 7 prompts de IA para marketing',
  'Hola, gracias por descargar nuestro recurso. Adjunto encontrarás los 7 prompts que realmente funcionan. Cualquier duda, responde este correo.'
),
(
  'leads-whatsapp',
  'Cómo generar leads en WhatsApp sin spam',
  'https://godzillaconsulting.ai/lead-magnets/whatsapp-guia.pdf',
  '📲 Tu guía: Genera leads en WhatsApp sin spam',
  'Hola, gracias por tu interés. Adjunto encontrarás la guía completa para generar leads en WhatsApp sin parecer spam. Estamos aquí para cualquier pregunta.'
),
(
  'crm-template',
  'Plantilla de CRM Personalizable',
  'https://godzillaconsulting.ai/lead-magnets/crm-template.xlsx',
  '📊 Tu Plantilla de CRM Personalizable está lista',
  'Hola, aquí tienes la plantilla de CRM que solicitaste. Esperamos que te ayude a organizar mejor tus ventas. ¡Mucho éxito!'
)
ON CONFLICT (slug) DO UPDATE SET file_url = EXCLUDED.file_url;
