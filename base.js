/* =====================================================
   504HNFITNESS — base.js
   Supabase: kazzhlqneujpwjzefyeq.supabase.co
   ===================================================== */

const { useState, useEffect } = React;

/* ─── SUPABASE CLIENT ────────────────────────────────── */
const SUPABASE_URL = 'https://kazzhlqneujpwjzefyeq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthenpobHFuZXVqcHdqemVmeWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NTk4NzAsImV4cCI6MjA5MjAzNTg3MH0.oIGGDrhAwIzezi0Eo7rivY0J4N1VI8U1FJk8mZbjAM0';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ─── PRECIOS POR PLAN ───────────────────────────────── */
const PLAN_PRICES = {
  Diario:     50,
  Mensual:    500,
  Trimestral: 1350,
  Anual:      4800,
};

/* ─── DURACIONES POR PLAN ────────────────────────────── */
const PLAN_DURATION_LABEL = {
  Diario:     '1 día',
  Mensual:    '1 mes',
  Trimestral: '3 meses',
  Anual:      '12 meses',
};

/*
  calcVence: calcula la nueva fecha de vencimiento
  - Si fromDate es null → parte desde HOY (cliente vencido o nuevo)
  - Si fromDate es una fecha válida → extiende desde esa fecha (renovación al día)
*/
const calcVence = (plan, fromDate = null) => {
  const base = fromDate ? new Date(fromDate + 'T12:00:00') : new Date();
  const d = new Date(base);
  switch (plan) {
    case 'Diario':     d.setDate(d.getDate() + 1);        break;
    case 'Mensual':    d.setMonth(d.getMonth() + 1);      break;
    case 'Trimestral': d.setMonth(d.getMonth() + 3);      break;
    case 'Anual':      d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split('T')[0];
};

/*
  calcEstado: determina el estado de la membresía por fecha
  - vencido  → fecha ya pasó
  - proximo  → vence en los próximos 7 días
  - al-dia   → todo bien
*/
const calcEstado = (venceStr) => {
  if (!venceStr) return 'vencido';
  const hoy   = new Date(); hoy.setHours(0,0,0,0);
  const vence = new Date(venceStr + 'T00:00:00');
  const diff  = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return 'vencido';
  if (diff <= 7) return 'proximo';
  return 'al-dia';
};

/* Formatea fecha YYYY-MM-DD a texto legible */
const fmtFecha = (str) => {
  if (!str) return '—';
  return new Date(str + 'T12:00:00').toLocaleDateString('es-HN', { day:'numeric', month:'long', year:'numeric' });
};

const FORM_EMPTY = { nombre:'', plan:'Mensual', telefono:'' };

/* ============================================================
   PANTALLA DE CARGA
   ============================================================ */
const LoadingScreen = ({ mensaje = 'CARGANDO...' }) => (
  <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'var(--black)',gap:16}}>
    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,letterSpacing:'0.1em',color:'var(--gold)'}}>⚡ {mensaje}</div>
    <div style={{width:48,height:3,background:'var(--gray-800)',overflow:'hidden'}}>
      <div style={{height:'100%',background:'var(--gold)',animation:'loadBar 1.2s ease-in-out infinite'}}/>
    </div>
    <style>{`@keyframes loadBar{0%{width:0%;margin-left:0}50%{width:100%;margin-left:0}100%{width:0%;margin-left:100%}}`}</style>
  </div>
);

/* ============================================================
   TOAST NOTIFICACIÓN
   ============================================================ */
const Toast = ({ msg, tipo = 'ok', onClose }) => (
  <div style={{
    position:'fixed',bottom:28,right:28,zIndex:9000,
    background:tipo==='ok'?'var(--green)':'var(--red)',
    color:'#fff',padding:'12px 20px',
    fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:14,
    letterSpacing:'0.1em',textTransform:'uppercase',
    boxShadow:'0 4px 20px rgba(0,0,0,0.4)',animation:'fadeUp 0.3s ease both',
    display:'flex',alignItems:'center',gap:12
  }}>
    {tipo==='ok'?'✓':'✕'} {msg}
    <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,0.7)',cursor:'pointer',fontSize:16,lineHeight:1,padding:0}}>✕</button>
  </div>
);

/* ============================================================
   MODAL CONFIRMACIÓN ELIMINAR
   ============================================================ */
const ConfirmModal = ({ nombre, loading, onConfirm, onCancel }) => (
  <div className="modal-overlay" onClick={onCancel}>
    <div className="modal-box" onClick={e => e.stopPropagation()}>
      <div className="modal-title">¿ELIMINAR CLIENTE?</div>
      <div className="modal-subtitle">Esta acción no se puede deshacer.</div>
      <p style={{fontSize:14,color:'var(--white)',marginBottom:8}}>
        Vas a eliminar a <strong style={{color:'var(--gold)'}}>{nombre}</strong> del sistema.
      </p>
      <p style={{fontSize:13,color:'var(--gray-400)'}}>
        Todos sus datos y membresía serán removidos permanentemente de Supabase.
      </p>
      <div className="modal-actions">
        <button className="btn-danger" onClick={onConfirm} disabled={loading}>
          {loading ? 'Eliminando...' : 'Sí, eliminar'}
        </button>
        <button className="btn-outline" onClick={onCancel} disabled={loading}>Cancelar</button>
      </div>
    </div>
  </div>
);

/* ============================================================
   MODAL REGISTRAR PAGO + RECIBO DIGITAL
   Auto-extiende la membresía según el plan del cliente.
   ============================================================ */
const PagoModal = ({ client, onClose, onClientUpdated }) => {
  const today = new Date().toISOString().split('T')[0];

  // Si el cliente está vencido → renovación desde hoy
  // Si está al día o por vencer → renovación desde su fecha actual
  const isVencido = calcEstado(client.vence) === 'vencido';
  const newVence  = calcVence(client.plan, isVencido ? null : client.vence);

  const [form, setForm] = useState({
    monto:  PLAN_PRICES[client.plan] || '',
    metodo: 'Efectivo',
    fecha:  today,
  });
  const [guardando, setGuardando] = useState(false);

  /* ── Genera el HTML del recibo y lo imprime ── */
  const imprimirRecibo = (venceActualizado) => {
    const receiptNo    = 'REC-' + Date.now().toString().slice(-6);
    const fechaDisplay = new Date(form.fecha + 'T12:00:00').toLocaleDateString('es-HN', { year:'numeric', month:'long', day:'numeric' });
    const validoDisplay = new Date(venceActualizado + 'T12:00:00').toLocaleDateString('es-HN', { year:'numeric', month:'long', day:'numeric' });
    const montoDisplay = parseFloat(form.monto).toLocaleString('es-HN', { minimumFractionDigits:2 });

    const html = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8"><title>Recibo ${receiptNo}</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Barlow',sans-serif;background:#f0f0f0;display:flex;justify-content:center;padding:40px 20px}
.r{background:#fff;max-width:500px;width:100%;padding:52px 44px;box-shadow:0 4px 32px rgba(0,0,0,.12)}
.logo-row{display:flex;align-items:center;gap:12px;margin-bottom:4px}
.li{width:36px;height:36px;background:#0a0a0a;clip-path:polygon(20% 0%,80% 0%,100% 20%,100% 80%,80% 100%,20% 100%,0% 80%,0% 20%);display:flex;align-items:center;justify-content:center;color:#f5c518;font-size:18px}
.lt{font-family:'Bebas Neue',sans-serif;font-size:30px;letter-spacing:.04em;color:#0a0a0a}
.tag{font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#888;margin-bottom:20px}
.badge{display:inline-flex;align-items:center;gap:8px;background:#0a0a0a;padding:6px 14px;margin-bottom:24px}
.bl{font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#888}
.bn{font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:.1em;color:#f5c518}
.dv{height:3px;background:linear-gradient(90deg,#f5c518,#c9a012 70%,transparent);margin:20px 0}
.sl{font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#aaa;margin-bottom:12px}
.row{display:flex;justify-content:space-between;align-items:baseline;padding:9px 0;border-bottom:1px solid #f0f0f0}
.row:last-child{border-bottom:none}
.rl{font-size:13px;color:#777}.rv{font-size:13px;font-weight:700;color:#111;text-align:right;max-width:60%}
.rv.green{color:#38a169}
.tb{background:#0a0a0a;padding:20px 24px;margin-top:20px;display:flex;justify-content:space-between;align-items:center}
.tl{font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#aaa}
.ta{font-family:'Bebas Neue',sans-serif;font-size:38px;color:#f5c518}
.tc{font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;color:#888;margin-right:4px}
.paid{display:inline-flex;align-items:center;gap:6px;background:rgba(56,161,105,.12);border:1px solid rgba(56,161,105,.3);color:#38a169;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;padding:3px 10px;margin-top:16px}
.footer{text-align:center;margin-top:32px;padding-top:20px;border-top:1px dashed #ddd}
.fg{font-family:'Bebas Neue',sans-serif;font-size:18px;color:#0a0a0a;letter-spacing:.04em}
.ft{font-size:11px;color:#aaa;margin-top:4px;line-height:1.7}
@media print{body{background:#fff;padding:0;display:block}.r{box-shadow:none;max-width:100%;padding:32px}}
</style></head>
<body><div class="r">
<div class="logo-row"><div class="li">⚡</div><div class="lt">504HNFITNESS</div></div>
<div class="tag">Centro de Entrenamiento · Tegucigalpa, Honduras</div>
<div class="badge"><span class="bl">Recibo N°</span><span class="bn">${receiptNo}</span></div>
<div class="dv"></div>
<div class="sl">Datos del cliente</div>
<div class="row"><span class="rl">Nombre completo</span><span class="rv">${client.nombre}</span></div>
<div class="row"><span class="rl">Teléfono</span><span class="rv">${client.telefono || '—'}</span></div>
<div class="dv"></div>
<div class="sl">Detalle del pago</div>
<div class="row"><span class="rl">Plan de membresía</span><span class="rv">${client.plan}</span></div>
<div class="row"><span class="rl">Duración</span><span class="rv">${PLAN_DURATION_LABEL[client.plan]}</span></div>
<div class="row"><span class="rl">Fecha de pago</span><span class="rv">${fechaDisplay}</span></div>
<div class="row"><span class="rl">Membresía válida hasta</span><span class="rv green">${validoDisplay}</span></div>
<div class="row"><span class="rl">Método de pago</span><span class="rv">${form.metodo}</span></div>
<div class="paid">✓ &nbsp;Pago confirmado · Membresía renovada</div>
<div class="tb">
  <span class="tl">Total pagado</span>
  <div><span class="tc">L.</span><span class="ta">${montoDisplay}</span></div>
</div>
<div class="footer">
  <div class="fg">⚡ 504HNfitness</div>
  <div class="ft">¡Gracias por tu membresía!<br>Este documento es un comprobante oficial de pago.<br>Consultas: contacto@504hnfitness.com</div>
</div>
</div>
<script>window.onload=function(){window.print()}<\/script>
</body></html>`;

    const win = window.open('', '_blank', 'width=620,height=820');
    if (win) { win.document.write(html); win.document.close(); }
    else alert('Tu navegador bloqueó la ventana emergente. Permite pop-ups e intenta de nuevo.');
  };

  /* ── Confirmar pago: actualiza Supabase, extiende suscripción, imprime ── */
  const handleConfirmarPago = async () => {
    if (!form.monto || parseFloat(form.monto) <= 0) return;
    setGuardando(true);

    const nuevoEstado = 'al-dia';

    const { data, error } = await db
      .from('clientes')
      .update({ vence: newVence, estado: nuevoEstado })
      .eq('id', client.id)
      .select()
      .single();

    setGuardando(false);

    if (!error) {
      onClientUpdated(data);   // actualiza la tabla en tiempo real
      imprimirRecibo(newVence);
      onClose();
    } else {
      console.error('Error al registrar pago:', error);
      alert('Error al registrar el pago. Intenta de nuevo.');
    }
  };

  const estadoActual = calcEstado(client.vence);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box wide" onClick={e => e.stopPropagation()}>

        {/* ENCABEZADO */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
          <div>
            <div className="modal-title">REGISTRAR PAGO</div>
            <div className="modal-subtitle">{client.nombre} &nbsp;·&nbsp; Plan {client.plan}</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--gray-400)',cursor:'pointer',fontSize:22,lineHeight:1,padding:'4px'}}>✕</button>
        </div>

        {/* RESUMEN RENOVACIÓN */}
        <div style={{
          background:'var(--gray-900)', border:'1px solid var(--gray-800)',
          padding:'16px 20px', marginBottom:20, display:'flex', flexDirection:'column', gap:8
        }}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',color:'var(--gray-400)',marginBottom:4}}>
            Renovación automática de membresía
          </div>
          <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
            <div>
              <div style={{fontSize:11,color:'var(--gray-700)',marginBottom:2}}>ESTADO ACTUAL</div>
              <span className={`status-badge ${estadoActual}`}>
                {estadoActual==='al-dia'?'AL DÍA':estadoActual==='proximo'?'POR VENCER':'VENCIDO'}
              </span>
            </div>
            <div>
              <div style={{fontSize:11,color:'var(--gray-700)',marginBottom:2}}>VENCE ACTUALMENTE</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:700,color:'var(--gray-400)'}}>
                {fmtFecha(client.vence)}
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',color:'var(--gray-700)',fontSize:20}}>→</div>
            <div>
              <div style={{fontSize:11,color:'var(--gray-700)',marginBottom:2}}>NUEVA FECHA DE VENCIMIENTO</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:700,color:'var(--gold)'}}>
                {fmtFecha(newVence)}
              </div>
            </div>
          </div>
          {isVencido && (
            <div style={{fontSize:12,color:'#fc8181',marginTop:4}}>
              ⚠ La membresía está vencida — la renovación parte desde hoy.
            </div>
          )}
          {!isVencido && (
            <div style={{fontSize:12,color:'#68d391',marginTop:4}}>
              ✓ La membresía se extenderá {PLAN_DURATION_LABEL[client.plan]} desde la fecha actual de vencimiento.
            </div>
          )}
        </div>

        {/* FORMULARIO DE PAGO */}
        <div className="form-grid" style={{gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:4}}>
          <div className="field-group" style={{marginBottom:0}}>
            <label className="field-label">Monto cobrado (L.)</label>
            <input type="number" className="field-input" value={form.monto}
              onChange={e => setForm({...form, monto: e.target.value})}
              placeholder="0.00" min="0" step="0.01" />
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
            <input type="date" className="field-input" value={form.fecha}
              onChange={e => setForm({...form, fecha: e.target.value})} />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-primary" onClick={handleConfirmarPago}
            disabled={guardando || !form.monto || parseFloat(form.monto) <= 0}>
            {guardando ? 'Registrando...' : '✓ Confirmar pago e imprimir recibo'}
          </button>
          <button className="btn-outline" onClick={onClose} disabled={guardando}>Cancelar</button>
        </div>
        <p className="modal-note">
          Al confirmar: se actualiza la membresía en Supabase y se abre el recibo para imprimir o guardar como PDF.
        </p>
      </div>
    </div>
  );
};

/* ============================================================
   LOGIN
   ============================================================ */
const LoginPage = ({ onLogin }) => {
  const [pass,  setPass]  = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (pass === '504admin') { onLogin(); }
    else { setError('Contraseña incorrecta. Inténtalo de nuevo.'); }
  };

  return (
    <div className="login-screen">
      <nav className="nav">
        <a href="https://504hnfitness-public.vercel.app/" className="nav-logo">
          <div className="nav-logo-icon">⚡</div>504HNFITNESS
        </a>
        <div className="nav-right">
          <span className="nav-tag">Panel Privado</span>
          <a href="https://504hnfitness-public.vercel.app/" className="nav-btn" style={{textDecoration:'none'}}>← Sitio público</a>
        </div>
      </nav>
      <div className="login-body">
        <div className="login-card fade-up">
          <div style={{marginBottom:24}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,letterSpacing:'0.25em',textTransform:'uppercase',color:'var(--gold)',marginBottom:8,display:'flex',alignItems:'center',gap:10}}>
              <span style={{display:'block',width:20,height:1,background:'var(--gold)'}}></span>
              Solo administradores
            </div>
            <div className="login-title">ACCESO<br/>ADMIN</div>
            <div className="login-subtitle">Panel de control interno 504HNfitness</div>
          </div>
          {error && <div className="login-error">{error}</div>}
          <form onSubmit={handleLogin}>
            <div className="field-group">
              <label className="field-label">Contraseña</label>
              <input type="password" className="field-input"
                placeholder="Ingresa tu contraseña"
                value={pass} onChange={e => setPass(e.target.value)} autoFocus />
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
  const activos     = clientes.filter(c => c.estado !== 'vencido').length;
  const vencidos    = clientes.filter(c => c.estado === 'vencido').length;
  const proximos    = clientes.filter(c => c.estado === 'proximo').length;
  const ingresosMes = activos * 500;

  const [egresos,        setEgresos]        = useState([]);
  const [loadingEgresos, setLoadingEgresos] = useState(true);
  const [egresoForm,     setEgresoForm]     = useState({ descripcion:'', fecha:'', monto:'' });
  const [showEgresoForm, setShowEgresoForm] = useState(false);
  const [savingEgreso,   setSavingEgreso]   = useState(false);
  const [toast,          setToast]          = useState(null);

  const totalEgresos = egresos.reduce((s, e) => s + parseFloat(e.monto || 0), 0);

  const showToast = (msg, tipo = 'ok') => {
    setToast({ msg, tipo }); setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      const { data, error } = await db.from('egresos').select('*').order('fecha', { ascending: true });
      if (!error) setEgresos(data || []);
      setLoadingEgresos(false);
    };
    load();
  }, []);

  const handleAddEgreso = async () => {
    if (!egresoForm.descripcion || !egresoForm.fecha || !egresoForm.monto) return;
    setSavingEgreso(true);
    const { data, error } = await db
      .from('egresos')
      .insert([{ descripcion: egresoForm.descripcion, fecha: egresoForm.fecha, monto: parseFloat(egresoForm.monto) }])
      .select().single();
    setSavingEgreso(false);
    if (!error) {
      setEgresos([...egresos, data]);
      setEgresoForm({ descripcion:'', fecha:'', monto:'' });
      setShowEgresoForm(false);
      showToast('Egreso guardado');
    } else { showToast('Error al guardar', 'error'); console.error(error); }
  };

  const handleDeleteEgreso = async (id) => {
    const { error } = await db.from('egresos').delete().eq('id', id);
    if (!error) setEgresos(egresos.filter(x => x.id !== id));
    else { showToast('Error al eliminar', 'error'); console.error(error); }
  };

  return (
    <div className="fade-up">
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
      <div className="admin-page-title">DASHBOARD</div>
      <div className="admin-page-sub">Resumen general · Datos en tiempo real desde Supabase</div>

      <div className="metrics-grid">
        <div className="metric-card green fade-up fade-up-1">
          <div className="metric-label">Ingresos estimados</div>
          <div className="metric-value">L. {ingresosMes.toLocaleString('es-HN')}</div>
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

      <div className="table-title" style={{marginBottom:16}}>⚠ Alertas de cobro</div>
      {clientes.filter(c => c.estado !== 'al-dia').map(c => (
        <div key={c.id} className={`alert-card ${c.estado === 'proximo' ? 'warn' : ''}`}>
          <div>
            <div className="alert-name">{c.nombre}</div>
            <div className="alert-detail">Plan {c.plan} · Vence {fmtFecha(c.vence)} · {c.telefono}</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <span className={`status-badge ${c.estado}`}>{c.estado==='vencido'?'VENCIDO':'POR VENCER'}</span>
            <a href={`https://wa.me/${(c.telefono||'').replace(/\D/g,'')}?text=Hola ${c.nombre.split(' ')[0]}, te recordamos que tu membresía en 504HNfitness está por vencer.`}
               target="_blank" rel="noreferrer"
               className="action-btn" style={{textDecoration:'none',display:'inline-flex',alignItems:'center'}}>
              💬 WhatsApp
            </a>
          </div>
        </div>
      ))}
      {clientes.filter(c => c.estado !== 'al-dia').length === 0 && (
        <div style={{color:'var(--gray-700)',fontSize:13,padding:'12px 0'}}>Sin alertas pendientes ✓</div>
      )}

      <div className="section-divider"></div>

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
          <div style={{display:'flex',gap:12,marginTop:20}}>
            <button className="btn-primary" onClick={handleAddEgreso} disabled={savingEgreso}>
              {savingEgreso ? 'Guardando...' : 'Guardar egreso'}
            </button>
            <button className="btn-outline" onClick={() => setShowEgresoForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">
            {loadingEgresos ? 'Cargando...' : `${egresos.length} registro${egresos.length!==1?'s':''}`}
          </span>
          <button className="btn-primary" onClick={() => setShowEgresoForm(!showEgresoForm)}>+ Agregar egreso</button>
        </div>
        <div style={{overflowX:'auto'}}>
          <table>
            <thead>
              <tr><th>#</th><th>Descripción</th><th>Fecha</th><th>Monto (L.)</th><th>Acumulado (L.)</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {!loadingEgresos && egresos.map((e, i) => {
                const acumulado = egresos.slice(0, i+1).reduce((s,x) => s + parseFloat(x.monto||0), 0);
                return (
                  <tr key={e.id}>
                    <td style={{color:'var(--gray-700)',fontFamily:"'Barlow Condensed',sans-serif"}}>{i+1}</td>
                    <td style={{fontWeight:600}}>{e.descripcion}</td>
                    <td style={{color:'var(--gray-400)',fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:'0.05em'}}>{e.fecha}</td>
                    <td style={{color:'var(--red)',fontFamily:"'Bebas Neue',sans-serif",fontSize:18}}>L. {parseFloat(e.monto).toLocaleString('es-HN',{minimumFractionDigits:2})}</td>
                    <td style={{color:'var(--gold)',fontFamily:"'Bebas Neue',sans-serif",fontSize:18}}>L. {acumulado.toLocaleString('es-HN',{minimumFractionDigits:2})}</td>
                    <td>
                      <button className="action-btn" onClick={() => handleDeleteEgreso(e.id)}
                        style={{color:'var(--red)',borderColor:'rgba(229,62,62,0.3)'}}>✕</button>
                    </td>
                  </tr>
                );
              })}
              {!loadingEgresos && egresos.length === 0 && (
                <tr><td colSpan={6} style={{textAlign:'center',padding:'32px',color:'var(--gray-700)'}}>Sin egresos registrados</td></tr>
              )}
              {loadingEgresos && (
                <tr><td colSpan={6} style={{textAlign:'center',padding:'32px',color:'var(--gray-700)'}}>Cargando...</td></tr>
              )}
            </tbody>
            {!loadingEgresos && egresos.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3} style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray-400)'}}>TOTAL EGRESOS</td>
                  <td colSpan={3} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:'var(--red)'}}>
                    L. {totalEgresos.toLocaleString('es-HN',{minimumFractionDigits:2})}
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
const ClientesPanel = ({ clientes, setClientes }) => {
  const [search,     setSearch]     = useState('');
  const [showForm,   setShowForm]   = useState(false);
  const [formMode,   setFormMode]   = useState('add');   // 'add' | 'edit'
  const [editId,     setEditId]     = useState(null);
  const [form,       setForm]       = useState(FORM_EMPTY);
  const [saving,     setSaving]     = useState(false);
  const [confirmId,  setConfirmId]  = useState(null);
  const [deleting,   setDeleting]   = useState(false);
  const [pagoClient, setPagoClient] = useState(null);   // cliente para modal de pago
  const [toast,      setToast]      = useState(null);

  // Fecha de vencimiento calculada en tiempo real mientras el admin elige el plan
  const vencePreview = calcVence(form.plan);

  const estadoLabel = { 'al-dia':'AL DÍA', 'vencido':'VENCIDO', 'proximo':'POR VENCER' };

  const showToast = (msg, tipo = 'ok') => {
    setToast({ msg, tipo }); setTimeout(() => setToast(null), 3000);
  };

  const filtered = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.plan.toLowerCase().includes(search.toLowerCase())
  );

  /* ── Abrir formulario AGREGAR ── */
  const openAddForm = () => {
    setForm(FORM_EMPTY); setFormMode('add'); setEditId(null); setShowForm(true);
  };

  /* ── Abrir formulario EDITAR ── */
  const openEditForm = (client) => {
    setForm({ nombre: client.nombre, plan: client.plan, telefono: client.telefono || '' });
    setEditId(client.id); setFormMode('edit'); setShowForm(true);
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  /* ── Guardar (INSERT o UPDATE en Supabase) ── */
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nombre) return;
    setSaving(true);

    if (formMode === 'edit') {
      /* Al editar solo se cambia nombre, plan y teléfono.
         La fecha de vencimiento se gestiona solo a través de pagos. */
      const { data, error } = await db
        .from('clientes')
        .update({ nombre: form.nombre, plan: form.plan, telefono: form.telefono })
        .eq('id', editId)
        .select().single();
      setSaving(false);
      if (!error) { setClientes(clientes.map(c => c.id === editId ? data : c)); showToast(`${data.nombre} actualizado`); }
      else { showToast('Error al actualizar', 'error'); console.error(error); }

    } else {
      /* Al agregar: vence y estado se calculan automáticamente */
      const vence  = calcVence(form.plan);
      const estado = 'al-dia';
      const { data, error } = await db
        .from('clientes')
        .insert([{ nombre: form.nombre, plan: form.plan, telefono: form.telefono, estado, vence }])
        .select().single();
      setSaving(false);
      if (!error) { setClientes([data, ...clientes]); showToast(`${data.nombre} agregado — vence ${fmtFecha(data.vence)}`); }
      else { showToast('Error al guardar', 'error'); console.error(error); }
    }

    setForm(FORM_EMPTY); setShowForm(false); setFormMode('add'); setEditId(null);
  };

  const handleCancelForm = () => {
    setShowForm(false); setFormMode('add'); setEditId(null); setForm(FORM_EMPTY);
  };

  /* ── Eliminar (DELETE en Supabase) ── */
  const handleDeleteConfirmed = async () => {
    setDeleting(true);
    const { error } = await db.from('clientes').delete().eq('id', confirmId);
    setDeleting(false);
    if (!error) {
      const nombre = clientes.find(c => c.id === confirmId)?.nombre || 'Cliente';
      setClientes(clientes.filter(x => x.id !== confirmId));
      setConfirmId(null);
      showToast(`${nombre} eliminado`);
    } else { showToast('Error al eliminar', 'error'); console.error(error); }
  };

  /* ── Cuando se registra un pago, actualizar el cliente en la tabla ── */
  const handleClientUpdated = (updatedClient) => {
    setClientes(clientes.map(c => c.id === updatedClient.id ? updatedClient : c));
    showToast(`Pago registrado · ${updatedClient.nombre} al día hasta ${fmtFecha(updatedClient.vence)}`);
  };

  const clienteAEliminar = clientes.find(c => c.id === confirmId);

  return (
    <div className="fade-up">
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      <div className="admin-page-title">CLIENTES</div>
      <div className="admin-page-sub">Gestión de membresías · {clientes.length} registros en Supabase</div>

      {/* MODAL CONFIRMACIÓN ELIMINAR */}
      {confirmId && clienteAEliminar && (
        <ConfirmModal nombre={clienteAEliminar.nombre} loading={deleting}
          onConfirm={handleDeleteConfirmed} onCancel={() => setConfirmId(null)} />
      )}

      {/* MODAL REGISTRAR PAGO */}
      {pagoClient && (
        <PagoModal
          client={pagoClient}
          onClose={() => setPagoClient(null)}
          onClientUpdated={handleClientUpdated}
        />
      )}

      {/* FORMULARIO AGREGAR / EDITAR */}
      {showForm && (
        <div className="form-panel fade-up">
          <div className="table-title" style={{marginBottom:20}}>
            {formMode === 'edit' ? '✏ Editar cliente' : '+ Agregar nuevo cliente'}
          </div>
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="field-group" style={{marginBottom:0}}>
                <label className="field-label">Nombre completo</label>
                <input className="field-input" value={form.nombre}
                  onChange={e => setForm({...form, nombre: e.target.value})}
                  placeholder="Ej. Juan Pérez" required />
              </div>
              <div className="field-group" style={{marginBottom:0}}>
                <label className="field-label">Teléfono</label>
                <input className="field-input" value={form.telefono}
                  onChange={e => setForm({...form, telefono: e.target.value})}
                  placeholder="+504 9xxx-xxxx" />
              </div>
              <div className="field-group" style={{marginBottom:0}}>
                <label className="field-label">Plan de membresía</label>
                <select className="form-select" value={form.plan} onChange={e => setForm({...form, plan: e.target.value})}>
                  <option>Diario</option>
                  <option>Mensual</option>
                  <option>Trimestral</option>
                  <option>Anual</option>
                </select>
              </div>

              {/* PREVIEW de fecha de vencimiento (solo al agregar) */}
              {formMode === 'add' && (
                <div style={{
                  display:'flex', flexDirection:'column', justifyContent:'flex-end',
                  background:'var(--gold-bg)', border:'1px solid rgba(245,197,24,0.2)',
                  padding:'12px 16px'
                }}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',color:'var(--gray-400)',marginBottom:4}}>
                    Membresía válida hasta
                  </div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:700,color:'var(--gold)'}}>
                    📅 {fmtFecha(vencePreview)}
                  </div>
                  <div style={{fontSize:11,color:'var(--gray-700)',marginTop:2}}>
                    Calculado: hoy + {PLAN_DURATION_LABEL[form.plan]}
                  </div>
                </div>
              )}

              {formMode === 'edit' && (
                <div style={{
                  display:'flex', flexDirection:'column', justifyContent:'flex-end',
                  background:'var(--gray-900)', border:'1px solid var(--gray-800)',
                  padding:'12px 16px'
                }}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',color:'var(--gray-400)',marginBottom:4}}>
                    Para renovar la membresía
                  </div>
                  <div style={{fontSize:13,color:'var(--gray-400)'}}>
                    Usa el botón 🧾 <strong style={{color:'var(--gold)'}}>Registrar pago</strong> en la tabla para extender la suscripción.
                  </div>
                </div>
              )}
            </div>

            <div style={{display:'flex',gap:12,marginTop:20}}>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : (formMode === 'edit' ? 'Guardar cambios' : 'Agregar cliente')}
              </button>
              <button type="button" className="btn-outline" onClick={handleCancelForm} disabled={saving}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABLA DE CLIENTES */}
      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">{filtered.length} cliente{filtered.length!==1?'s':''}</span>
          <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
            <input className="table-search" placeholder="Buscar por nombre o plan..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn-primary" onClick={openAddForm}>+ Agregar</button>
          </div>
        </div>
        <div style={{overflowX:'auto'}}>
          <table>
            <thead>
              <tr>
                <th>Nombre</th><th>Plan</th><th>Vence</th>
                <th>Teléfono</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td style={{fontWeight:600}}>{c.nombre}</td>
                  <td style={{color:'var(--gray-400)'}}>{c.plan}</td>
                  <td style={{color:'var(--gray-400)',fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:'0.05em'}}>
                    {fmtFecha(c.vence)}
                  </td>
                  <td style={{color:'var(--gray-400)'}}>{c.telefono}</td>
                  <td><span className={`status-badge ${c.estado}`}>{estadoLabel[c.estado]}</span></td>
                  <td>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      {/* WhatsApp */}
                      <a href={`https://wa.me/${(c.telefono||'').replace(/\D/g,'')}?text=Hola ${c.nombre.split(' ')[0]}!`}
                         target="_blank" rel="noreferrer"
                         className="action-btn" style={{textDecoration:'none'}} title="WhatsApp">💬</a>

                      {/* Registrar pago + recibo */}
                      <button className="action-btn" onClick={() => setPagoClient(c)}
                        title="Registrar pago y generar recibo"
                        style={{color:'var(--gold)',borderColor:'rgba(245,197,24,0.3)'}}>🧾 Pago</button>

                      {/* Editar */}
                      <button className="action-btn" onClick={() => openEditForm(c)}
                        title="Editar datos"
                        style={{color:'#4299e1',borderColor:'rgba(66,153,225,0.3)'}}>✏</button>

                      {/* Eliminar */}
                      <button className="action-btn" onClick={() => setConfirmId(c.id)}
                        title="Eliminar cliente"
                        style={{color:'var(--red)',borderColor:'rgba(229,62,62,0.3)'}}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{textAlign:'center',padding:'40px',color:'var(--gray-700)'}}>
                    {clientes.length === 0
                      ? '📋 Sin clientes registrados — agrega el primero con el botón + Agregar'
                      : 'Sin resultados para tu búsqueda'}
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
  const [view,     setView]     = useState('dashboard');
  const [clientes, setClientes] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [dbError,  setDbError]  = useState('');

  useEffect(() => {
    const load = async () => {
      const { data, error } = await db
        .from('clientes').select('*').order('created_at', { ascending: false });
      if (error) {
        setDbError('No se pudieron cargar los datos. Verifica la conexión con Supabase.');
        console.error('Supabase error:', error);
      } else { setClientes(data || []); }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <LoadingScreen mensaje="CONECTANDO CON SUPABASE..." />;

  const navItems = [
    { id:'dashboard', icon:'📊', label:'Dashboard' },
    { id:'clientes',  icon:'👥', label:'Clientes'  },
  ];

  return (
    <div>
      <nav className="nav">
        <a href="https://504hnfitness-public.vercel.app/" className="nav-logo">
          <div className="nav-logo-icon">⚡</div>504HNFITNESS
        </a>
        <div className="nav-right">
          <span className="nav-tag">Panel Admin</span>
          <button className="nav-btn" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </nav>

      {dbError && (
        <div style={{background:'rgba(229,62,62,0.1)',borderBottom:'1px solid rgba(229,62,62,0.3)',color:'#fc8181',fontSize:13,padding:'10px 32px',textAlign:'center'}}>
          ⚠ {dbError}
        </div>
      )}

      <div className="admin-wrap">
        <aside className="sidebar">
          <div style={{flex:1}}>
            {navItems.map(item => (
              <button key={item.id}
                className={`sidebar-item ${view===item.id?'active':''}`}
                onClick={() => setView(item.id)}>
                <span className="sidebar-icon">{item.icon}</span>{item.label}
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
