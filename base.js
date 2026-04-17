/* =====================================================
   504HNFITNESS — base.js
   ===================================================== */

const { useState } = React;

/* ─── DATOS MOCK ─────────────────────────────────────
   Reemplazar con llamadas a Supabase (ver instrucciones)
   ───────────────────────────────────────────────────── */
const CLIENTES_MOCK = [
  { id:1, nombre:'Carlos Mejía',    plan:'Mensual',    estado:'al-dia',  vence:'2025-05-10', telefono:'+504 9841-2200' },
  { id:2, nombre:'Sofía Andrade',   plan:'Trimestral', estado:'al-dia',  vence:'2025-06-22', telefono:'+504 9922-3310' },
  { id:3, nombre:'René Velásquez',  plan:'Mensual',    estado:'vencido', vence:'2025-04-01', telefono:'+504 9700-4455' },
  { id:4, nombre:'Mariela Torres',  plan:'Anual',      estado:'al-dia',  vence:'2026-01-15', telefono:'+504 9533-8810' },
  { id:5, nombre:'Diego Funez',     plan:'Mensual',    estado:'proximo', vence:'2025-04-20', telefono:'+504 9612-5500' },
  { id:6, nombre:'Karla Reconcos',  plan:'Trimestral', estado:'al-dia',  vence:'2025-07-03', telefono:'+504 9988-2200' },
  { id:7, nombre:'Omar Cáceres',    plan:'Mensual',    estado:'vencido', vence:'2025-03-28', telefono:'+504 9855-6601' },
];

/* Precios sugeridos por plan (editar según tu negocio) */
const PLAN_PRICES = {
  Diario: 50,
  Mensual: 500,
  Trimestral: 1350,
  Anual: 4800,
};

/* ============================================================
   MODAL DE CONFIRMACIÓN DE ELIMINACIÓN
   ============================================================ */
const ConfirmModal = ({ nombre, onConfirm, onCancel }) => (
  <div className="modal-overlay" onClick={onCancel}>
    <div className="modal-box" onClick={e => e.stopPropagation()}>
      <div className="modal-title">¿ELIMINAR CLIENTE?</div>
      <div className="modal-subtitle">
        Esta acción no se puede deshacer.
      </div>
      <p style={{fontSize:14, color:'var(--white)', marginBottom:8}}>
        Vas a eliminar a <strong style={{color:'var(--gold)'}}>{nombre}</strong> del sistema.
      </p>
      <p style={{fontSize:13, color:'var(--gray-400)'}}>
        Todos sus datos y membresía serán removidos permanentemente.
      </p>
      <div className="modal-actions">
        <button className="btn-danger" onClick={onConfirm}>Sí, eliminar</button>
        <button className="btn-outline" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  </div>
);

/* ============================================================
   MODAL DE RECIBO DIGITAL
   ============================================================ */
const ReceiptModal = ({ client, onClose }) => {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    monto: PLAN_PRICES[client.plan] || '',
    metodo: 'Efectivo',
    fecha: today,
    validoHasta: client.vence,
  });

  const handlePrint = () => {
    const receiptNo = 'REC-' + Date.now().toString().slice(-6);
    const fechaDisplay = new Date(form.fecha + 'T12:00:00').toLocaleDateString('es-HN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    const validoDisplay = form.validoHasta
      ? new Date(form.validoHasta + 'T12:00:00').toLocaleDateString('es-HN', { year:'numeric', month:'long', day:'numeric' })
      : '—';
    const montoDisplay = parseFloat(form.monto).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo ${receiptNo} — ${client.nombre}</title>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@700&display=swap" rel="stylesheet">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Barlow', sans-serif;
      background: #f0f0f0;
      display: flex; justify-content: center;
      padding: 40px 20px; min-height: 100vh;
    }
    .receipt {
      background: #fff; max-width: 500px; width: 100%;
      padding: 52px 44px; box-shadow: 0 4px 32px rgba(0,0,0,0.12);
      height: fit-content;
    }
    /* ENCABEZADO */
    .logo-row { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
    .logo-icon {
      width: 36px; height: 36px; background: #0a0a0a;
      clip-path: polygon(20% 0%,80% 0%,100% 20%,100% 80%,80% 100%,20% 100%,0% 80%,0% 20%);
      display: flex; align-items: center; justify-content: center;
      color: #f5c518; font-size: 18px;
    }
    .logo-text { font-family: 'Bebas Neue', sans-serif; font-size: 30px; letter-spacing: 0.04em; color: #0a0a0a; }
    .tagline {
      font-family: 'Barlow Condensed', sans-serif; font-size: 10px; font-weight: 700;
      letter-spacing: 0.22em; text-transform: uppercase; color: #888; margin-bottom: 20px;
    }
    /* NÚMERO DE RECIBO */
    .receipt-badge {
      display: inline-flex; align-items: center; gap: 8px;
      background: #0a0a0a; padding: 6px 14px; margin-bottom: 24px;
    }
    .receipt-badge-label {
      font-family: 'Barlow Condensed', sans-serif; font-size: 10px; font-weight: 700;
      letter-spacing: 0.2em; text-transform: uppercase; color: #888;
    }
    .receipt-badge-no {
      font-family: 'Bebas Neue', sans-serif; font-size: 16px; letter-spacing: 0.1em; color: #f5c518;
    }
    /* DIVISOR DORADO */
    .divider { height: 3px; background: linear-gradient(90deg, #f5c518, #c9a012 70%, transparent); margin: 20px 0; }
    /* SECCIÓN */
    .section-label {
      font-family: 'Barlow Condensed', sans-serif; font-size: 10px; font-weight: 700;
      letter-spacing: 0.22em; text-transform: uppercase; color: #aaa; margin-bottom: 12px;
    }
    /* FILA DE DATOS */
    .row {
      display: flex; justify-content: space-between; align-items: baseline;
      padding: 9px 0; border-bottom: 1px solid #f0f0f0;
    }
    .row:last-child { border-bottom: none; }
    .row-label { font-size: 13px; color: #777; }
    .row-value { font-size: 13px; font-weight: 700; color: #111; text-align: right; max-width: 60%; }
    /* TOTAL */
    .total-box {
      background: #0a0a0a; padding: 20px 24px; margin-top: 20px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .total-label {
      font-family: 'Barlow Condensed', sans-serif; font-size: 12px; font-weight: 700;
      letter-spacing: 0.2em; text-transform: uppercase; color: #aaa;
    }
    .total-amount { font-family: 'Bebas Neue', sans-serif; font-size: 38px; color: #f5c518; }
    .total-currency { font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 700; color: #888; margin-right: 4px; }
    /* ESTADO */
    .paid-badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(56,161,105,0.12); border: 1px solid rgba(56,161,105,0.3);
      color: #38a169; font-family: 'Barlow Condensed', sans-serif;
      font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;
      padding: 3px 10px; margin-top: 16px;
    }
    /* PIE */
    .footer { text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px dashed #ddd; }
    .footer-gym { font-family: 'Bebas Neue', sans-serif; font-size: 18px; color: #0a0a0a; letter-spacing: 0.04em; }
    .footer-text { font-size: 11px; color: #aaa; margin-top: 4px; line-height: 1.7; }
    @media print {
      body { background: #fff; padding: 0; display: block; }
      .receipt { box-shadow: none; max-width: 100%; padding: 32px; }
    }
  </style>
</head>
<body>
<div class="receipt">
  <!-- ENCABEZADO -->
  <div class="logo-row">
    <div class="logo-icon">⚡</div>
    <div class="logo-text">504HNFITNESS</div>
  </div>
  <div class="tagline">Centro de Entrenamiento · Tegucigalpa, Honduras</div>

  <div class="receipt-badge">
    <span class="receipt-badge-label">Recibo N°</span>
    <span class="receipt-badge-no">${receiptNo}</span>
  </div>

  <div class="divider"></div>

  <!-- CLIENTE -->
  <div class="section-label">Datos del cliente</div>
  <div class="row">
    <span class="row-label">Nombre completo</span>
    <span class="row-value">${client.nombre}</span>
  </div>
  <div class="row">
    <span class="row-label">Teléfono</span>
    <span class="row-value">${client.telefono || '—'}</span>
  </div>

  <div class="divider"></div>

  <!-- PAGO -->
  <div class="section-label">Detalle del pago</div>
  <div class="row">
    <span class="row-label">Plan de membresía</span>
    <span class="row-value">${client.plan}</span>
  </div>
  <div class="row">
    <span class="row-label">Fecha de pago</span>
    <span class="row-value">${fechaDisplay}</span>
  </div>
  <div class="row">
    <span class="row-label">Membresía válida hasta</span>
    <span class="row-value">${validoDisplay}</span>
  </div>
  <div class="row">
    <span class="row-label">Método de pago</span>
    <span class="row-value">${form.metodo}</span>
  </div>

  <!-- ESTADO -->
  <div class="paid-badge">✓ &nbsp;Pago confirmado</div>

  <!-- TOTAL -->
  <div class="total-box">
    <span class="total-label">Total pagado</span>
    <div>
      <span class="total-currency">L.</span>
      <span class="total-amount">${montoDisplay}</span>
    </div>
  </div>

  <!-- PIE -->
  <div class="footer">
    <div class="footer-gym">⚡ 504HNfitness</div>
    <div class="footer-text">
      ¡Gracias por tu membresía!<br>
      Este documento es un comprobante oficial de pago.<br>
      Consultas: contacto@504hnfitness.com
    </div>
  </div>
</div>
<script>
  window.onload = function() {
    window.print();
  };
<\/script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=620,height=820');
    if (win) {
      win.document.write(html);
      win.document.close();
    } else {
      alert('Tu navegador bloqueó la ventana emergente. Permite pop-ups para este sitio e intenta de nuevo.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box wide" onClick={e => e.stopPropagation()}>

        {/* ENCABEZADO MODAL */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20}}>
          <div>
            <div className="modal-title">RECIBO DIGITAL</div>
            <div className="modal-subtitle">
              {client.nombre} &nbsp;·&nbsp; Plan {client.plan}
            </div>
          </div>
          <button onClick={onClose} style={{
            background:'none', border:'none', color:'var(--gray-400)',
            cursor:'pointer', fontSize:22, lineHeight:1, padding:'4px'
          }}>✕</button>
        </div>

        {/* FORMULARIO DE PAGO */}
        <div className="form-grid" style={{gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:4}}>
          <div className="field-group" style={{marginBottom:0}}>
            <label className="field-label">Monto cobrado (L.)</label>
            <input
              type="number" className="field-input"
              value={form.monto}
              onChange={e => setForm({...form, monto: e.target.value})}
              placeholder="0.00" min="0" step="0.01"
            />
          </div>
          <div className="field-group" style={{marginBottom:0}}>
            <label className="field-label">Método de pago</label>
            <select className="form-select" value={form.metodo} onChange={e => setForm({...form, metodo: e.target.value})}>
              <option>Efectivo</option>
              <option>Transferencia bancaria</option>
              <option>Tarjeta de débito</option>
              <option>Tarjeta de crédito</option>
              <option>Tigo Money</option>
              <option>Otro</option>
            </select>
          </div>
          <div className="field-group" style={{marginBottom:0}}>
            <label className="field-label">Fecha de pago</label>
            <input
              type="date" className="field-input"
              value={form.fecha}
              onChange={e => setForm({...form, fecha: e.target.value})}
            />
          </div>
          <div className="field-group" style={{marginBottom:0}}>
            <label className="field-label">Membresía válida hasta</label>
            <input
              type="date" className="field-input"
              value={form.validoHasta}
              onChange={e => setForm({...form, validoHasta: e.target.value})}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="btn-primary"
            onClick={handlePrint}
            disabled={!form.monto || parseFloat(form.monto) <= 0}
          >
            🖨&nbsp; Imprimir / Guardar PDF
          </button>
          <button className="btn-outline" onClick={onClose}>Cancelar</button>
        </div>
        <p className="modal-note">
          Se abrirá una ventana nueva con el recibo listo para imprimir o guardar como PDF desde tu navegador.
        </p>
      </div>
    </div>
  );
};

/* ============================================================
   LOGIN
   ============================================================ */
const LoginPage = ({ onLogin }) => {
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    /* TODO: Reemplazar con autenticación de Supabase Auth */
    if (pass === '504admin') {
      onLogin();
    } else {
      setError('Contraseña incorrecta. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="login-screen">
      <nav className="nav">
        <a href="index.html" className="nav-logo">
          <div className="nav-logo-icon">⚡</div>
          504HNFITNESS
        </a>
        <div className="nav-right">
          <span className="nav-tag">Panel Privado</span>
          <a href="index.html" className="nav-btn" style={{textDecoration:'none'}}>← Sitio público</a>
        </div>
      </nav>
      <div className="login-body">
        <div className="login-card fade-up">
          <div style={{marginBottom:24}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:'0.25em', textTransform:'uppercase', color:'var(--gold)', marginBottom:8, display:'flex', alignItems:'center', gap:10}}>
              <span style={{display:'block', width:20, height:1, background:'var(--gold)'}}></span>
              Solo administradores
            </div>
            <div className="login-title">ACCESO<br/>ADMIN</div>
            <div className="login-subtitle">Panel de control interno 504HNfitness</div>
          </div>
          {error && <div className="login-error">{error}</div>}
          <form onSubmit={handleLogin}>
            <div className="field-group">
              <label className="field-label">Contraseña</label>
              <input
                type="password" className="field-input"
                placeholder="Ingresa tu contraseña"
                value={pass} onChange={e => setPass(e.target.value)} autoFocus
              />
            </div>
            <button type="submit" className="login-submit">Entrar al panel →</button>
          </form>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   DASHBOARD
   ============================================================ */
const Dashboard = ({ clientes }) => {
  const activos    = clientes.filter(c => c.estado !== 'vencido').length;
  const vencidos   = clientes.filter(c => c.estado === 'vencido').length;
  const proximos   = clientes.filter(c => c.estado === 'proximo').length;
  const ingresosMes = activos * 500;

  const [egresos, setEgresos] = useState([]);
  const [egresoForm, setEgresoForm] = useState({ descripcion:'', fecha:'', monto:'' });
  const [showEgresoForm, setShowEgresoForm] = useState(false);
  const totalEgresos = egresos.reduce((s, e) => s + parseFloat(e.monto || 0), 0);

  const handleAddEgreso = () => {
    if (!egresoForm.descripcion || !egresoForm.fecha || !egresoForm.monto) return;
    setEgresos([...egresos, { ...egresoForm, id: Date.now() }]);
    setEgresoForm({ descripcion:'', fecha:'', monto:'' });
    setShowEgresoForm(false);
  };

  return (
    <div className="fade-up">
      <div className="admin-page-title">DASHBOARD</div>
      <div className="admin-page-sub">Resumen del mes · Datos en tiempo real (próximamente Supabase)</div>

      {/* MÉTRICAS */}
      <div className="metrics-grid">
        <div className="metric-card green fade-up fade-up-1">
          <div className="metric-label">Ingresos estimados</div>
          <div className="metric-value">L. {ingresosMes.toLocaleString()}</div>
          <div className="metric-change">Basado en clientes activos</div>
        </div>
        <div className="metric-card gold fade-up fade-up-2">
          <div className="metric-label">Clientes activos</div>
          <div className="metric-value">{activos}</div>
          <div className="metric-change">De {clientes.length} registrados</div>
        </div>
        <div className="metric-card red fade-up fade-up-3">
          <div className="metric-label">Pagos vencidos</div>
          <div className="metric-value">{vencidos}</div>
          <div className="metric-change">Requieren atención</div>
        </div>
        <div className="metric-card blue fade-up fade-up-4">
          <div className="metric-label">Próximos a vencer</div>
          <div className="metric-value">{proximos}</div>
          <div className="metric-change">En los próximos 7 días</div>
        </div>
      </div>

      {/* ALERTAS */}
      <div className="table-title" style={{marginBottom:16}}>⚠ Alertas de cobro</div>
      {clientes.filter(c => c.estado !== 'al-dia').map(c => (
        <div key={c.id} className={`alert-card ${c.estado === 'proximo' ? 'warn' : ''}`}>
          <div>
            <div className="alert-name">{c.nombre}</div>
            <div className="alert-detail">Plan {c.plan} · Vence {c.vence} · {c.telefono}</div>
          </div>
          <div style={{display:'flex', gap:8}}>
            <span className={`status-badge ${c.estado}`}>{c.estado === 'vencido' ? 'VENCIDO' : 'POR VENCER'}</span>
            <a
              href={`https://wa.me/${c.telefono.replace(/\D/g,'')}?text=Hola ${c.nombre.split(' ')[0]}, te recordamos que tu membresía en 504HNfitness está por vencer.`}
              target="_blank" rel="noreferrer"
              className="action-btn" style={{textDecoration:'none', display:'inline-flex', alignItems:'center'}}>
              💬 WhatsApp
            </a>
          </div>
        </div>
      ))}
      {clientes.filter(c => c.estado !== 'al-dia').length === 0 && (
        <div style={{color:'var(--gray-700)', fontSize:13, padding:'12px 0'}}>Sin alertas pendientes ✓</div>
      )}

      <div className="section-divider"></div>

      {/* EGRESOS */}
      <div className="table-title" style={{marginBottom:16}}>📉 Egresos del mes</div>

      {showEgresoForm && (
        <div className="form-panel fade-up">
          <div className="table-title" style={{marginBottom:16}}>+ Nuevo egreso</div>
          <div className="form-grid">
            <div className="field-group" style={{marginBottom:0}}>
              <label className="field-label">Descripción del pago</label>
              <input className="field-input" value={egresoForm.descripcion}
                onChange={e => setEgresoForm({...egresoForm, descripcion: e.target.value})}
                placeholder="Ej. Renta del local" />
            </div>
            <div className="field-group" style={{marginBottom:0}}>
              <label className="field-label">Fecha de pago</label>
              <input type="date" className="field-input" value={egresoForm.fecha}
                onChange={e => setEgresoForm({...egresoForm, fecha: e.target.value})} />
            </div>
            <div className="field-group" style={{marginBottom:0}}>
              <label className="field-label">Monto (Lempiras)</label>
              <input type="number" className="field-input" value={egresoForm.monto}
                onChange={e => setEgresoForm({...egresoForm, monto: e.target.value})}
                placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>
          <div style={{display:'flex', gap:12, marginTop:20}}>
            <button className="btn-primary" onClick={handleAddEgreso}>Guardar egreso</button>
            <button className="btn-outline" onClick={() => setShowEgresoForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">{egresos.length} registro{egresos.length !== 1 ? 's' : ''}</span>
          <button className="btn-primary" onClick={() => setShowEgresoForm(!showEgresoForm)}>+ Agregar egreso</button>
        </div>
        <div style={{overflowX:'auto'}}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Descripción del pago</th>
                <th>Fecha de pago</th>
                <th>Monto (L.)</th>
                <th>Acumulado (L.)</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {egresos.map((e, i) => {
                const acumulado = egresos.slice(0, i + 1).reduce((s, x) => s + parseFloat(x.monto || 0), 0);
                return (
                  <tr key={e.id}>
                    <td style={{color:'var(--gray-700)', fontFamily:"'Barlow Condensed',sans-serif"}}>{i + 1}</td>
                    <td style={{fontWeight:600}}>{e.descripcion}</td>
                    <td style={{color:'var(--gray-400)', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:'0.05em'}}>{e.fecha}</td>
                    <td style={{color:'var(--red)', fontFamily:"'Bebas Neue',sans-serif", fontSize:18}}>L. {parseFloat(e.monto).toLocaleString('es-HN', {minimumFractionDigits:2})}</td>
                    <td style={{color:'var(--gold)', fontFamily:"'Bebas Neue',sans-serif", fontSize:18}}>L. {acumulado.toLocaleString('es-HN', {minimumFractionDigits:2})}</td>
                    <td>
                      <button className="action-btn" onClick={() => setEgresos(egresos.filter(x => x.id !== e.id))}
                        style={{color:'var(--red)', borderColor:'rgba(229,62,62,0.3)'}}>✕</button>
                    </td>
                  </tr>
                );
              })}
              {egresos.length === 0 && (
                <tr><td colSpan={6} style={{textAlign:'center', padding:'32px', color:'var(--gray-700)'}}>Sin egresos registrados este mes</td></tr>
              )}
            </tbody>
            {egresos.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3} style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--gray-400)'}}>
                    TOTAL EGRESOS DEL MES
                  </td>
                  <td colSpan={3} style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:'var(--red)'}}>
                    L. {totalEgresos.toLocaleString('es-HN', {minimumFractionDigits:2})}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   GESTIÓN DE CLIENTES
   ============================================================ */
const FORM_EMPTY = { nombre:'', plan:'Mensual', telefono:'', estado:'al-dia', vence:'' };

const ClientesPanel = ({ clientes, setClientes }) => {
  const [search,   setSearch]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('add');   // 'add' | 'edit'
  const [editId,   setEditId]   = useState(null);
  const [form,     setForm]     = useState(FORM_EMPTY);

  /* Modales */
  const [confirmId,     setConfirmId]     = useState(null);  // id del cliente a eliminar
  const [receiptClient, setReceiptClient] = useState(null);  // cliente para recibo

  const estadoLabel = { 'al-dia':'AL DÍA', 'vencido':'VENCIDO', 'proximo':'POR VENCER' };

  const filtered = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.plan.toLowerCase().includes(search.toLowerCase())
  );

  /* Abrir formulario para AGREGAR */
  const openAddForm = () => {
    setForm(FORM_EMPTY);
    setFormMode('add');
    setEditId(null);
    setShowForm(true);
  };

  /* Abrir formulario para EDITAR */
  const openEditForm = (client) => {
    setForm({
      nombre:   client.nombre,
      plan:     client.plan,
      telefono: client.telefono,
      estado:   client.estado,
      vence:    client.vence,
    });
    setEditId(client.id);
    setFormMode('edit');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* Guardar (agregar o editar) */
  const handleSave = (e) => {
    e.preventDefault();
    if (!form.nombre || !form.vence) return;
    if (formMode === 'edit') {
      setClientes(clientes.map(c => c.id === editId ? { ...form, id: editId } : c));
    } else {
      setClientes([...clientes, { ...form, id: Date.now() }]);
    }
    setForm(FORM_EMPTY);
    setShowForm(false);
    setFormMode('add');
    setEditId(null);
  };

  /* Cancelar formulario */
  const handleCancelForm = () => {
    setShowForm(false);
    setFormMode('add');
    setEditId(null);
    setForm(FORM_EMPTY);
  };

  /* Confirmar eliminación */
  const handleDeleteConfirmed = () => {
    setClientes(clientes.filter(x => x.id !== confirmId));
    setConfirmId(null);
  };

  const clienteAEliminar = clientes.find(c => c.id === confirmId);

  return (
    <div className="fade-up">
      <div className="admin-page-title">CLIENTES</div>
      <div className="admin-page-sub">Gestión de membresías y pagos</div>

      {/* ── MODAL CONFIRMACIÓN ELIMINAR ── */}
      {confirmId && clienteAEliminar && (
        <ConfirmModal
          nombre={clienteAEliminar.nombre}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {/* ── MODAL RECIBO ── */}
      {receiptClient && (
        <ReceiptModal
          client={receiptClient}
          onClose={() => setReceiptClient(null)}
        />
      )}

      {/* ── FORMULARIO AGREGAR / EDITAR ── */}
      {showForm && (
        <div className="form-panel fade-up">
          <div className="table-title" style={{marginBottom:20}}>
            {formMode === 'edit' ? '✏ Editar cliente' : '+ Agregar cliente'}
          </div>
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="field-group" style={{marginBottom:0}}>
                <label className="field-label">Nombre completo</label>
                <input
                  className="field-input" value={form.nombre}
                  onChange={e => setForm({...form, nombre: e.target.value})}
                  placeholder="Ej. Juan Pérez" required
                />
              </div>
              <div className="field-group" style={{marginBottom:0}}>
                <label className="field-label">Teléfono</label>
                <input
                  className="field-input" value={form.telefono}
                  onChange={e => setForm({...form, telefono: e.target.value})}
                  placeholder="+504 9xxx-xxxx"
                />
              </div>
              <div className="field-group" style={{marginBottom:0}}>
                <label className="field-label">Plan</label>
                <select className="form-select" value={form.plan} onChange={e => setForm({...form, plan: e.target.value})}>
                  <option>Diario</option>
                  <option>Mensual</option>
                  <option>Trimestral</option>
                  <option>Anual</option>
                </select>
              </div>
              <div className="field-group" style={{marginBottom:0}}>
                <label className="field-label">Estado de pago</label>
                <select className="form-select" value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}>
                  <option value="al-dia">Al día</option>
                  <option value="proximo">Por vencer</option>
                  <option value="vencido">Vencido</option>
                </select>
              </div>
              <div className="field-group" style={{marginBottom:0}}>
                <label className="field-label">Fecha de vencimiento</label>
                <input
                  type="date" className="field-input" value={form.vence}
                  onChange={e => setForm({...form, vence: e.target.value})} required
                />
              </div>
            </div>
            <div style={{display:'flex', gap:12, marginTop:20}}>
              <button type="submit" className="btn-primary">
                {formMode === 'edit' ? 'Guardar cambios' : 'Guardar cliente'}
              </button>
              <button type="button" className="btn-outline" onClick={handleCancelForm}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* ── TABLA ── */}
      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">{filtered.length} cliente{filtered.length !== 1 ? 's' : ''}</span>
          <div style={{display:'flex', gap:12, alignItems:'center', flexWrap:'wrap'}}>
            <input
              className="table-search"
              placeholder="Buscar por nombre o plan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="btn-primary" onClick={openAddForm}>+ Agregar</button>
          </div>
        </div>

        <div style={{overflowX:'auto'}}>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Plan</th>
                <th>Vence</th>
                <th>Teléfono</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td style={{fontWeight:600}}>{c.nombre}</td>
                  <td style={{color:'var(--gray-400)'}}>{c.plan}</td>
                  <td style={{color:'var(--gray-400)', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:'0.05em'}}>{c.vence}</td>
                  <td style={{color:'var(--gray-400)'}}>{c.telefono}</td>
                  <td><span className={`status-badge ${c.estado}`}>{estadoLabel[c.estado]}</span></td>
                  <td>
                    <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                      {/* WhatsApp */}
                      <a
                        href={`https://wa.me/${(c.telefono||'').replace(/\D/g,'')}?text=Hola ${c.nombre.split(' ')[0]}!`}
                        target="_blank" rel="noreferrer"
                        className="action-btn" style={{textDecoration:'none'}}
                        title="Enviar WhatsApp"
                      >💬</a>

                      {/* Recibo */}
                      <button
                        className="action-btn"
                        onClick={() => setReceiptClient(c)}
                        title="Generar recibo"
                        style={{color:'var(--gold)', borderColor:'rgba(245,197,24,0.3)'}}
                      >🧾</button>

                      {/* Editar */}
                      <button
                        className="action-btn"
                        onClick={() => openEditForm(c)}
                        title="Editar cliente"
                        style={{color:'#4299e1', borderColor:'rgba(66,153,225,0.3)'}}
                      >✏</button>

                      {/* Eliminar (con confirmación) */}
                      <button
                        className="action-btn"
                        onClick={() => setConfirmId(c.id)}
                        title="Eliminar cliente"
                        style={{color:'var(--red)', borderColor:'rgba(229,62,62,0.3)'}}
                      >✕</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{textAlign:'center', padding:'32px', color:'var(--gray-700)'}}>
                    Sin resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   ADMIN PANEL WRAPPER
   ============================================================ */
const AdminPanel = ({ onLogout }) => {
  const [view, setView]       = useState('dashboard');
  const [clientes, setClientes] = useState(CLIENTES_MOCK);

  const navItems = [
    { id:'dashboard', icon:'📊', label:'Dashboard' },
    { id:'clientes',  icon:'👥', label:'Clientes' },
  ];

  return (
    <div>
      <nav className="nav">
        <a href="index.html" className="nav-logo">
          <div className="nav-logo-icon">⚡</div>
          504HNFITNESS
        </a>
        <div className="nav-right">
          <span className="nav-tag">Panel Admin</span>
          <button className="nav-btn" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </nav>
      <div className="admin-wrap">
        <aside className="sidebar">
          <div style={{flex:1}}>
            {navItems.map(item => (
              <button
                key={item.id}
                className={`sidebar-item ${view === item.id ? 'active' : ''}`}
                onClick={() => setView(item.id)}
              >
                <span className="sidebar-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
          <div className="sidebar-bottom">
            <button className="sidebar-item" style={{color:'var(--red)'}} onClick={onLogout}>
              <span className="sidebar-icon">🚪</span> Salir
            </button>
          </div>
        </aside>
        <main className="admin-main">
          {view === 'dashboard' && <Dashboard clientes={clientes} />}
          {view === 'clientes'  && <ClientesPanel clientes={clientes} setClientes={setClientes} />}
        </main>
      </div>
    </div>
  );
};

/* ============================================================
   APP ROOT
   ============================================================ */
const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  return isLoggedIn
    ? <AdminPanel onLogout={() => setIsLoggedIn(false)} />
    : <LoginPage  onLogin={() => setIsLoggedIn(true)} />;
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
