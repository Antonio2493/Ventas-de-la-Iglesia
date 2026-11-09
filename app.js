let appState = {
    registros: [],
    inversionesPorFecha: {},
    verTodoHistorial: false
};

const formatCRC = (amount) => '₡' + Math.round(amount).toLocaleString('es-CR');

// Función para formatear la fecha a estilo latino (DD/MM/AAAA)
const formatearFechaVisual = (fechaStr) => {
    if (!fechaStr) return '';
    const partes = fechaStr.split('-');
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return fechaStr;
};

window.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date().toISOString().split('T')[0];
    const fechaMaestra = document.getElementById('fecha-maestra');

    if (fechaMaestra) {
        fechaMaestra.value = hoy;
        // Cuando cambie la fecha maestra, actualizamos todo en automático al instante
        fechaMaestra.addEventListener('change', () => {
            actualizarInterfazPorFechaMaestra();
            renderApp();
        });
    }

    const btnVerTodo = document.getElementById('btn-ver-todo');
    if (btnVerTodo) {
        btnVerTodo.addEventListener('click', () => {
            appState.verTodoHistorial = !appState.verTodoHistorial;
            btnVerTodo.classList.toggle('active', appState.verTodoHistorial);
            btnVerTodo.innerText = appState.verTodoHistorial ? '📅 Usar Fecha Maestra' : '📂 Ver Historial Completo';
            
            // Deshabilitar o habilitar el selector maestro
            if (fechaMaestra) fechaMaestra.disabled = appState.verTodoHistorial;
            
            // Ocultar o mostrar formularios y tarjetas de inversión/stock según el modo
            const secReg = document.getElementById('seccion-registro');
            const secInv = document.getElementById('seccion-inversion');
            const tarjetaStock = document.getElementById('tarjeta-stock');
            const tarjetaInvResumen = document.getElementById('tarjeta-inversion-resumen');

            if (secReg) secReg.style.display = appState.verTodoHistorial ? 'none' : 'block';
            if (secInv) secInv.style.display = appState.verTodoHistorial ? 'none' : 'block';
            if (tarjetaStock) tarjetaStock.style.display = appState.verTodoHistorial ? 'none' : 'block';
            if (tarjetaInvResumen) tarjetaInvResumen.style.display = appState.verTodoHistorial ? 'none' : 'block';

            renderApp();
        });
    }

    const formVenta = document.getElementById('form-venta');
    if (formVenta) {
        formVenta.addEventListener('submit', guardarRegistroNube);
    }

    const btnGuardarInversion = document.getElementById('btn-guardar-inversion');
    if (btnGuardarInversion) {
        btnGuardarInversion.addEventListener('click', guardarInversionNube);
    }

    if (window.db) {
        sincronizarDatosIglesia();
    } else {
        window.addEventListener('firebase-ready', sincronizarDatosIglesia);
    }
});

function sincronizarDatosIglesia() {
    window.db.collection("iglesia_ventas_diarias").onSnapshot((snapshot) => {
        appState.registros = [];
        snapshot.forEach((docSnap) => {
            appState.registros.push({ idDoc: docSnap.id, ...docSnap.data() });
        });
        appState.registros.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        renderApp();
    });

    window.db.collection("iglesia_inversiones_diarias").onSnapshot((snapshot) => {
        appState.inversionesPorFecha = {};
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            appState.inversionesPorFecha[data.fecha] = {
                inversion: data.inversion || 0,
                producto: data.producto || '',
                cantidadPreparada: data.cantidadPreparada || 0
            };
        });
        actualizarInterfazPorFechaMaestra();
        renderApp();
    });
}

function actualizarInterfazPorFechaMaestra() {
    const fechaMaestraEl = document.getElementById('fecha-maestra');
    if (!fechaMaestraEl) return;
    const fechaMaestra = fechaMaestraEl.value;
    
    // Actualizar texto guía en la tarjeta de inversión
    const labelFechaActiva = document.getElementById('label-fecha-activa');
    if (labelFechaActiva) {
        labelFechaActiva.innerText = formatearFechaVisual(fechaMaestra);
    }

    // Cargar datos de inversión de ese día en los inputs correspondientes
    const info = appState.inversionesPorFecha[fechaMaestra] || { inversion: 0, producto: '', cantidadPreparada: 0 };
    const inputInversionDia = document.getElementById('input-inversion-dia');
    const inputInversionProducto = document.getElementById('input-inversion-producto');
    const inputInversionCantidad = document.getElementById('input-inversion-cantidad');

    if (inputInversionDia) inputInversionDia.value = info.inversion;
    if (inputInversionProducto) inputInversionProducto.value = info.producto;
    if (inputInversionCantidad) inputInversionCantidad.value = info.cantidadPreparada;
}

async function guardarRegistroNube(e) {
    e.preventDefault();
    const fechaMaestraEl = document.getElementById('fecha-maestra');
    if (!fechaMaestraEl) return;
    const fechaMaestra = fechaMaestraEl.value;

    const hermano = document.getElementById('venta-hermano').value.trim();
    const concepto = document.getElementById('venta-concepto').value.trim();
    const cantidad = parseInt(document.getElementById('venta-cantidad').value) || 1;
    const pago = parseFloat(document.getElementById('venta-pago').value) || 0;
    const debe = parseFloat(document.getElementById('venta-debe').value) || 0;

    if (hermano && concepto) {
        try {
            await window.db.collection("iglesia_ventas_diarias").add({
                fecha: fechaMaestra,
                hermano,
                concepto,
                cantidad,
                pago,
                debe,
                timestamp: Date.now()
            });

            document.getElementById('venta-hermano').value = '';
            document.getElementById('venta-concepto').value = '';
            document.getElementById('venta-cantidad').value = '1';
            document.getElementById('venta-pago').value = '0';
            document.getElementById('venta-debe').value = '0';
        } catch (error) {
            console.error("Error al guardar venta:", error);
        }
    }
}

async function guardarInversionNube() {
    const fechaMaestraEl = document.getElementById('fecha-maestra');
    if (!fechaMaestraEl) return;
    const fechaMaestra = fechaMaestraEl.value;

    const inversionVal = parseFloat(document.getElementById('input-inversion-dia').value) || 0;
    const productoVal = document.getElementById('input-inversion-producto').value.trim();
    const cantidadPrepVal = parseInt(document.getElementById('input-inversion-cantidad').value) || 0;
    const docId = `inv_${fechaMaestra}`;

    if (!fechaMaestra) {
        alert("Por favor selecciona una fecha maestra.");
        return;
    }

    try {
        await window.db.collection("iglesia_inversiones_diarias").doc(docId).set({
            fecha: fechaMaestra,
            inversion: inversionVal,
            producto: productoVal,
            cantidadPreparada: cantidadPrepVal,
            timestamp: Date.now()
        });
        alert(`¡Inversión y stock guardados para la fecha ${formatearFechaVisual(fechaMaestra)}!`);
    } catch (error) {
        console.error("Error al guardar inversión:", error);
        alert("Hubo un error al guardar la inversión.");
    }
}

function renderApp() {
    const fechaMaestraEl = document.getElementById('fecha-maestra');
    const fechaMaestra = fechaMaestraEl ? fechaMaestraEl.value : '';
    const tbody = document.getElementById('lista-ventas');
    if (!tbody) return;

    tbody.innerHTML = '';

    let registrosFiltrados = appState.registros;
    if (!appState.verTodoHistorial) {
        registrosFiltrados = appState.registros.filter(item => item.fecha === fechaMaestra);
    }

    let totalPagado = 0;
    let totalDebe = 0;
    let totalUnidadesVendidas = 0;

    if (registrosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#888;">No hay registros para esta fecha.</td></tr>';
    } else {
        registrosFiltrados.forEach(item => {
            const cantidadVal = item.cantidad || 1;
            const pagoVal = item.pago || 0;
            const debeVal = item.debe || 0;
            totalPagado += pagoVal;
            totalDebe += debeVal;
            totalUnidadesVendidas += cantidadVal;

            const estadoTexto = debeVal > 0 ? "Debe ❌" : "Pagado ✅";
            const badgeClass = debeVal > 0 ? "debe" : "pagado";

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatearFechaVisual(item.fecha)}</td>
                <td><strong>${item.hermano}</strong></td>
                <td>${item.concepto}</td>
                <td style="text-align: center; font-weight: 600;">${cantidadVal}</td>
                <td style="color: var(--success); font-weight: 600;">${formatCRC(pagoVal)}</td>
                <td style="color: var(--danger); font-weight: 600;">${formatCRC(debeVal)}</td>
                <td><span class="badge ${badgeClass}">${estadoTexto}</span></td>
                <td>
                    <div class="acciones-container" id="acciones-${item.idDoc}"></div>
                    <button class="btn-action btn-delete" onclick="eliminarRegistroNube('${item.idDoc}')">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);

            const contenedorAcciones = document.getElementById(`acciones-${item.idDoc}`);
            if (debeVal > 0 && contenedorAcciones) {
                const btnPagar = document.createElement('button');
                btnPagar.className = 'btn-action btn-pagar';
                btnPagar.innerText = 'Marcar Pagado';
                btnPagar.onclick = () => marcarComoPagado(item.idDoc, pagoVal, debeVal);
                contenedorAcciones.appendChild(btnPagar);
            }
        });
    }

    const datosInversionDia = appState.inversionesPorFecha[fechaMaestra] || { inversion: 0, producto: 'Unidades', cantidadPreparada: 0 };
    const inversionDelDia = datosInversionDia.inversion;
    const cantidadPreparada = datosInversionDia.cantidadPreparada;
    const nombreProducto = datosInversionDia.producto || 'Unidades';

    const balanceNeto = totalPagado - inversionDelDia;

    document.getElementById('total-pagado').innerText = formatCRC(totalPagado);
    document.getElementById('total-debe').innerText = formatCRC(totalDebe);
    document.getElementById('total-inversion-view').innerText = formatCRC(inversionDelDia);
    document.getElementById('total-stock-view').innerText = `${totalUnidadesVendidas} / ${cantidadPreparada} (${nombreProducto})`;

    const labelBalance = document.getElementById('titulo-balance');
    const elemBalance = document.getElementById('total-balance');
    elemBalance.innerText = formatCRC(balanceNeto);

    if (balanceNeto >= 0) {
        labelBalance.innerText = "Ganancia Neta 📈";
        elemBalance.style.color = "#059669";
    } else {
        labelBalance.innerText = "Pérdida Neta 📉";
        elemBalance.style.color = "#dc2626";
    }
}

window.marcarComoPagado = async function(idDoc, pagoActual, debeActual) {
    if (confirm("¿Marcar este saldo pendiente como PAGADO?")) {
        try {
            await window.db.collection("iglesia_ventas_diarias").doc(idDoc).update({
                pago: pagoActual + debeActual,
                debe: 0
            });
        } catch (error) {
            console.error("Error al actualizar el pago:", error);
        }
    }
};

window.eliminarRegistroNube = async function(idDoc) {
    if (confirm("¿Estás seguro de eliminar este registro?")) {
        try {
            await window.db.collection("iglesia_ventas_diarias").doc(idDoc).delete();
        } catch (error) {
            console.error("Error al eliminar el documento:", error);
        }
    }
};