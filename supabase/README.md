# Supabase para Nakama Reportes

1. Crea o abre tu proyecto en Supabase con el nombre Nakama-Reportes.
2. Abre SQL Editor y pega el contenido de schema.sql.
3. Copia la URL del proyecto y la anon key desde Settings > API.
4. Crea un archivo .env en la raíz con:

VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>

5. Instala la librería:

npm install @supabase/supabase-js
