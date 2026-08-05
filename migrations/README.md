Migración ejemplo: Supabase -> Netlify Database (Drizzle)

Instrucciones rápidas:

1) Exporta esquema y datos desde Supabase (SQL dump o CSV) desde el panel de Supabase.
2) Revisa las tablas importantes (ej: `employee_profiles`) y adapta los tipos a Postgres estándar.
3) Establece la variable de entorno en Netlify: `NETLIFY_DATABASE_URL` con la connection string proporcionada por Netlify Database.
4) Despliega el repositorio y ejecuta la función de migración (ejemplo):

   curl -i "https://<tu-sitio>.netlify.app/.netlify/functions/netlify-db-migrate"

5) Verifica las tablas y datos en Netlify Database o mediante consultas.

Notas:
- Esta carpeta contiene solo guías y scripts de ejemplo; personaliza las migraciones según tu esquema.
- No olvides hacer backup antes de cualquier migración.
