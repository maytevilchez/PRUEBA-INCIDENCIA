/**
 * =============================================================================
 * ARCHIVO: model/data.js
 * CAPA:   Modelo (datos iniciales)
 * =============================================================================
 * Qué es:     Almacena la estructura base del inventario antes de cargar un Excel.
 * Para qué:  Define columnas, mapeo de campos y filas de ejemplo en memoria.
 * Quién lo usa: controller/app.js lee y escribe en window.APP_MODEL.
 * =============================================================================
 */

// Objeto global del modelo — toda la app consulta estos datos
window.APP_MODEL = {

    // Inventario organizado por hojas (como pestañas de Excel)
    inventoryBySheet: {

        // Hoja principal con datos de demostración
        Principal: {

            // Nombres de columnas que se muestran en la tabla
            columns: [
                "Empleado",
                "Equipo",
                "Marca",
                "Fecha de devolución",
                "Descripción del problema",
                "Acción tomada",
                "Fecha que se le entregó uno nuevo",
                "Estado"
            ],

            // Relación entre nombre interno del código y columna del Excel
            fieldMap: {
                empleado: "Empleado",
                equipo: "Equipo",
                marca: "Marca",
                fechaDevolucion: "Fecha de devolución",
                descripcionProblema: "Descripción del problema",
                accionTomada: "Acción tomada",
                fechaEntregaNuevo: "Fecha que se le entregó uno nuevo",
                estado: "Estado"
            },

            // Filas de ejemplo (se reemplazan al importar un Excel real)
            rows: [
                {
                    Empleado: "Cecy Salcedo Aranda",
                    Equipo: "Cargador de laptop USB-C",
                    Marca: "Lenovo",
                    "Fecha de devolución": "2026-03-27",
                    "Descripción del problema": "El cargador no suministra energía correctamente",
                    "Acción tomada": "Se entregó un cargador en correcto funcionamiento",
                    "Fecha que se le entregó uno nuevo": "2026-03-27",
                    Estado: "Resuelto"
                },
                {
                    Empleado: "Pedro Hernandez",
                    Equipo: "Cargador de laptop USB-C",
                    Marca: "Lenovo",
                    "Fecha de devolución": "2026-04-13",
                    "Descripción del problema": "Falla reportada en el cargador de laptop",
                    "Acción tomada": "Se entregó un cargador en correcto funcionamiento",
                    "Fecha que se le entregó uno nuevo": "2026-04-13",
                    Estado: "Resuelto"
                },
                {
                    Empleado: "Pedro Hernandez",
                    Equipo: "Cargador de laptop USB-C",
                    Marca: "Lenovo",
                    "Fecha de devolución": "2026-04-21",
                    "Descripción del problema": "Falla reportada en el cargador de laptop",
                    "Acción tomada": "Se entregó un cargador en correcto funcionamiento con caja",
                    "Fecha que se le entregó uno nuevo": "2026-04-21",
                    Estado: "Resuelto"
                }
            ]
        }
    },

    // Nombre de la hoja activa en el panel Inventario
    activeInventorySheet: "Principal",

    // Datos derivados para el panel Reporte (se generan desde el inventario)
    reportes: [],

    /*
     * Respaldo editable de fichas de personal.
     * Duplica este formato para cada área y colaborador. Supabase prevalece
     * cuando está disponible, por lo que estos datos sirven como base visible
     * y como respaldo si se abre el sistema sin conexión.
     */
    personnelByArea: {
        Contabilidad: Array.from({ length: 1 }).map((_, i) => ({
            nombre: `Yuli Tarazona Aguirre `,
            dni: '40186232',
            cargo: 'Contabilidad',
            fechaIngreso: '01/09/2022',
            foto: '',
            equipmentProfiles: [{ name: 'Laptop', brand: 'Pendiente', model: 'Pendiente', serial: 'Pendiente', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
            incidents: []
        })),
         Ingenieria: [
            {
                nombre: 'Jonathan Oswaldo Azaña Ramos',
                dni: '42560250',
                cargo: 'Jefe de Logistica',
                fechaIngreso: '01/05/2018',
                foto: '',
                equipmentProfiles: [{ name: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', serial: 'L-LOG-001', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            },
            {
                nombre: 'Carlos Fernando Lozano Roman',
                dni: '70069180',
                cargo: 'Logistica',
                fechaIngreso: '01/03/2024',
                foto: '',
                equipmentProfiles: [{ name: 'Laptop', brand: 'HP', model: 'ProBook', serial: 'L-LOG-002', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            },
             {
                nombre: 'Carlos Fernando Lozano Roman',
                dni: '70069180',
                cargo: 'Logistica',
                fechaIngreso: '01/03/2024',
                foto: '',
                equipmentProfiles: [{ name: 'Laptop', brand: 'HP', model: 'ProBook', serial: 'L-LOG-002', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            },
             {
                nombre: 'Carlos Fernando Lozano Roman',
                dni: '70069180',
                cargo: 'Logistica',
                fechaIngreso: '01/03/2024',
                foto: '',
                equipmentProfiles: [{ name: 'Laptop', brand: 'HP', model: 'ProBook', serial: 'L-LOG-002', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            },
             {
                nombre: 'Carlos Fernando Lozano Roman',
                dni: '70069180',
                cargo: 'Logistica',
                fechaIngreso: '01/03/2024',
                foto: '',
                equipmentProfiles: [{ name: 'Laptop', brand: 'HP', model: 'ProBook', serial: 'L-LOG-002', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            },
             {
                nombre: 'Carlos Fernando Lozano Roman',
                dni: '70069180',
                cargo: 'Logistica',
                fechaIngreso: '01/03/2024',
                foto: '',
                equipmentProfiles: [{ name: 'Laptop', brand: 'HP', model: 'ProBook', serial: 'L-LOG-002', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            }
        ],
        Logistica: [
            {
                nombre: 'Jonathan Oswaldo Azaña Ramos',
                dni: '42560250',
                cargo: 'Jefe de Logistica',
                fechaIngreso: '01/05/2018',
                foto: '',
                equipmentProfiles: [{ name: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', serial: 'L-LOG-001', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            },
            {
                nombre: 'Carlos Fernando Lozano Roman',
                dni: '70069180',
                cargo: 'Logistica',
                fechaIngreso: '01/03/2024',
                foto: '',
                equipmentProfiles: [{ name: 'Laptop', brand: 'HP', model: 'ProBook', serial: 'L-LOG-002', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            }
        ],
        Marketing: Array.from({ length: 1 }).map((_, i) => ({
            nombre: `Colaborador ${i + 1}`,
            dni: 'Pendiente',
            cargo: 'Marketing',
            fechaIngreso: 'Pendiente',
            foto: '',
            equipmentProfiles: [{ name: 'Laptop', brand: 'Pendiente', model: 'Pendiente', serial: 'Pendiente', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
            incidents: []
        })),
        Ofertas: Array.from({ length: 3 }).map((_, i) => ({
            nombre: `Colaborador ${i + 1}`,
            dni: 'Pendiente',
            cargo: 'Ofertas',
            fechaIngreso: 'Pendiente',
            foto: '',
            equipmentProfiles: [{ name: 'Laptop', brand: 'Pendiente', model: 'Pendiente', serial: 'Pendiente', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
            incidents: []
        })),
        Operaciones: [
            {
                nombre: 'Jonathan Oswaldo Azaña Ramos',
                dni: '42560250',
                cargo: 'Jefe de Logistica',
                fechaIngreso: '01/05/2018',
                foto: '',
                equipmentProfiles: [{ name: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', serial: 'L-LOG-001', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            },
            {
                nombre: 'Carlos Fernando Lozano Roman',
                dni: '70069180',
                cargo: 'Logistica',
                fechaIngreso: '01/03/2024',
                foto: '',
                equipmentProfiles: [{ name: 'Laptop', brand: 'HP', model: 'ProBook', serial: 'L-LOG-002', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            }
            {
                nombre: 'Jonathan Oswaldo Azaña Ramos',
                dni: '42560250',
                cargo: 'Jefe de Logistica',
                fechaIngreso: '01/05/2018',
                foto: '',
                equipmentProfiles: [{ name: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', serial: 'L-LOG-001', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            },
            {
                nombre: 'Jonathan Oswaldo Azaña Ramos',
                dni: '42560250',
                cargo: 'Jefe de Logistica',
                fechaIngreso: '01/05/2018',
                foto: '',
                equipmentProfiles: [{ name: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', serial: 'L-LOG-001', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            },
            {
                nombre: 'Jonathan Oswaldo Azaña Ramos',
                dni: '42560250',
                cargo: 'Jefe de Logistica',
                fechaIngreso: '01/05/2018',
                foto: '',
                equipmentProfiles: [{ name: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', serial: 'L-LOG-001', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            },
            {
                nombre: 'Jonathan Oswaldo Azaña Ramos',
                dni: '42560250',
                cargo: 'Jefe de Logistica',
                fechaIngreso: '01/05/2018',
                foto: '',
                equipmentProfiles: [{ name: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', serial: 'L-LOG-001', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            },
            {
                nombre: 'Jonathan Oswaldo Azaña Ramos',
                dni: '42560250',
                cargo: 'Jefe de Logistica',
                fechaIngreso: '01/05/2018',
                foto: '',
                equipmentProfiles: [{ name: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', serial: 'L-LOG-001', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            },
        ],
        Planificacion: Array.from({ length: 1 }).map((_, i) => ({
            nombre: `Colaborador ${i + 1}`,
            dni: 'Pendiente',
            cargo: 'Planificacion',
            fechaIngreso: 'Pendiente',
            foto: '',
            equipmentProfiles: [{ name: 'Laptop', brand: 'Pendiente', model: 'Pendiente', serial: 'Pendiente', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
            incidents: []
        })),
        SAS: [
            {
                nombre: 'Jonathan Oswaldo Azaña Ramos',
                dni: '42560250',
                cargo: 'Jefe de Logistica',
                fechaIngreso: '01/05/2018',
                foto: '',
                equipmentProfiles: [{ name: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', serial: 'L-LOG-001', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            },
            {
                nombre: 'Carlos Fernando Lozano Roman',
                dni: '70069180',
                cargo: 'Logistica',
                fechaIngreso: '01/03/2024',
                foto: '',
                equipmentProfiles: [{ name: 'Laptop', brand: 'HP', model: 'ProBook', serial: 'L-LOG-002', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            },
             {
                nombre: 'Carlos Fernando Lozano Roman',
                dni: '70069180',
                cargo: 'Logistica',
                fechaIngreso: '01/03/2024',
                foto: '',
                equipmentProfiles: [{ name: 'Laptop', brand: 'HP', model: 'ProBook', serial: 'L-LOG-002', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            },
             {
                nombre: 'Carlos Fernando Lozano Roman',
                dni: '70069180',
                cargo: 'Logistica',
                fechaIngreso: '01/03/2024',
                foto: '',
                equipmentProfiles: [{ name: 'Laptop', brand: 'HP', model: 'ProBook', serial: 'L-LOG-002', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            },
             {
                nombre: 'Carlos Fernando Lozano Roman',
                dni: '70069180',
                cargo: 'Logistica',
                fechaIngreso: '01/03/2024',
                foto: '',
                equipmentProfiles: [{ name: 'Laptop', brand: 'HP', model: 'ProBook', serial: 'L-LOG-002', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            },
        ],
        SSOMA: Array.from({ length: 1 }).map((_, i) => ({
            nombre: `Colaborador ${i + 1}`,
            dni: 'Pendiente',
            cargo: 'SSOMA',
            fechaIngreso: 'Pendiente',
            foto: '',
            equipmentProfiles: [{ name: 'Laptop', brand: 'Pendiente', model: 'Pendiente', serial: 'Pendiente', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
            incidents: []
        })),
        TI: [
            {
                nombre: 'Edwin Chaparro Ampa',
                dni: 'Pendiente',
                cargo: 'Gerente de TI',
                foto: '',
                equipmentProfiles: [{
                    name: 'Laptop', brand: 'Pendiente', model: 'Pendiente', serial: 'Pendiente', status: 'Activo',
                    hardware: {}, software: {},
                    accessoryList: [
                        { name: 'Cargador', model: 'Pendiente', serial: 'Pendiente' },
                        { name: 'Mouse', model: 'Pendiente', serial: 'Pendiente' }
                    ]
                }],
                incidents: [
                    { title: 'Sin incidencias registradas', description: '', severity: 'Baja', status: 'Resuelto', created_at: '2026-01-01' }
                ]
            },
            {
                nombre: 'Thalia Giral Onton', dni: 'Pendiente', cargo: 'Soporte TI', fechaIngreso: 'Pendiente', foto: '',
                equipmentProfiles: [{ name: 'Laptop', brand: 'Pendiente', model: 'Pendiente', serial: 'Pendiente', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            },
            {
                nombre: 'Mayte Francesca Vilchez Ramos', dni: 'Pendiente', cargo: 'Soporte TI', fechaIngreso: 'Pendiente', foto: '',
                equipmentProfiles: [{ name: 'Laptop', brand: 'Pendiente', model: 'Pendiente', serial: 'Pendiente', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            },
            {
                nombre: 'Zayd Ayasta Martel', dni: '60947270', cargo: 'TI', fechaIngreso: '11/08/2026', foto: '<img src="https://img.sanishtech.com/u/955906c3515f2d7ab7a45cdce7a039e9.jpeg" alt="WhatsApp Image 2026-08-10 at 10.18.11 (1)" width="1193" height="1166" loading="lazy" style="max-width:100%;height:auto;">',
                equipmentProfiles: [{ name: 'Laptop', brand: 'Pendiente', model: 'Pendiente', serial: 'Pendiente', status: 'Activo', hardware: {}, software: {}, accessoryList: [] }],
                incidents: []
            }
        ]
    }
};

/* -------------------------
   Helpers: uso opcional de Supabase Client
   Estas funciones intentan importar dinámicamente `supabase/client.js`
   (si se carga como módulo) o usar `window.supabase` como fallback.
   Se exponen en `window` para que `controller/app.js` o scripts de prueba
   puedan invocarlas fácilmente.
   ------------------------- */

async function _getSupabaseClient() {
    if (window._NAKAMA_SUPABASE_CLIENT) return window._NAKAMA_SUPABASE_CLIENT;
    // Intentar usar import dinámico (requiere que supabase/client.js sea un módulo válido)
    try {
        const mod = await import('../supabase/client.js');
        if (mod && mod.supabase) {
            window._NAKAMA_SUPABASE_CLIENT = mod.supabase;
            return mod.supabase;
        }
    } catch (err) {
        // ignore - intentaremos otros fallbacks
        console.debug('Import dinámico de supabase/client.js falló:', err?.message || err);
    }
    // Fallback: comprobar si hay un cliente global (por ejemplo definido manualmente)
    if (window.supabase) {
        window._NAKAMA_SUPABASE_CLIENT = window.supabase;
        return window.supabase;
    }
    return null;
}

// Inserta/actualiza registros de equipment usando el cliente Supabase JS
window.saveEquipmentUsingSupabaseClient = async function(records) {
    if (!records) throw new Error('Se requiere records');
    const arr = Array.isArray(records) ? records : [records];
    const client = await _getSupabaseClient();
    if (!client) throw new Error('Supabase client no disponible. Asegura cargar supabase/client.js');

    // Normalizar: eliminar propiedades undefined
    const payload = arr.map(r => {
        const copy = Object.assign({}, r);
        Object.keys(copy).forEach(k => { if (copy[k] === undefined) delete copy[k]; });
        return copy;
    });

    // Usamos upsert para insertar o actualizar por id si existe
    const { data, error } = await client.from('equipment').upsert(payload, { onConflict: 'id', returning: 'representation' });
    if (error) throw error;
    return data;
};

// Sincroniza accesorios por fila: borra los existentes y crea los nuevos
window.saveEquipmentAccessoriesUsingSupabaseClient = async function(equipmentId, accessories, employee = {}) {
    if (!equipmentId) throw new Error('equipmentId requerido');
    const client = await _getSupabaseClient();
    if (!client) throw new Error('Supabase client no disponible. Asegura cargar supabase/client.js');

    // Borrar accesorios existentes para equipment_id
    const { error: delErr } = await client.from('equipment_accessories').delete().eq('equipment_id', equipmentId);
    if (delErr) {
        // No detener el flujo completo por errores de borrado, solo informar
        console.warn('Error borrando accesorios previos:', delErr.message || delErr);
    }

    // Insertar nuevos accesorios (si los hay)
    const rows = (Array.isArray(accessories) ? accessories : (accessories ? [accessories] : [])).map(a => ({
        equipment_id: equipmentId,
        employee_id: employee.employee_id || null,
        area_id: employee.area_id || null,
        employee_name: employee.employee_name || employee.name || null,
        area_name: employee.area_name || null,
        name: a.name || a.nombre || null,
        model: a.model || a.modelo || null,
        serial: a.serial || a.serie || null
    }));
    if (!rows.length) return [];
    const { data, error } = await client.from('equipment_accessories').insert(rows).select();
    if (error) throw error;
    return data;
};

// Conveniencia: guarda equipment + accessories en secuencia
window.saveEquipmentAndAccessories = async function(equipmentRecord) {
    const client = await _getSupabaseClient();
    if (!client) throw new Error('Supabase client no disponible.');

    // Guardar equipo (upsert). Si el registro tiene `id` se actualizará.
    const saved = await window.saveEquipmentUsingSupabaseClient(equipmentRecord);
    // `saved` puede ser array o single, tomar el primer elemento
    const first = Array.isArray(saved) ? saved[0] : saved;
    if (!first || !first.id) return first;

    // Sincronizar accesorios por fila
    await window.saveEquipmentAccessoriesUsingSupabaseClient(first.id, equipmentRecord.accessories || [], equipmentRecord);
    return first;
};

// Exportar ayuda para debugging
window._nakama_model_helpers = {
    getSupabaseClient: _getSupabaseClient
};
