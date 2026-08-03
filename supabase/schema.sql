CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.areas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL UNIQUE,
    role text NOT NULL DEFAULT 'Jefe' CHECK (role IN ('Jefe', 'TI', 'Admin')),
    password_hash text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name text NOT NULL,
    dni text UNIQUE,
    area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
    hire_date date,
    photo_url text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Clave estable usada por la aplicación para actualizar al mismo colaborador.
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employee_key text UNIQUE;

CREATE TABLE IF NOT EXISTS public.equipment (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
    area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
    employee_name text NOT NULL DEFAULT 'Pendiente',
    area_name text,
    equipment_name text NOT NULL,
    brand text,
    model text,
    serial text,
    hardware jsonb NOT NULL DEFAULT '{}'::jsonb,
    software jsonb NOT NULL DEFAULT '{}'::jsonb,
    accessories jsonb NOT NULL DEFAULT '[]'::jsonb,
    problem_description text,
    action_taken text,
    return_date date,
    replacement_date date,
    status text NOT NULL DEFAULT 'Resuelto' CHECK (status IN ('Resuelto', 'Pendiente', 'En revisión', 'En proceso')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.equipment_accessories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
    area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
    employee_name text,
    area_name text,
    name text,
    model text,
    serial text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.incidents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    severity text NOT NULL DEFAULT 'Media' CHECK (severity IN ('Baja', 'Media', 'Alta', 'Crítica')),
    status text NOT NULL DEFAULT 'Abierto' CHECK (status IN ('Abierto', 'En proceso', 'Resuelto', 'Cerrado')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type text NOT NULL,
    summary text,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'anon_select_reports') THEN
        EXECUTE 'CREATE POLICY anon_select_reports ON public.reports FOR SELECT USING (auth.role() = ''anon'')';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'anon_insert_reports') THEN
        EXECUTE 'CREATE POLICY anon_insert_reports ON public.reports FOR INSERT WITH CHECK (auth.role() = ''anon'')';
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.employee_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id uuid UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_key text NOT NULL UNIQUE,
    employee_name text NOT NULL,
    area text NOT NULL,
    dni text,
    hire_date text,
    photo_url text,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Compatibilidad con bases creadas antes de incorporar estos campos al perfil.
ALTER TABLE public.employee_profiles ADD COLUMN IF NOT EXISTS employee_index integer;
ALTER TABLE public.employee_profiles ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE public.employee_profiles ADD COLUMN IF NOT EXISTS profile_data jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS public.employee_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'anon_select_employee_profiles') THEN
        EXECUTE 'CREATE POLICY anon_select_employee_profiles ON public.employee_profiles FOR SELECT USING (auth.role() = ''anon'')';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'anon_insert_employee_profiles') THEN
        EXECUTE 'CREATE POLICY anon_insert_employee_profiles ON public.employee_profiles FOR INSERT WITH CHECK (auth.role() = ''anon'')';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'anon_update_employee_profiles') THEN
        EXECUTE 'CREATE POLICY anon_update_employee_profiles ON public.employee_profiles FOR UPDATE USING (auth.role() = ''anon'') WITH CHECK (auth.role() = ''anon'')';
    END IF;
END
$$;

-- Habilitar y permitir acceso básico anónimo a la tabla equipment
ALTER TABLE IF EXISTS public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.equipment_accessories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'anon_select_equipment') THEN
        EXECUTE 'CREATE POLICY anon_select_equipment ON public.equipment FOR SELECT USING (auth.role() = ''anon'')';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'anon_insert_equipment') THEN
        EXECUTE 'CREATE POLICY anon_insert_equipment ON public.equipment FOR INSERT WITH CHECK (auth.role() = ''anon'')';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'anon_update_equipment') THEN
        EXECUTE 'CREATE POLICY anon_update_equipment ON public.equipment FOR UPDATE USING (auth.role() = ''anon'') WITH CHECK (auth.role() = ''anon'')';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'anon_select_equipment_accessories') THEN
        EXECUTE 'CREATE POLICY anon_select_equipment_accessories ON public.equipment_accessories FOR SELECT USING (auth.role() = ''anon'')';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'anon_insert_equipment_accessories') THEN
        EXECUTE 'CREATE POLICY anon_insert_equipment_accessories ON public.equipment_accessories FOR INSERT WITH CHECK (auth.role() = ''anon'')';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'anon_delete_equipment_accessories') THEN
        EXECUTE 'CREATE POLICY anon_delete_equipment_accessories ON public.equipment_accessories FOR DELETE USING (auth.role() = ''anon'')';
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_employees_area_id ON public.employees(area_id);
CREATE INDEX IF NOT EXISTS idx_equipment_employee_id ON public.equipment(employee_id);
CREATE INDEX IF NOT EXISTS idx_equipment_accessories_equipment_id ON public.equipment_accessories(equipment_id);
CREATE INDEX IF NOT EXISTS idx_incidents_employee_id ON public.incidents(employee_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

-- Dejar que un empleado pueda tener varios equipos distintos
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_equipment_unique_employee_id ON public.equipment(employee_id) WHERE employee_id IS NOT NULL;

INSERT INTO public.areas (name, description) VALUES
    ('Contabilidad', 'Área financiera'),
    ('Ingeniería', 'Área técnica'),
    ('Logística', 'Área operativa'),
    ('Marketing', 'Área comercial'),
    ('Ofertas', 'Área de ofertas'),
    ('Operaciones', 'Área de operaciones'),
    ('Planificación', 'Área de planificación'),
    ('SAS', 'Área de soporte'),
    ('SSOMA', 'Área de seguridad'),
    ('TI', 'Área de tecnología')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.profiles (username, role) VALUES
    ('jefe', 'Jefe'),
    ('ti', 'TI')
ON CONFLICT (username) DO NOTHING;

-- Asegurar políticas RLS para la tabla employees (idempotente)
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'anon_select_employees') THEN
        EXECUTE $$CREATE POLICY anon_select_employees ON public.employees FOR SELECT USING (auth.role() = 'anon')$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'anon_insert_employees') THEN
        EXECUTE $$CREATE POLICY anon_insert_employees ON public.employees FOR INSERT WITH CHECK (auth.role() = 'anon')$$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'anon_update_employees') THEN
        EXECUTE $$CREATE POLICY anon_update_employees ON public.employees FOR UPDATE USING (auth.role() = 'anon') WITH CHECK (auth.role() = 'anon')$$;
    END IF;
    PERFORM 1;
END
$$;
