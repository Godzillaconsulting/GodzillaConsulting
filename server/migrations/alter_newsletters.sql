-- Añadir la columna del mega-diccionario de idiomas
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS translations_json JSONB;
