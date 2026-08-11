/**
 * =============================================================================
 * ARCHIVO: controller/app.js
 * CAPA:   Controlador (lógica de la aplicación)
 * =============================================================================
 * Qué es:     Cerebro del Sistema Nakama: conecta la vista (index.html) con los datos.
 * Para qué:  Login, inventario, Excel, gráficas, alertas, reportes y chat ejecutivo.
 * Depende de: model/data.js (APP_MODEL), Chart.js, XLSX, ExcelJS, FileSaver
 * =============================================================================
 */

/* ─── SECCIÓN: AUTENTICACIÓN (index.html → #login-section) ───
   login()        → Valida usuario/contraseña y muestra el dashboard
   DOMContentLoaded → Enter para navegar entre campos e iniciar sesión
   logout()       → Cierra sesión y vuelve al login (más abajo en el archivo) */

// TI puede editar las fichas de responsables; Jefe accede solo para consulta.
let currentUserRole = null;

function canEditPeople() {
    return currentUserRole === 'TI';
}

function login() {
    let userInput = document.getElementById("usuario");
    let passInput = document.getElementById("password");
    let user = userInput.value.trim();
    let pass = passInput.value.trim();
    let btn = document.getElementById("login-btn");

    // Validar campos
    if (!user) {
        alert("Por favor ingresa el usuario");
        userInput.focus();
        return;
    }
    
    if (!pass) {
        alert("Por favor ingresa la contraseña");
        passInput.focus();
        return;
    }

    // Agregar feedback visual
    btn.disabled = true;
    btn.textContent = "Verificando...";

    // Simular validación
    setTimeout(() => {
        const normalizedUser = user.toLowerCase();
        const normalizedPass = pass.toLowerCase();
        const roles = { jefe: 'JEFE', ti: 'TI' };
        const role = normalizedUser === normalizedPass ? roles[normalizedUser] : null;

        if (role) {
            currentUserRole = role;
            // Ocultar login, mostrar dashboard
            document.getElementById("login-section").style.display = "none";
            document.getElementById("dashboard").style.display = "block";
            document.getElementById("dashboard").classList.remove("hidden");
            
            // Mostrar elemento chat si existe
            const fab = document.getElementById('chat-open-fab');
            if (fab) fab.style.display = 'flex';
            
            closeChat();
            
            // Limpiar campos
            userInput.value = "";
            passInput.value = "";
            userInput.classList.remove('has-value');
            passInput.classList.remove('has-value');
            
            // Restaurar botón
            btn.disabled = false;
            btn.textContent = "ENTRAR";
            
            // Cargar datos del panel
            if (typeof renderInventoryTable === 'function') {
                renderInventoryTable();
            }
            updateSupabaseStatusIndicator();
        } else {
            alert("Usuario o contraseña incorrectos.\n\nCredenciales:\nJefe / Jefe (solo consulta)\nTI / TI (puede editar responsables)");
            passInput.value = "";
            passInput.classList.remove('has-value');
            passInput.focus();
            
            // Restaurar botón
            btn.disabled = false;
            btn.textContent = "ENTRAR";
        }
    }, 300);
}

// Permitir login con tecla Enter
function attachLoginKeyHandlers() {
    const usuarioInput = document.getElementById("usuario");
    const passwordInput = document.getElementById("password");

    if (usuarioInput) {
        usuarioInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                if (passwordInput) {
                    passwordInput.focus();
                }
            }
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                login();
            }
        });
    }

    // Inicializar cualquier tabla o panel
    setTimeout(() => {
        const dashboard = document.getElementById("dashboard");
        if (dashboard && dashboard.style.display === "block") {
            renderInventoryTable();
        }
    }, 100);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachLoginKeyHandlers);
} else {
    attachLoginKeyHandlers();
}

/* ─── SECCIÓN: CHAT EJECUTIVO (index.html → #chat-widget, #chat-open-fab) ───
   openChat / closeChat     → Mostrar u ocultar el asistente
   sendChatMessage          → Envía pregunta y muestra respuesta
   getChatResponse          → Interpreta la pregunta y consulta el Excel en memoria
   formatFullExcelRecord    → Devuelve todas las columnas de un registro */

function openChat() {
    const widget = document.getElementById('chat-widget');
    const fab = document.getElementById('chat-open-fab');
    if (!widget) return;
    widget.classList.remove('hidden');
    widget.classList.add('open');
    widget.style.display = 'flex';
    if (fab) fab.style.display = 'none';

    const body = document.querySelector('.chat-body');
    if (body && body.innerHTML.trim() === '') {
        appendChatMessage('assistant', chatExecutiveIntro());
    }

    setTimeout(() => {
        const input = document.getElementById('chat-input');
        if (input) input.focus();
    }, 100);
}

function closeChat() {
    const widget = document.getElementById('chat-widget');
    const fab = document.getElementById('chat-open-fab');
    if (widget) {
        widget.classList.add('hidden');
        widget.classList.remove('open');
        widget.style.display = 'none';
    }
    if (fab) fab.style.display = 'flex';
}

function appendChatMessage(author, text) {
    const body = document.querySelector('.chat-body');
    if (!body) return;
    const message = document.createElement('div');
    message.className = `chat-message ${author}`;
    const html = `<div class="message-text">${escapeHtml(String(text)).replace(/\n/g,'<br>')}</div>`;
    message.innerHTML = html;
    body.appendChild(message);
    body.scrollTop = body.scrollHeight;
}

function showChatTyping() {
    const body = document.querySelector('.chat-body');
    if (!body) return;
    removeChatTyping();
    const el = document.createElement('div');
    el.id = 'chat-typing-indicator';
    el.className = 'chat-message assistant typing';
    el.innerHTML = '<div class="message-text"><span class="typing-dots"><span></span><span></span><span></span></span></div>';
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
}

function removeChatTyping() {
    const el = document.getElementById('chat-typing-indicator');
    if (el) el.remove();
}

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    appendChatMessage('user', text);
    input.value = '';

    showChatTyping();
    const response = getChatResponse(text);
    setTimeout(() => {
        removeChatTyping();
        appendChatMessage('assistant', response);
    }, 380);
}

function formatChatDate(value) {
    if (!value) return '';
    const raw = String(value).trim();
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime()) && /\d{4}/.test(raw)) {
        return parsed.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return raw;
}

function findEmployeeInQuestion(q, rows, getEmployeeTextFn) {
    const employees = [...new Set(rows.map(r => getEmployeeTextFn(r)).filter(Boolean))];
    const qNorm = String(q).toLowerCase();

    for (const emp of employees) {
        if (qNorm.includes(emp.toLowerCase())) return emp;
    }

    const qWords = qNorm.split(/[^a-záéíóúñü0-9]+/i).filter(w => w.length > 2);
    let best = null;
    let bestScore = 0;

    employees.forEach(emp => {
        const parts = emp.toLowerCase().split(/\s+/).filter(p => p.length > 2);
        const score = parts.filter(p => qWords.some(w => p.includes(w) || w.includes(p) || p.startsWith(w.slice(0, 4)))).length;
        if (score > bestScore) {
            bestScore = score;
            best = emp;
        }
    });

    return bestScore > 0 ? best : null;
}

function detectEquipmentTerm(q) {
    const equipmentTerms = ['cargador', 'charger', 'laptop', 'portatil', 'portátil', 'notebook', 'pc', 'monitor', 'impresor', 'proyector', 'impresora', 'router', 'servidor', 'celular', 'móvil', 'movil', 'teléfono', 'telefono', 'tablet', 'mouse', 'teclado', 'usb', 'cable', 'fuente'];
    const match = String(q).toLowerCase().match(new RegExp(equipmentTerms.join('|'), 'i'));
    return match ? match[0] : null;
}

function chatExecutiveIntro() {
    return 'Buenos días, soy el asistente de Nakama. ¿En qué puedo ayudarte?';
}

function chatExecutiveFallback() {
    return [
        'No localicé información coincidente en el inventario cargado.',
        '',
        'Puede consultarme, por ejemplo:',
        '• Total de registros o equipos',
        '• Casos resueltos o pendientes',
        '• ¿Cuál fue el problema? (con nombre o equipo)',
        '• Fecha de entrega o devolución de un empleado'
    ].join('\n');
}

function formatExcelCellValue(key, value) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const keyLower = String(key).toLowerCase();
    if (/fecha|date|entrega|devoluci[oó]n|d[ií]a/.test(keyLower) && /\d{4}/.test(raw)) {
        return formatChatDate(raw);
    }
    return raw;
}

function formatFullExcelRecord(row, index, total) {
    const header = total > 1 ? `— Registro ${index + 1} de ${total} —` : '— Detalle del registro —';
    const lines = [header];
    Object.keys(row).forEach(col => {
        const formatted = formatExcelCellValue(col, row[col]);
        if (formatted) lines.push(`• ${col}: ${formatted}`);
    });
    return lines.join('\n');
}

function isProblemQuestion(q) {
    return /(cu[aá]l|que|qué)\s+(fue\s+)?(el\s+)?problema/i.test(q)
        || /(cu[aá]l|que|qué)\s+problema\s+(tuvo|ten[ií]a|present[oó]|report[oó])/i.test(q)
        || /(descripci[oó]n|detalle|informaci[oó]n|reporte)\s+(del\s+)?problema/i.test(q)
        || /problema\s+(de|del|con|que\s+tuvo|reportado)/i.test(q)
        || /(qu[eé]|que)\s+(fall[oó]|pas[oó]|sucedi[oó]|ocurri[oó])/i.test(q)
        || /(dime|indica|muestra|cu[eé]ntame)\s+(el\s+)?problema/i.test(q);
}

function getChatResponse(question) {
    const q = String(question || '').trim().toLowerCase();
    ensureInventoryBySheetModel();
    const rows = getAllInventoryFlat();
    if (!rows.length) {
        return 'Aún no hay datos corporativos disponibles.\n\nCargue su Excel desde Inventario → «Cargar Excel» y formule nuevamente su consulta.';
    }

    // ==================== FUNCIONES GENÉRICAS ====================
    
    // Detectar columnas disponibles
    const getAllColumns = () => {
        if (!rows.length) return [];
        const cols = new Set();
        rows.forEach(row => {
            Object.keys(row).forEach(key => cols.add(key));
        });
        return Array.from(cols);
    };
    
    const allColumns = getAllColumns();

    // Buscar una columna por variaciones
    const findColumn = (keywords) => {
        if (!Array.isArray(keywords)) keywords = [keywords];
        const keywordsLower = keywords.map(k => String(k).toLowerCase());
        
        return allColumns.find(col => {
            const colLower = String(col).toLowerCase();
            return keywordsLower.some(k => colLower.includes(k) || k === colLower);
        });
    };

    // Obtener valor de una fila con búsqueda flexible
    const getValue = (row, keywords) => {
        const col = findColumn(keywords);
        if (col && row[col] != null) {
            return String(row[col]).trim();
        }
        return '';
    };

    // Funciones específicas adaptadas
    const getEmployeeColumn = () => findColumn(['empleado', 'employee', 'responsable', 'solicitante', 'contacto', 'persona', 'usuario']);
    const getEquipmentColumn = () => findColumn(['equipo', 'equipment', 'producto', 'product', 'dispositivo', 'aparato']);
    const getProblemColumn = () => findColumn(['descripción', 'description', 'problema', 'problem', 'issue', 'asunto', 'detalle', 'detail']);
    const getStatusColumn = () => findColumn(['estado', 'status', 'estado', 'situación']);
    const getDateColumns = () => ({
        delivery: findColumn(['entrega', 'delivery', 'fecha entrega', 'fecha new']),
        return: findColumn(['devolución', 'return', 'fecha devolución', 'fecha return']),
        any: findColumn(['fecha', 'date', 'día', 'data'])
    });

    const normalizeText = text => String(text || '').toLowerCase();
    
    const getEmployeeText = row => getValue(row, getEmployeeColumn() || ['empleado', 'employee', 'responsable']);
    const getEquipmentText = row => getValue(row, getEquipmentColumn() || ['equipo', 'equipment', 'producto']);
    const getProblemText = row => getValue(row, getProblemColumn() || ['descripción', 'problema', 'issue']);
    const getStatusText = row => normalizeText(getValue(row, getStatusColumn() || ['estado', 'status'])) || 'sin estado';
    
    const getDeliveryDate = row => getValue(row, getDateColumns().delivery || ['entrega', 'delivery']);
    const getReturnDate = row => getValue(row, getDateColumns().return || ['devolución', 'return']);
    const getAnyDate = row => getValue(row, getDateColumns().any || ['fecha', 'date']);

    const isResolved = row => /resuelto|solucionado|entregado|ok|activo|completado|completo|cerrado|done|completed/i.test(getStatusText(row));
    const isPending = row => /pendiente|no resuelto|abierto|sin resolver|urgente|crítico|pending|open|blocked/i.test(getStatusText(row));

    // Contar por una columna
    const countByColumn = (colName) => {
        const col = findColumn(colName);
        if (!col) return {};
        
        return rows.reduce((acc, row) => {
            const value = getValue(row, col) || 'Sin dato';
            acc[value] = (acc[value] || 0) + 1;
            return acc;
        }, {});
    };

    // Buscar término en cualquier celda
    const searchTerm = (term) => {
        const searchLower = String(term).toLowerCase();
        return rows.filter(row => {
            return Object.values(row).some(val => 
                String(val || '').toLowerCase().includes(searchLower)
            );
        });
    };

    const formatDateLine = (date, employee, equipment) => {
        const parts = [`• ${formatChatDate(date)}`];
        if (employee) parts.push(employee);
        if (equipment) parts.push(`(${equipment})`);
        return parts.join(' — ');
    };

    // ==================== RESPUESTAS DEL CHATBOT ====================


    if (/^(\s*)(hola|buenos|buenas|hey|saludos|hi|hello)\b/.test(q)) {
    return 'Buenos días, soy el asistente de Nakama. ¿En qué puedo ayudarte?';
}

    // ¿Cuál fue el problema? → registro completo del Excel
    if (isProblemQuestion(q)) {
        const empFilter = findEmployeeInQuestion(q, rows, getEmployeeText);
        const equipTerm = detectEquipmentTerm(q);

        let matches = rows.filter(r => {
            const empOk = !empFilter || getEmployeeText(r).toLowerCase().includes(empFilter.toLowerCase());
            const eqOk = !equipTerm || getEquipmentText(r).toLowerCase().includes(equipTerm.toLowerCase());
            return empOk && eqOk;
        });

        if (!matches.length && (empFilter || equipTerm)) {
            return 'No encontré un registro en el Excel que coincida con el colaborador o equipo indicado.';
        }

        if (!matches.length) matches = rows;

        const withProblem = matches.filter(r => getProblemText(r));
        const source = withProblem.length ? withProblem : matches;
        const limit = 5;
        const slice = source.slice(0, limit);

        const context = [empFilter && `colaborador: ${empFilter}`, equipTerm && `equipo: ${equipTerm}`].filter(Boolean).join(' · ');
        const intro = context
            ? `Información del Excel (${context}):`
            : `Información del Excel — ${slice.length} registro${slice.length === 1 ? '' : 's'}:`;

        const body = slice.map((row, i) => formatFullExcelRecord(row, i, slice.length)).join('\n\n');
        const extra = source.length > limit ? `\n\n…y ${source.length - limit} registro(s) adicional(es) en el inventario.` : '';

        return `${intro}\n\n${body}${extra}`;
    }

    // Consulta específica: empleado + equipo + fecha (prioridad alta)
    if (/(entreg[oó]|entregado|entrega|cu[aá]ndo|qu[eé] d[ií]a|fecha).*(a |al |para )?/i.test(q) || /(a |al ).*(entreg|fecha|cu[aá]ndo)/i.test(q)) {
        const foundEmployee = findEmployeeInQuestion(q, rows, getEmployeeText);
        const foundEquipment = detectEquipmentTerm(q);

        if (foundEmployee || foundEquipment) {
            const matches = rows.filter(r => {
                const empMatch = !foundEmployee || getEmployeeText(r).toLowerCase().includes(foundEmployee.toLowerCase());
                const eqMatch = !foundEquipment || getEquipmentText(r).toLowerCase().includes(foundEquipment.toLowerCase());
                return empMatch && eqMatch;
            });

            if (matches.length) {
                const latest = matches[matches.length - 1];
                const deliveryDate = getDeliveryDate(latest);
                const returnDate = getReturnDate(latest);
                const dateValue = deliveryDate || returnDate;
                const label = deliveryDate ? 'entrega' : 'devolución';

                if (dateValue) {
                    const who = foundEmployee || getEmployeeText(latest);
                    const what = foundEquipment ? getEquipmentText(latest) : getEquipmentText(latest);
                    return [
                        `Registro localizado — ${label}:`,
                        formatChatDate(dateValue),
                        who ? `Colaborador: ${who}` : '',
                        what ? `Equipo: ${what}` : '',
                        matches.length > 1 ? `\nNota: existen ${matches.length} movimientos relacionados; se muestra el más reciente.` : ''
                    ].filter(Boolean).join('\n');
                }
                return 'El registro existe, pero no tiene fecha de entrega ni devolución documentada.';
            }
            return 'No encontré un registro que coincida con el colaborador o equipo indicado.';
        }
    }

    // Contar registros totales
    if (/cu[aá]ntos|cantidad|total|n[uú]mero/.test(q) && /(registros|casos|filas|datos|items|elementos|equipos|entradas|hay)/i.test(q)) {
        return `Resumen ejecutivo: ${rows.length} registro${rows.length === 1 ? '' : 's'} en inventario corporativo.`;
    }

    // Contar por empleado
    if (getEmployeeColumn() && /cu[aá]ntos|cantidad|total|empleados?|personas?|colaboradores?/i.test(q)) {
        const empCounts = countByColumn(getEmployeeColumn());
        const totalEmployees = Object.keys(empCounts).length;
        const lines = Object.entries(empCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([name, count]) => `• ${name}: ${count} caso${count === 1 ? '' : 's'}`);
        const extra = Object.keys(empCounts).length > 6 ? `\n• …y ${Object.keys(empCounts).length - 6} colaborador(es) adicional(es)` : '';
        return `Distribución por colaborador (${totalEmployees} en total):\n${lines.join('\n')}${extra}`;
    }

    // Estados resueltos/pendientes
    if (getStatusColumn()) {
        const resolved = rows.filter(isResolved).length;
        const pending = rows.filter(isPending).length;

        if (/(resuelto|resueltos|solucionado|cerrado|completado)/.test(q) && !/(no |sin |pendiente)/.test(q)) {
            return `Estado operativo: ${resolved} caso${resolved === 1 ? '' : 's'} resuelto${resolved === 1 ? '' : 's'} de ${rows.length} registrados.`;
        }

        if (/(pendiente|no resuelto|abierto|sin resolver|urgente|cr[ií]tico)/.test(q)) {
            return `Atención requerida: ${pending} caso${pending === 1 ? '' : 's'} pendiente${pending === 1 ? '' : 's'} de ${rows.length} registrados.`;
        }

        if (/estado|estatus|situaci[oó]n/.test(q)) {
            const statusCounts = rows.reduce((acc, row) => {
                const state = getStatusText(row) || 'sin estado';
                const label = state.charAt(0).toUpperCase() + state.slice(1);
                acc[label] = (acc[label] || 0) + 1;
                return acc;
            }, {});
            const lines = Object.entries(statusCounts).map(([state, count]) => `• ${state}: ${count}`);
            return `Desglose por estado:\n${lines.join('\n')}`;
        }
    }

    // Fechas generales
    if (/fecha|fechas|cu[aá]ndo|d[ií]a|mes|a[nñ]o|devoluci[oó]n|entrega|delivery|return/i.test(q)) {
        const dateColumns = getDateColumns();
        const equipTerm = detectEquipmentTerm(q);
        const empFilter = findEmployeeInQuestion(q, rows, getEmployeeText);

        if (/devoluci[oó]n|devuelto|return/.test(q) && dateColumns.return) {
            let dates = rows.map(r => ({
                date: getReturnDate(r),
                employee: getEmployeeText(r),
                equipment: getEquipmentText(r)
            })).filter(r => r.date);

            if (equipTerm) dates = dates.filter(d => d.equipment.toLowerCase().includes(equipTerm.toLowerCase()));
            if (empFilter) dates = dates.filter(d => d.employee.toLowerCase().includes(empFilter.toLowerCase()));

            if (!dates.length) return 'No hay fechas de devolución registradas para ese criterio.';
            const list = dates.slice(0, 5).map(r => formatDateLine(r.date, r.employee, r.equipment)).join('\n');
            return `Fechas de devolución:\n${list}`;
        }

        if (/entrega|entregado|delivery/.test(q) && dateColumns.delivery) {
            let dates = rows.map(r => ({
                date: getDeliveryDate(r),
                employee: getEmployeeText(r),
                equipment: getEquipmentText(r)
            })).filter(r => r.date);

            if (equipTerm) dates = dates.filter(d => d.equipment.toLowerCase().includes(equipTerm.toLowerCase()));
            if (empFilter) dates = dates.filter(d => d.employee.toLowerCase().includes(empFilter.toLowerCase()));

            if (!dates.length) return 'No hay fechas de entrega registradas para ese criterio.';
            const list = dates.slice(0, 5).map(r => formatDateLine(r.date, r.employee, r.equipment)).join('\n');
            return `Fechas de entrega:\n${list}`;
        }

        if (dateColumns.any) {
            let allDates = rows.map(r => ({
                date: getAnyDate(r),
                employee: getEmployeeText(r),
                equipment: getEquipmentText(r)
            })).filter(r => r.date);

            if (equipTerm) allDates = allDates.filter(d => d.equipment.toLowerCase().includes(equipTerm.toLowerCase()));
            if (empFilter) allDates = allDates.filter(d => d.employee.toLowerCase().includes(empFilter.toLowerCase()));

            if (!allDates.length) return 'No hay fechas registradas para ese criterio.';
            const list = allDates.slice(0, 5).map(r => formatDateLine(r.date, r.employee, r.equipment)).join('\n');
            return `Calendario operativo:\n${list}`;
        }
    }

    // Listado de incidencias (sin pedir detalle completo)
    if (getProblemColumn() && /problema|fallo|incidencia|issue|error|aver[ií]a|defecto|roto/i.test(q) && !isProblemQuestion(q)) {
        const equipTerm = detectEquipmentTerm(q);
        const empFilter = findEmployeeInQuestion(q, rows, getEmployeeText);

        let matches = rows.filter(r => getProblemText(r));
        if (equipTerm) matches = matches.filter(r => getEquipmentText(r).toLowerCase().includes(equipTerm.toLowerCase()));
        if (empFilter) matches = matches.filter(r => getEmployeeText(r).toLowerCase().includes(empFilter.toLowerCase()));

        if (!matches.length) return 'No se registran incidencias para el criterio indicado.';

        const list = matches.slice(0, 5).map((row, i) => formatFullExcelRecord(row, i, Math.min(matches.length, 5))).join('\n\n');
        const extra = matches.length > 5 ? `\n\n…y ${matches.length - 5} registro(s) más.` : '';
        return `Incidencias documentadas en el Excel:\n\n${list}${extra}`;
    }

    // Búsqueda por colaborador (nombre suelto) — detalle completo del Excel
    const employeeByName = findEmployeeInQuestion(q, rows, getEmployeeText);
    if (employeeByName && q.length > 2 && !isProblemQuestion(q)) {
        const empRows = rows.filter(r => getEmployeeText(r).toLowerCase().includes(employeeByName.toLowerCase()));
        const slice = empRows.slice(0, 4);
        const body = slice.map((row, i) => formatFullExcelRecord(row, i, slice.length)).join('\n\n');
        const extra = empRows.length > 4 ? `\n\n…y ${empRows.length - 4} registro(s) adicional(es).` : '';
        return `Expediente de ${employeeByName} (${empRows.length} registro${empRows.length === 1 ? '' : 's'}):\n\n${body}${extra}`;
    }

    // Equipos específicos
    if (getEquipmentColumn()) {
        const term = detectEquipmentTerm(q);
        if (term) {
            const filtered = rows.filter(r => getEquipmentText(r).toLowerCase().includes(term.toLowerCase()));
            if (!filtered.length) return `Sin registros corporativos para «${term}».`;

            const slice = filtered.slice(0, 5);
            const details = slice.map((row, i) => formatFullExcelRecord(row, i, slice.length)).join('\n\n');
            const extra = filtered.length > 5 ? `\n\n…y ${filtered.length - 5} registro(s) más.` : '';

            return `Inventario — ${term} (${filtered.length} registro${filtered.length === 1 ? '' : 's'}):\n\n${details}${extra}`;
        }
    }

    // Búsqueda genérica
    if (q.length > 2) {
        const exactMatches = rows.filter(r => Object.values(r).some(val => {
            const strVal = String(val || '').toLowerCase();
            return strVal === q || (strVal.includes(q) && strVal.length < 50);
        }));

        if (exactMatches.length > 0) {
            const results = exactMatches.slice(0, 3).map(r => {
                for (const val of Object.values(r)) {
                    const strVal = String(val || '').toLowerCase();
                    if (strVal.includes(q)) return `• ${String(val)}`;
                }
                return '';
            }).filter(Boolean).join('\n');
            return `Coincidencias encontradas:\n${results}`;
        }
    }
return chatExecutiveFallback(); 
}
   

/* ─── SECCIÓN: NAVEGACIÓN Y FILTROS GLOBALES ───
   showPanel()              → Cambia entre Inventario, Análisis, Alertas y Reporte
   Variables selected*      → Estado de filtros en reportes y análisis */

// Filtro de mes en panel Reporte (index.html → #month-filter)
let selectedMonth = '';
// Variable global para el filtro de empleado en reporte
let selectedReportEmployee = '';
// Variable global para el filtro de producto/equipo en reporte
let selectedReportProduct = '';
// Variable global para el filtro de hoja de análisis
let selectedAnalysisSheet = 'all';

function filterReportesByMonth(month) {
    selectedMonth = month;
    renderReportes();
}

function filterReportesByEmployee(employee) {
    selectedReportEmployee = employee || '';
    renderReportes();
}

function filterReportesByProduct(product) {
    selectedReportProduct = product || '';
    renderReportes();
}

function setAnalysisSheetFilter(sheetKey) {
    selectedAnalysisSheet = sheetKey || 'all';
    saveInventoryToStorage();
    renderAnalysis();
}

function getFilteredAnalysisInventory() {
    ensureInventoryBySheetModel();
    const sheetKey = selectedAnalysisSheet && selectedAnalysisSheet !== 'all' ? selectedAnalysisSheet : null;
    if (sheetKey && window.APP_MODEL.inventoryBySheet && window.APP_MODEL.inventoryBySheet[sheetKey]) {
        const bundle = getSheetBundle(sheetKey);
        return (bundle.rows || []).map(row => rowToCanonical(row, bundle.fieldMap)).filter(isInventoryRowFilled);
    }
    return getAllInventoryFlat();
}

function renderAnalysisSheetFilterOptions() {
    ensureInventoryBySheetModel();
    const select = document.getElementById('analysis-sheet-filter');
    if (!select || !window.APP_MODEL) return;

    const keys = Object.keys(window.APP_MODEL.inventoryBySheet || {});
    const current = selectedAnalysisSheet || 'all';
    const options = ['<option value="all">Todas las hojas</option>'];
    keys.forEach(name => {
        const safeValue = String(name).replace(/"/g, '&quot;');
        options.push(`<option value="${safeValue}">${escapeHtml(name)}</option>`);
    });
    select.innerHTML = options.join('');
    if (current !== 'all' && !keys.includes(current)) {
        selectedAnalysisSheet = 'all';
    }
    select.value = selectedAnalysisSheet;
}

function logout() {
    // Confirmar cierre de sesión
    if (!confirm("¿Deseas cerrar sesión?")) {
        return;
    }
    
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("login-section").style.display = "flex";

    const fab = document.getElementById('chat-open-fab');
    if (fab) fab.style.display = 'none';
    closeChat();

    // Limpiar campos de login
    document.getElementById("usuario").value = "";
    document.getElementById("password").value = "";
    currentUserRole = null;
    document.getElementById("usuario").focus();
}

function showPanel(panelId) {
    const panels = ['inventory', 'analysis', 'alerts', 'incidents', 'reportes'];
    panels.forEach(id => {
        const panel = document.getElementById(`${id}-panel`);
        if (panel) {
            if (id === panelId) {
                panel.classList.remove('hidden');
            } else {
                panel.classList.add('hidden');
            }
        }
    });

    const navIds = ['inventory', 'analysis', 'alerts', 'incidents', 'reportes'];
    navIds.forEach(id => {
        const nav = document.getElementById(`nav-${id}`);
        if (nav) {
            if (id === panelId) {
                nav.classList.add('active');
            } else {
                nav.classList.remove('active');
            }
        }
    });

    if (panelId !== 'incidents') {
        const submenu = document.getElementById('incidents-submenu');
        if (submenu) submenu.classList.add('hidden');
    }

    // Renderizar el contenido del panel cuando se cambia
    if (panelId === 'alerts') {
        renderAlerts();
    } else if (panelId === 'reportes') {
        initializeCharts();
        renderReportes();
    } else if (panelId === 'analysis') {
        initializeCharts();
        renderAnalysis();
    } else if (panelId === 'incidents') {
        renderIncidentsDashboard();
    } else if (panelId === 'inventory') {
        renderInventory();
    }
}

function toggleIncidentsSubmenu() {
    const submenu = document.getElementById('incidents-submenu');
    if (!submenu) return;
    submenu.classList.remove('hidden');
}

function showIncidentsDashboard() {
    const submenu = document.getElementById('incidents-submenu');
    if (submenu) submenu.classList.remove('hidden');
    showPanel('incidents');

    const dashboardHeader = document.querySelector('#incidents-panel > .incidents-dashboard-header');
    if (dashboardHeader) dashboardHeader.classList.add('hidden');

    const dashboardGrid = document.querySelector('.incidents-dashboard-grid');
    if (dashboardGrid) dashboardGrid.classList.add('hidden');

    const section = document.getElementById('incidents-global-section');
    if (section) section.classList.remove('hidden');

    renderGlobalIncidentsTable();
}

function showGlobalIncidentsTable() {
    const submenu = document.getElementById('incidents-submenu');
    if (submenu) submenu.classList.remove('hidden');
    showPanel('incidents');

    const dashboardGrid = document.querySelector('.incidents-dashboard-grid');
    if (dashboardGrid) dashboardGrid.classList.remove('hidden');

    renderIncidentsDashboard();

    const section = document.getElementById('incidents-global-section');
    if (section) section.classList.add('hidden');
}

const incidentsDashboardCharts = {};
let selectedIncidentsArea = '';

function populateIncidentsAreaFilterOptions() {
    const select = document.getElementById('incidents-area-filter-select');
    if (!select) return;
    const currentValue = selectedIncidentsArea || '';
    const areaNames = Object.keys(AREA_PEOPLE || {});
    select.innerHTML = '<option value="">Todas las áreas</option>' + areaNames.map(area => `<option value="${area}">${area}</option>`).join('');
    select.value = currentValue;
}

function applyIncidentsAreaFilter(area) {
    selectedIncidentsArea = area || '';
    renderGlobalIncidentsTable();
}

function clearIncidentsAreaFilter() {
    selectedIncidentsArea = '';
    const select = document.getElementById('incidents-area-filter-select');
    if (select) select.value = '';
    renderGlobalIncidentsTable();
}

async function renderIncidentsDashboard() {
    if (typeof Chart === 'undefined') return;
    const reports = await getUnifiedIncidentRows();
    const areaNames = Object.keys(AREA_PEOPLE || {});
    const employeeAreas = new Map();
    areaNames.forEach(area => (AREA_PEOPLE[area] || []).forEach(person => {
        employeeAreas.set(String(person.nombre || '').trim().toLowerCase(), area);
    }));
    const areaCounts = areaNames.map(area => reports.filter(report =>
        employeeAreas.get(String(report.empleado || '').trim().toLowerCase()) === area
    ).length);
    Object.values(incidentsDashboardCharts).forEach(chart => chart.destroy());
    Object.keys(incidentsDashboardCharts).forEach(key => delete incidentsDashboardCharts[key]);
    const common = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    boxWidth: 12,
                    color: '#10256f',
                    usePointStyle: true,
                    pointStyle: 'rect',
                    padding: 14,
                    font: { size: 13, weight: '700' }
                }
            }
        },
        animation: { duration: 700, easing: 'easeOutQuart' },
        elements: { arc: { borderWidth: 2 }, point: { radius: 4, hoverRadius: 5 } }
    };
    const create = (id, type, labels, data, colors, options = {}) => {
        const canvas = document.getElementById(id);
        if (!canvas) return;
        incidentsDashboardCharts[id] = new Chart(canvas, {
            type,
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderColor: '#ffffff',
                    borderWidth: type === 'line' ? 2 : 2,
                    fill: type === 'line',
                    tension: .35,
                    hoverOffset: 6,
                    pointBackgroundColor: '#1f5dcc'
                }]
            },
            options: { ...common, ...options }
        });
    };
    const statusCounts = {
        Nuevas: 0,
        'En proceso': 0,
        Pendientes: 0,
        Resueltas: 0,
        Cerradas: 0
    };
    reports.forEach(report => {
        const status = String(report.estado || '').trim();
        if (/resuelto|solucionado|entregado|ok|cerrado/.test(status)) statusCounts['Cerradas'] += 1;
        else if (/en proceso|proceso/.test(status)) statusCounts['En proceso'] += 1;
        else if (/pend/.test(status)) statusCounts.Pendientes += 1;
        else statusCounts.Nuevas += 1;
    });
    const priorityCounts = { Crítica: 0, Alta: 0, Media: 0, Baja: 0 };
    reports.forEach(report => {
        const priority = String(report.prioridad || report.severity || '').trim();
        if (/crítica|critica/.test(priority)) priorityCounts.Crítica += 1;
        else if (/alta/.test(priority)) priorityCounts.Alta += 1;
        else if (/baja/.test(priority)) priorityCounts.Baja += 1;
        else priorityCounts.Media += 1;
    });
    const categoryCounts = {
        Software: 0,
        Hardware: 0,
        Red: 0,
        Accesos: 0,
        Correo: 0,
        Otros: 0
    };
    reports.forEach(report => {
        const product = String(report.producto || '').trim().toLowerCase();
        if (/laptop|pc|software|sistema|programa/.test(product)) categoryCounts.Software += 1;
        else if (/monitor|impresora|router|switch|servidor|hardware/.test(product)) categoryCounts.Hardware += 1;
        else if (/red|wifi|internet|vpn/.test(product)) categoryCounts.Red += 1;
        else if (/acceso|usuario|password|login/.test(product)) categoryCounts.Accesos += 1;
        else if (/correo|mail/.test(product)) categoryCounts.Correo += 1;
        else categoryCounts.Otros += 1;
    });
    const trendLabels = ['01', '04', '07', '10', '13', '16', '19', '22', '25', '28', '31'];
    const trendCounts = new Array(11).fill(0);
    reports.forEach(report => {
        const rawDate = new Date(report.created_at || report.fecha || report.fechaResolucion || Date.now());
        const day = rawDate.getDate();
        if (Number.isFinite(day)) {
            const index = Math.min(10, Math.max(0, Math.floor((day - 1) / 3)));
            trendCounts[index] += 1;
        }
    });
    create('inc-status-chart', 'doughnut', ['Nuevas', 'En proceso', 'Pendientes', 'Resueltas', 'Cerradas'], [statusCounts.Nuevas, statusCounts['En proceso'], statusCounts.Pendientes, 0, statusCounts.Cerradas], ['#2878df', '#ffc107', '#8456d5', '#4dbd5f', '#96a6b8'], { cutout: '56%' });
    create('inc-priority-chart', 'doughnut', ['Crítica', 'Alta', 'Media', 'Baja'], [priorityCounts.Crítica, priorityCounts.Alta, priorityCounts.Media, priorityCounts.Baja], ['#ef5350', '#ff9418', '#ffc107', '#47bd6a'], { cutout: '56%' });
    create('inc-category-chart', 'bar', Object.keys(categoryCounts), Object.values(categoryCounts), ['#2878df', '#4dbd5f', '#8456d5', '#ff821c', '#28b6b8', '#b8c5d6'], { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, grid: { display: false } }, y: { grid: { display: false } } } });
    create('inc-trend-chart', 'line', trendLabels, trendCounts, '#2878df', { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#edf2f8' } }, x: { grid: { display: false } } } });
    const heatmap = document.getElementById('inc-heatmap');
    if (heatmap) heatmap.innerHTML = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, row) => `<div class="heatmap-day">${day}</div>${Array.from({ length: 12 }, (_, col) => `<i style="opacity:${.12 + (((row * 5 + col * 3) % 9) / 10)}"></i>`).join('')}`).join('');
    const totalAreaIncidents = areaCounts.reduce((total, count) => total + count, 0);
    const areas = areaNames.map((area, index) => [area, areaCounts[index], totalAreaIncidents ? `${((areaCounts[index] / totalAreaIncidents) * 100).toFixed(1)}%` : '0.0%']).sort((a, b) => b[1] - a[1]);
    document.getElementById('inc-areas-table').innerHTML = `<table class="inc-mini-table"><thead><tr><th>Área</th><th>Cantidad</th><th>Porcentaje</th></tr></thead><tbody>${areas.map(item => `<tr><td>${item[0]}</td><td>${item[1]}</td><td><span style="width:${item[2]}"></span>${item[2]}</td></tr>`).join('')}</tbody></table>`;
    const resolution = [
        ['Software', '6.2 horas'],
        ['Hardware', '5.1 horas'],
        ['Red', '4.8 horas'],
        ['Accesos', '4.3 horas'],
        ['Correo electrónico', '3.6 horas'],
        ['Otros', '6.7 horas']
    ];
    document.getElementById('inc-resolution-table').innerHTML = `<table class="inc-mini-table"><thead><tr><th>Categoría</th><th>Tiempo promedio</th></tr></thead><tbody>${resolution.map(item => `<tr><td>${item[0]}</td><td>${item[1]}</td></tr>`).join('')}</tbody></table>`;
}

async function renderGlobalIncidentsTable() {
    const tableHost = document.getElementById('inc-global-table');
    if (!tableHost) return;

    populateIncidentsAreaFilterOptions();

    const areaNames = Object.keys(AREA_PEOPLE || {});
    const employeeAreas = new Map();
    areaNames.forEach(area => (AREA_PEOPLE[area] || []).forEach(person => {
        employeeAreas.set(String(person.nombre || '').trim().toLowerCase(), area);
    }));

    const baseReports = await getUnifiedIncidentRows();
    const reports = selectedIncidentsArea
        ? baseReports.filter(report => employeeAreas.get(String(report.empleado || '').trim().toLowerCase()) === selectedIncidentsArea)
        : baseReports;

    if (!reports.length) {
        tableHost.innerHTML = '<div class="inc-global-empty">No hay incidencias registradas.</div>';
        return;
    }
    const rows = reports.map((report, index) => {
        const empleado = escapeHtml(String(report.empleado || 'Desconocido'));
        const producto = escapeHtml(String(report.producto || ''));
        const problema = escapeHtml(String(report.problema || ''));
        const estadoRaw = String(report.estado || 'Abierto');
        const estado = escapeHtml(estadoRaw);
        const fecha = escapeHtml(formatDateForInput(report.fechaResolucion || report.fecha || report.created_at || '')) || '';
        const prioridad = String(report.prioridad || report.severity || (index % 3 === 0 ? 'Alta' : index % 3 === 1 ? 'Media' : 'Baja'));
        const prioridadClass = prioridad.toLowerCase();
        const estadoClass = estadoRaw.toLowerCase().includes('resuel') ? 'resolved'
            : estadoRaw.toLowerCase().includes('proceso') ? 'progress'
            : estadoRaw.toLowerCase().includes('pend') ? 'pending'
            : 'open';
        return `<tr><td>${String(index + 1).padStart(2, '0')}</td><td>${empleado}</td><td>${producto}</td><td>${problema}</td><td><span class="inc-priority-badge ${prioridadClass}">${prioridad}</span></td><td>${fecha || '—'}</td><td><span class="inc-status-badge ${estadoClass}">${estado}</span></td></tr>`;
    }).join('');
    tableHost.innerHTML = `
        <div class="inc-global-table-wrap">
            <table class="inc-global-table">
                <thead><tr><th>N.º</th><th>Empleado</th><th>Producto</th><th>Problema</th><th>Prioridad</th><th>Fecha</th><th>Estado</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

/* ─── SECCIÓN: ALERTAS (index.html → #alerts-panel) ───
   getAlertsFromInventory() → Detecta casos críticos o pendientes en el inventario
   renderAlerts()           → Pinta la lista de alertas en pantalla */

function getAlertsFromInventory() {
    ensureInventoryBySheetModel();
    const inventory = getAllInventoryFlat();
    const alerts = [];

    if (!inventory.length) {
        alerts.push('No hay registros en el inventario');
        return alerts;
    }

    // Detectar casos sin resolver
    const unresolved = inventory.filter(item => {
        const estado = String(item.estado || '').toLowerCase();
        return !/resuelto|solucionado|entregado|ok|activo/i.test(estado);
    });

    if (unresolved.length > 0) {
        alerts.push(`⚠ ${unresolved.length} caso(s) sin resolver`);
        unresolved.forEach(item => {
            const empleado = escapeHtml(String(item.empleado || 'Empleado desconocido'));
            const equipo = escapeHtml(String(item.equipo || 'Equipo desconocido'));
            const estado = escapeHtml(String(item.estado || 'No resuelto'));
            alerts.push(`• ${empleado} / ${equipo} — ${estado}`);
        });
    }

    // Detectar casos críticos no resueltos
    const critical = unresolved.filter(item => {
        const desc = String(item.descripcion || '').toLowerCase();
        return /critico|urgente|prioritario|fallo grave|error|daño|rotura|no funciona/i.test(desc);
    });

    if (critical.length > 0) {
        alerts.push(`🔴 ${critical.length} caso(s) crítico(s) pendiente(s)`);
    }

    // Detectar tipos de equipo con alta tasa de fallos
    const typeStats = {};
    const now = new Date();
    let overdueCount = 0;

    inventory.forEach(item => {
        const type = String(item.equipo || 'Desconocido').trim() || 'Desconocido';
        const estado = String(item.estado || '').toLowerCase();
        const isResolved = /resuelto|solucionado|entregado|ok|activo/i.test(estado);
        const date = parseDate(item.fechaDevolucion) || parseDate(item.fechaEntrega);

        if (!typeStats[type]) {
            typeStats[type] = { total: 0, fallos: 0, overdue: 0 };
        }
        typeStats[type].total += 1;
        if (!isResolved) {
            typeStats[type].fallos += 1;
        }
        if (date && daysBetween(date, now) >= 30 && !isResolved) {
            typeStats[type].overdue += 1;
            overdueCount += 1;
        }
    });

    // Alertar sobre tipos de equipo con > 50% de fallos
    Object.keys(typeStats).forEach(type => {
        const stats = typeStats[type];
        const failureRate = (stats.fallos / stats.total) * 100;
        if (failureRate > 50) {
            alerts.push(`⚠ Alta tasa de fallos en ${type} (${Math.round(failureRate)}%)`);
        }
    });

    // Alertar sobre casos vencidos
    if (overdueCount > 0) {
        alerts.push(`📅 ${overdueCount} caso(s) vencido(s) sin resolver (>30 días)`);
    }

    if (!alerts.length) {
        alerts.push('✓ No hay alertas urgentes en este momento');
    }

    return alerts;
}

function renderAlerts() {
    const list = document.querySelector('.alert-list');
    if (!list || !window.APP_MODEL) return;

    const alerts = getAlertsFromInventory();
    list.innerHTML = alerts.map(alert => `
        <div class="alert-card">
            <p>${alert}</p>
        </div>
    `).join('');
}

/* ─── SECCIÓN: REPORTES (index.html → #reportes-panel) ───
   generateReportesFromInventory() → Convierte filas del inventario en datos de reporte
   renderReportes()                → Tabla + gráfica con filtros por mes/empleado/equipo */

function getDefaultExcelFieldLabels() {
    return {
        empleado: 'Empleado',
        equipo: 'Equipo',
        descripcion: 'Descripción del problema',
        fechaDevolucion: 'Fecha de devolución'
    };
}

function getReportTableLabels() {
    const d = getDefaultExcelFieldLabels();
    const f = (window.APP_MODEL && window.APP_MODEL.excelFieldLabels) || {};
    return {
        empleado: (f.empleado && String(f.empleado).trim()) || d.empleado,
        equipo: (f.equipo && String(f.equipo).trim()) || d.equipo,
        descripcion: (f.descripcion && String(f.descripcion).trim()) || d.descripcion,
        fecha: (f.fechaDevolucion && String(f.fechaDevolucion).trim()) || d.fechaDevolucion
    };
}

function applyReportTableHeaderRow() {
    const theadRow = document.querySelector('#reportes-panel .report-table thead tr');
    if (!theadRow) return;
    const headers = ['N°', 'Incidente', 'Empleado', 'Creado por', 'Estado'];
    theadRow.innerHTML = headers.map(text => `<th>${text}</th>`).join('');
}

function updateReportesSubtitle() {
    const el = document.getElementById('reportes-subtitle');
    if (!el) return;
    el.textContent = 'Columnas visibles del reporte: N°, Incidente, Empleado, Creado por, Estado.';
}

function pickReporteProblemaText(row, canon) {
    if (canon.descripcion && String(canon.descripcion).trim()) {
        return String(canon.descripcion).trim();
    }
    const directKeys = ['Síntomas', 'Sintomas', 'Causa', 'Asunto', 'Problema', 'Detalle', 'Observaciones'];
    for (let i = 0; i < directKeys.length; i++) {
        const k = directKeys[i];
        if (row[k] != null && String(row[k]).trim()) {
            return String(row[k]).trim();
        }
    }
    const keys = Object.keys(row);
    for (let i = 0; i < keys.length; i++) {
        const col = keys[i];
        const n = normalizeHeader(col);
        if (/sintoma|causa|asunto|falla|error|diagnost|incidencia|detalle|motivo|descripcion|problema/.test(n)) {
            const v = row[col];
            if (v != null && String(v).trim()) {
                return String(v).trim();
            }
        }
    }
    return '';
}

function pickReporteProductoText(row, canon) {
    if (canon.equipo && String(canon.equipo).trim()) {
        return String(canon.equipo).trim();
    }
    const directKeys = ['Máquina', 'Maquina', 'Equipo', 'Producto', 'Modelo', 'Activo', 'Serial'];
    for (let i = 0; i < directKeys.length; i++) {
        const k = directKeys[i];
        if (row[k] != null && String(row[k]).trim()) {
            return String(row[k]).trim();
        }
    }
    const keys = Object.keys(row);
    for (let i = 0; i < keys.length; i++) {
        const col = keys[i];
        const n = normalizeHeader(col);
        if (/maquina|equipo|modelo|dispositivo|hardware|activo|serial/.test(n)) {
            const v = row[col];
            if (v != null && String(v).trim()) {
                return String(v).trim();
            }
        }
    }
    return 'Desconocido';
}

function getProductCategory(producto) {
    const normalized = String(producto || '').toLowerCase();
    if (/impresor|printer/.test(normalized)) return 'Impresoras';
    if (/cargador|charger/.test(normalized)) return 'Cargadores';
    if (/proyector|projector/.test(normalized)) return 'Proyectores';
    if (/laptop|notebook|portátil|portatil|pc|computadora|ordenador/.test(normalized)) return 'Computadoras';
    if (/monitor|pantalla/.test(normalized)) return 'Monitores';
    if (/mouse|teclado|keyboard|ratón|raton/.test(normalized)) return 'Periféricos';
    if (/router|switch|servidor|modem|módem|hub/.test(normalized)) return 'Red';
    if (/celular|móvil|movil|teléfono|telefono/.test(normalized)) return 'Celulares';
    return 'Otros equipos';
}

function pickReporteEmpleadoText(row, canon) {
    if (canon.empleado && String(canon.empleado).trim()) {
        return String(canon.empleado).trim();
    }
    const directKeys = ['Empleado', 'Técnico', 'Tecnico', 'Contacto', 'Cliente', 'Solicitante', 'Responsable'];
    for (let i = 0; i < directKeys.length; i++) {
        const k = directKeys[i];
        if (row[k] != null && String(row[k]).trim()) {
            return String(row[k]).trim();
        }
    }
    const keys = Object.keys(row);
    for (let i = 0; i < keys.length; i++) {
        const col = keys[i];
        const n = normalizeHeader(col);
        if (/empleado|trabajador|usuario|contacto|tecnico|solicitante|nombre/.test(n)) {
            const v = row[col];
            if (v != null && String(v).trim()) {
                return String(v).trim();
            }
        }
    }
    return 'N/A';
}

function generateReportesFromInventory() {
    const localIncidents = getAllLocalEmployeeIncidents();
    const reportes = [];

    localIncidents.forEach((incident, index) => {
        const normalized = normalizeUnifiedIncidentRecord(incident, index);
        if (!normalized) return;
        const date = normalized.created_at ? new Date(normalized.created_at) : new Date();
        reportes.push({
            empleado: normalized.empleado,
            producto: normalized.producto,
            productoCategoria: getProductCategory(normalized.producto),
            problema: normalized.problema,
            estado: normalized.estado,
            prioridad: normalized.prioridad,
            fechaResolucion: String(normalized.created_at || '').trim(),
            mes: date.getMonth() + 1,
            año: date.getFullYear(),
            fecha: date
        });
    });

    if (!window.APP_MODEL) {
        window.APP_MODEL = {};
    }
    window.APP_MODEL.reportes = reportes;
}


function getFilteredReportes() {
    generateReportesFromInventory();
    let filtered = window.APP_MODEL.reportes || [];
    
    if (selectedMonth) {
        const monthNum = parseInt(selectedMonth, 10);
        filtered = filtered.filter(item => item.mes === monthNum);
    }
    if (selectedReportEmployee) {
        filtered = filtered.filter(item => String(item.empleado || '').trim() === String(selectedReportEmployee).trim());
    }
    if (selectedReportProduct) {
        const sel = normalizeOptionKey(selectedReportProduct);
        filtered = filtered.filter(item => {
            const productValue = normalizeOptionKey(String(item.producto || ''));
            const categoryValue = normalizeOptionKey(String(item.productoCategoria || ''));
            return productValue === sel || categoryValue === sel || productValue.indexOf(sel) !== -1 || categoryValue.indexOf(sel) !== -1;
        });
    }
    
    filtered.sort((a, b) => {
        const empleadoA = String(a.empleado || '').localeCompare(String(b.empleado || ''), 'es', { sensitivity: 'base' });
        if (empleadoA !== 0) return empleadoA;
        return String(a.producto || '').localeCompare(String(b.producto || ''), 'es', { sensitivity: 'base' });
    });
    return filtered;
}

function getFilteredReportesForFilter(excludeField) {
    generateReportesFromInventory();
    return (window.APP_MODEL.reportes || []).filter(item => {
        if (excludeField !== 'mes' && selectedMonth) {
            const monthNum = parseInt(selectedMonth, 10);
            if (item.mes !== monthNum) return false;
        }
        if (excludeField !== 'empleado' && selectedReportEmployee) {
            if (String(item.empleado || '').trim() !== String(selectedReportEmployee).trim()) return false;
        }
        if (excludeField !== 'producto' && selectedReportProduct) {
            const selectedValue = normalizeOptionKey(selectedReportProduct);
            const productValue = normalizeOptionKey(String(item.producto || ''));
            const categoryValue = normalizeOptionKey(String(item.productoCategoria || ''));
            if (productValue === selectedValue || categoryValue === selectedValue || productValue.indexOf(selectedValue) !== -1 || categoryValue.indexOf(selectedValue) !== -1) {
                // keep
            } else {
                return false;
            }
        }
        return true;
    });
}

function renderReportMonthFilterOptions() {
    if (!window.APP_MODEL) return;
    const select = document.getElementById('month-filter');
    if (!select) return;

    const reports = getFilteredReportesForFilter('mes');
    const monthNumbers = Array.from(new Set(reports.map(item => item.mes).filter(Boolean)));
    monthNumbers.sort((a, b) => a - b);

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const options = ['<option value="">Todos los meses</option>'];
    monthNumbers.forEach(monthNum => {
        if (monthNum >= 1 && monthNum <= 12) {
            const safe = String(monthNum);
            options.push(`<option value="${safe}">${monthNames[monthNum - 1] || safe}</option>`);
        }
    });

    if (selectedMonth && !monthNumbers.includes(parseInt(selectedMonth, 10))) {
        selectedMonth = '';
    }
    select.innerHTML = options.join('');
    select.value = selectedMonth || '';
}

function exportReportesExcel() {
    generateReportesFromInventory();
    const reportes = getFilteredReportes();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte');

    const headerCells = ['N°', 'Incidente', 'Empleado', 'Creado por', 'Estado'];

    const extractCreatedBy = text => {
        if (!text) return '';
        const raw = String(text).trim();
        const match = raw.match(/Creado por:\s*(.+)$/i);
        if (match) return match[1].trim();
        if (/^Creado por\b/i.test(raw)) return raw.replace(/^Creado por:\s*/i, '').trim();
        return '';
    };

    const rows = reportes.map((item, index) => [
        index + 1,
        item.problema || '',
        item.empleado || 'N/A',
        extractCreatedBy(item.producto),
        item.estado || ''
    ]);

    worksheet.addTable({
        name: 'ReporteIncidencias',
        ref: 'A1',
        headerRow: true,
        style: {
            theme: 'TableStyleMedium2',
            showRowStripes: true,
            showFirstColumn: false,
            showLastColumn: false,
            showColumnStripes: false
        },
        columns: headerCells.map(header => ({ name: header })),
        rows: rows
    });

    const borderStyle = {
        style: 'thin',
        color: { argb: 'FFCBD5E1' }
    };
    const numRows = rows.length + 1;
    const numCols = headerCells.length;

    for (let rowIndex = 1; rowIndex <= numRows; rowIndex += 1) {
        const row = worksheet.getRow(rowIndex);
        row.eachCell({ includeEmpty: true }, cell => {
            if (cell.col > numCols) return;
            cell.border = {
                top: borderStyle,
                left: borderStyle,
                bottom: borderStyle,
                right: borderStyle
            };
            cell.alignment = { vertical: 'middle', wrapText: true };
            if (rowIndex === 1) {
                cell.font = { bold: true };
            }
        });
    }

    worksheet.columns.forEach((column, index) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
            const value = cell.value == null ? '' : String(cell.value);
            maxLength = Math.max(maxLength, value.length);
        });
        column.width = Math.min(48, Math.max(18, maxLength + 2));
    });

    const timestamp = new Date().toLocaleString('es-ES').replace(/[/:]/g, '-');
    workbook.xlsx.writeBuffer().then(buffer => {
        const blob = new Blob([buffer], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte-incidencias-${timestamp}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
    }).catch(error => {
        console.error('Error al exportar el reporte a Excel.', error);
        alert('No se pudo exportar el reporte a Excel.');
    });
}

function renderReportes() {
    generateReportesFromInventory();
    applyReportTableHeaderRow();
    updateReportesSubtitle();
    renderReportMonthFilterOptions();
    renderReportEmployeeFilterOptions();
    renderReportProductFilterOptions();
    const tbody = document.querySelector('#reportes-panel .report-table tbody');
    if (!tbody || !window.APP_MODEL) return;

    const reportes = getFilteredReportes();
    if (!reportes.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="report-empty-row">No hay incidencias con texto en columnas de problema, síntomas, causa o asunto. Revisa el mapeo del Excel o el filtro de mes.</td></tr>';
        renderReportChart();
        return;
    }
    const extractCreatedBy = text => {
        if (!text) return '';
        const raw = String(text).trim();
        const match = raw.match(/Creado por:\s*(.+)$/i);
        return match ? match[1].trim() : '';
    };

    tbody.innerHTML = reportes.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(String(item.problema || ''))}</td>
            <td>${escapeHtml(item.empleado || 'N/A')}</td>
            <td>${escapeHtml(extractCreatedBy(item.producto))}</td>
            <td>${escapeHtml(item.estado || '')}</td>
        </tr>
    `).join('');
    renderReportChart();
}

/* ─── SECCIÓN: PERSISTENCIA (localStorage + Supabase) ───
   saveInventoryToStorage()  → Guarda inventario editado para no perder cambios
   loadInventoryFromStorage() → Recupera datos al recargar la página y prioriza
   el snapshot remoto si está disponible. */

let inventoryRemoteSaveTimer = null;

function applyInventorySnapshot(parsed) {
    if (!window.APP_MODEL) {
        window.APP_MODEL = {};
    }
    if (Array.isArray(parsed)) {
        window.APP_MODEL.inventoryBySheet = { Principal: parsed };
        window.APP_MODEL.activeInventorySheet = 'Principal';
        window.APP_MODEL.excelFieldLabels = getDefaultExcelFieldLabels();
        delete window.APP_MODEL.inventory;
        window.APP_MODEL.hasImportedInventory = true;
        return true;
    }

    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.inventory) && !parsed.inventoryBySheet) {
        window.APP_MODEL.inventoryBySheet = { Principal: parsed.inventory };
        window.APP_MODEL.activeInventorySheet = 'Principal';
        window.APP_MODEL.excelFieldLabels = getDefaultExcelFieldLabels();
        delete window.APP_MODEL.inventory;
        window.APP_MODEL.hasImportedInventory = true;
        return true;
    }

    if (parsed && typeof parsed === 'object' && parsed.inventoryBySheet && typeof parsed.inventoryBySheet === 'object') {
        window.APP_MODEL.inventoryBySheet = parsed.inventoryBySheet;
        const keys = Object.keys(window.APP_MODEL.inventoryBySheet);
        window.APP_MODEL.activeInventorySheet = (parsed.activeInventorySheet && window.APP_MODEL.inventoryBySheet[parsed.activeInventorySheet])
            ? parsed.activeInventorySheet
            : (keys[0] || 'Principal');
        selectedAnalysisSheet = parsed.analysisSheetFilter || 'all';
        window.APP_MODEL.excelFieldLabels = (parsed.excelFieldLabels && typeof parsed.excelFieldLabels === 'object')
            ? Object.assign({}, getDefaultExcelFieldLabels(), parsed.excelFieldLabels)
            : getDefaultExcelFieldLabels();
        delete window.APP_MODEL.inventory;
        window.APP_MODEL.hasImportedInventory = true;
        return true;
    }

    ensureInventoryBySheetModel();
    window.APP_MODEL.hasImportedInventory = false;
    return false;
}

async function loadInventoryFromSupabase() {
    if (!isSupabaseConfigured()) return null;
    try {
        const response = await supabaseRestFetch('reports?select=id,report_type,summary,payload,created_at&report_type=eq.inventory&order=created_at.desc&limit=1', {
            method: 'GET'
        });
        if (!response.ok) {
            console.warn('No se pudo cargar el inventario remoto desde Supabase:', response.status);
            return null;
        }
        const rows = await response.json();
        const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
        if (!row?.payload) return null;
        const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
        if (payload && typeof payload === 'object') {
            applyInventorySnapshot(payload);
            return payload;
        }
    } catch (error) {
        console.warn('No se pudo cargar el snapshot de inventario desde Supabase.', error);
    }
    return null;
}

async function loadInventoryFromSupabaseEquipment() {
    if (!isSupabaseConfigured()) return null;
    try {
        const { equipment } = await loadEquipmentDataFromSupabase();
        if (!Array.isArray(equipment) || !equipment.length) return null;

        const rows = equipment.map(item => ({
            Empleado: String(item.employee_name || '').trim(),
            Equipo: String(item.equipment_name || '').trim(),
            Marca: String(item.brand || '').trim(),
            'Fecha de devolución': String(item.return_date || '').trim(),
            'Descripción del problema': String(item.problem_description || item.action_taken || '').trim(),
            'Acción tomada': String(item.action_taken || '').trim(),
            'Fecha que se le entregó uno nuevo': String(item.replacement_date || '').trim(),
            Estado: String(item.status || 'Pendiente').trim()
        }));

        window.APP_MODEL = window.APP_MODEL || {};
        window.APP_MODEL.inventoryBySheet = {
            Principal: {
                columns: getDefaultInventoryColumns().slice(),
                rows,
                fieldMap: defaultInventoryFieldMap()
            }
        };
        window.APP_MODEL.activeInventorySheet = 'Principal';
        window.APP_MODEL.excelFieldLabels = getDefaultExcelFieldLabels();
        window.APP_MODEL.hasImportedInventory = true;
        return true;
    } catch (error) {
        console.warn('No se pudo cargar el inventario desde Supabase equipment:', error);
        return null;
    }
}

async function saveInventoryToSupabase() {
    if (!isSupabaseConfigured() || !window.APP_MODEL) return false;
    ensureInventoryBySheetModel();
    try {
        const payload = {
            report_type: 'inventory',
            summary: `Snapshot de inventario ${new Date().toLocaleString('es-PE')}`,
            payload: {
                inventoryBySheet: window.APP_MODEL.inventoryBySheet,
                activeInventorySheet: window.APP_MODEL.activeInventorySheet,
                excelFieldLabels: window.APP_MODEL.excelFieldLabels || getDefaultExcelFieldLabels(),
                analysisSheetFilter: selectedAnalysisSheet || 'all'
            }
        };
        const response = await supabaseRestFetch('reports', {
            method: 'POST',
            body: JSON.stringify([payload])
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`No se pudo guardar el inventario en Supabase: ${response.status} ${response.statusText} ${errText}`);
        }
        return true;
    } catch (error) {
        console.warn('No se pudo sincronizar el inventario con Supabase.', error);
        return false;
    }
}

function queueInventoryRemoteSync() {
    if (!isSupabaseConfigured()) return;
    if (inventoryRemoteSaveTimer) {
        clearTimeout(inventoryRemoteSaveTimer);
    }
    inventoryRemoteSaveTimer = setTimeout(() => {
        void saveInventoryToSupabase();
    }, 800);
}

async function loadInventoryFromStorage() {
    const remoteSnapshot = await loadInventoryFromSupabase();
    if (remoteSnapshot) {
        return true;
    }

    const remoteEquipment = await loadInventoryFromSupabaseEquipment();
    if (remoteEquipment) {
        saveInventoryToStorage(true);
        return true;
    }

    const stored = localStorage.getItem('inventoryData');
    if (!stored) {
        ensureInventoryBySheetModel();
        if (!window.APP_MODEL) {
            window.APP_MODEL = {};
        }
        window.APP_MODEL.hasImportedInventory = false;
        return false;
    }

    try {
        const parsed = JSON.parse(stored);
        return applyInventorySnapshot(parsed);
    } catch (error) {
        console.warn('Error leyendo inventoryData desde localStorage', error);
        if (!window.APP_MODEL) {
            window.APP_MODEL = {};
        }
        window.APP_MODEL.inventoryBySheet = { Principal: blankSheetBundle() };
        window.APP_MODEL.activeInventorySheet = 'Principal';
        window.APP_MODEL.excelFieldLabels = getDefaultExcelFieldLabels();
        delete window.APP_MODEL.inventory;
        window.APP_MODEL.hasImportedInventory = false;
        return false;
    }
}

function saveInventoryToStorage(skipRemoteSync = false) {
    if (!window.APP_MODEL) return;
    ensureInventoryBySheetModel();
    try {
        if (window.APP_MODEL.hasImportedInventory !== true) {
            window.APP_MODEL.hasImportedInventory = true;
        }
        localStorage.setItem('inventoryData', JSON.stringify({
            inventoryBySheet: window.APP_MODEL.inventoryBySheet,
            activeInventorySheet: window.APP_MODEL.activeInventorySheet,
            excelFieldLabels: window.APP_MODEL.excelFieldLabels || getDefaultExcelFieldLabels(),
            analysisSheetFilter: selectedAnalysisSheet || 'all'
        }));
        if (!skipRemoteSync) {
            queueInventoryRemoteSync();
        }
    } catch (error) {
        console.warn('Error guardando inventoryData en localStorage', error);
    }
}

function updateInventoryItem(index, colIndex, value) {
    ensureInventoryBySheetModel();
    const bundle = getActiveSheetBundle();
    const rows = bundle.rows;
    const row = rows[index];
    if (!row || colIndex < 0 || colIndex >= bundle.columns.length) return;
    const colKey = bundle.columns[colIndex];
    row[colKey] = value;
    saveInventoryToStorage();
    
    // Actualizar todos los paneles en cascada
    setTimeout(() => {
        renderMetrics();
        renderAnalysis();
        renderAlerts();
        renderReportes();
        updateAnalysisCharts();
    }, 100);
}

// Guarda el contenido mientras se escribe. AsÃ­ un cambio no se pierde si se
// recarga o cierra la pÃ¡gina antes de que la celda pierda el foco.
let inventoryAutosaveTimer = null;
function queueInventoryItemSave(index, colIndex, value) {
    ensureInventoryBySheetModel();
    const bundle = getActiveSheetBundle();
    const row = bundle.rows[index];
    if (!row || colIndex < 0 || colIndex >= bundle.columns.length) return;

    row[bundle.columns[colIndex]] = value;
    clearTimeout(inventoryAutosaveTimer);
    inventoryAutosaveTimer = setTimeout(saveInventoryToStorage, 350);
}


let analysisTrendChart = null;
let analysisTypeChart = null;
let reportChart = null;
const analysisTypeColors = ['#e17055', '#6c5ce7', '#74b9ff', '#00b894', '#00d2d3', '#fdcb6e', '#e84393', '#00cec9'];
const analysisTypeColorMap = {};

/* ─── SECCIÓN: GRÁFICAS Chart.js (Análisis y Reporte) ───
   initializeCharts()    → Crea gráficas de línea, dona y barras
   buildTrendData()    → Serie temporal de fallos
   renderReportChart() → Gráfica del panel Reporte */

function getAnalysisTypeColor(label) {
    if (!label) {
        return '#cccccc';
    }
    if (analysisTypeColorMap[label]) {
        return analysisTypeColorMap[label];
    }
    const existingColors = Object.values(analysisTypeColorMap);
    const nextColor = analysisTypeColors[existingColors.length % analysisTypeColors.length];
    analysisTypeColorMap[label] = nextColor;
    return nextColor;
}

function getAnalysisTypeColors(labels) {
    return labels.map(label => getAnalysisTypeColor(label));
}

function formatMonthShortEs(date) {
    // Ej: "ene", "feb" → "Ene", "Feb"; también elimina el punto si el navegador lo añade.
    const raw = date.toLocaleString('es-ES', { month: 'short' }).replace('.', '').trim();
    if (!raw) return '';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function wrapChartLabel(label, maxLength) {
    if (!label || typeof label !== 'string') return label;
    const words = label.split(/\s+/);
    const lines = [];
    let current = '';
    words.forEach(word => {
        if (!current) {
            current = word;
            return;
        }
        if ((current + ' ' + word).length <= maxLength) {
            current += ' ' + word;
        } else {
            lines.push(current);
            current = word;
        }
    });
    if (current) lines.push(current);
    return lines.length > 1 ? lines : lines[0];
}

function renderTypeLegend(labels, colors) {
    const legend = document.getElementById('analysis-type-legend');
    if (!legend) return;

    legend.innerHTML = labels.map((label, index) => {
        const color = colors[index] || '#ccc';
        return `
            <li><span class="legend-color" style="background:${color}"></span>${label}</li>
        `;
    }).join('');
}

function getFailureDatesFromInventory(inventory) {
    const dates = [];
    inventory.forEach(item => {
        const date = parseDate(item.fechaDevolucion) || parseDate(item.fechaEntrega);
        if (date) dates.push(date);
    });
    return dates.sort((a, b) => a - b);
}

function buildTrendData() {
    ensureInventoryBySheetModel();
    const inventory = getFilteredAnalysisInventory();
    const now = new Date();
    const labels = [];
    const counts = [];

    for (let offset = 5; offset >= 0; offset--) {
        const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        labels.push(formatMonthShortEs(date));
        counts.push(0);
    }

    inventory.forEach(item => {
        // Para tendencia usamos la fecha del evento de falla (devolución/reporte).
        // Si no existe, usamos entrega como fallback.
        const date = parseDate(item.fechaDevolucion) || parseDate(item.fechaEntrega);
        if (!date) return;
        const monthsDiff = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
        if (monthsDiff >= 0 && monthsDiff < 6) {
            const index = 5 - monthsDiff;
            // Tendencia de fallos históricos: cada fila representa un evento registrado en el Excel.
            counts[index] += 1;
        }
    });

    const prediction = predictNextFailureCount(counts, inventory);
    const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextLabel = formatMonthShortEs(nextDate);

    return {
        labels: labels.concat([nextLabel]),
        counts: counts.concat([prediction.count]),
        predictionLabel: nextLabel,
        predictionCount: prediction.count,
        predictionReason: prediction.reason
    };
}

function predictNextFailureCount(counts, inventory) {
    const values = counts.slice();
    const n = values.length;
    if (n === 0) {
        return { count: 0, reason: 'No hay datos históricos suficientes.' };
    }
    const total = values.reduce((a, b) => a + b, 0);
    if (total === 0) {
        const dates = getFailureDatesFromInventory(inventory || []);
        if (dates.length) {
            const firstDate = dates[0];
            const lastDate = dates[dates.length - 1];
            const monthSpan = Math.max(1, Math.ceil(((lastDate - firstDate) / 86400000) / 30));
            const avgPerMonth = Math.max(1, Math.round(dates.length / monthSpan));
            return {
                count: avgPerMonth,
                reason: 'No hay fallos en los últimos 6 meses, se estima según el historial completo del Excel.'
            };
        }
        return { count: 0, reason: 'No hay fallos registrados en los últimos 6 meses.' };
    }

    const sumX = values.reduce((sum, _, index) => sum + index, 0);
    const sumY = values.reduce((sum, value) => sum + value, 0);
    const meanX = sumX / n;
    const meanY = sumY / n;
    let numerator = 0;
    let denominator = 0;

    values.forEach((value, index) => {
        numerator += (index - meanX) * (value - meanY);
        denominator += Math.pow(index - meanX, 2);
    });

    const slope = denominator === 0 ? 0 : numerator / denominator;
    const lastValue = values[n - 1];
    let predicted = Math.round(lastValue + slope);

    if (predicted < 0) predicted = 0;
    // Si hay historial (total>0) y el último mes tuvo fallos, evitamos caer a 0 por ruido.
    if (predicted === 0 && lastValue > 0) predicted = Math.max(1, lastValue);

    const direction = slope > 0 ? 'aumentando' : slope < 0 ? 'disminuyendo' : 'estable';
    const reason = `Tendencia ${direction} sobre los últimos 6 meses.`;

    return { count: predicted, reason };
}

function buildTypeDistribution() {
    ensureInventoryBySheetModel();
    const inventory = getFilteredAnalysisInventory();

    const counts = {};
    inventory.forEach(item => {
        const type = String(item.equipo || '').trim();
        if (!type) return;
        counts[type] = (counts[type] || 0) + 1;
    });

    const sortedEntries = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (!sortedEntries.length) {
        return { labels: ['Sin datos'], data: [1] };
    }

    const labels = sortedEntries.map(([label]) => label);
    return {
        labels,
        data: sortedEntries.map(([, value]) => value),
        colors: getAnalysisTypeColors(labels)
    };
}

function buildReportChartData() {
    const reports = getFilteredReportes();
    const counts = {};
    reports.forEach(item => {
        const product = String(item.producto || 'Desconocido').trim() || 'Desconocido';
        counts[product] = (counts[product] || 0) + 1;
    });

    const labels = Object.keys(counts).slice(0, 5);
    const data = labels.map(label => counts[label]);
    return { labels, data };
}

function renderReportEmployeeFilterOptions() {
    if (!window.APP_MODEL) return;
    const select = document.getElementById('employee-filter');
    if (!select) return;

    const reports = getFilteredReportesForFilter('empleado');
    const employees = Array.from(new Set(reports.map(item => String(item.empleado || '').trim()).filter(Boolean)));
    if (selectedReportEmployee && selectedReportEmployee.trim() && !employees.includes(selectedReportEmployee.trim())) {
        employees.unshift(selectedReportEmployee.trim());
    }
    employees.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    const options = ['<option value="">Todos los empleados</option>'];
    employees.forEach(name => {
        const safe = String(name).replace(/"/g, '&quot;');
        options.push(`<option value="${safe}">${escapeHtml(name)}</option>`);
    });

    select.innerHTML = options.join('');
    select.value = selectedReportEmployee || '';
}

function renderReportProductFilterOptions() {
    if (!window.APP_MODEL) return;
    const select = document.getElementById('product-filter');
    if (!select) return;

    const reports = getFilteredReportesForFilter('producto');
    const productValues = reports.map(item => String(item.producto || '').trim()).filter(Boolean);
    const categoryValues = reports.map(item => String(item.productoCategoria || '').trim()).filter(Boolean);

    // Normalizar y deduplicar (ignorando mayúsculas/acentos y palabras repetidas dentro de la misma etiqueta)
    const normalizedMap = new Map();
    // Excluir estas etiquetas del filtro (sin distinguir mayúsculas/acentos)
    const excludeKeys = new Set(['cargadores', 'impresoras', 'proyectores']);
    function pushValue(v) {
        if (!v) return;
        const key = normalizeOptionKey(v);
        if (!key) return;
        if (excludeKeys.has(key)) return; // saltar valores excluidos
        const candidate = dedupeWordsPreserve(v);
        const existing = normalizedMap.get(key);
        // Preferir la etiqueta más larga (más descriptiva) como representante
        if (!existing || (String(candidate).length > String(existing).length)) {
            normalizedMap.set(key, candidate);
        }
    }
    // recorrer categorías primero para darles preferencia visual, luego productos
    categoryValues.forEach(pushValue);
    productValues.forEach(pushValue);

    // Asegurar que la selección actual esté presente
    if (selectedReportProduct && String(selectedReportProduct).trim()) {
        const selKey = normalizeOptionKey(selectedReportProduct);
        if (selKey && !normalizedMap.has(selKey)) {
            normalizedMap.set(selKey, dedupeWordsPreserve(String(selectedReportProduct).trim()));
        }
    }

    const values = Array.from(normalizedMap.values());
    values.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    // Dedupe final: asegurar que no existan etiquetas muy similares o repetidas
    const finalValues = [];
    const seenKeys = new Set();
    values.forEach(v => {
        const key = normalizeOptionKey(v);
        if (!key) return;
        if (!seenKeys.has(key)) {
            seenKeys.add(key);
            finalValues.push(v);
        }
    });

    const options = ['<option value="">Todos los equipos</option>'];
    finalValues.forEach(value => {
        const safe = String(value).replace(/"/g, '&quot;');
        options.push(`<option value="${safe}">${escapeHtml(value)}</option>`);
    });

    select.innerHTML = options.join('');
    if (selectedReportProduct && String(selectedReportProduct).trim()) {
        const selKey = normalizeOptionKey(selectedReportProduct);
        const rep = normalizedMap.get(selKey) || String(selectedReportProduct).trim();
        select.value = rep;
    } else {
        select.value = '';
    }
}

function initializeCharts() {
    const trendCtx = document.getElementById('analysis-trend-chart');
    const typeCtx = document.getElementById('analysis-type-chart');
    const reportCtx = document.getElementById('report-chart');

    if (trendCtx && !analysisTrendChart) {
        analysisTrendChart = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Fallos',
                    data: [],
                    borderColor: '#0984e3',
                    backgroundColor: 'rgba(9, 132, 227, 0.15)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#0984e3'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    }

    if (typeCtx && !analysisTypeChart) {
        analysisTypeChart = new Chart(typeCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [],
                    borderColor: [],
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    if (reportCtx && !reportChart) {
        reportChart = new Chart(reportCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Problemas',
                    data: [],
                    backgroundColor: '#6c5ce7'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        ticks: {
                            maxRotation: 0,
                            minRotation: 0,
                            callback: function(value, index) {
                                const label = this.chart && this.chart.data && this.chart.data.labels
                                    ? this.chart.data.labels[index] || value
                                    : value;
                                return wrapChartLabel(label, 22);
                            }
                        }
                    },
                    y: { beginAtZero: true }
                }
            }
        });
    }

    updateAnalysisCharts();
    renderReportChart();
}

function updateAnalysisCharts(data) {
    const trendData = buildTrendData();
    if (analysisTrendChart) {
        analysisTrendChart.data.labels = trendData.labels;
        analysisTrendChart.data.datasets[0].data = trendData.counts;
        analysisTrendChart.data.datasets[0].pointBackgroundColor = trendData.counts.map((_, index) => index === trendData.counts.length - 1 ? '#d63031' : '#0984e3');
        analysisTrendChart.update();
    }

    const typeData = buildTypeDistribution();
    if (analysisTypeChart) {
        analysisTypeChart.data.labels = typeData.labels;
        analysisTypeChart.data.datasets[0].data = typeData.data;
        analysisTypeChart.data.datasets[0].backgroundColor = typeData.colors;
        analysisTypeChart.data.datasets[0].borderColor = typeData.colors.map(color => color || '#fff');
        analysisTypeChart.update();
        renderTypeLegend(typeData.labels, typeData.colors);
    }

    renderReportChart();
    try { renderWorkerNotifications(); } catch (e) { console.warn('Error mostrando notificaciones de trabajador', e); }
}

function renderReportChart() {
    if (!reportChart) return;
    const reportData = buildReportChartData();
    reportChart.data.labels = reportData.labels;
    reportChart.data.datasets[0].data = reportData.data;
    reportChart.update();
}

/* ─── SECCIÓN: TABLA INVENTARIO (index.html → #inventory-panel) ───
   renderInventoryTable() → Dibuja columnas y filas editables
   addInventoryRow()      → Añade fila vacía
   updateInventoryItem()  → Guarda celda al editar */

function addInventoryRow() {
    if (!window.APP_MODEL) {
        window.APP_MODEL = {};
    }
    ensureInventoryBySheetModel();
    const key = getActiveInventorySheetKey();
    const bundle = getSheetBundle(key);
    const empty = {};
    bundle.columns.forEach(col => {
        empty[col] = '';
    });
    bundle.rows.push(empty);

    saveInventoryToStorage();
    
    // Actualizar todos los paneles
    setTimeout(() => {
        renderInventory();
        renderMetrics();
        renderAnalysis();
        renderAlerts();
        renderReportes();
    }, 100);
}

function deleteInventoryRow(index) {
    ensureInventoryBySheetModel();
    const rows = getActiveInventoryRows();
    if (!rows || index < 0 || index >= rows.length) return;
    rows.splice(index, 1);
    saveInventoryToStorage();
    
    // Actualizar todos los paneles
    setTimeout(() => {
        renderInventory();
        renderMetrics();
        renderAnalysis();
        renderAlerts();
        renderReportes();
    }, 100);
}

function isInventoryRowFilled(row) {
    return Object.values(row).some(value => String(value || '').trim() !== '');
}

/* ─── SECCIÓN: MODELO DE INVENTARIO (model/data.js → APP_MODEL.inventoryBySheet) ───
   getAllInventoryFlat()      → Todas las filas de todas las hojas
   ensureInventoryBySheetModel() → Asegura estructura válida del modelo
   getSheetBundle()           → Datos de una hoja (columnas + filas + fieldMap) */

function defaultInventoryFieldMap() {
    return {
        empleado: 'Empleado',
        equipo: 'Equipo',
        marca: 'Marca',
        fechaDevolucion: 'Fecha de devolución',
        descripcion: 'Descripción del problema',
        accion: 'Acción tomada',
        fechaEntrega: 'Fecha que se le entregó uno nuevo',
        estado: 'Estado'
    };
}

function getDefaultInventoryColumns() {
    return [
        'Empleado',
        'Equipo',
        'Marca',
        'Fecha de devolución',
        'Descripción del problema',
        'Acción tomada',
        'Fecha que se le entregó uno nuevo',
        'Estado'
    ];
}

function blankSheetBundle() {
    return {
        columns: getDefaultInventoryColumns().slice(),
        rows: [],
        fieldMap: defaultInventoryFieldMap()
    };
}

function legacyRowToDynamic(row) {
    const fm = defaultInventoryFieldMap();
    const o = {};
    Object.keys(fm).forEach(internal => {
        const col = fm[internal];
        o[col] = row && row[internal] != null ? String(row[internal]) : '';
    });
    return o;
}

function legacyArrayToBundle(arr) {
    return {
        columns: getDefaultInventoryColumns().slice(),
        rows: (arr || []).map(legacyRowToDynamic),
        fieldMap: defaultInventoryFieldMap()
    };
}

function getSheetBundle(sheetKey) {
    ensureInventoryBySheetModel();
    const m = window.APP_MODEL.inventoryBySheet;
    const raw = m[sheetKey];
    if (!raw) {
        return blankSheetBundle();
    }
    if (Array.isArray(raw)) {
        const b = legacyArrayToBundle(raw);
        m[sheetKey] = b;
        return b;
    }
    const defCols = getDefaultInventoryColumns();
    const columns = Array.isArray(raw.columns) && raw.columns.length ? raw.columns.slice() : defCols.slice();
    const fieldMap = (raw.fieldMap && typeof raw.fieldMap === 'object')
        ? Object.assign(defaultInventoryFieldMap(), raw.fieldMap)
        : defaultInventoryFieldMap();
    const rows = Array.isArray(raw.rows) ? raw.rows : [];
    return { columns, rows, fieldMap };
}

function getActiveSheetBundle() {
    return getSheetBundle(getActiveInventorySheetKey());
}

function rowToCanonical(row, fieldMap) {
    const fm = fieldMap || defaultInventoryFieldMap();
    const out = emptyInventoryRow();
    Object.keys(out).forEach(internal => {
        const colKey = fm[internal];
        if (!colKey || !row) return;
        const rawVal = row[colKey];
        if (internal === 'fechaDevolucion' || internal === 'fechaEntrega') {
            const dt = parseDate(String(rawVal || ''));
            out[internal] = dt ? formatDateEs(dt) : String(rawVal || '').trim();
        } else {
            out[internal] = String(rawVal == null ? '' : rawVal).trim();
        }
    });
    return out;
}

function isDynamicRowFilled(row) {
    if (!row || typeof row !== 'object') return false;
    return Object.keys(row).some(k => String(row[k] || '').trim() !== '');
}

function getAllInventoryFlat() {
    const m = window.APP_MODEL && window.APP_MODEL.inventoryBySheet;
    if (!m || typeof m !== 'object') {
        return [];
    }
    return Object.keys(m).flatMap(k => {
        const b = getSheetBundle(k);
        return (b.rows || []).map(row => rowToCanonical(row, b.fieldMap)).filter(isInventoryRowFilled);
    });
}

function ensureInventoryBySheetModel() {
    if (!window.APP_MODEL) {
        window.APP_MODEL = {};
    }
    if (window.APP_MODEL.inventoryBySheet && typeof window.APP_MODEL.inventoryBySheet === 'object') {
        const keys = Object.keys(window.APP_MODEL.inventoryBySheet);
        if (!keys.length) {
            window.APP_MODEL.inventoryBySheet = { Principal: blankSheetBundle() };
        }
        keys.forEach(k => {
            if (Array.isArray(window.APP_MODEL.inventoryBySheet[k])) {
                window.APP_MODEL.inventoryBySheet[k] = legacyArrayToBundle(window.APP_MODEL.inventoryBySheet[k]);
            }
        });
        const cur = window.APP_MODEL.activeInventorySheet;
        if (!cur || !window.APP_MODEL.inventoryBySheet[cur]) {
            window.APP_MODEL.activeInventorySheet = Object.keys(window.APP_MODEL.inventoryBySheet)[0];
        }
        if (!window.APP_MODEL.excelFieldLabels || typeof window.APP_MODEL.excelFieldLabels !== 'object') {
            window.APP_MODEL.excelFieldLabels = getDefaultExcelFieldLabels();
        }
        return;
    }
    const fromFlat = Array.isArray(window.APP_MODEL.inventory) ? window.APP_MODEL.inventory : [];
    window.APP_MODEL.inventoryBySheet = {
        Principal: fromFlat.length ? legacyArrayToBundle(fromFlat) : blankSheetBundle()
    };
    window.APP_MODEL.activeInventorySheet = 'Principal';
    delete window.APP_MODEL.inventory;
    if (!window.APP_MODEL.excelFieldLabels || typeof window.APP_MODEL.excelFieldLabels !== 'object') {
        window.APP_MODEL.excelFieldLabels = getDefaultExcelFieldLabels();
    }
}

function getActiveInventorySheetKey() {
    ensureInventoryBySheetModel();
    const m = window.APP_MODEL.inventoryBySheet;
    const keys = Object.keys(m);
    const cur = window.APP_MODEL.activeInventorySheet;
    if (cur && m[cur]) {
        return cur;
    }
    window.APP_MODEL.activeInventorySheet = keys[0] || 'Principal';
    return window.APP_MODEL.activeInventorySheet;
}

function getActiveInventoryRows() {
    return getActiveSheetBundle().rows;
}

function setActiveInventorySheet(sheetKey) {
    commitActiveEdit();
    ensureInventoryBySheetModel();
    if (!sheetKey || !window.APP_MODEL.inventoryBySheet[sheetKey]) {
        return;
    }
    window.APP_MODEL.activeInventorySheet = sheetKey;
    saveInventoryToStorage();
    renderInventory();
}

function addInventorySheetTab() {
    commitActiveEdit();
    ensureInventoryBySheetModel();
    const suggested = 'Nueva hoja';
    const input = prompt('Nombre de la nueva hoja (como una pestaña de Excel):', suggested);
    if (input === null) {
        return;
    }
    let name = String(input).trim() || suggested;
    const m = window.APP_MODEL.inventoryBySheet;
    const original = name;
    let n = 2;
    while (m[name]) {
        name = `${original} (${n})`;
        n += 1;
    }
    m[name] = blankSheetBundle();
    window.APP_MODEL.activeInventorySheet = name;
    saveInventoryToStorage();
    setTimeout(() => {
        renderInventory();
        renderMetrics();
        renderAnalysis();
        renderAlerts();
        renderReportes();
    }, 50);
}

/* ─── SECCIÓN: MÉTRICAS KPI (tarjetas morada/azul/roja del inventario) ───
   getInventoryMetrics() → Calcula activos, utilización y alertas
   renderMetrics()       → Actualiza #card-active, #card-utilization, #card-alerts */

function getInventoryMetrics() {
    ensureInventoryBySheetModel();
    const filledInventory = getAllInventoryFlat();
    const total = filledInventory.length;
    const resolvedCount = filledInventory.filter(item => item.estado && /resuelto|solucionado|entregado|ok|activo/i.test(item.estado)).length;
    const alertsCount = filledInventory.filter(item => {
        const estado = item.estado || '';
        const isResolved = /resuelto|solucionado|entregado|ok|activo/i.test(estado);
        return !isResolved;
    }).length;
    const utilization = total ? Math.round((resolvedCount / total) * 100) : 0;
    return {
        total,
        utilization,
        alertsCount
    };
}

function renderMetrics() {
    const metrics = getInventoryMetrics();
    const activeEl = document.getElementById('card-active');
    const utilizationEl = document.getElementById('card-utilization');
    const alertsEl = document.getElementById('card-alerts');

    if (activeEl) activeEl.innerText = metrics.total;
    if (utilizationEl) utilizationEl.innerText = `${metrics.utilization}%`;
    if (alertsEl) alertsEl.innerText = metrics.alertsCount;
}

function parseDate(value) {
    if (!value) return null;
    const cleaned = String(value).trim();
    // Excel a veces guarda fechas como serial (ej: 46145). Convertimos: 1899-12-30 + serial días.
    if (/^\d{5}$/.test(cleaned)) {
        const serial = Number(cleaned);
        if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
            const excelEpoch = new Date(1899, 11, 30);
            const dt = new Date(excelEpoch.getTime() + serial * 86400000);
            return isNaN(dt) ? null : dt;
        }
    }
    // Formato ISO (input type="date"): yyyy-mm-dd
    const iso = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) {
        const y = Number(iso[1]);
        const m = Number(iso[2]);
        const d = Number(iso[3]);
        const dt = new Date(y, m - 1, d);
        return isNaN(dt) ? null : dt;
    }
    const date = new Date(cleaned);
    if (!isNaN(date)) {
        return date;
    }
    const match = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (match) {
        const a = Number(match[1]);
        const b = Number(match[2]);
        const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
        if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(year)) return null;

        // Heurística robusta:
        // - Si a > 12 y b <= 12 => dd/mm
        // - Si b > 12 y a <= 12 => mm/dd
        // - Si ambos <= 12 => preferimos dd/mm (formato habitual en ES)
        let day;
        let month;
        if (a > 12 && b <= 12) {
            day = a;
            month = b;
        } else if (b > 12 && a <= 12) {
            day = b;
            month = a;
        } else {
            day = a;
            month = b;
        }
        const dt = new Date(year, month - 1, day);
        return isNaN(dt) ? null : dt;
    }
    return null;
}

function daysBetween(start, end) {
    const ms = 1000 * 60 * 60 * 24;
    return Math.round((end - start) / ms);
}

function formatDateEs(date) {
    if (!date || isNaN(date)) return '';
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function formatDateLongEs(date) {
    if (!date || isNaN(date)) return '';
    // Ej: "3 de julio de 2026"
    const day = date.getDate();
    const month = date.toLocaleString('es-ES', { month: 'long' });
    const year = date.getFullYear();
    return `${day} de ${month} de ${year}`;
}

function formatDateForInput(value) {
    const date = parseDate(value);
    if (!date || isNaN(date)) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function getFailureEventDate(item) {
    // Preferimos la fecha del evento (cuando se reportó/devolvió) y si no, la de entrega.
    return parseDate(item.fechaDevolucion) || parseDate(item.fechaEntrega) || null;
}

function buildFailureHistory(inventory) {
    const byEquipo = {};
    inventory.forEach(item => {
        const equipo = String(item.equipo || 'Desconocido').trim() || 'Desconocido';
        const date = getFailureEventDate(item);
        if (!date) return;
        if (!byEquipo[equipo]) byEquipo[equipo] = [];
        byEquipo[equipo].push(date);
    });
    Object.keys(byEquipo).forEach(equipo => {
        byEquipo[equipo].sort((a, b) => a - b);
    });
    return byEquipo;
}

function averageIntervalDays(dates) {
    if (!Array.isArray(dates) || dates.length < 2) return null;
    const intervals = [];
    for (let i = 1; i < dates.length; i++) {
        const delta = daysBetween(dates[i - 1], dates[i]);
        if (Number.isFinite(delta) && delta > 0) intervals.push(delta);
    }
    if (!intervals.length) return null;
    const sum = intervals.reduce((a, b) => a + b, 0);
    return sum / intervals.length;
}

function pickMostLikelyEquipo(historyByEquipo) {
    // Heurística: prioriza mayor volumen de eventos y menor intervalo promedio (más frecuente).
    const candidates = Object.keys(historyByEquipo).map(equipo => {
        const dates = historyByEquipo[equipo] || [];
        const avg = averageIntervalDays(dates);
        return {
            equipo,
            count: dates.length,
            avgInterval: avg
        };
    }).filter(c => c.count > 0);

    if (!candidates.length) return null;

    candidates.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        const aScore = a.avgInterval == null ? Number.POSITIVE_INFINITY : a.avgInterval;
        const bScore = b.avgInterval == null ? Number.POSITIVE_INFINITY : b.avgInterval;
        return aScore - bScore;
    });

    return candidates[0];
}

function pickMostLikelyEmpleadoForEquipo(inventory, equipo) {
    const counts = {};
    const target = String(equipo || '').trim();
    inventory.forEach(item => {
        if (String(item.equipo || '').trim() !== target) return;
        const empleado = String(item.empleado || '').trim();
        if (!empleado) return;
        counts[empleado] = (counts[empleado] || 0) + 1;
    });
    const entries = Object.entries(counts);
    if (!entries.length) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
}

function predictNextFailureEvent(inventory) {
    const filled = Array.isArray(inventory) ? inventory.filter(isInventoryRowFilled) : [];
    const history = buildFailureHistory(filled);
    const pick = pickMostLikelyEquipo(history);
    if (!pick) {
        const now = new Date();
        const fallback = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return {
            empleado: 'N/A',
            equipo: 'N/A',
            date: fallback,
            confidence: 'Baja',
            reason: 'No hay fechas válidas en el Excel para estimar una próxima falla.'
        };
    }

    const dates = history[pick.equipo] || [];
    const last = dates[dates.length - 1] || null;
    const avgDays = averageIntervalDays(dates);
    const empleadoPick = pickMostLikelyEmpleadoForEquipo(filled, pick.equipo) || 'N/A';

    if (!last || avgDays == null) {
        const now = new Date();
        const fallback = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return {
            empleado: empleadoPick,
            equipo: pick.equipo,
            date: fallback,
            confidence: 'Media',
            reason: 'Hay historial, pero no suficientes intervalos; se aproxima al próximo mes.'
        };
    }

    const now = new Date();
    const roundedAvg = Math.round(avgDays);
    // Guardrails: si el promedio es demasiado grande, suele ser por datos muy separados o fechas mal registradas.
    // En ese caso, preferimos una estimación conservadora (próximo mes) para no mostrar una fecha absurda.
    const MAX_REASONABLE_AVG_DAYS = 180;
    if (!Number.isFinite(roundedAvg) || roundedAvg <= 0 || roundedAvg > MAX_REASONABLE_AVG_DAYS) {
        const fallback = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return {
            empleado: empleadoPick,
            equipo: pick.equipo,
            date: fallback,
            confidence: 'Baja',
            reason: `El intervalo promedio entre fallas (${Math.round(avgDays)} día(s)) es atípico; se estima al próximo mes.`
        };
    }

    const next = new Date(last);
    next.setDate(next.getDate() + Math.max(7, roundedAvg));
    // Evitar fechas en el pasado (p. ej. si el último evento es antiguo y el intervalo ya pasó).
    if (next <= now) {
        const fallback = new Date(now);
        fallback.setDate(fallback.getDate() + Math.max(7, roundedAvg));
        next.setTime(fallback.getTime());
    }
    // Si aun así cae demasiado lejos, hacemos fallback.
    const horizonDays = daysBetween(now, next);
    if (!Number.isFinite(horizonDays) || horizonDays > 365) {
        const fallback = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return {
            empleado: empleadoPick,
            equipo: pick.equipo,
            date: fallback,
            confidence: 'Baja',
            reason: 'La proyección excede el horizonte razonable; se estima al próximo mes.'
        };
    }

    const confidence = dates.length >= 6 ? 'Alta' : dates.length >= 3 ? 'Media' : 'Baja';
    return {
        empleado: empleadoPick,
        equipo: pick.equipo,
        date: next,
        confidence,
        reason: `Promedio de ${roundedAvg} día(s) entre fallas para este equipo según el Excel.`
    };
}

/* ─── SECCIÓN: ANÁLISIS PREDICTIVO (index.html → #analysis-panel) ───
   getAnalysisData()        → Riesgo, fallos estimados y probabilidades por equipo
   predictNextFailureEvent() → Proyección del próximo fallo según historial
   renderAnalysis()         → Actualiza gráficas, medidor y tabla de riesgo */

function getAnalysisData() {
    ensureInventoryBySheetModel();
    const inventory = getFilteredAnalysisInventory();
    const now = new Date();
    const nextFailure = predictNextFailureEvent(inventory);
    const trend = buildTrendData();
    
    // Análisis por tipo de equipo
    const equipoStats = {};
    
    inventory.forEach(item => {
        const equipo = item.equipo || 'Desconocido';
        const descripcion = String(item.descripcion || '').toLowerCase();
        const estadoText = String(item.estado || '').toLowerCase();
        const date = parseDate(item.fechaDevolucion) || parseDate(item.fechaEntrega) || now;
        const ageDays = daysBetween(date, now);
        const isResolved = /resuelto|solucionado|entregado|ok|activo/i.test(estadoText);
        
        if (!equipoStats[equipo]) {
            equipoStats[equipo] = {
                total: 0,
                sin_resolver: 0,
                criticos: 0,
                antiguedad_promedio: 0,
                descripcion_problemas: [],
                fechas: [],
                problemas_recurrentes: {}
            };
        }
        
        equipoStats[equipo].total += 1;
        equipoStats[equipo].descripcion_problemas.push(descripcion);
        equipoStats[equipo].fechas.push(ageDays);
        
        if (!isResolved) {
            equipoStats[equipo].sin_resolver += 1;
        }
        
        // Detectar problemas recurrentes
        const problema_key = descripcion.substring(0, 30);
        equipoStats[equipo].problemas_recurrentes[problema_key] = (equipoStats[equipo].problemas_recurrentes[problema_key] || 0) + 1;
        
        // Detectar crítico
        const isCritical = /critico|urgente|prioritario|fallo grave|error|daño|rotura|no funciona/i.test(descripcion);
        if (isCritical && !isResolved) {
            equipoStats[equipo].criticos += 1;
        }
    });
    
    // Calcular proyecciones inteligentes - TOTALMENTE DINÁMICO
    const riskTable = [];
    
    Object.keys(equipoStats).forEach(equipo => {
        const stats = equipoStats[equipo];
        let projection = 'Baja';
        let fallos = stats.total; // Mostrar total histórico de fallos
        
        // Métrica: porcentaje de sin resolver
        const porcentaje_sin_resolver = stats.total > 0 ? (stats.sin_resolver / stats.total) * 100 : 0;
        
        // Métrica: problemas recurrentes
        const problemas_frecuentes = Object.values(stats.problemas_recurrentes).filter(count => count >= 2).length;
        
        // Métrica: criticalidad
        const porcentaje_criticos = stats.total > 0 ? (stats.criticos / stats.total) * 100 : 0;
        
        // Lógica de predicción mejorada
        if (porcentaje_sin_resolver > 40 || porcentaje_criticos > 30 || problemas_frecuentes >= 2) {
            projection = 'Alta';
        } else if (stats.total >= 2 || problemas_frecuentes >= 1) {
            projection = 'Media';
        } else {
            projection = 'Baja';
        }
        
        // Calcular probabilidad de fallo futuro basada en historial
        let probabilidad = '10%';
        if (stats.total === 0) {
            probabilidad = '0%';
        } else if (projection === 'Alta') {
            probabilidad = Math.min(95, 50 + Math.round(porcentaje_sin_resolver / 2)) + '%';
        } else if (projection === 'Media') {
            probabilidad = Math.min(70, 30 + Math.round(stats.total * 10)) + '%';
        } else {
            probabilidad = Math.min(40, 10 + stats.total * 5) + '%';
        }
        
        riskTable.push({
            equipo: equipo,
            fallos: stats.sin_resolver, // Fallos actuales sin resolver
            historico: stats.total,     // Fallos históricos totales
            projection: projection,
            probabilidad: probabilidad,
            estadoText: stats.sin_resolver > 0 ? `${stats.sin_resolver} sin resolver` : 'Todos resueltos'
        });
    });
    
    // Calcular nivel de riesgo general basado en datos reales
    const totalEquipos = riskTable.length || 1;
    const equiposAltoRiesgo = riskTable.filter(item => item.projection === 'Alta').length;
    const equiposMedioRiesgo = riskTable.filter(item => item.projection === 'Media').length;
    
    const porcentajeAlto = totalEquipos > 0 ? (equiposAltoRiesgo / totalEquipos) * 100 : 0;
    const porcentajeMedio = totalEquipos > 0 ? (equiposMedioRiesgo / totalEquipos) * 100 : 0;
    
    let riskLevel = 'Bajo';
    let riskPercentage = 0;
    let openFailures = 0;
    
    // Calcular fallos sin resolver totales
    riskTable.forEach(item => {
        openFailures += item.fallos;
    });
    
    // Score global (0-100) mezclando proyección + % abiertos por equipo.
    // Esto evita mostrar 100% solo por existir 1 caso abierto.
    const projectionWeight = { Alta: 1, Media: 0.6, Baja: 0.2 };
    let scoreSum = 0;
    riskTable.forEach(row => {
        const proj = projectionWeight[row.projection] ?? 0.2;
        const openRate = row.historico > 0 ? row.fallos / row.historico : 0;
        const rowScore = Math.min(1, proj * 0.7 + openRate * 0.3);
        scoreSum += rowScore;
    });
    const score = riskTable.length ? Math.round((scoreSum / riskTable.length) * 100) : 0;
    riskPercentage = score;
    if (score >= 70) riskLevel = 'Alto';
    else if (score >= 40) riskLevel = 'Medio';
    else if (riskTable.length) riskLevel = 'Bajo';
    else riskLevel = 'Sin datos';
    
    // Si no hay datos en absoluto
    if (totalEquipos === 0 || riskTable.length === 0) {
        riskLevel = 'Sin datos';
        riskPercentage = 0;
        openFailures = 0;
    }

    return {
        riskLevel,
        riskPercentage,
        // "Fallos estimados" = predicción para el próximo mes desde la tendencia.
        estimatedFailures: trend?.predictionCount ?? 0,
        openFailures,
        riskTable: riskTable,
        nextFailure
    };
}


function renderAnalysis() {
    // Asegurar charts disponibles al entrar al panel
    initializeCharts();
    renderAnalysisSheetFilterOptions();
    const data = getAnalysisData();
    const riskEl = document.getElementById('analysis-risk');
    const riskPercentageEl = document.getElementById('analysis-risk-percentage');
    const failuresEl = document.getElementById('analysis-failures');
    const tableBody = document.getElementById('analysis-risk-table-body');
    const riskBar = document.getElementById('analysis-risk-bar');
    const riskMeterValueEl = document.getElementById('analysis-risk-meter-value');

    if (riskEl) {
        riskEl.innerText = data.riskLevel;
        riskEl.dataset.risk = data.riskLevel.toLowerCase();
    }
    
    if (riskPercentageEl) {
        riskPercentageEl.innerText = `${data.riskPercentage}%`;
    }
    if (riskBar) {
        riskBar.style.width = `${Math.max(0, Math.min(100, data.riskPercentage))}%`;
    }
    if (riskMeterValueEl) {
        riskMeterValueEl.innerText = `${data.riskPercentage}%`;
    }
    
    if (failuresEl) {
        failuresEl.innerText = data.estimatedFailures ?? 0;
    }
    
    if (tableBody) {
        tableBody.innerHTML = data.riskTable.map(row => `
            <tr class="risk-row risk-${row.projection.toLowerCase()}">
                <td>${row.equipo}</td>
                <td><span class="fallos-badge">${row.fallos}</span></td>
                <td><span class="proyeccion-badge proyeccion-${row.projection.toLowerCase()}">${row.projection}</span></td>
                <td><span class="probabilidad-badge">${row.probabilidad || 'N/A'}</span></td>
            </tr>
        `).join('');
    }
    updateAnalysisCharts(data);

    // Mensaje principal de IA: "cuándo se va a malograr otro"
    const predictionEl = document.getElementById('analysis-prediction');
    if (predictionEl && data.nextFailure) {
        const when = formatDateLongEs(data.nextFailure.date);
        const equipo = data.nextFailure.equipo || 'N/A';
        const empleado = data.nextFailure.empleado || 'N/A';
        const conf = data.nextFailure.confidence || 'Baja';
        const reason = data.nextFailure.reason ? ` ${data.nextFailure.reason}` : '';
        const trendData = buildTrendData();
        const trendText = trendData && trendData.predictionLabel
            ? ` Además, estima ${trendData.predictionCount} fallo(s) en ${trendData.predictionLabel} (${trendData.predictionReason}).`
            : '';
        predictionEl.innerText = `IA predictiva: ${empleado} podría presentar un fallo en ${when} (${equipo}). Confianza: ${conf}.${reason}${trendText}`;
    }
}

function getAtRiskWorkers() {
    ensureInventoryBySheetModel();
    if (!window.APP_MODEL || window.APP_MODEL.hasImportedInventory !== true) {
        return [];
    }
    const inventory = getFilteredAnalysisInventory();
    const atRisk = new Map();

    // 1) Usar la predicción principal (si existe)
    const predicted = predictNextFailureEvent(inventory);
    if (predicted && predicted.empleado && String(predicted.empleado).trim() && predicted.empleado !== 'N/A') {
        atRisk.set(String(predicted.empleado).trim(), `IA: posible fallo en ${predicted.equipo || 'equipo desconocido'} el ${formatDateLongEs(predicted.date)}. Confianza: ${predicted.confidence || 'Baja'}`);
    }

    // 2) Empleados con incidencias sin resolver recientes o múltiples sin resolver
    const unresolvedCounts = {};
    const now = new Date();
    inventory.forEach(item => {
        const emp = String(item.empleado || '').trim();
        if (!emp) return;
        const estadoText = String(item.estado || '').toLowerCase();
        const isResolved = /resuelto|solucionado|entregado|ok|activo/i.test(estadoText);
        const date = parseDate(item.fechaDevolucion) || parseDate(item.fechaEntrega) || now;
        const age = daysBetween(date, now);
        if (!isResolved) {
            unresolvedCounts[emp] = (unresolvedCounts[emp] || 0) + 1;
            if (age <= 30 || age === 0) {
                if (!atRisk.has(emp)) {
                    atRisk.set(emp, `Registro sin resolver (${item.equipo || 'equipo'}) reportado hace ${age} día(s).`);
                }
            }
        }
    });

    Object.keys(unresolvedCounts).forEach(emp => {
        const c = unresolvedCounts[emp];
        if (c >= 2 && !atRisk.has(emp)) {
            atRisk.set(emp, `${c} incidencia(s) sin resolver`);
        }
    });

    return Array.from(atRisk.entries()).map(([empleado, reason]) => ({ empleado, reason }));
}

function renderWorkerNotifications() {
    const container = document.getElementById('worker-notifications');
    if (!container) return;

    const list = getAtRiskWorkers();
    container.innerHTML = '';

    if (!list || !list.length) return;

    // Solicitar permiso de notificación si corresponde
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        try { Notification.requestPermission(); } catch (e) { /* ignorar */ }
    }

    list.forEach(item => {
        const toast = document.createElement('div');
        toast.className = 'worker-toast';
        toast.innerHTML = `<strong>${escapeHtml(item.empleado)}</strong><small>${escapeHtml(item.reason)}</small>`;
        container.appendChild(toast);
        // Mostrar notificación del sistema si se permite
        try {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification(`Riesgo: ${item.empleado}`, { body: item.reason });
            }
        } catch (e) {
            // ignore Notification errors
        }
        // Auto-remover después de 8s
        setTimeout(() => {
            try { if (toast && toast.parentNode) toast.parentNode.removeChild(toast); } catch (e) {}
        }, 8000);
    });
}

function commitActiveEdit() {
    const active = document.activeElement;
    if (active && active.matches && active.matches('td[contenteditable]')) {
        active.blur();
    }
}

/* ─── SECCIÓN: IMPORTAR / EXPORTAR EXCEL ───
   loadInventoryFromExcel()  → Lee .xlsx/.csv y carga todas las columnas
   exportInventoryExcel()    → Descarga inventario con estilos (ExcelJS)
   parseInventoryFromWorkbook() → Convierte hojas del libro a APP_MODEL */

function normalizeHeader(value) {
    return value.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function normalizeOptionKey(value) {
    if (!value && value !== '') return '';
    // Normaliza, elimina diacríticos, convierte a minúsculas y remueve puntuación
    const base = normalizeHeader(String(value || ''));
    // Reemplaza cualquier carácter que no sea letra/número/espacio por espacio
    const cleaned = base.replace(/[^a-z0-9\s]/g, ' ');
    return cleaned.replace(/\s+/g, ' ').trim();
}

function dedupeWordsPreserve(value) {
    if (!value) return value;
    const parts = String(value).split(/\s+/);
    const seen = new Set();
    const out = [];
    parts.forEach(p => {
        const k = p.toLowerCase();
        if (!seen.has(k)) {
            seen.add(k);
            out.push(p);
        }
    });
    return out.join(' ');
}

function emptyInventoryRow() {
    return {
        empleado: '',
        equipo: '',
        marca: '',
        fechaDevolucion: '',
        descripcion: '',
        accion: '',
        fechaEntrega: '',
        estado: ''
    };
}

function coerceInventoryImportValue(rawValue, field) {
    if (rawValue === null || rawValue === undefined || rawValue === '') {
        return '';
    }
    if ((field === 'fechaDevolucion' || field === 'fechaEntrega') && typeof rawValue === 'number' && Number.isFinite(rawValue)) {
        const serial = Math.floor(rawValue);
        if (serial > 200 && serial < 1000000) {
            const excelEpoch = new Date(1899, 11, 30);
            const dt = new Date(excelEpoch.getTime() + serial * 86400000);
            if (!isNaN(dt)) {
                return formatDateEs(dt);
            }
        }
    }
    if ((field === 'fechaDevolucion' || field === 'fechaEntrega') && rawValue instanceof Date && !isNaN(rawValue)) {
        return formatDateEs(rawValue);
    }
    if (field === 'fechaDevolucion' || field === 'fechaEntrega') {
        const dt = parseDate(String(rawValue).trim());
        if (dt) {
            return formatDateEs(dt);
        }
    }
    return String(rawValue).trim();
}

function isDateLikeColumnKey(colKey) {
    const h = normalizeHeader(String(colKey || ''));
    if (!h) {
        return false;
    }
    if (/cont\.?\s*ini|ini\s*\/\s*fin|conteo|folio\s*ini|nro\.?\s*contrato\s*$/.test(h)) {
        return false;
    }
    if (/datetime|timestamp|vencimiento|caducidad|fecha\s*y\s*hora/.test(h)) {
        return true;
    }
    if (/\bfecha\b|^fecha|fecha$|fecha\s*:|fecha\s+de|fecha\s+del|fecha\s+hasta|fecha\s+desde|\/fecha/.test(h)) {
        return true;
    }
    if (/\bdate\b|^date|_date$|-date$/.test(h)) {
        return true;
    }
    return false;
}

function coerceExcelDateValue(raw) {
    if (raw === null || raw === undefined || raw === '') {
        return '';
    }
    if (raw instanceof Date && !isNaN(raw)) {
        return formatDateEs(raw);
    }
    if (typeof raw === 'number' && Number.isFinite(raw)) {
        const serial = Math.floor(raw);
        if (serial > 200 && serial < 1000000) {
            const excelEpoch = new Date(1899, 11, 30);
            const dt = new Date(excelEpoch.getTime() + serial * 86400000);
            if (!isNaN(dt)) {
                return formatDateEs(dt);
            }
        }
    }
    const s = String(raw).trim();
    const dt = parseDate(s);
    return dt ? formatDateEs(dt) : s;
}

function internalFieldForColumnKey(colKey, fieldMap) {
    const fm = fieldMap || {};
    let found = null;
    Object.keys(fm).forEach(internal => {
        if (fm[internal] === colKey) {
            found = internal;
        }
    });
    return found;
}

function stringifyImportedCell(raw, colKey, fieldMap) {
    const internal = internalFieldForColumnKey(colKey, fieldMap);
    if (internal === 'fechaDevolucion' || internal === 'fechaEntrega') {
        return coerceInventoryImportValue(raw, internal);
    }
    if (isDateLikeColumnKey(colKey)) {
        return coerceExcelDateValue(raw);
    }
    if (raw instanceof Date && !isNaN(raw)) {
        return formatDateEs(raw);
    }
    return raw == null ? '' : String(raw).trim();
}

function makeUniqueColumnKeys(displayHeaders) {
    const used = new Set();
    const columns = [];
    displayHeaders.forEach((base, idx) => {
        let key = String(base == null ? '' : base).trim() || `Columna ${idx + 1}`;
        let candidate = key;
        let n = 2;
        while (used.has(candidate)) {
            candidate = `${key} (${n})`;
            n += 1;
        }
        used.add(candidate);
        columns.push(candidate);
    });
    return columns;
}

function resolveInventoryFieldFromHeader(rawHeader) {
    const h = normalizeHeader(rawHeader);
    if (!h || /^unnamed/.test(h)) {
        return null;
    }

    const exact = {
        empleado: 'empleado',
        equipo: 'equipo',
        marca: 'marca',
        'fecha de devolucion': 'fechaDevolucion',
        'descripcion del problema': 'descripcion',
        descripcion: 'descripcion',
        'accion tomada': 'accion',
        accion: 'accion',
        'fecha que se le entrego uno nuevo': 'fechaEntrega',
        'fecha que se le entregro uno nuevo': 'fechaEntrega',
        estado: 'estado'
    };
    if (exact[h]) {
        return exact[h];
    }

    if (['employee', 'staff', 'worker', 'assignee', 'owner'].includes(h)) return 'empleado';
    if (['device', 'hardware', 'asset', 'equipment'].includes(h)) return 'equipo';
    if (['description', 'issue', 'details', 'notes'].includes(h)) return 'descripcion';
    if (['brand', 'vendor', 'manufacturer'].includes(h)) return 'marca';
    if (['action', 'solution', 'fix'].includes(h)) return 'accion';
    if (['status', 'state'].includes(h)) return 'estado';

    if (/fecha/.test(h) && /(devol|devolucion|return|fallo|incidencia|reporte|recepcion|reclamacion|failure)/.test(h)) {
        return 'fechaDevolucion';
    }
    if (/fecha/.test(h) && /(entreg|nuevo|reemplazo|reposicion|replacement|delivery)/.test(h)) {
        return 'fechaEntrega';
    }
    if (/\bfecha\b/.test(h) && !/(entreg|nuevo|reemplazo|reposicion|replacement|delivery)/.test(h)) {
        return 'fechaDevolucion';
    }

    if (/^(estado|status|situacion)$/.test(h) || h.startsWith('estado ')) return 'estado';
    if (/^(marca|fabricante|vendor)$/.test(h) || /^marca\s/.test(h)) return 'marca';
    if ((/accion|solucion|medida|correctivo|tratamiento|remedy|workaround/.test(h)) && !/descripcion/.test(h)) {
        return 'accion';
    }
    if (/descripcion|problema|incidencia|detalle|motivo|comentario|observacio|falla|diagnostico|denuncia|tipo\s+de\s+fal|symptom|sintoma|causa|asunto/.test(h)) {
        return 'descripcion';
    }

    if (h.includes('maquina') || h.includes('máquina')) {
        return 'equipo';
    }

    if (h.includes('equipo') || ['dispositivo', 'hardware', 'activo', 'producto', 'modelo', 'tipo', 'activo fijo'].includes(h)) {
        if (/problema|descripcion|incidencia|falla|detalle/.test(h)) return null;
        return 'equipo';
    }

    if (/empleado|trabajador|colaborador|responsable|^usuario$|^nombre$|^nombre\s+completo$|persona|assigned|asignad|propietario|titular|solicitante|contacto/.test(h)) {
        return 'empleado';
    }

    return null;
}

function parseMatrixToFullSheetData(aoa, headerIdx) {
    if (!aoa || headerIdx >= aoa.length) {
        return null;
    }
    const rawHeaders = (aoa[headerIdx] || []).map(c => String(c == null ? '' : c).trim());
    let width = Math.max(rawHeaders.length, 1);
    for (let rr = headerIdx + 1; rr < aoa.length; rr++) {
        width = Math.max(width, (aoa[rr] || []).length);
    }
    const padded = [];
    for (let i = 0; i < width; i++) {
        padded.push(rawHeaders[i] != null && rawHeaders[i] !== '' ? rawHeaders[i] : '');
    }
    const displayHeaders = padded.map((h, i) => h || `Columna ${i + 1}`);
    const columns = makeUniqueColumnKeys(displayHeaders);

    const fieldMap = {};
    padded.forEach((raw, i) => {
        const internal = resolveInventoryFieldFromHeader(raw || `Columna ${i + 1}`);
        if (internal && fieldMap[internal] == null) {
            fieldMap[internal] = columns[i];
        }
    });

    const rows = [];
    for (let ri = headerIdx + 1; ri < aoa.length; ri++) {
        const line = aoa[ri] || [];
        const obj = {};
        let any = false;
        columns.forEach((colKey, i) => {
            const raw = line[i];
            const val = stringifyImportedCell(raw, colKey, fieldMap);
            obj[colKey] = val;
            if (val !== '') any = true;
        });
        if (any && isDynamicRowFilled(obj)) {
            rows.push(obj);
        }
    }

    if (!rows.length) {
        return null;
    }

    const headerLabels = {};
    padded.forEach((raw, i) => {
        const internal = resolveInventoryFieldFromHeader(raw || `Columna ${i + 1}`);
        if (internal && raw && headerLabels[internal] == null) {
            headerLabels[internal] = raw;
        }
    });

    const fieldCount = columns.length;
    return { rows, fieldCount, headerLabels, columns, fieldMap };
}

function tryParseInventoryFromSheet(sheet) {
    const emptySd = blankSheetBundle();
    if (!sheet || !sheet['!ref']) {
        return { sheetData: emptySd, headerLabels: {} };
    }
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
    if (!aoa || !aoa.length) {
        return { sheetData: emptySd, headerLabels: {} };
    }

    let best = null;
    let bestLabels = {};
    let bestKey = -1;
    const maxProbe = Math.min(25, aoa.length);
    for (let hi = 0; hi < maxProbe; hi++) {
        const parsed = parseMatrixToFullSheetData(aoa, hi);
        if (!parsed || !parsed.rows.length) continue;
        const key = parsed.fieldCount * 100000 + parsed.rows.length;
        if (key > bestKey) {
            bestKey = key;
            best = {
                columns: parsed.columns,
                rows: parsed.rows,
                fieldMap: Object.assign(defaultInventoryFieldMap(), parsed.fieldMap)
            };
            bestLabels = parsed.headerLabels || {};
        }
    }
    if (!best) {
        return { sheetData: emptySd, headerLabels: {} };
    }
    return { sheetData: best, headerLabels: bestLabels };
}

function parseInventoryFromWorkbook(workbook) {
    const inventoryBySheet = {};
    const sheetsUsed = [];
    const mergedFieldLabels = {};

    (workbook.SheetNames || []).forEach(name => {
        const sheet = workbook.Sheets[name];
        const { sheetData, headerLabels } = tryParseInventoryFromSheet(sheet);
        const filled = (sheetData.rows || []).filter(isDynamicRowFilled);
        if (filled.length) {
            inventoryBySheet[name] = {
                columns: sheetData.columns,
                rows: filled,
                fieldMap: sheetData.fieldMap || defaultInventoryFieldMap()
            };
            sheetsUsed.push({ name, rows: filled.length });
            Object.keys(headerLabels || {}).forEach(field => {
                if (mergedFieldLabels[field] == null && headerLabels[field]) {
                    mergedFieldLabels[field] = headerLabels[field];
                }
            });
        }
    });

    const totalRows = Object.values(inventoryBySheet).reduce((acc, bundle) => acc + (bundle.rows || []).length, 0);
    return {
        inventoryBySheet,
        importMeta: { sheets: sheetsUsed, totalRows },
        fieldLabels: mergedFieldLabels
    };
}

function loadInventoryFromExcel(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            const { inventoryBySheet, importMeta, fieldLabels } = parseInventoryFromWorkbook(workbook);
            if (!importMeta.totalRows) {
                alert('No se reconocieron datos de inventario. Incluye al menos dos columnas con encabezados claros (por ejemplo Empleado, Equipo o Descripción / Problema) en alguna fila de la primera zona de la hoja.');
                return;
            }
            if (!window.APP_MODEL) {
                window.APP_MODEL = {};
            }
            window.APP_MODEL.inventoryBySheet = inventoryBySheet;
            const sheetKeys = Object.keys(inventoryBySheet);
            window.APP_MODEL.activeInventorySheet = sheetKeys[0] || 'Principal';
            selectedAnalysisSheet = sheetKeys.length === 1 ? sheetKeys[0] : 'all';
            delete window.APP_MODEL.inventory;
            window.APP_MODEL.excelFieldLabels = Object.assign({}, getDefaultExcelFieldLabels(), fieldLabels || {});
            window.APP_MODEL.hasImportedInventory = true;
            saveInventoryToStorage();

            renderInventory();
            renderMetrics();
            renderAnalysis();
            renderAlerts();
            renderReportes();

            if (isSupabaseConfigured()) {
                try {
                    const saved = await saveInventoryToSupabase();
                    if (saved) {
                        console.info('Inventario guardado en Supabase.');
                    } else {
                        console.warn('No se pudo sincronizar el inventario con Supabase.');
                    }
                } catch (error) {
                    console.warn('Error guardando inventario en Supabase:', error);
                }
            }

            const sheetSummary = importMeta.sheets.map(s => `${s.name}: ${s.rows}`).join(' · ');
            alert(`Archivo integrado: ${importMeta.totalRows} fila(s) en ${importMeta.sheets.length} hoja(s). Se guardaron todas las columnas tal como vienen en el Excel.\n${sheetSummary}`);
        } catch (error) {
            console.error(error);
            alert('Error al cargar el archivo. Comprueba que sea un Excel o CSV válido.');
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
}

function applyExcelHeaderStyle(headerRow) {
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        cell.font = {
            bold: true,
            color: { argb: 'FFFFFFFF' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
        };
    });
}

function sanitizeExcelWorksheetName(name) {
    const s = String(name || 'Hoja').replace(/[:\\/?*[\]]/g, '_').trim().substring(0, 31);
    return s || 'Hoja';
}

function uniqueExcelWorksheetName(base, usedSet) {
    let n = sanitizeExcelWorksheetName(base);
    let nTry = n;
    let i = 2;
    while (usedSet.has(nTry)) {
        const suffix = `(${i})`;
        const maxBase = Math.max(1, 31 - suffix.length);
        nTry = (n.substring(0, maxBase) + suffix).substring(0, 31);
        i += 1;
    }
    usedSet.add(nTry);
    return nTry;
}

function exportInventoryExcel() {
    commitActiveEdit();
    saveInventoryToStorage();
    ensureInventoryBySheetModel();
    const bySheet = window.APP_MODEL.inventoryBySheet || {};

    const workbook = new ExcelJS.Workbook();
    const usedNames = new Set();

    Object.keys(bySheet).forEach(sheetKey => {
        const bundle = getSheetBundle(sheetKey);
        const wsName = uniqueExcelWorksheetName(sheetKey, usedNames);
        const worksheet = workbook.addWorksheet(wsName);

        const headerRow = worksheet.addRow(bundle.columns);
        applyExcelHeaderStyle(headerRow);

        (bundle.rows || []).filter(isDynamicRowFilled).forEach(item => {
            const values = bundle.columns.map(colKey => {
                const int = internalFieldForColumnKey(colKey, bundle.fieldMap);
                const raw = item[colKey] != null ? item[colKey] : '';
                if (int === 'fechaDevolucion' || int === 'fechaEntrega' || isDateLikeColumnKey(colKey)) {
                    const d = parseDate(String(raw));
                    return d || '';
                }
                return raw;
            });
            worksheet.addRow(values);
        });

        worksheet.columns.forEach((col, i) => {
            const colLetter = ExcelJS.Worksheet.getColumn(i + 1).letter;
            worksheet.getColumn(colLetter).width = 18;
        });
    });

    const timestamp = new Date().toLocaleString('es-ES').replace(/[/:]/g, '-');
    workbook.xlsx.writeBuffer().then(buffer => {
        const blob = new Blob([buffer], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `inventario-${timestamp}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
    });
}

/* ─── SECCIÓN: SELECCIÓN DE ÁREAS (INVENTARIO) ───
   selectArea()   → Muestra la vista de detalles de un área específica
   backToAreas()  → Vuelve a la vista de cuadrículas de áreas */

// Datos de personas por área
const AREA_PERSONS = {
    'Contabilidad': {
        nombre: 'Carlos Mendoza',
        dni: '12345678',
        fechaIngreso: '15/03/2022',
        foto: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%230b1e6d" width="200" height="200"/%3E%3Ccircle cx="100" cy="70" r="35" fill="%23FFD84D"/%3E%3Cpath d="M 100 115 Q 65 140 60 180 L 140 180 Q 135 140 100 115" fill="%23FFD84D"/%3E%3C/svg%3E'
    },
    'Ingenieria': {
        nombre: 'María Rodríguez',
        dni: '87654321',
        fechaIngreso: '22/05/2021',
        foto: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%232196F3" width="200" height="200"/%3E%3Ccircle cx="100" cy="70" r="35" fill="%23FFE55C"/%3E%3Cpath d="M 100 115 Q 65 140 60 180 L 140 180 Q 135 140 100 115" fill="%23FFE55C"/%3E%3C/svg%3E'
    },
    'Logistica': {
        nombre: 'Roberto Díaz',
        cargo: 'Jefe de Logística',
        dni: '45678901',
        fechaIngreso: '08/01/2023',
        foto: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%234CAF50" width="200" height="200"/%3E%3Ccircle cx="100" cy="70" r="35" fill="%23FFEB3B"/%3E%3Cpath d="M 100 115 Q 65 140 60 180 L 140 180 Q 135 140 100 115" fill="%23FFEB3B"/%3E%3C/svg%3E'
    },
    'Marketing': {
        nombre: 'Laura García',
        dni: '34567890',
        fechaIngreso: '10/11/2020',
        foto: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%23FF5722" width="200" height="200"/%3E%3Ccircle cx="100" cy="70" r="35" fill="%23FFC107"/%3E%3Cpath d="M 100 115 Q 65 140 60 180 L 140 180 Q 135 140 100 115" fill="%23FFC107"/%3E%3C/svg%3E'
    },
    'Ofertas': {
        nombre: 'Andrés López',
        dni: '23456789',
        fechaIngreso: '14/07/2022',
        foto: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%239C27B0" width="200" height="200"/%3E%3Ccircle cx="100" cy="70" r="35" fill="%23E1BEE7"/%3E%3Cpath d="M 100 115 Q 65 140 60 180 L 140 180 Q 135 140 100 115" fill="%23E1BEE7"/%3E%3C/svg%3E'
    },
    'Operaciones': {
        nombre: 'Sofía Martínez',
        dni: '56789012',
        fechaIngreso: '03/02/2021',
        foto: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%23FFC107" width="200" height="200"/%3E%3Ccircle cx="100" cy="70" r="35" fill="%23333"/%3E%3Cpath d="M 100 115 Q 65 140 60 180 L 140 180 Q 135 140 100 115" fill="%23333"/%3E%3C/svg%3E'
    },
    'Planificacion': {
        nombre: 'Fernando Torres',
        dni: '67890123',
        fechaIngreso: '19/09/2023',
        foto: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%2300BCD4" width="200" height="200"/%3E%3Ccircle cx="100" cy="70" r="35" fill="%23B3E5FC"/%3E%3Cpath d="M 100 115 Q 65 140 60 180 L 140 180 Q 135 140 100 115" fill="%23B3E5FC"/%3E%3C/svg%3E'
    },
    'SAS': {
        nombre: 'Patricia Sánchez',
        dni: '78901234',
        fechaIngreso: '27/04/2022',
        foto: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%23E91E63" width="200" height="200"/%3E%3Ccircle cx="100" cy="70" r="35" fill="%23F8BBD0"/%3E%3Cpath d="M 100 115 Q 65 140 60 180 L 140 180 Q 135 140 100 115" fill="%23F8BBD0"/%3E%3C/svg%3E'
    },
    'SSOMA': {
        nombre: 'Juan Ramírez',
        dni: '89012345',
        fechaIngreso: '11/06/2023',
        foto: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%23673AB7" width="200" height="200"/%3E%3Ccircle cx="100" cy="70" r="35" fill="%23CE93D8"/%3E%3Cpath d="M 100 115 Q 65 140 60 180 L 140 180 Q 135 140 100 115" fill="%23CE93D8"/%3E%3C/svg%3E'
    },
    'TI': {
        nombre: 'David Peña',
        cargo: 'Gerente de TI',
        dni: '90123456',
        fechaIngreso: '',
        foto: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%23558B2F" width="200" height="200"/%3E%3Ccircle cx="100" cy="70" r="35" fill="%23AED581"/%3E%3Cpath d="M 100 115 Q 65 140 60 180 L 140 180 Q 135 140 100 115" fill="%23AED581"/%3E%3C/svg%3E'
    }
};


function loadPersonDataFromStorage() {
    const saved = localStorage.getItem('AREA_PERSONS');
    if (saved) {
        try {
            const savedData = JSON.parse(saved);
            // Actualizar solo los campos nombre, dni, fechaIngreso (mantener fotos)
            for (let area in savedData) {
                if (AREA_PERSONS[area]) {
                    AREA_PERSONS[area].nombre = savedData[area].nombre;
                    AREA_PERSONS[area].dni = savedData[area].dni;
                    AREA_PERSONS[area].fechaIngreso = savedData[area].fechaIngreso;
                }
            }
        } catch (e) {
            console.error('Error al cargar datos del localStorage:', e);
        }
    }
}

// Llamar al cargar la página
loadPersonDataFromStorage();


function backToAreas() {
    closeEquipmentProfile();
    // Limpiar el área seleccionada
    window.selectedArea = null;
    
    // Mostrar la cuadrícula de áreas
    const gridContainer = document.querySelector('.areas-grid-container');
    if (gridContainer) {
        gridContainer.style.display = 'block';
    }
    
    // Ocultar el contenedor de detalles
    const detailsContainer = document.getElementById('area-details-container');
    if (detailsContainer) {
        detailsContainer.classList.add('area-details-hidden');
        detailsContainer.classList.remove('area-details-container');
    }
}

// Personas mostradas en cada area. El numero de tarjetas coincide con el numero del area.
const AREA_PERSON_COUNTS = {
    Contabilidad: 1, Ingenieria: 6, Logistica: 2, Marketing: 1, Ofertas: 3,
    Operaciones: 7, Planificacion: 1, SAS: 5, SSOMA: 1, TI: 4
};

/* Las fotos no se guardan en localStorage porque su límite es muy reducido.
   IndexedDB permanece disponible después de cerrar el navegador y admite
   imágenes de mayor tamaño junto con los datos de cada colaborador. */
const PEOPLE_STORAGE_DB = 'nakama-reportes';
const PEOPLE_STORAGE_STORE = 'area-people';
const PEOPLE_STORAGE_KEY = 'current';

function normalizeSupabaseUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) return '';
    let normalized = raw.replace(/\/+$/, '');
    normalized = normalized.replace(/\/rest\/v1$/i, '');
    return normalized;
}

function getSupabaseConfig() {
    const rawUrl = String(window.NAKAMA_SUPABASE_URL || '').trim();
    const url = normalizeSupabaseUrl(rawUrl);
    const key = String(window.NAKAMA_SUPABASE_ANON_KEY || '').trim();
    return { url, key };
}

function isSupabaseConfigured() {
    const { url, key } = getSupabaseConfig();
    return Boolean(url && key && !url.includes('<') && !key.includes('<'));
}

function isLocalFileProtocol() {
    return typeof window !== 'undefined' && window.location?.protocol === 'file:';
}

function isNetlifyHosted() {
    if (typeof window === 'undefined' || !window.location?.hostname) return false;
    const host = String(window.location.hostname).toLowerCase();
    return host.includes('netlify') || host.includes('localhost') || host.includes('127.0.0.1');
}

function buildSupabaseRestUrl(path) {
    const normalizedPath = String(path || '').replace(/^\/+/, '');
    if (isNetlifyHosted() && !String(window.location?.hostname || '').includes('localhost') && !String(window.location?.hostname || '').includes('127.0.0.1')) {
        const url = new URL('/.netlify/functions/supabase-proxy', window.location.origin);
        url.searchParams.set('path', normalizedPath);
        return url.toString();
    }
    const { url } = getSupabaseConfig();
    return `${url}/rest/v1/${normalizedPath}`;
}

async function supabaseRestFetch(path, options = {}) {
    const { key } = getSupabaseConfig();
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');
    if (!headers.has('apikey')) headers.set('apikey', key);
    if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${key}`);
    if (!headers.has('Content-Type') && options.body && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(String(options.method || 'GET').toUpperCase())) {
        headers.set('Content-Type', 'application/json');
    }
    return fetch(buildSupabaseRestUrl(path), {
        ...options,
        headers
    });
}

async function checkSupabaseConnection() {
    if (!isSupabaseConfigured()) {
        return { connected: false, reason: 'no-config' };
    }
    if (isLocalFileProtocol()) {
        return { connected: false, reason: 'local-file' };
    }
    const controller = new AbortController();
    // Los proyectos en reposo pueden tardar varios segundos en reactivar su API.
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    try {
        const response = await supabaseRestFetch('employee_profiles?select=employee_key&limit=1', {
            method: 'GET',
            signal: controller.signal
        });
        return { connected: response.ok, reason: response.ok ? 'ok' : `http ${response.status}` };
    } catch (error) {
        const message = error?.name === 'AbortError' ? 'timeout' : String(error?.message || 'error desconocido');
        console.warn('Error al verificar conexión Supabase:', message, error);
        return { connected: false, reason: message };
    } finally {
        clearTimeout(timeoutId);
    }
}

async function updateSupabaseStatusIndicator() {
    const statusNode = document.getElementById('supabase-status');
    if (!statusNode) return;
    if (!isSupabaseConfigured()) {
        statusNode.textContent = 'Supabase no configurado.';
        statusNode.classList.add('supabase-status-error');
        statusNode.classList.remove('supabase-status-ok');
        return;
    }
    if (isLocalFileProtocol()) {
        statusNode.textContent = 'Abre la app desde http://localhost o servidor para conectar a Supabase.';
        statusNode.classList.add('supabase-status-error');
        statusNode.classList.remove('supabase-status-ok');
        return;
    }
    statusNode.textContent = 'Comprobando conexión Supabase...';
    statusNode.classList.remove('supabase-status-ok', 'supabase-status-error');

    const result = await checkSupabaseConnection();
    if (result.connected) {
        statusNode.textContent = 'Conectado a Supabase';
        statusNode.classList.add('supabase-status-ok');
        statusNode.classList.remove('supabase-status-error');
    } else {
        statusNode.textContent = `No conectado a Supabase (${result.reason})`;
        statusNode.classList.add('supabase-status-error');
        statusNode.classList.remove('supabase-status-ok');
    }
}

function sanitizeEmployeeKeyPart(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function ensurePersonEmployeeKey(areaName, index, person) {
    if (!person) return '';
    const existing = String(person.employee_key || '').trim();
    if (existing) return existing;
    const area = String(areaName || '').trim();
    const namePart = sanitizeEmployeeKeyPart(person.nombre || '') || `colaborador-${index + 1}`;
    const key = `${area}-${index + 1}-${namePart}`.replace(/-+/g, '-').replace(/(^-|-$)/g, '');
    person.employee_key = key;
    return key;
}

function buildRemotePersonData(person) {
    const data = JSON.parse(JSON.stringify(person || {}));
    delete data.supabaseEmployeeId;
    delete data.supabaseEquipmentIds;
    delete data.supabaseEquipmentId;
    return data;
}

function remoteText(value, fallback = 'Pendiente') {
    const text = String(value ?? '').trim();
    return text || fallback;
}

function buildEmployeeProfileRecord(areaName, index) {
    const person = AREA_PEOPLE[areaName]?.[index];
    if (!person) return null;
    const employeeKey = ensurePersonEmployeeKey(areaName, index, person);
    return {
        employee_id: person.supabaseEmployeeId || null,
        employee_key: employeeKey,
        employee_name: remoteText(person.nombre, `Colaborador ${index + 1}`),
        area: areaName,
        dni: remoteText(person.dni),
        hire_date: remoteText(person.fechaIngreso),
        photo_url: remoteText(person.foto),
        employee_index: index,
        job_title: String(person.cargo || '').trim(),
        profile_data: buildRemotePersonData(person),
        updated_at: new Date().toISOString()
    };
}

function buildEmployeeProfileRecords(areaName) {
    const people = AREA_PEOPLE[areaName] || [];
    return people.map((person, index) => {
        const employeeKey = ensurePersonEmployeeKey(areaName, index, person);
        return {
            employee_key: employeeKey,
            employee_name: remoteText(person.nombre, `Colaborador ${index + 1}`),
            area: areaName,
            dni: remoteText(person.dni),
            hire_date: remoteText(person.fechaIngreso),
            photo_url: remoteText(person.foto),
            employee_index: index,
            job_title: String(person.cargo || '').trim(),
            profile_data: buildRemotePersonData(person),
            updated_at: new Date().toISOString()
        };
    });
}

async function saveEmployeeProfileToSupabase(areaName, index) {
    if (!isSupabaseConfigured() || !areaName) {
        console.warn('Supabase no configurado o area inválida; no se sincroniza.');
        return false;
    }
    const person = AREA_PEOPLE[areaName]?.[index];
    if (!person) return false;
    // El perfil debe quedar ligado al registro principal del empleado.
    const employeeSaved = await upsertEmployeeToEmployees(person);
    if (!employeeSaved || !person.supabaseEmployeeId) {
        throw new Error('Supabase no devolvió un identificador válido para el colaborador.');
    }
    const record = buildEmployeeProfileRecord(areaName, index);
    if (!record) return false;
    if (isLocalFileProtocol()) {
        throw new Error('No se puede conectar a Supabase desde file://. Abre la app desde un servidor local (por ejemplo Live Server o http://localhost).');
    }
    const response = await supabaseRestFetch('employee_profiles?on_conflict=employee_key', {
        method: 'POST',
        headers: {
            Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify([record])
    });
    if (!response.ok) {
        const errorText = await response.text();
        const message = `No se pudo sincronizar con Supabase: ${response.status} ${response.statusText} ${errorText}`;
        if (response.status === 401 || response.status === 403 || errorText.toLowerCase().includes('row-level security')) {
            throw new Error(message + ' Revisa las políticas RLS para employee_profiles y permite acceso al rol anon.');
        }
        throw new Error(message);
    }
    return true;
}

async function saveEmployeeDataToSupabase(areaName = window.selectedArea) {
    if (!isSupabaseConfigured() || !areaName) return false;
    const records = buildEmployeeProfileRecords(areaName);
    if (!records.length) return false;
    const response = await supabaseRestFetch('employee_profiles?on_conflict=employee_key', {
        method: 'POST',
        headers: {
            Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify(records)
    });
    if (!response.ok) {
        const errorText = await response.text();
        const message = `No se pudo sincronizar con Supabase: ${response.status} ${response.statusText} ${errorText}`;
        if (response.status === 401 || response.status === 403 || errorText.toLowerCase().includes('row-level security')) {
            throw new Error(message + ' Revisa las políticas RLS para employee_profiles y permite acceso al rol anon.');
        }
        throw new Error(message);
    }
    return true;
}

async function loadEmployeeDataFromSupabase() {
    if (!isSupabaseConfigured()) return null;
    const response = await supabaseRestFetch('employee_profiles?select=employee_id,employee_key,employee_name,area,dni,hire_date,photo_url,employee_index,job_title,profile_data,updated_at', {
        method: 'GET'
    });
    if (!response.ok) {
        throw new Error(`No se pudo cargar desde Supabase: ${response.status}`);
    }
    const rows = await response.json();
    const grouped = {};
    rows.forEach(row => {
        const area = String(row.area || '').trim();
        const employeeKey = String(row.employee_key || '').trim();
        if (!area || !employeeKey) return;
        const indexMatch = employeeKey.match(/-(\d+)-/);
        const keyIndex = indexMatch ? Number(indexMatch[1]) - 1 : null;
        const employeeIndex = Number.isInteger(row.employee_index) ? row.employee_index : keyIndex;
        grouped[area] = grouped[area] || [];
        grouped[area].push({
            employee_index: Number.isFinite(employeeIndex) ? employeeIndex : null,
            employee_id: row.employee_id || null,
            employee_key: employeeKey,
            employee_name: row.employee_name || 'Colaborador',
            dni: row.dni || 'Pendiente',
            hire_date: row.hire_date || 'Pendiente',
            photo_url: row.photo_url || '',
            job_title: row.job_title || '',
            profile_data: row.profile_data && typeof row.profile_data === 'object' ? row.profile_data : {}
        });
    });
    return grouped;
}

async function loadEquipmentDataFromSupabase() {
    if (!isSupabaseConfigured()) return { equipment: [], accessories: [] };
    const [equipmentResponse, accessoriesResponse] = await Promise.all([
        supabaseRestFetch('equipment?select=id,employee_id,employee_name,area_name,equipment_name,brand,model,serial,hardware,software,accessories,action_taken,status', { method: 'GET' }),
        supabaseRestFetch('equipment_accessories?select=id,equipment_id,employee_id,name,model,serial', { method: 'GET' })
    ]);
    if (!equipmentResponse.ok) throw new Error(`No se pudieron cargar los equipos desde Supabase: ${equipmentResponse.status}`);
    const equipment = await equipmentResponse.json();
    if (!accessoriesResponse.ok) {
        console.warn('No se pudieron cargar los accesorios desde Supabase:', accessoriesResponse.status);
        return { equipment: Array.isArray(equipment) ? equipment : [], accessories: [] };
    }
    const accessories = await accessoriesResponse.json();
    return {
        equipment: Array.isArray(equipment) ? equipment : [],
        accessories: Array.isArray(accessories) ? accessories : []
    };
}

function openPeopleStorage() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(PEOPLE_STORAGE_DB, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(PEOPLE_STORAGE_STORE)) {
                db.createObjectStore(PEOPLE_STORAGE_STORE);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function backupAreaPeopleToLocalStorage() {
    try {
        localStorage.setItem('AREA_PEOPLE', JSON.stringify(AREA_PEOPLE));
        backupEmployeeAccessoriesToLocalStorage();
    } catch (error) {
        console.warn('No se pudo guardar la copia de AREA_PEOPLE en localStorage:', error);
    }
}

// Copia de consulta por nombre. AREA_PEOPLE sigue siendo la fuente principal,
// pero este índice permite recuperar los accesorios directamente por empleado.
const EMPLOYEE_ACCESSORIES_STORAGE_KEY = 'EMPLOYEE_ACCESSORIES';

function backupEmployeeAccessoriesToLocalStorage() {
    const accessoriesByEmployee = {};
    Object.entries(AREA_PEOPLE).forEach(([areaName, people]) => {
        (people || []).forEach((person, personIndex) => {
            const employeeName = String(person?.nombre || '').trim();
            if (!employeeName) return;
            const profiles = ensureEquipmentProfiles(person);
            const employeeKey = ensurePersonEmployeeKey(areaName, personIndex, person);
            accessoriesByEmployee[employeeKey] = {
                employee_name: employeeName,
                employee_key: employeeKey,
                area: areaName,
                equipment: profiles.map((profile, equipmentIndex) => ({
                    equipment_index: equipmentIndex,
                    accessories: (Array.isArray(profile.accessoryList) ? profile.accessoryList : Object.values(profile.accessories || {})).map(accessory => ({
                        id: String(accessory.id || ''),
                        name: String(accessory.name || ''),
                        model: String(accessory.model || ''),
                        serial: String(accessory.serial || '')
                    }))
                }))
            };
        });
    });
    localStorage.setItem(EMPLOYEE_ACCESSORIES_STORAGE_KEY, JSON.stringify(accessoriesByEmployee));
}

async function saveAreaPeopleData() {
    const db = await openPeopleStorage();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PEOPLE_STORAGE_STORE, 'readwrite');
        transaction.objectStore(PEOPLE_STORAGE_STORE).put(AREA_PEOPLE, PEOPLE_STORAGE_KEY);
        transaction.oncomplete = () => {
            db.close();
            try {
                backupAreaPeopleToLocalStorage();
                backupEmployeeAccessoriesToLocalStorage();
            } catch (error) {
                console.warn('No se pudo crear el respaldo local tras guardar en IndexedDB:', error);
            }
            resolve();
        };
        transaction.onerror = () => {
            db.close();
            reject(transaction.error);
        };
    });
}

async function readAreaPeopleData() {
    const db = await openPeopleStorage();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PEOPLE_STORAGE_STORE, 'readonly');
        const request = transaction.objectStore(PEOPLE_STORAGE_STORE).get(PEOPLE_STORAGE_KEY);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
    });
}

const AREA_PEOPLE = Object.fromEntries(Object.entries(AREA_PERSONS).map(([area, person]) => {
    const people = [Object.assign({}, person)];
    const count = AREA_PERSON_COUNTS[area] || 1;
    for (let i = 2; i <= count; i += 1) {
        people.push({
            nombre: `Colaborador ${i}`,
            dni: 'Pendiente',
            fechaIngreso: 'Pendiente',
            foto: person.foto,
            cargo: area === 'Logistica' && i === 2 ? 'Jefe de Logística' : ''
        });
    }
    return [area, people.map((entry, index) => {
        ensurePersonEmployeeKey(area, index, entry);
        return entry;
    })];
}));

function escapePersonText(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[character]);
}

function dateToInputValue(date) {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date || '')) return '';
    const [day, month, year] = date.split('/');
    return `${year}-${month}-${day}`;
}

function photoPosition(value) {
    const position = Number(value);
    return Number.isFinite(position) ? Math.max(0, Math.min(100, position)) : 50;
}

function ensureEquipmentProfiles(person) {
    if (!person.equipmentProfiles || !Array.isArray(person.equipmentProfiles)) {
        const legacy = person.equipmentProfile ? [person.equipmentProfile] : [];
        person.equipmentProfiles = legacy.length ? legacy : [{}];
        delete person.equipmentProfile;
    }
    return person.equipmentProfiles;
}

function equipmentProfileFor(person, defaults, index = 0) {
    const profiles = ensureEquipmentProfiles(person);
    const ownerEmployeeKey = String(person?.employee_key || '').trim();
    while (profiles.length <= index) {
        profiles.push({});
    }
    let profile = profiles[index];
    // Un equipo solo puede pertenecer al colaborador que lo creó. Esto evita
    // reutilizar por error un perfil compartido desde una copia local antigua.
    if (ownerEmployeeKey && profile?.owner_employee_key && profile.owner_employee_key !== ownerEmployeeKey) {
        profile = {};
        profiles[index] = profile;
    }
    if (ownerEmployeeKey) profile.owner_employee_key ||= ownerEmployeeKey;
    profile.name ||= defaults.name;
    profile.brand ||= defaults.brand;
    profile.model ||= defaults.model;
    profile.serial ||= defaults.serial;
    profile.system ||= defaults.system;
    profile.status ||= defaults.status;
    profile.hardware ||= {};
    profile.software ||= {};
    profile.accessories ||= {};
    profile.software.system ||= profile.system || defaults.system || '';

    // Los accesorios pertenecen únicamente a este colaborador/equipo. No se
    // agregan plantillas vacías (Mouse, Teclado o Monitor) a otros perfiles.
    if (!Array.isArray(profile.accessoryList)) {
        profile.accessoryList = Object.entries(profile.accessories).map(([key, item]) => ({
            id: key, name: item.name || 'Accesorio', model: item.model || '', serial: item.serial || '', owner_employee_key: ownerEmployeeKey
        }));
    }
    // Elimina los tres valores de plantilla que versiones anteriores añadían
    // sin datos. Los accesorios ingresados manualmente se conservan.
    profile.accessoryList = profile.accessoryList.filter(accessory => {
        // Nunca mostrar accesorios pertenecientes a otro colaborador, aunque
        // provengan de una copia local antigua compartida por error.
        if (ownerEmployeeKey && accessory?.owner_employee_key && accessory.owner_employee_key !== ownerEmployeeKey) return false;
        const name = String(accessory?.name || '').trim();
        const model = String(accessory?.model || '').trim();
        const serial = String(accessory?.serial || '').trim();
        return Boolean(model || serial || (name && !['mouse', 'teclado', 'monitor'].includes(name.toLowerCase())));
    }).map(accessory => ({ ...accessory, owner_employee_key: accessory.owner_employee_key || ownerEmployeeKey }));
    return profile;
}

function getSelectedEquipmentIndex() {
    return Number.isInteger(window.selectedEquipmentIndex) ? window.selectedEquipmentIndex : 0;
}

function switchEquipmentProfile(index) {
    window.selectedEquipmentIndex = Number.isInteger(index) ? index : 0;
    openEquipmentProfile(window.selectedPersonIndex);
}

function addEquipmentProfile(person) {
    const profiles = ensureEquipmentProfiles(person);
    profiles.push({});
    saveAreaPeopleData();
    window.selectedEquipmentIndex = profiles.length - 1;
    openEquipmentProfile(window.selectedPersonIndex);
    return profiles.length;
}

async function removeEquipmentProfile(index) {
    if (!canEditPeople()) return;
    const person = AREA_PEOPLE[window.selectedArea]?.[window.selectedPersonIndex];
    if (!person) return;
    const profiles = ensureEquipmentProfiles(person);
    if (profiles.length <= 1) {
        alert('Debe quedar al menos una laptop registrada.');
        return;
    }
    const label = String(profiles[index]?.name || `Laptop ${index + 1}`).trim() || `Laptop ${index + 1}`;
    if (!confirm(`¿Quitar "${label}" de este colaborador? Esta acción no se puede deshacer.`)) return;

    const removed = profiles.splice(index, 1)[0];
    if (getSelectedEquipmentIndex() >= profiles.length) {
        window.selectedEquipmentIndex = profiles.length - 1;
    }
    try {
        await saveAreaPeopleData();
        if (removed?.supabaseEquipmentId) {
            await deleteEquipmentFromSupabase(removed.supabaseEquipmentId);
        }
        openEquipmentProfile(window.selectedPersonIndex);
    } catch (error) {
        console.error('No se pudo eliminar la laptop.', error);
        openEquipmentProfile(window.selectedPersonIndex);
        alert('Se quitó de la vista, pero no se pudo confirmar la eliminación en Supabase.');
    }
}

function equipmentInput(field, value) {
    return `<input type="text" class="equipment-edit-input" data-equipment-field="${field}" value="${escapePersonText(value || '')}" placeholder="Pendiente">`;
}

function equipmentValue(value) {
    return value ? escapePersonText(value) : 'Pendiente';
}

function renderAreaPeople(areaName) {
    const container = document.querySelector('.person-card-container');
    const people = AREA_PEOPLE[areaName] || [];
    const editable = canEditPeople();
    if (!container) return;

    container.innerHTML = people.map((person, index) => {
        const isTiManager = areaName === 'TI' && index === 0;
        const dateView = isTiManager ? '' : `<div class="person-field"><label>Fecha de Ingreso:</label><p>${escapePersonText(person.fechaIngreso)}</p></div>`;
        const dateEdit = isTiManager ? '' : `<div class="person-field"><label>Fecha de Ingreso:</label><input type="date" class="edit-input edit-date" value="${dateToInputValue(person.fechaIngreso)}"></div>`;
        return `
        <article class="person-card" data-person-index="${index}">
            ${editable ? `<div class="person-card-actions">
                <button class="person-edit-btn" onclick="startEditPerson(${index})">Editar</button>
                <button class="person-save-btn hidden" onclick="savePerson(${index})">Guardar</button>
                <button class="person-cancel-btn hidden" onclick="cancelEditPerson(${index})">Cancelar</button>
            </div>` : ''}
            <div class="person-photo"><img src="${escapePersonText(person.foto)}" alt="Foto de ${escapePersonText(person.nombre)}" style="object-position: ${photoPosition(person.fotoPosX)}% ${photoPosition(person.fotoPosY)}%"></div>
            <h2 class="person-name">${escapePersonText(person.nombre)}</h2>
            <p class="person-role">${escapePersonText(person.cargo || areaName)}</p>
            <div class="person-info person-view-mode">
                <div class="person-field"><label>DNI:</label><p>${escapePersonText(person.dni)}</p></div>
                ${dateView}
            </div>
            <div class="person-info person-edit-mode hidden">
                <div class="person-field"><label>Nombre:</label><input type="text" class="edit-input edit-name" value="${escapePersonText(person.nombre)}"></div>
                <div class="person-field"><label>Cargo:</label><input type="text" class="edit-input edit-cargo" value="${escapePersonText(person.cargo || areaName)}"></div>
                <div class="person-field"><label>DNI:</label><input type="text" class="edit-input edit-dni" value="${person.dni === 'Pendiente' ? '' : escapePersonText(person.dni)}"></div>
                <div class="person-field"><label>Foto:</label><input type="file" class="edit-input edit-photo" accept="image/*"></div>
                ${dateEdit}
            </div>
            <button type="button" class="person-enter-btn" onclick="openEquipmentProfile(${index})">Ingresar</button>
        </article>`;
    }).join('');
    if (editable) enablePhotoDragging(container, areaName);
}

function openEquipmentProfile(index) {
    const person = AREA_PEOPLE[window.selectedArea]?.[index];
    const profile = document.getElementById('equipment-profile-view');
    const cards = document.querySelector('.person-card-container');
    const header = document.querySelector('.area-details-header');
    if (!person || !profile || !cards) return;
    window.selectedPersonIndex = index;
    window.selectedEquipmentIndex = getSelectedEquipmentIndex();

    const inventoryRows = Object.values(window.APP_MODEL?.inventoryBySheet || {}).flatMap(sheet => sheet.rows || []);
    const personName = String(person.nombre || '').trim().toLowerCase();
    const record = inventoryRows.find(row => String(row.Empleado || row.empleado || '').trim().toLowerCase() === personName) || {};
    const value = (keys, fallback = 'Pendiente') => keys.map(key => record[key]).find(Boolean) || fallback;
    const defaultEquipment = {
        name: value(['Equipo', 'equipo'], `Laptop ${getSelectedEquipmentIndex() + 1}`),
        brand: value(['Marca', 'marca']), model: value(['Modelo', 'modelo']),
        serial: value(['N° Serie', 'Nº Serie', 'Número de serie', 'Numero de serie']),
        system: value(['Sistema operativo', 'Tipo de Windows'], 'Windows 11 Pro'),
        status: value(['Estado', 'estado'], 'Activo')
    };
    const profileData = equipmentProfileFor(person, defaultEquipment, getSelectedEquipmentIndex());
    const editable = canEditPeople();
    const safe = escapePersonText;
    const display = (field, value) => editable ? equipmentInput(field, value) : equipmentValue(value);
    const allProfiles = ensureEquipmentProfiles(person);
    const equipmentTabs = allProfiles.map((item, idx) => {
        const label = escapePersonText(String(item.name || `Laptop ${idx + 1}`).trim() || `Laptop ${idx + 1}`);
        const activeClass = idx === getSelectedEquipmentIndex() ? 'equipment-tab-active' : '';
        const removeButton = (editable && allProfiles.length > 1)
            ? `<button type="button" class="equipment-tab-remove" title="Quitar ${label}" onclick="event.stopPropagation(); removeEquipmentProfile(${idx})">×</button>`
            : '';
        return `<span class="equipment-tab-wrap"><button type="button" class="equipment-tab ${activeClass}" onclick="switchEquipmentProfile(${idx})">${label}</button>${removeButton}</span>`;
    }).join('');
    const nextEquipmentNumber = allProfiles.length + 1;
    const addTabButton = `<button type="button" class="equipment-tab-add" onclick="addEquipmentProfile(AREA_PEOPLE[window.selectedArea]?.[window.selectedPersonIndex])">+ Agregar Laptop ${nextEquipmentNumber}</button>`;
    const hardware = [
        ['processor', 'Procesador'], ['ram', 'Memoria RAM (GB)'], ['disk', 'Tamaño disco C: (GB)'], ['opticalDrive', 'Unidad óptica'],
        ['videoMemoryType', 'Tipo memoria de video'], ['videoMemory', 'Memoria de video (GB)'], ['displaySize', 'Tamaño display'],
        ['resolution', 'Resolución máxima'], ['keyboardLanguage', 'Idioma teclado'], ['serialPort', 'Puerto serie'], ['usbPort', 'Puerto USB'], ['networkPort', 'Puerto red']
    ];
    const software = [
        ['system', 'Tipo de Windows'], ['systemLanguage', 'Idioma sistema operativo'], ['architecture', '32/64 bits'], ['officeVersion', 'Versión Office'],
        ['officeLanguage', 'Idioma Office'], ['antivirus', 'Antivirus'], ['autocad', 'Autocad 2014']
    ];
    const specificationRows = (items, group) => items.map(([key, label]) => `<tr><th>${label}</th><td>${display(`${group}.${key}`, profileData[group][key])}</td></tr>`).join('');
    const accessoryRows = profileData.accessoryList.map((accessory, index) => `<tr><td>${display(`accessoryList.${index}.name`, accessory.name)}</td><td>${display(`accessoryList.${index}.model`, accessory.model)}</td><td>${display(`accessoryList.${index}.serial`, accessory.serial)}</td>${editable ? `<td><button type="button" class="accessory-remove-btn" onclick="removeEquipmentAccessory(${index})">Quitar</button></td>` : ''}</tr>`).join('');
    profile.innerHTML = `
        <div class="equipment-profile-top">
            <button type="button" class="area-back-btn" onclick="closeEquipmentProfile()">← Volver a colaboradores</button>
            <div><p class="equipment-profile-kicker">Asignación de activo</p><h2>${safe(person.nombre)}</h2></div>
            <div class="equipment-tabs-container">${equipmentTabs}${addTabButton}</div>
            <span class="equipment-status">${display('status', profileData.status)}</span>
            ${editable ? '<button type="button" class="equipment-save-btn" onclick="saveEquipmentProfile()">Guardar cambios</button>' : ''}
            <button type="button" class="equipment-incidents-btn" onclick="showEquipmentIncidents()">Ver Incidencia</button>
        </div>
        <div class="equipment-layout">
            <article class="equipment-section"><h3>Equipo</h3><div class="equipment-hero"><img src="../Equipo.png" alt="Laptop asignada"></div>
                <dl class="equipment-summary"><div><dt>Equipo</dt><dd>${display('name', profileData.name)}</dd></div><div><dt>Marca</dt><dd>${display('brand', profileData.brand)}</dd></div><div><dt>Modelo</dt><dd>${display('model', profileData.model)}</dd></div><div><dt>Número de serie</dt><dd>${display('serial', profileData.serial)}</dd></div></dl>
                <div class="specifications-grid">
                    <div><h4>Hardware</h4><table class="equipment-table specs-table"><tbody>${specificationRows(hardware, 'hardware')}</tbody></table></div>
                    <div><h4>Software</h4><table class="equipment-table specs-table"><tbody>${specificationRows(software, 'software')}</tbody></table></div>
                </div>
            </article>
            <article class="equipment-section"><h3>Accesorios</h3><div class="accessory-image"><img src="../Accesorio.png" alt="Accesorios asignados"></div>
                <table class="equipment-table compact-table"><thead><tr><th>Accesorio</th><th>Modelo</th><th>N.º serie</th>${editable ? '<th>Acción</th>' : ''}</tr></thead><tbody>${accessoryRows}</tbody></table>
                ${editable ? '<div class="accessory-actions"><button type="button" class="accessory-add-btn" onclick="addEquipmentAccessory()">+ Agregar accesorio</button><button type="button" class="accessory-save-btn" onclick="saveEquipmentAccessories()">Guardar accesorios</button></div>' : ''}
            </article>
        </div>
        <div id="equipment-incidents-notice" class="equipment-incidents-notice hidden"><span>✓</span><div><strong>Sin incidencias abiertas</strong><p>El equipo se encuentra registrado con estado: ${safe(profileData.status)}.</p></div></div>`;
    cards.classList.add('hidden');
    header?.classList.add('hidden');
    profile.classList.remove('hidden');
    // IMPORTANTE: estos listeners se agregan UNA SOLA VEZ para todo el ciclo
    // de vida de la página (bandera profile.dataset.listenersBound). Antes se
    // agregaban en cada llamada a openEquipmentProfile() y, como el nodo del
    // DOM se reutiliza (solo cambia su innerHTML), los listeners viejos nunca
    // se eliminaban. Cada listener "recordaba" (closure) al colaborador que
    // estaba abierto en ese momento, así que al escribir en el perfil de un
    // colaborador nuevo, TODOS los listeners acumulados se disparaban y el
    // texto terminaba guardándose también en colaboradores anteriores. Por
    // eso los accesorios/datos se "copiaban" de un empleado a otro.
    // La solución: registrar el listener una única vez y, dentro de él,
    // resolver siempre al colaborador ACTUAL (window.selectedArea /
    // window.selectedPersonIndex) en el momento del evento, en vez de usar
    // la variable `person` capturada al abrir el perfil.
    if (editable && !profile.dataset.listenersBound) {
        profile.dataset.listenersBound = 'true';
        profile.addEventListener('input', event => {
            if (!event.target.matches('[data-equipment-field]')) return;
            const currentPerson = AREA_PEOPLE[window.selectedArea]?.[window.selectedPersonIndex];
            if (!currentPerson) return;
            syncEquipmentProfileInputs(profile, currentPerson);
            clearTimeout(profile.equipmentSaveTimer);
            profile.equipmentSaveTimer = setTimeout(() => saveEquipmentProfile(false), 500);
        });
        // Al pasar al siguiente campo se confirma de inmediato en IndexedDB.
        // Esto cubre Equipo, Hardware, Software y la tabla de Accesorios.
        profile.addEventListener('blur', event => {
            if (!event.target.matches('[data-equipment-field]')) return;
            const currentPerson = AREA_PEOPLE[window.selectedArea]?.[window.selectedPersonIndex];
            if (!currentPerson) return;
            clearTimeout(profile.equipmentSaveTimer);
            syncEquipmentProfileInputs(profile, currentPerson);
            saveEquipmentProfile(false);
        }, true);
    }
}

function syncEquipmentProfileInputs(profile, person) {
    const data = equipmentProfileFor(person, {}, getSelectedEquipmentIndex());
    profile.querySelectorAll('[data-equipment-field]').forEach(input => {
        const keys = input.dataset.equipmentField.split('.');
        let target = data;
        keys.slice(0, -1).forEach(key => target = target[key] ||= {});
        target[keys.at(-1)] = input.value.trim();
    });
}

async function persistOpenEquipmentProfile() {
    const profile = document.getElementById('equipment-profile-view');
    if (!profile || profile.classList.contains('hidden')) return;
    const person = AREA_PEOPLE[window.selectedArea]?.[window.selectedPersonIndex];
    if (!person) return;
    syncEquipmentProfileInputs(profile, person);
    if (profile.equipmentSaveTimer) {
        clearTimeout(profile.equipmentSaveTimer);
        profile.equipmentSaveTimer = null;
    }
    try {
        await saveAreaPeopleData();
    } catch (error) {
        console.warn('No se pudo guardar el perfil abierto antes de cerrar:', error);
    }
}

function persistOpenEquipmentProfileSync() {
    const profile = document.getElementById('equipment-profile-view');
    if (!profile || profile.classList.contains('hidden')) return;
    const person = AREA_PEOPLE[window.selectedArea]?.[window.selectedPersonIndex];
    if (!person) return;
    syncEquipmentProfileInputs(profile, person);
    backupAreaPeopleToLocalStorage();
}

function equipmentDetailsForSupabase(details, fields) {
    return Object.fromEntries(fields.map(key => [key, remoteText(details?.[key])]));
}

function buildEquipmentRecordForProfile(person, employeeId, profileIndex) {
    const profile = equipmentProfileFor(person, {}, profileIndex);
    const fullProfile = {
        name: remoteText(profile.name, `Laptop ${profileIndex + 1}`),
        brand: remoteText(profile.brand),
        model: remoteText(profile.model),
        serial: remoteText(profile.serial),
        status: (function() {
            const allowed = ['Resuelto', 'Pendiente', 'En revisión', 'En proceso'];
            const s = String(profile.status || '').trim();
            return allowed.includes(s) ? s : 'Pendiente';
        })(),
        hardware: equipmentDetailsForSupabase(profile.hardware, ['processor', 'ram', 'disk', 'opticalDrive', 'videoMemoryType', 'videoMemory', 'displaySize', 'resolution', 'keyboardLanguage', 'serialPort', 'usbPort', 'networkPort']),
        software: equipmentDetailsForSupabase(profile.software, ['system', 'systemLanguage', 'architecture', 'officeVersion', 'officeLanguage', 'antivirus', 'autocad']),
        accessories: Array.isArray(profile.accessoryList) ? profile.accessoryList : Object.values(profile.accessories || {}),
        accessoryMap: profile.accessories || {},
        notes: remoteText(profile.notes)
    };

    return {
        employee_id: employeeId,
        employee_name: remoteText(person.nombre, 'Colaborador'),
        equipment_name: fullProfile.name,
        brand: fullProfile.brand,
        model: fullProfile.model,
        serial: fullProfile.serial,
        hardware: fullProfile.hardware,
        software: fullProfile.software,
        accessories: fullProfile.accessories.map(accessory => ({
            id: remoteText(accessory.id),
            name: remoteText(accessory.name),
            model: remoteText(accessory.model),
            serial: remoteText(accessory.serial)
        })),
        action_taken: remoteText(profile.action_taken),
        return_date: null,
        replacement_date: null,
        status: fullProfile.status
    };
}

function buildEquipmentRecordsForPerson(person, employeeId) {
    const profiles = ensureEquipmentProfiles(person);
    return profiles.map((profile, index) => buildEquipmentRecordForProfile(person, employeeId, index));
}

async function saveEquipmentToSupabase(person) {
    if (!isSupabaseConfigured() || !person) return false;
    // Ensure employee exists or is upserted first
    try {
        await upsertEmployeeToEmployees(person);
    } catch (e) {
        throw new Error(`No se pudo sincronizar al colaborador antes de guardar su equipo: ${e?.message || e}`);
    }
    const employeeId = person.supabaseEmployeeId || null;
    if (!employeeId) {
        throw new Error('No se obtuvo el identificador de Supabase para el colaborador; el equipo no se guardó para evitar datos sin nombre.');
    }
    const profiles = ensureEquipmentProfiles(person);
    const { url, key } = getSupabaseConfig();
    const areaName = String(window.selectedArea || person.area || '').trim();
    const areaId = await getAreaIdByName(areaName);
    person.supabaseEquipmentIds ||= [];

    for (let index = 0; index < profiles.length; index += 1) {
        const record = buildEquipmentRecordForProfile(person, employeeId, index);
        record.area_name = areaName || null;
        if (areaId) record.area_id = areaId;
        const equipmentId = profiles[index].supabaseEquipmentId || null;
        const endpoint = equipmentId ? `${url}/rest/v1/equipment?id=eq.${encodeURIComponent(equipmentId)}` : `${url}/rest/v1/equipment`;
        const method = equipmentId ? 'PATCH' : 'POST';
        const body = equipmentId ? JSON.stringify(record) : JSON.stringify([record]);
        const response = await fetch(endpoint, {
            method,
            headers: {
                apikey: key,
                Authorization: `Bearer ${key}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Prefer: 'return=representation'
            },
            body
        });
        let rows;
        if (!response.ok) {
            const err = await response.text();
            if (response.status === 400 && err.includes("Could not find the 'problem_description' column")) {
                const safeRecord = { ...record };
                delete safeRecord.problem_description;
                const safeBody = equipmentId ? JSON.stringify(safeRecord) : JSON.stringify([safeRecord]);
                const retryResponse = await fetch(endpoint, {
                    method,
                    headers: {
                        apikey: key,
                        Authorization: `Bearer ${key}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        Prefer: 'return=representation'
                    },
                    body: safeBody
                });
                if (!retryResponse.ok) {
                    const retryErr = await retryResponse.text();
                    throw new Error(`No se pudo guardar equipo en Supabase después de eliminar problem_description: ${retryResponse.status} ${retryResponse.statusText} ${retryErr}`);
                }
                rows = await retryResponse.json();
            } else {
                throw new Error(`No se pudo guardar equipo en Supabase: ${response.status} ${response.statusText} ${err}`);
            }
        } else {
            rows = await response.json();
        }
        // Un PATCH sin filas indica que el id guardado localmente pertenece a
        // un registro eliminado o a otra base de datos. Se crea el equipo de
        // nuevo para no perder el guardado actual.
        if (equipmentId && (!Array.isArray(rows) || !rows[0]?.id)) {
            profiles[index].supabaseEquipmentId = null;
            const insertResponse = await fetch(`${url}/rest/v1/equipment`, {
                method: 'POST',
                headers: {
                    apikey: key,
                    Authorization: `Bearer ${key}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Prefer: 'return=representation'
                },
                body: JSON.stringify([record])
            });
            if (!insertResponse.ok) {
                const insertErr = await insertResponse.text();
                throw new Error(`No se pudo crear el equipo en Supabase: ${insertResponse.status} ${insertResponse.statusText} ${insertErr}`);
            }
            rows = await insertResponse.json();
        }
        if (Array.isArray(rows) && rows[0]?.id) {
            profiles[index].supabaseEquipmentId = rows[0].id;
        } else if (rows?.id) {
            profiles[index].supabaseEquipmentId = rows.id;
        }
        if (!profiles[index].supabaseEquipmentId) {
            throw new Error('Supabase no devolvió un identificador válido para el equipo.');
        }
        person.supabaseEquipmentIds[index] = profiles[index].supabaseEquipmentId;

    }
    return true;
}

async function deleteEquipmentFromSupabase(equipmentId) {
    if (!isSupabaseConfigured() || !equipmentId) return false;
    const headers = {
        Accept: 'application/json'
    };
    // Primero se eliminan los accesorios asociados (si la tabla existe por separado)
    // y luego el equipo, para no dejar registros huérfanos.
    try {
        await supabaseRestFetch(`equipment_accessories?equipment_id=eq.${encodeURIComponent(equipmentId)}`, {
            method: 'DELETE',
            headers
        });
    } catch (e) {
        console.warn('No se pudieron eliminar accesorios asociados en Supabase.', e);
    }
    const response = await supabaseRestFetch(`equipment?id=eq.${encodeURIComponent(equipmentId)}`, {
        method: 'DELETE',
        headers
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`No se pudo eliminar el equipo en Supabase: ${response.status} ${response.statusText} ${err}`);
    }
    return true;
}

async function saveEquipmentAccessories() {
    if (!canEditPeople()) return;
    const person = AREA_PEOPLE[window.selectedArea]?.[window.selectedPersonIndex];
    const profileView = document.getElementById('equipment-profile-view');
    if (!person || !profileView) return;

    syncEquipmentProfileInputs(profileView, person);
    const equipmentIndex = getSelectedEquipmentIndex();
    const equipmentProfile = equipmentProfileFor(person, {}, equipmentIndex);

    try {
        await saveAreaPeopleData();

        backupEmployeeAccessoriesToLocalStorage();

        // Primero se confirma el equipo padre y después se insertan los
        // accesorios en equipment_accessories vinculados a ese equipo.
        await saveEquipmentProfile(false);
        const equipmentId = equipmentProfile.supabaseEquipmentId;
        if (!equipmentId) throw new Error('No se obtuvo un equipo válido para asociar los accesorios.');
        await saveEquipmentAccessoriesToSupabase(equipmentId, person, equipmentProfile.accessoryList || []);
        await saveAreaPeopleData();
        alert('Accesorios guardados correctamente en Supabase.');
    } catch (error) {
        console.error('No se pudieron guardar los accesorios en Supabase.', error);
        alert(`Los accesorios se guardaron localmente, pero Supabase rechazó la sincronización:\n${error?.message || error}`);
    }
}

async function saveEquipmentAccessoriesToSupabase(equipmentId, person, accessories = []) {
    if (!isSupabaseConfigured() || !equipmentId) return false;
    const employeeName = String(person?.nombre || '').trim() || null;
    const employeeId = person?.supabaseEmployeeId || null;
    const areaName = String(window.selectedArea || person?.area || '').trim() || null;
    const areaId = areaName ? await getAreaIdByName(areaName) : null;

    const deleteResponse = await supabaseRestFetch(`equipment_accessories?equipment_id=eq.${encodeURIComponent(equipmentId)}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' }
    });
    if (!deleteResponse.ok) {
        const err = await deleteResponse.text();
        throw new Error(`No se pudieron reemplazar los accesorios anteriores: ${deleteResponse.status} ${deleteResponse.statusText} ${err}`);
    }

    if (!Array.isArray(accessories) || accessories.length === 0) return true;
    const payload = accessories.map(accessory => ({
        equipment_id: equipmentId,
        employee_id: employeeId,
        area_id: areaId,
        employee_name: employeeName,
        area_name: areaName,
        name: String(accessory.name || '').trim() || null,
        model: String(accessory.model || '').trim() || null,
        serial: String(accessory.serial || '').trim() || null
    }));
    const insertResponse = await supabaseRestFetch('equipment_accessories', {
        method: 'POST',
        headers: {
            Prefer: 'return=representation'
        },
        body: JSON.stringify(payload)
    });
    if (!insertResponse.ok) {
        const err = await insertResponse.text();
        throw new Error(`No se pudieron guardar accesorios en Supabase: ${insertResponse.status} ${insertResponse.statusText} ${err}`);
    }
    return true;
}

async function getAreaIdByName(areaName) {
    if (!isSupabaseConfigured() || !areaName) return null;
    const response = await supabaseRestFetch(`areas?select=id&name=eq.${encodeURIComponent(areaName)}`, {
        method: 'GET'
    });
    if (!response.ok) return null;
    const rows = await response.json();
    if (Array.isArray(rows) && rows[0]?.id) return rows[0].id;

    // Compatibilidad con áreas registradas con tildes, por ejemplo
    // "Logística" en Supabase y "Logistica" en la interfaz.
    const allResponse = await supabaseRestFetch('areas?select=id,name', {
        method: 'GET'
    });
    if (!allResponse.ok) return null;
    const normalizeArea = value => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
    const matchingArea = (await allResponse.json()).find(area => normalizeArea(area.name) === normalizeArea(areaName));
    return matchingArea?.id || null;
}

async function fetchEmployeeByDni(dni) {
    if (!isSupabaseConfigured() || !dni) return null;
    const response = await supabaseRestFetch(`employees?select=id,dni&dni=eq.${encodeURIComponent(dni)}&limit=1`, {
        method: 'GET'
    });
    if (!response.ok) return null;
    const rows = await response.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

function hasUsableDni(dni) {
    const value = String(dni || '').trim();
    return Boolean(value && value.toLowerCase() !== 'pendiente');
}

async function fetchEmployeeByKey(employeeKey) {
    if (!isSupabaseConfigured() || !employeeKey) return null;
    const response = await supabaseRestFetch(`employees?select=id,employee_key&employee_key=eq.${encodeURIComponent(employeeKey)}&limit=1`, {
        method: 'GET'
    });
    if (!response.ok) return null;
    const rows = await response.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

async function upsertEmployeeToEmployees(person) {
    if (!isSupabaseConfigured() || !person) return false;
    const fullName = String(person.nombre || '').trim();
    const dni = hasUsableDni(person.dni) ? String(person.dni).trim() : null;
    const hireDate = (function () {
        const d = String(person.fechaIngreso || '').trim();
        if (!d || d.toLowerCase() === 'pendiente') return null;
        const parts = d.split('/');
        if (parts.length !== 3) return null;
        return `${parts[2].padStart(4,'0')}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
    })();
    const photo = String(person.foto || '').trim() || null;
    const areaName = window.selectedArea || String(person.area || '').trim();
    const employeeIndex = Math.max((AREA_PEOPLE[areaName] || []).indexOf(person), 0);
    const employeeKey = ensurePersonEmployeeKey(areaName, employeeIndex, person);
    const areaId = await getAreaIdByName(areaName);
    const record = {
        employee_key: employeeKey,
        full_name: fullName || 'Colaborador',
        dni,
        hire_date: hireDate,
        photo_url: photo,
        ...(areaId ? { area_id: areaId } : {})
    };
    let targetId = person.supabaseEmployeeId || null;
    if (!targetId) {
        const existing = await fetchEmployeeByKey(employeeKey);
        targetId = existing?.id || null;
        if (existing?.id) person.supabaseEmployeeId = existing.id;
    }
    if (!targetId && dni) {
        const existing = await fetchEmployeeByDni(dni);
        targetId = existing?.id || null;
        if (!person.supabaseEmployeeId && existing?.id) {
            person.supabaseEmployeeId = existing.id;
        }
    }

    if (targetId) {
        const patchResponse = await supabaseRestFetch(`employees?id=eq.${encodeURIComponent(targetId)}`, {
            method: 'PATCH',
            headers: {
                Prefer: 'return=representation'
            },
            body: JSON.stringify(record)
        });
        if (!patchResponse.ok) {
            const err = await patchResponse.text();
            throw new Error(`No se pudo actualizar employee en Supabase: ${patchResponse.status} ${patchResponse.statusText} ${err}`);
        }
        const rows = await patchResponse.json();
        if (Array.isArray(rows) && rows[0]?.id) {
            person.supabaseEmployeeId = rows[0].id;
            return true;
        }

        // El identificador pudo pertenecer a otra base de datos o a un registro eliminado.
        // En ese caso se crea un empleado nuevo y se reemplaza el id guardado localmente.
        console.warn('El employee_id almacenado ya no existe en Supabase; se creará un nuevo registro.');
        person.supabaseEmployeeId = null;
        targetId = null;
    }

    const insertResponse = await supabaseRestFetch('employees', {
        method: 'POST',
        headers: {
            Prefer: 'return=representation'
        },
        body: JSON.stringify([record])
    });
    if (!insertResponse.ok) {
        const err = await insertResponse.text();
        throw new Error(`No se pudo upsertar employee en Supabase: ${insertResponse.status} ${insertResponse.statusText} ${err}`);
    }
    const rows = await insertResponse.json();
    if (Array.isArray(rows) && rows[0]?.id) {
        person.supabaseEmployeeId = rows[0].id;
        return true;
    }
    return false;
}

async function saveEquipmentProfile(showFeedback = true) {
    if (!canEditPeople()) return;
    const person = AREA_PEOPLE[window.selectedArea]?.[window.selectedPersonIndex];
    const profile = document.getElementById('equipment-profile-view');
    if (!person || !profile) return;
    syncEquipmentProfileInputs(profile, person);
    try {
        // Guardado local inmediato
        await saveAreaPeopleData();

        const areaName = window.selectedArea;
        const employeeIndex = (AREA_PEOPLE[areaName] || []).indexOf(person);
        if (employeeIndex < 0) throw new Error('No se pudo identificar al colaborador para sincronizarlo.');
        await saveEmployeeProfileToSupabase(areaName, employeeIndex);
        await saveEquipmentToSupabase(person);
        // Guardar localmente los ids y datos confirmados por Supabase y dejar
        // el perfil remoto con exactamente la misma información del sistema.
        await saveAreaPeopleData();
        await saveEmployeeProfileToSupabase(areaName, employeeIndex);
        await updateSupabaseStatusIndicator();
        console.info('Sincronización Supabase: equipo y empleado sincronizados.');

        if (showFeedback) alert('Equipo guardado correctamente en Supabase.');
    } catch (error) {
        console.error('No se pudo guardar el equipo en Supabase.', error);
        if (showFeedback) alert(`El equipo se guardó localmente, pero Supabase rechazó la sincronización:\n${error?.message || error}`);
    }
}

async function addEquipmentAccessory() {
    if (!canEditPeople()) return;
    const person = AREA_PEOPLE[window.selectedArea]?.[window.selectedPersonIndex];
    if (!person) return;
    const data = equipmentProfileFor(person, {}, getSelectedEquipmentIndex());
    data.accessoryList.push({
        id: `accessory-${Date.now()}`,
        name: 'Nuevo accesorio',
        model: '',
        serial: '',
        owner_employee_key: String(person.employee_key || '').trim()
    });
    openEquipmentProfile(window.selectedPersonIndex);
    await saveEquipmentProfile(false);
}

async function removeEquipmentAccessory(index) {
    if (!canEditPeople()) return;
    const person = AREA_PEOPLE[window.selectedArea]?.[window.selectedPersonIndex];
    const profile = document.getElementById('equipment-profile-view');
    if (!person || !profile) return;
    syncEquipmentProfileInputs(profile, person);
    const accessories = equipmentProfileFor(person, {}, getSelectedEquipmentIndex()).accessoryList;
    if (!accessories[index]) return;
    accessories.splice(index, 1);
    openEquipmentProfile(window.selectedPersonIndex);
    try {
        await saveEquipmentProfile(false);
    } catch (error) {
        console.error('No se pudo eliminar el accesorio.', error);
        alert('El accesorio se quitó de la vista, pero no se pudo guardar el cambio.');
    }
}

function closeEquipmentProfile() {
    document.getElementById('equipment-profile-view')?.classList.add('hidden');
    document.querySelector('.person-card-container')?.classList.remove('hidden');
    document.querySelector('.area-details-header')?.classList.remove('hidden');
}

async function showEquipmentIncidents() {
    const profile = document.getElementById('equipment-profile-view');
    const host = document.getElementById('equipment-incidents-notice');
    if (!profile || !host) return;
    const equipmentView = profile.innerHTML;

    const employee = profile.querySelector('.equipment-profile-top h2')?.textContent?.trim() || '';
    const person = AREA_PEOPLE[window.selectedArea]?.[window.selectedPersonIndex] || null;
    const remoteEmployeeId = String(person?.supabaseEmployeeId || '').trim();
    const storedIncidents = readEmployeeIncidents(employee);
    const remoteIncidents = await loadIncidentsFromSupabaseForEmployee(remoteEmployeeId);
    const mergedIncidents = mergeIncidentHistory(storedIncidents, remoteIncidents, employee);
    const safe = escapePersonText;
    const tiPeople = (AREA_PEOPLE.TI || []).map(person => String(person.nombre || '').trim()).filter(Boolean);
    const namedTiCreators = tiPeople.filter(name => /mayte|thalia/i.test(name));
    const incidentCreators = namedTiCreators.length >= 2 ? namedTiCreators : tiPeople.slice(1, 3);
    if (incidentCreators.length < 2) incidentCreators.splice(0, incidentCreators.length, 'Mayte', 'Thalía');
    const creatorOptions = selected => incidentCreators.map(name => `<option${name === selected ? ' selected' : ''}>${safe(name)}</option>`).join('');
    const today = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const incidentItems = mergedIncidents.length
        ? mergedIncidents.map((item, index) => ({
            report: {
                problema: item.title || '',
                producto: item.description || ''
            },
            status: item.status || 'Abierto',
            priority: item.severity || 'Media',
            incidentDate: item.created_at ? new Date(item.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : today,
            resolutionValue: '',
            creator: incidentCreators[index % incidentCreators.length]
        }))
        : [{
            report: {},
            status: 'Abierto',
            priority: 'Alta',
            incidentDate: today,
            resolutionValue: '',
            creator: incidentCreators[0]
        }];

    const total = incidentItems.length;
    const open = incidentItems.filter(item => item.status === 'Abierto').length;
    const inProgress = incidentItems.filter(item => item.status === 'En proceso').length;
    const resolved = incidentItems.filter(item => item.status === 'Cerrado').length;
    const resolutionDays = incidentItems.map(item => {
        const start = item.report.fecha instanceof Date ? item.report.fecha : null;
        const end = parseDate(item.report.fechaResolucion || '');
        if (start && end) {
            return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
        }
        return null;
    }).filter(val => val !== null);
    const averageResolution = resolutionDays.length ? `${Math.round(resolutionDays.reduce((acc, val) => acc + val, 0) / resolutionDays.length)} d` : '—';

    const rows = incidentItems.map((item, index) => {
        const report = item.report || {};
        const resolutionCell = item.resolutionValue ? `<input type="date" class="incident-resolution-date" value="${item.resolutionValue}">` : '<input type="date" class="incident-resolution-date">';
        return `<tr><td>${String(index + 1).padStart(2, '0')}</td><td contenteditable="true" class="incident-problem-cell">${safe(report.problema)}<small>${safe(report.producto)}</small></td><td><select class="incident-priority-select" aria-label="Prioridad de incidencia"><option${item.priority === 'Alta' ? ' selected' : ''}>Alta</option><option${item.priority === 'Media' ? ' selected' : ''}>Media</option><option${item.priority === 'Baja' ? ' selected' : ''}>Baja</option></select></td><td>${item.incidentDate}</td><td><select class="incident-created-by" aria-label="Creador de incidencia">${creatorOptions(item.creator)}</select></td><td>${resolutionCell}</td><td><div class="incident-status-control"><select aria-label="Estado de incidencia" onchange="syncIncidentStatus(this)"><option${item.status === 'Abierto' ? ' selected' : ''}>Abierto</option><option${item.status === 'En proceso' ? ' selected' : ''}>En proceso</option><option${item.status === 'Cerrado' ? ' selected' : ''}>Cerrado</option><option${item.status === 'Resuelto' ? ' selected' : ''}>Resuelto</option></select><input type="checkbox" aria-label="Marcar incidencia como cerrada" ${item.status === 'Cerrado' ? 'checked' : ''} onchange="markIncidentClosed(this)"></div></td></tr>`;
    }).join('');

    host.classList.remove('hidden');
    host.classList.add('equipment-incidents-board');
    host.innerHTML = `
        <div class="incidents-board-heading"><div><span>GESTIÓN DE SOPORTE</span><h2>Reporte de incidencias</h2><p>Consulta el historial y estado de las incidencias asignadas.</p></div><div class="incidents-actions"><button type="button" class="incidents-add-btn" onclick="addIncidentRow()">Añadir incidencia</button><button type="button" class="incidents-save-btn" onclick="saveIncidentsFromProfile()">Guardar</button><button type="button" class="incidents-close-btn" onclick="hideEquipmentIncidents()">×</button></div></div>
        <div class="incident-metrics">
            <article><span>Total de incidencias</span><strong>${total}</strong></article>
            <article class="metric-open"><span>Incidencias abiertas</span><strong>${open}</strong></article>
            <article class="metric-progress"><span>Incidencias en proceso</span><strong>${inProgress}</strong></article>
            <article class="metric-resolved"><span>Incidencias resueltas</span><strong>${resolved}</strong></article>
            <article class="metric-time"><span>Tiempo promedio de resolución</span><strong>${averageResolution}</strong></article>
        </div>
        <div class="incidents-table-wrap"><table class="incidents-table"><thead><tr><th>N.º</th><th>Incidencia / problema</th><th>Prioridad</th><th>Fecha</th><th>Creado por</th><th>Fecha de resolución</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    profile.dataset.equipmentView = equipmentView;
    const reportContent = host.innerHTML.replace('onclick="hideEquipmentIncidents()"', 'onclick="closeEquipmentIncidents()"');
    profile.innerHTML = `<div class="equipment-profile-top incidents-page-top"><button type="button" class="area-back-btn" onclick="closeEquipmentIncidents()">← Volver al equipo</button><div><p class="equipment-profile-kicker">Asignación de activo</p><h2>Incidencias del equipo</h2></div></div><main class="equipment-incidents-notice equipment-incidents-board">${reportContent}</main>`;
}

function hideEquipmentIncidents() {
    const notice = document.getElementById('equipment-incidents-notice');
    if (!notice) return;
    notice.className = 'equipment-incidents-notice hidden';
    notice.innerHTML = '';
}

function closeEquipmentIncidents() {
    const profile = document.getElementById('equipment-profile-view');
    if (!profile?.dataset.equipmentView) return;
    profile.innerHTML = profile.dataset.equipmentView;
    delete profile.dataset.equipmentView;
}

function markIncidentClosed(checkbox) {
    const select = checkbox.closest('.incident-status-control')?.querySelector('select');
    if (select && checkbox.checked) select.value = 'Cerrado';
}

function syncIncidentStatus(select) {
    const checkbox = select.closest('.incident-status-control')?.querySelector('input[type="checkbox"]');
    if (checkbox) checkbox.checked = select.value === 'Cerrado';
}

function normalizeIncidentTitle(text) {
    const raw = String(text || '').trim();
    const normalized = raw.replace(/\s+/g, ' ').trim();
    return normalized;
}

function getEmployeeIncidentsStorageKey(employeeName) {
    const base = String(employeeName || '').trim().toLowerCase();
    const normalized = base
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return normalized ? `incidents_by_employee_${normalized}` : 'incidents_by_employee_unassigned';
}

function readEmployeeIncidents(employeeName) {
    try {
        const key = getEmployeeIncidentsStorageKey(employeeName);
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('No se pudieron leer incidencias locales para el empleado.', error);
        return [];
    }
}

function saveEmployeeIncidents(employeeName, incidents) {
    try {
        const key = getEmployeeIncidentsStorageKey(employeeName);
        localStorage.setItem(key, JSON.stringify(incidents));
    } catch (error) {
        console.warn('No se pudieron guardar incidencias locales para el empleado.', error);
    }
}

function clearAllIncidents() {
    if (!confirm('¿Eliminar todas las incidencias locales y limpiar el reporte?')) return;
    try {
        const keys = Object.keys(localStorage || {});
        keys.forEach(key => {
            if (typeof key === 'string' && key.startsWith('incidents_by_employee_')) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.warn('No se pudieron borrar las incidencias locales.', error);
    }
    if (window.APP_MODEL) {
        delete window.APP_MODEL.reportes;
    }
    renderReportes();
    alert('Todas las incidencias locales han sido borradas.');
}

function getAllLocalEmployeeIncidents() {
    const incidents = [];
    try {
        for (const key of Object.keys(localStorage || {})) {
            if (!key.startsWith('incidents_by_employee_')) continue;
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) continue;
            parsed.forEach(item => incidents.push({
                ...item,
                employee_name: item.employee_name || key.replace('incidents_by_employee_', '').replace(/-/g, ' ')
            }));
        }
    } catch (error) {
        console.warn('No se pudieron leer las incidencias locales del sistema.', error);
    }
    return incidents;
}

function mergeIncidentHistory(localIncidents, remoteIncidents, employeeName) {
    const merged = [];
    const seen = new Set();
    const pushRecord = record => {
        if (!record) return;
        const key = `${String(record.problema || record.title || '').trim().toLowerCase()}::${String(record.producto || record.description || '').trim().toLowerCase()}::${String(record.empleado || record.employee_name || employeeName || '').trim().toLowerCase()}::${String(record.created_at || '').trim()}`;
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(record);
    };

    [...(Array.isArray(remoteIncidents) ? remoteIncidents : []), ...(Array.isArray(localIncidents) ? localIncidents : [])]
        .map((item, index) => normalizeUnifiedIncidentRecord({
            ...item,
            employee_name: item.employee_name || employeeName || item.empleado || '',
            title: item.title || item.problema || '',
            description: item.description || item.producto || '',
            severity: item.severity || item.prioridad || 'Media',
            status: item.status || item.estado || 'Abierto',
            created_at: item.created_at || item.fecha || ''
        }, index))
        .filter(Boolean)
        .forEach(pushRecord);

    merged.sort((a, b) => new Date(b.created_at || b.fecha || 0).getTime() - new Date(a.created_at || a.fecha || 0).getTime());
    return merged;
}

async function loadIncidentsFromSupabaseForEmployee(employeeId) {
    if (!employeeId || !isSupabaseConfigured()) return [];
    try {
        const response = await supabaseRestFetch(`incidents?select=id,employee_id,title,description,severity,status,created_at&employee_id=eq.${encodeURIComponent(employeeId)}&order=created_at.desc`, {
            method: 'GET'
        });
        if (!response.ok) {
            console.warn('No se pudieron cargar las incidencias remotas del empleado:', response.status);
            return [];
        }
        const rows = await response.json();
        return Array.isArray(rows) ? rows : [];
    } catch (error) {
        console.warn('Error al consultar incidencias remotas del empleado:', error);
        return [];
    }
}

async function loadAllIncidentsFromSupabase() {
    if (!isSupabaseConfigured()) return [];
    try {
        const response = await supabaseRestFetch('incidents?select=id,employee_id,title,description,severity,status,created_at,employees(full_name)', {
            method: 'GET'
        });
        if (!response.ok) {
            console.warn('No se pudieron cargar las incidencias remotas globales:', response.status);
            return [];
        }
        const rows = await response.json();
        return Array.isArray(rows) ? rows : [];
    } catch (error) {
        console.warn('Error al consultar incidencias remotas globales:', error);
        return [];
    }
}

function normalizeUnifiedIncidentRecord(record, fallbackIndex = 0) {
    if (!record) return null;
    const employeeName = String(record.employee_name || record.empleado || record.full_name || '').trim();
    const title = normalizeIncidentTitle(String(record.title || record.problema || `Incidencia ${fallbackIndex + 1}`));
    const description = String(record.description || record.producto || '').trim();
    const severity = String(record.severity || record.prioridad || 'Media').trim() || 'Media';
    const status = String(record.status || record.estado || 'Abierto').trim() || 'Abierto';
    const createdAt = record.created_at || record.fecha || record.fechaResolucion || null;
    const fecha = createdAt ? new Date(createdAt) : null;
    if (!title) return null;
    return {
        empleado: employeeName || 'Desconocido',
        producto: description ? description.replace(/^Producto:\s*/i, '') : '',
        problema: title,
        prioridad: severity,
        severity,
        estado: status,
        status,
        fecha: fecha && !Number.isNaN(fecha.getTime()) ? fecha.toISOString() : createdAt || '',
        created_at: fecha && !Number.isNaN(fecha.getTime()) ? fecha.toISOString() : createdAt || '',
        employee_name: employeeName
    };
}

async function getUnifiedIncidentRows() {
    const localRows = getAllLocalEmployeeIncidents().map((item, index) => normalizeUnifiedIncidentRecord(item, index)).filter(Boolean);
    const remoteRowsRaw = await loadAllIncidentsFromSupabase();
    const remoteRows = remoteRowsRaw.map((item, index) => {
        const employeeName = String(item?.employees?.full_name || item?.employee_name || '').trim();
        return normalizeUnifiedIncidentRecord({
            ...item,
            employee_name: employeeName,
            title: item.title,
            description: item.description,
            severity: item.severity,
            status: item.status,
            created_at: item.created_at
        }, index);
    }).filter(Boolean);

    const merged = [];
    const seen = new Set();
    const pushRecord = record => {
        const key = `${String(record.problema || '').trim().toLowerCase()}::${String(record.producto || '').trim().toLowerCase()}::${String(record.empleado || '').trim().toLowerCase()}::${String(record.created_at || '').trim()}`;
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(record);
    };
    [...remoteRows, ...localRows].forEach(pushRecord);
    merged.sort((a, b) => new Date(b.created_at || b.fecha || 0).getTime() - new Date(a.created_at || a.fecha || 0).getTime());
    return merged;
}

function getIncidentRowData(row) {
    if (!row) return null;
    const problemCell = row.querySelector('.incident-problem-cell');
    if (!problemCell) return null;

    const title = Array.from(problemCell.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => String(node.textContent || '').trim())
        .join(' ')
        .trim();

    const product = String(problemCell.querySelector('small')?.textContent || '').trim();
    const priority = String(row.querySelector('.incident-priority-select')?.value || 'Media').trim() || 'Media';
    const status = String(row.querySelector('.incident-status-control select')?.value || 'Abierto').trim() || 'Abierto';
    const dateText = String(row.children[3]?.textContent || '').trim();
    const createdAt = parseDate(dateText);
    const resolverValue = String(row.querySelector('.incident-resolution-date')?.value || '').trim();
    const creator = String(row.querySelector('.incident-created-by')?.value || '').trim();

    const normalizedTitle = normalizeIncidentTitle(title || product || `Incidencia ${row.rowIndex || ''}`);
    const descriptionParts = [];
    if (product) descriptionParts.push(`Producto: ${product}`);
    if (creator) descriptionParts.push(`Creado por: ${creator}`);
    if (resolverValue) descriptionParts.push(`Fecha de resolución: ${resolverValue}`);
    const description = descriptionParts.join(' | ');

    if (!normalizedTitle) return null;

    const record = {
        title: normalizedTitle,
        description: description || null,
        severity: priority,
        status: status
    };
    if (createdAt) {
        record.created_at = createdAt.toISOString();
    }
    return record;
}

function buildIncidentTableRow(index, item) {
    const report = item.report || {};
    const resolutionCell = item.resolutionValue ? `<input type="date" class="incident-resolution-date" value="${item.resolutionValue}">` : '<input type="date" class="incident-resolution-date">';
    return `<tr><td>${String(index + 1).padStart(2, '0')}</td><td contenteditable="true" class="incident-problem-cell">${escapePersonText(report.problema)}<small>${escapePersonText(report.producto)}</small></td><td><select class="incident-priority-select" aria-label="Prioridad de incidencia"><option${item.priority === 'Alta' ? ' selected' : ''}>Alta</option><option${item.priority === 'Media' ? ' selected' : ''}>Media</option><option${item.priority === 'Baja' ? ' selected' : ''}>Baja</option></select></td><td>${item.incidentDate}</td><td><select class="incident-created-by" aria-label="Creador de incidencia">${item.creatorOptions}</select></td><td>${resolutionCell}</td><td><div class="incident-status-control"><select aria-label="Estado de incidencia" onchange="syncIncidentStatus(this)"><option${item.status === 'Abierto' ? ' selected' : ''}>Abierto</option><option${item.status === 'En proceso' ? ' selected' : ''}>En proceso</option><option${item.status === 'Cerrado' ? ' selected' : ''}>Cerrado</option><option${item.status === 'Resuelto' ? ' selected' : ''}>Resuelto</option></select><input type="checkbox" aria-label="Marcar incidencia como cerrada" ${item.status === 'Cerrado' ? 'checked' : ''} onchange="markIncidentClosed(this)"></div></td></tr>`;
}

function parseIncidentTableRows() {
    const tableBody = document.querySelector('.incidents-table tbody');
    if (!tableBody) return [];
    return Array.from(tableBody.querySelectorAll('tr'))
        .map(getIncidentRowData)
        .filter(record => record && record.title);
}

function addIncidentRow() {
    const tableBody = document.querySelector('.incidents-table tbody');
    if (!tableBody) return;
    const nextIndex = tableBody.querySelectorAll('tr').length;
    const today = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const creatorOptions = (AREA_PEOPLE.TI || []).map(person => String(person.nombre || '').trim()).filter(Boolean);
    const namedTiCreators = creatorOptions.filter(name => /mayte|thalia/i.test(name));
    const incidentCreators = namedTiCreators.length >= 2 ? namedTiCreators : creatorOptions.slice(1, 3);
    if (incidentCreators.length < 2) incidentCreators.splice(0, incidentCreators.length, 'Mayte', 'Thalía');
    const selectedCreator = incidentCreators[0] || 'TI';
    const creatorSelect = incidentCreators.map(name => `<option${name === selectedCreator ? ' selected' : ''}>${escapePersonText(name)}</option>`).join('');

    const rowHtml = `<tr><td>${String(nextIndex + 1).padStart(2, '0')}</td><td contenteditable="true" class="incident-problem-cell"></td><td><select class="incident-priority-select" aria-label="Prioridad de incidencia"><option>Alta</option><option selected>Media</option><option>Baja</option></select></td><td>${today}</td><td><select class="incident-created-by" aria-label="Creador de incidencia">${creatorSelect}</select></td><td><input type="date" class="incident-resolution-date"></td><td><div class="incident-status-control"><select aria-label="Estado de incidencia" onchange="syncIncidentStatus(this)"><option selected>Abierto</option><option>En proceso</option><option>Cerrado</option><option>Resuelto</option></select><input type="checkbox" aria-label="Marcar incidencia como cerrada"></div></td></tr>`;
    tableBody.insertAdjacentHTML('beforeend', rowHtml);
}

async function saveIncidentsFromProfile() {
    if (!canEditPeople()) return;
    const person = AREA_PEOPLE[window.selectedArea]?.[window.selectedPersonIndex];
    if (!person) {
        alert('No se pudo identificar al colaborador actual. Selecciona un empleado antes de guardar incidencias.');
        return;
    }

    const incidents = parseIncidentTableRows();
    if (!incidents.length) {
        alert('No se encontraron incidencias válidas para guardar. Completa el campo de incidencia antes de guardar.');
        return;
    }

    const employeeName = String(person.nombre || '').trim();
    const localStoragePayload = incidents.map(incident => ({
        ...incident,
        employee_name: employeeName
    }));
    saveEmployeeIncidents(employeeName, localStoragePayload);

    if (!isSupabaseConfigured()) {
        console.info('Incidencias guardadas localmente por empleado. Supabase no está configurado correctamente, por lo que la sincronización remota quedó omitida.');
        return;
    }
    try {
        await upsertEmployeeToEmployees(person);
        const employeeId = person.supabaseEmployeeId || null;
        if (!employeeId) throw new Error('No se obtuvo el identificador de Supabase para el colaborador.');

        const { url, key } = getSupabaseConfig();
        const payload = incidents.map(incident => ({
            ...incident,
            employee_id: employeeId
        }));

        const response = await fetch(`${url}/rest/v1/incidents`, {
            method: 'POST',
            headers: {
                apikey: key,
                Authorization: `Bearer ${key}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Supabase rechazó el guardado de incidencias: ${response.status} ${response.statusText} ${err}`);
        }

        await updateSupabaseStatusIndicator();
        console.info('Incidencias guardadas correctamente en local y en Supabase.');
    } catch (error) {
        console.error('Error al guardar incidencias en Supabase.', error);
        console.warn(`No se pudo guardar la incidencia en Supabase: ${error?.message || 'error desconocido'}. La copia local ya quedó guardada por empleado.`);
    }
}

function enablePhotoDragging() {
    // Fotos fijas: el jefe y el resto no deben moverlas.
    return;
}

function selectArea(areaName) {
    closeEquipmentProfile();
    window.selectedArea = areaName;
    document.querySelector('.areas-grid-container').style.display = 'none';
    const detailsContainer = document.getElementById('area-details-container');
    detailsContainer.classList.remove('area-details-hidden');
    detailsContainer.classList.add('area-details-container');
    document.getElementById('area-selected-title').textContent = `Area: ${areaName}`;
    renderAreaPeople(areaName);
    updateSupabaseStatusIndicator();
}

function startEditPerson(index) {
    if (!canEditPeople()) {
        alert('El usuario Jefe solo tiene permiso de consulta.');
        return;
    }
    const card = document.querySelector(`[data-person-index="${index}"]`);
    if (!card) return;
    card.querySelector('.person-view-mode').classList.add('hidden');
    card.querySelector('.person-edit-mode').classList.remove('hidden');
    card.querySelector('.person-edit-btn').classList.add('hidden');
    card.querySelector('.person-save-btn').classList.remove('hidden');
    card.querySelector('.person-cancel-btn').classList.remove('hidden');
}

async function savePerson(index) {
    if (!canEditPeople()) {
        alert('El usuario Jefe no tiene permiso para guardar cambios.');
        return;
    }
    const area = window.selectedArea;
    const card = document.querySelector(`[data-person-index="${index}"]`);
    const person = AREA_PEOPLE[area]?.[index];
    if (!card || !person) return;
    const name = card.querySelector('.edit-name').value.trim();
    const dni = card.querySelector('.edit-dni').value.trim();
    const isTiManager = area === 'TI' && index === 0;
    const dateInput = card.querySelector('.edit-date');
    const date = dateInput ? dateInput.value : '';
    const photoFile = card.querySelector('.edit-photo').files[0];
    if (!name || !dni || (!isTiManager && !date)) {
        alert('Completa el nombre, DNI y fecha de ingreso.');
        return;
    }
    const fechaIngreso = isTiManager ? '' : (() => {
        const [year, month, day] = date.split('-');
        return `${day}/${month}/${year}`;
    })();
    const cargoInput = card.querySelector('.edit-cargo');
    const cargo = cargoInput ? cargoInput.value.trim() : person.cargo || area;
    Object.assign(person, { nombre: name, dni, fechaIngreso, cargo });
    if (photoFile) {
        if (!photoFile.type.startsWith('image/')) {
            alert('Selecciona un archivo de imagen valido.');
            return;
        }
        person.foto = await readPersonPhoto(photoFile);
    }
    try {
        // Guardado local inmediato
        await saveAreaPeopleData();
        renderAreaPeople(area);

        await saveEmployeeProfileToSupabase(area, index);
        await updateSupabaseStatusIndicator();
        console.info('Sincronización Supabase: empleado sincronizado.');
        alert('Colaborador guardado correctamente en Supabase.');
    } catch (error) {
        console.error('No se pudo guardar la información del empleado en Supabase.', error);
        alert(`Los cambios se guardaron localmente, pero Supabase rechazó la sincronización:\n${error?.message || error}`);
    }
}

function readPersonPhoto(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        reader.readAsDataURL(file);
    });
}

function cancelEditPerson(index) {
    renderAreaPeople(window.selectedArea);
}

async function loadAreaPeopleData() {
    try {
        // Migrar las fichas guardadas por versiones anteriores, si existen.
        const saved = await readAreaPeopleData() || JSON.parse(localStorage.getItem('AREA_PEOPLE'));
        Object.entries(saved || {}).forEach(([area, people]) => {
            const expectedCount = AREA_PERSON_COUNTS[area] || 0;
            if (Array.isArray(people) && people.length > 0 && expectedCount > 0) {
                AREA_PEOPLE[area] = people.slice(0, expectedCount);
                while (AREA_PEOPLE[area].length < expectedCount) {
                    const index = AREA_PEOPLE[area].length + 1;
                    AREA_PEOPLE[area].push({
                        nombre: `Colaborador ${index}`,
                        dni: 'Pendiente',
                        fechaIngreso: 'Pendiente',
                        foto: AREA_PERSONS[area].foto
                    });
                }
            }
        });
        if (AREA_PEOPLE.TI?.[0]) {
            AREA_PEOPLE.TI[0].cargo = 'Gerente de TI';
            AREA_PEOPLE.TI[0].fechaIngreso = '';
        }
        if (AREA_PEOPLE.Logistica?.[1]) {
            AREA_PEOPLE.Logistica[1].cargo = 'Jefe de Logística';
        }

        const remotePeople = await loadEmployeeDataFromSupabase();
        if (remotePeople && typeof remotePeople === 'object') {
            Object.entries(remotePeople).forEach(([area, people]) => {
                if (!Array.isArray(people) || people.length === 0) return;
                const expectedCount = AREA_PERSON_COUNTS[area] || people.length;
                if (!Array.isArray(AREA_PEOPLE[area])) {
                    AREA_PEOPLE[area] = [];
                }
                people.forEach(remote => {
                    const index = Number.isFinite(remote.employee_index) ? remote.employee_index : AREA_PEOPLE[area].length;
                    while (AREA_PEOPLE[area].length <= index) {
                        const nextIndex = AREA_PEOPLE[area].length + 1;
                        AREA_PEOPLE[area].push({
                            nombre: `Colaborador ${nextIndex}`,
                            dni: 'Pendiente',
                            fechaIngreso: 'Pendiente',
                            foto: AREA_PERSONS[area]?.foto || ''
                        });
                    }
                    const existing = AREA_PEOPLE[area][index] || {};
                    AREA_PEOPLE[area][index] = {
                        ...existing,
                        ...remote.profile_data,
                        nombre: remote.employee_name || existing.nombre || `Colaborador ${index + 1}`,
                        dni: remote.dni || existing.dni || 'Pendiente',
                        fechaIngreso: remote.hire_date || existing.fechaIngreso || 'Pendiente',
                        foto: remote.photo_url || existing.foto || AREA_PERSONS[area]?.foto || '',
                        cargo: remote.job_title || remote.profile_data?.cargo || existing.cargo || '',
                        supabaseEmployeeId: remote.employee_id || existing.supabaseEmployeeId || null,
                        employee_key: remote.employee_key || existing.employee_key || ensurePersonEmployeeKey(area, index, existing)
                    };
                    ensurePersonEmployeeKey(area, index, AREA_PEOPLE[area][index]);
                });
                while (AREA_PEOPLE[area].length < expectedCount) {
                    const index = AREA_PEOPLE[area].length + 1;
                    AREA_PEOPLE[area].push({
                        nombre: `Colaborador ${index}`,
                        dni: 'Pendiente',
                        fechaIngreso: 'Pendiente',
                        foto: AREA_PERSONS[area]?.foto || ''
                    });
                }
            });

            const remoteAssets = await loadEquipmentDataFromSupabase();
            const accessoriesByEquipment = new Map();
            if (Array.isArray(remoteAssets?.accessories)) {
                remoteAssets.accessories.forEach(accessory => {
                    const list = accessoriesByEquipment.get(accessory.equipment_id) || [];
                    list.push(accessory);
                    accessoriesByEquipment.set(accessory.equipment_id, list);
                });
            }

            Object.values(AREA_PEOPLE).forEach(people => (people || []).forEach(person => {
                const employeeId = String(person.supabaseEmployeeId || '');
                if (!employeeId) return;
                const employeeEquipment = Array.isArray(remoteAssets?.equipment)
                    ? remoteAssets.equipment.filter(item => String(item.employee_id || '') === employeeId)
                    : [];
                if (!employeeEquipment.length) return;
                person.equipmentProfiles = employeeEquipment.map((item, index) => {
                    const accessoryRows = accessoriesByEquipment.get(item.id);
                    const rawAccessories = Array.isArray(accessoryRows) && accessoryRows.length
                        ? accessoryRows
                        : (Array.isArray(item.accessories) ? item.accessories : []);
                    return {
                        supabaseEquipmentId: item.id,
                        owner_employee_key: person.employee_key,
                        name: item.equipment_name || `Equipo ${index + 1}`,
                        brand: item.brand || '',
                        model: item.model || '',
                        serial: item.serial || '',
                        status: item.status || 'Pendiente',
                        hardware: item.hardware && typeof item.hardware === 'object' ? item.hardware : {},
                        software: item.software && typeof item.software === 'object' ? item.software : {},
                        action_taken: item.action_taken || '',
                        accessoryList: rawAccessories.map((accessory, accessoryIndex) => ({
                            id: accessory.id || `accessory-${item.id}-${accessoryIndex}`,
                            name: accessory.name || '',
                            model: accessory.model || '',
                            serial: accessory.serial || '',
                            owner_employee_key: person.employee_key
                        }))
                    };
                });
                person.supabaseEquipmentIds = person.equipmentProfiles.map(profile => profile.supabaseEquipmentId);
            }));
        }

        await saveAreaPeopleData();
        if (window.selectedArea) renderAreaPeople(window.selectedArea);
    } catch (error) {
        console.error('No se pudieron cargar las personas guardadas.', error);
    }
}

loadAreaPeopleData();
Object.values(AREA_PEOPLE).forEach(people => people.forEach(person => delete person.correo));

window.addEventListener('beforeunload', event => {
    persistOpenEquipmentProfileSync();
});

function renameActiveInventorySheet() {
    commitActiveEdit();
    ensureInventoryBySheetModel();
    const currentKey = getActiveInventorySheetKey();
    if (!currentKey) return;

    const newName = prompt('Nuevo nombre de la hoja:', currentKey);
    if (newName === null) return;

    const sanitized = sanitizeExcelWorksheetName(String(newName).trim());
    if (!sanitized) {
        alert('El nombre de hoja no puede estar vacío ni contener caracteres inválidos.');
        return;
    }

    if (sanitized === currentKey) return;
    const sheets = window.APP_MODEL.inventoryBySheet || {};
    if (sheets[sanitized]) {
        alert('Ya existe una hoja con ese nombre. Usa otro nombre.');
        return;
    }

    sheets[sanitized] = sheets[currentKey];
    delete sheets[currentKey];
    window.APP_MODEL.activeInventorySheet = sanitized;
    if (selectedAnalysisSheet === currentKey) {
        selectedAnalysisSheet = sanitized;
    }

    saveInventoryToStorage();
    renderInventory();
    renderAnalysis();
    renderAlerts();
    renderReportes();
}

function deleteActiveInventorySheet() {
    commitActiveEdit();
    ensureInventoryBySheetModel();
    const currentKey = getActiveInventorySheetKey();
    const sheets = window.APP_MODEL.inventoryBySheet || {};
    if (!currentKey || !sheets[currentKey]) return;

    if (Object.keys(sheets).length <= 1) {
        if (!confirm('Sólo queda una hoja. ¿Deseas vaciar su contenido en lugar de eliminarla?')) {
            return;
        }
        sheets[currentKey] = blankSheetBundle();
        saveInventoryToStorage();
        renderInventory();
        renderAnalysis();
        renderAlerts();
        renderReportes();
        return;
    }

    if (!confirm(`Eliminar la hoja «${currentKey}» y todo su contenido?`)) {
        return;
    }

    delete sheets[currentKey];
    const remainingKeys = Object.keys(sheets);
    window.APP_MODEL.activeInventorySheet = remainingKeys[0] || null;
    if (selectedAnalysisSheet === currentKey) {
        selectedAnalysisSheet = 'all';
    }

    saveInventoryToStorage();
    renderInventory();
    renderAnalysis();
    renderAlerts();
    renderReportes();
}

function scrollInventoryDown() {
    const container = document.querySelector('#inventory-panel .tabla-body');
    if (!container) return;
    container.scrollBy({ top: 300, behavior: 'smooth' });
}

function scrollAnalysisDown() {
    const container = document.querySelector('#analysis-panel .analysis-scroll-container');
    if (!container) return;
    container.scrollBy({ top: 300, behavior: 'smooth' });
}

function scrollAnalysisUp() {
    const container = document.querySelector('#analysis-panel .analysis-scroll-container');
    if (!container) return;
    container.scrollBy({ top: -300, behavior: 'smooth' });
}

function scrollAlertsDown() {
    const container = document.querySelector('#alerts-panel .alerts-scroll-container');
    if (!container) return;
    container.scrollBy({ top: 300, behavior: 'smooth' });
}

function scrollAlertsUp() {
    const container = document.querySelector('#alerts-panel .alerts-scroll-container');
    if (!container) return;
    container.scrollBy({ top: -300, behavior: 'smooth' });
}

/** Evita que texto del chat o tablas inserte HTML malicioso (seguridad XSS) */
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function columnUsesDateInput(colKey, fieldMap) {
    const int = internalFieldForColumnKey(colKey, fieldMap);
    if (int === 'fechaDevolucion' || int === 'fechaEntrega') {
        return true;
    }
    return isDateLikeColumnKey(colKey);
}

/** Dibuja la tabla del inventario, pestañas de hojas y enlaza edición de celdas */
function renderInventory() {
    const container = document.querySelector('#inventory-panel .tabla-body');
    const tabsEl = document.getElementById('inventory-sheet-tabs');
    if (!container || !window.APP_MODEL) return;

    ensureInventoryBySheetModel();
    const bySheet = window.APP_MODEL.inventoryBySheet;
    const active = getActiveInventorySheetKey();
    const bundle = getActiveSheetBundle();
    const columns = bundle.columns;
    const fieldMap = bundle.fieldMap;
    const inventory = bundle.rows;

    if (tabsEl) {
        tabsEl.innerHTML = '';
        const keys = Object.keys(bySheet);
        keys.forEach(name => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'sheet-tab' + (name === active ? ' active' : '');
            btn.textContent = name;
            btn.title = 'Ver datos de la hoja «' + name + '»';
            btn.addEventListener('click', () => setActiveInventorySheet(name));
            tabsEl.appendChild(btn);
        });
        tabsEl.style.display = keys.length ? 'flex' : 'none';
    }

    if (inventory.length === 0) {
        const safeSheet = String(active).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        container.innerHTML = '<p class="inventory-empty-msg">No hay filas en la hoja «' + safeSheet + '». Cambia de pestaña, pulsa «+ Nueva hoja» o «Añadir registro».</p>';
        renderMetrics();
        renderAnalysis();
        renderAlerts();
        renderReportes();
        return;
    }

    const headerCells = columns.map(h => `<th>${escapeHtml(h)}</th>`).join('') + '<th>Eliminar</th>';

    const rows = inventory.map((item, index) => {
        const cells = columns.map((colKey, ci) => {
            const val = item[colKey] != null ? String(item[colKey]) : '';
            const internal = internalFieldForColumnKey(colKey, fieldMap);
            if (internal === 'estado') {
                const resolved = /resuelto|solucionado|entregado|ok|activo/i.test(val);
                return `<td><select data-index="${index}" data-col-i="${ci}">` +
                    `<option value="Resuelto"${resolved ? ' selected' : ''}>Resuelto</option>` +
                    `<option value="No resuelto"${!resolved ? ' selected' : ''}>No resuelto</option>` +
                `</select></td>`;
            }
            if (columnUsesDateInput(colKey, fieldMap)) {
                return `<td><input type="date" data-index="${index}" data-col-i="${ci}" value="${formatDateForInput(val)}"></td>`;
            }
            return `<td contenteditable="true" data-index="${index}" data-col-i="${ci}">${escapeHtml(val)}</td>`;
        }).join('');
        return `<tr>${cells}<td><button class="delete-row" onclick="deleteInventoryRow(${index})">✕</button></td></tr>`;
    }).join('');

    container.innerHTML = `
        <table class="inventory-table">
            <thead>
                <tr>${headerCells}</tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;

    const editableCells = container.querySelectorAll('td[contenteditable]');
    editableCells.forEach(cell => {
        const saveCell = () => {
            const index = parseInt(cell.dataset.index, 10);
            const colI = parseInt(cell.dataset.colI, 10);
            const value = cell.innerText.trim();
            updateInventoryItem(index, colI, value);
        };

        cell.addEventListener('blur', saveCell);
        cell.addEventListener('input', () => {
            const index = parseInt(cell.dataset.index, 10);
            const colI = parseInt(cell.dataset.colI, 10);
            queueInventoryItemSave(index, colI, cell.innerText.trim());
        });
    });

    const selectInputs = container.querySelectorAll('select[data-index]');
    selectInputs.forEach(select => {
        const saveSelect = () => {
            const index = parseInt(select.dataset.index, 10);
            const colI = parseInt(select.dataset.colI, 10);
            updateInventoryItem(index, colI, select.value);
        };

        select.addEventListener('change', saveSelect);
    });

    const dateInputs = container.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        const saveInput = () => {
            const index = parseInt(input.dataset.index, 10);
            const colI = parseInt(input.dataset.colI, 10);
            const value = input.value ? formatDateEs(parseDate(input.value)) : '';
            updateInventoryItem(index, colI, value);
        };

        input.addEventListener('change', saveInput);
        input.addEventListener('blur', saveInput);
    });

    renderMetrics();
    renderAnalysis();
    renderAlerts();
    renderReportes();
}

let appInitialized = false;

async function initializeApp() {
    if (appInitialized) return;
    appInitialized = true;

    await loadInventoryFromStorage();
    initializeCharts();
    renderInventory();
    renderMetrics();
    renderAnalysis();
    renderAlerts();
    renderReportes();
    await updateSupabaseStatusIndicator();

    window.addEventListener('beforeunload', () => {
        saveInventoryToStorage();
        void saveInventoryToSupabase();
    });

    // Agregar funcionalidad de Enter en los campos de login
    const userInput = document.getElementById("usuario");
    const passwordInput = document.getElementById("password");
    if (userInput) {
        userInput.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                login();
            }
        });
    }
    if (passwordInput) {
        passwordInput.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                login();
            }
        });
    }

    // Evento para redimensionar gráficos en responsive
    window.addEventListener('resize', () => {
        if (analysisTrendChart) analysisTrendChart.resize();
        if (analysisTypeChart) analysisTypeChart.resize();
        if (reportChart) reportChart.resize();
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);
if (document.readyState !== 'loading') {
    void initializeApp();
}
