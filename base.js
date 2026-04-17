/* =====================================================
   504HNFITNESS — base.js
   ===================================================== */

const { useState, useEffect, useMemo } = React;

/* ─── SUPABASE ───────────────────────────────────────── */
const SUPABASE_URL = 'https://kazzhlqneujpwjzefyeq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthenpobHFuZXVqcHdqemVmeWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NTk4NzAsImV4cCI6MjA5MjAzNTg3MH0.oIGGDrhAwIzezi0Eo7rivY0J4N1VI8U1FJk8mZbjAM0';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ─── PLANES ─────────────────────────────────────────── */
const PLANES = [
  { nombre:'Diario',     monto:50,   duracion:'1 dia',    meses:1,  color:'#4299e1' },
  { nombre:'Mensual',    monto:500,  duracion:'1 mes',    meses:1,  color:'#38a169' },
  { nombre:'Trimestral', monto:1350, duracion:'3 meses',  meses:3,  color:'#805ad5' },
  { nombre:'Anual',      monto:4800, duracion:'12 meses', meses:12, color:'#f5c518' },
];
const PLAN_MAP   = Object.fromEntries(PLANES.map(p => [p.nombre, p]));
const PLAN_NAMES = PLANES.map(p => p.nombre);
const METODOS    = ['Efectivo','Transferencia bancaria','Tarjeta de debito','Tarjeta de credito','Tigo Money','Otro'];

const MESES_NOMBRES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                       'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

/* ─── UTILIDADES ─────────────────────────────────────── */
const calcVence = (plan, fromDate = null) => {
  const base = fromDate ? new Date(fromDate + 'T12:00:00') : new Date();
  const d = new Date(base);
  switch (plan) {
    case 'Diario':     d.setDate(d.getDate() + 1);         break;
    case 'Mensual':    d.setMonth(d.getMonth() + 1);       break;
    case 'Trimestral': d.setMonth(d.getMonth() + 3);       break;
    case 'Anual':      d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split('T')[0];
};

const calcEstado = (venceStr) => {
  if (!venceStr) return 'vencido';
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const v   = new Date(venceStr + 'T00:00:00');
  const d   = Math.ceil((v - hoy) / 86400000);
  if (d < 0)  return 'vencido';
  if (d <= 7) return 'proximo';
  return 'al-dia';
};

const fmtFecha = (str) => {
  if (!str) return '—';
  return new Date(str + 'T12:00:00').toLocaleDateString('es-HN', { day:'numeric', month:'short', year:'numeric' });
};

const fmtFechaLarga = (str) => {
  if (!str) return '—';
  return new Date(str + 'T12:00:00').toLocaleDateString('es-HN', { day:'numeric', month:'long', year:'numeric' });
};

const fmtMonto = (n) =>
  parseFloat(n || 0).toLocaleString('es-HN', { minimumFractionDigits:2, maximumFractionDigits:2 });

const todayStr = () => new Date().toISOString().split('T')[0];

const claveMes = (fechaStr) => (fechaStr || '').substring(0, 7); // 'YYYY-MM'

/*
  distribuirPago: distribuye el monto de un pago entre los meses que cubre.
  - Diario / Mensual → 100% en el mes del pago
  - Trimestral       → 1/3 por mes durante 3 meses
  - Anual            → 1/12 por mes durante 12 meses
*/
const distribuirPago = (pago) => {
  const fecha   = new Date(pago.fecha + 'T12:00:00');
  const anio0   = fecha.getFullYear();
  const mes0    = fecha.getMonth();
  const plan    = PLAN_MAP[pago.plan];
  const meses   = plan?.meses || 1;
  const mpm     = parseFloat(pago.monto) / meses;

  return Array.from({ length: meses }, (_, i) => {
    const d = new Date(anio0, mes0 + i, 1);
    return {
      clave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      monto: mpm,
    };
  });
};

/* ─── GENERAR PDF (jsPDF) ────────────────────────────── */
const generarPDFRecibo = (client, planPago, monto, metodo, fecha, venceActualizado) => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  const W = 210, pad = 20;
  let y = 0;
  const receiptNo = 'REC-' + Date.now().toString().slice(-6);

  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, W, 40, 'F');
  doc.setFont('helvetica','bold');
  doc.setFontSize(26);
  doc.setTextColor(245,197,24);
  doc.text('504HNFITNESS', pad, 22);
  doc.setFont('helvetica','normal');
  doc.setFontSize(8);
  doc.setTextColor(150,150,150);
  doc.text('Centro de Entrenamiento  |  Tegucigalpa, Honduras', pad, 32);

  y = 52;

  doc.setFillColor(10,10,10);
  doc.rect(pad, y-8, 82, 12, 'F');
  doc.setFont('helvetica','bold');
  doc.setFontSize(10);
  doc.setTextColor(245,197,24);
  doc.text('RECIBO No. ' + receiptNo, pad + 4, y);

  y += 14;
  doc.setDrawColor(245,197,24);
  doc.setLineWidth(1.2);
  doc.line(pad, y, W-pad, y);
  y += 12;

  const fila = (label, valor, colorValor=[30,30,30]) => {
    doc.setFont('helvetica','normal');
    doc.setFontSize(10);
    doc.setTextColor(120,120,120);
    doc.text(label, pad, y);
    doc.setFont('helvetica','bold');
    doc.setTextColor(...colorValor);
    doc.text(String(valor||'—'), W-pad, y, { align:'right' });
    y += 3;
    doc.setDrawColor(230,230,230);
    doc.setLineWidth(0.3);
    doc.line(pad, y, W-pad, y);
    y += 10;
  };

  doc.setFont('helvetica','bold');
  doc.setFontSize(8);
  doc.setTextColor(170,170,170);
  doc.text('DATOS DEL CLIENTE', pad, y);
  y += 8;
  fila('Nombre completo', client.nombre);
  fila('Telefono', client.telefono || '—');

  y += 4;
  doc.setDrawColor(245,197,24);
  doc.setLineWidth(1.2);
  doc.line(pad, y, W-pad, y);
  y += 12;

  doc.setFont('helvetica','bold');
  doc.setFontSize(8);
  doc.setTextColor(170,170,170);
  doc.text('DETALLE DEL PAGO', pad, y);
  y += 8;

  fila('Plan de membresia', planPago);
  fila('Duracion del plan', PLAN_MAP[planPago]?.duracion || '—');
  fila('Fecha de pago', fmtFechaLarga(fecha));
  fila('Membresia valida hasta', fmtFechaLarga(venceActualizado), [38,161,105]);
  fila('Metodo de pago', metodo);

  y += 2;
  doc.setFillColor(240,255,248);
  doc.setDrawColor(56,161,105);
  doc.setLineWidth(0.5);
  doc.rect(pad, y, 112, 9, 'FD');
  doc.setFont('helvetica','bold');
  doc.setFontSize(9);
  doc.setTextColor(56,161,105);
  doc.text('PAGO CONFIRMADO - MEMBRESIA RENOVADA', pad+4, y+6);
  y += 18;

  doc.setFillColor(10,10,10);
  doc.rect(pad, y, W-pad*2, 26, 'F');
  doc.setFont('helvetica','bold');
  doc.setFontSize(10);
  doc.setTextColor(150,150,150);
  doc.text('TOTAL PAGADO', pad+6, y+11);
  doc.setFontSize(24);
  doc.setTextColor(245,197,24);
  doc.text('L. ' + fmtMonto(monto), W-pad-6, y+19, { align:'right' });
  y += 36;

  doc.setDrawColor(220,220,220);
  doc.setLineWidth(0.3);
  doc.line(pad, y, W-pad, y);
  y += 9;
  doc.setFont('helvetica','bold');
  doc.setFontSize(11);
  doc.setTextColor(10,10,10);
  doc.text('504HNfitness', W/2, y, { align:'center' });
  y += 7;
  doc.setFont('helvetica','normal');
  doc.setFontSize(8.5);
  doc.setTextColor(160,160,160);
  doc.text('Gracias por tu membresia! Este documento es un comprobante oficial de pago.', W/2, y, { align:'center' });
  y += 6;
  doc.text('Consultas: contacto@504hnfitness.com', W/2, y, { align:'center' });

  return { doc, receiptNo };
};

/* ─── DESCARGAR PDF ──────────────────────────────────── */
const descargarPDF = (blob, receiptNo, nombre) => {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = `recibo-${receiptNo}-${nombre.replace(/\s+/g,'-')}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

const FORM_EMPTY = { nombre:'', plan:'Mensual', telefono:'', metodo:'Efectivo' };

/* ============================================================
   LOADING SCREEN
   ============================================================ */
const LoadingScreen = ({ mensaje='CARGANDO...' }) => (
  <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'var(--black)',gap:16}}>
    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,letterSpacing:'0.1em',color:'var(--gold)'}}>{mensaje}</div>
    <div style={{width:48,height:3,background:'var(--gray-800)',overflow:'hidden'}}>
      <div style={{height:'100%',background:'var(--gold)',animation:'loadBar 1.2s ease-in-out infinite'}}/>
    </div>
    <style>{`@keyframes loadBar{0%{width:0%;margin-left:0}50%{width:100%;margin-left:0}100%{width:0%;margin-left:100%}}`}</style>
  </div>
);

/* ============================================================
   TOAST
   ============================================================ */
const Toast = ({ msg, tipo='ok', onClose }) => (
  <div style={{
    position:'fixed',bottom:28,right:28,zIndex:9000,maxWidth:380,
    background:tipo==='ok'?'var(--green)':tipo==='warn'?'#c9a012':'var(--red)',
    color:'#fff',padding:'12px 20px',
    fontFamily:"'Barlow',sans-serif",fontWeight:600,fontSize:13,lineHeight:1.5,
    boxShadow:'0 4px 20px rgba(0,0,0,0.4)',animation:'fadeUp 0.3s ease both',
    display:'flex',alignItems:'flex-start',gap:10
  }}>
    <span style={{flexShrink:0,marginTop:1}}>{tipo==='ok'?'✓':tipo==='warn'?'ℹ':'✕'}</span>
    <span style={{flex:1}}>{msg}</span>
    <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,0.7)',cursor:'pointer',fontSize:18,lineHeight:1,padding:0,marginLeft:4,flexShrink:0}}>✕</button>
  </div>
);

/* ============================================================
   CONFIRM MODAL
   ============================================================ */
const ConfirmModal = ({ nombre, loading, onConfirm, onCancel }) => (
  <div className="modal-overlay" onClick={onCancel}>
    <div className="modal-box" onClick={e=>e.stopPropagation()}>
      <div className="modal-title">ELIMINAR CLIENTE?</div>
      <div className="modal-subtitle">Esta accion no se puede deshacer.</div>
      <p style={{fontSize:14,color:'var(--white)',marginBottom:8}}>Vas a eliminar a <strong style={{color:'var(--gold)'}}>{nombre}</strong> del sistema.</p>
      <p style={{fontSize:13,color:'var(--gray-400)'}}>Se eliminaran todos sus datos, membresia e historial de pagos.</p>
      <div className="modal-actions">
        <button className="btn-danger" onClick={onConfirm} disabled={loading}>{loading?'Eliminando...':'Si, eliminar'}</button>
        <button className="btn-outline" onClick={onCancel} disabled={loading}>Cancelar</button>
      </div>
    </div>
  </div>
);

/* ============================================================
   MODAL REGISTRAR PAGO
   ============================================================ */
const PagoModal = ({ client, onClose, onClientUpdated, showToastFn }) => {
  const [planPago,  setPlanPago]  = useState(client.plan);
  const [metodo,    setMetodo]    = useState('Efectivo');
  const [fecha,     setFecha]     = useState(todayStr());
  const [guardando, setGuardando] = useState(false);

  const plan      = PLAN_MAP[planPago];
  const monto     = plan.monto;
  const isVencido = calcEstado(client.vence) === 'vencido';
  const newVence  = calcVence(planPago, isVencido ? null : client.vence);
  const estadoAct = calcEstado(client.vence);

  const handleConfirmarPago = async () => {
    setGuardando(true);

    await db.from('pagos').insert([{
      cliente_id:client.id, cliente_nombre:client.nombre,
      plan:planPago, monto, metodo, fecha, vence_hasta:newVence,
    }]);

    const { data, error } = await db.from('clientes')
      .update({ vence:newVence, estado:'al-dia', plan:planPago })
      .eq('id', client.id).select().single();

    setGuardando(false);
    if (error) { showToastFn('Error al actualizar la membresia.','error'); return; }

    onClientUpdated(data);
    onClose();

    try {
      const { doc, receiptNo } = generarPDFRecibo(client, planPago, monto, metodo, fecha, newVence);
      descargarPDF(doc.output('blob'), receiptNo, client.nombre);
      showToastFn(`Pago registrado. Recibo descargado para ${client.nombre.split(' ')[0]}.`,'ok');
    } catch(err) {
      console.error(err);
      showToastFn('Pago guardado, pero hubo un error al generar el PDF.','warn');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box wide" onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
          <div>
            <div className="modal-title">REGISTRAR PAGO</div>
            <div className="modal-subtitle">
              {client.nombre} &nbsp;·&nbsp;
              <span className={`status-badge ${estadoAct}`} style={{fontSize:10}}>
                {estadoAct==='al-dia'?'AL DIA':estadoAct==='proximo'?'POR VENCER':'VENCIDO'}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--gray-400)',cursor:'pointer',fontSize:22,lineHeight:1,padding:'4px'}}>✕</button>
        </div>

        <div style={{marginBottom:20}}>
          <div className="field-label" style={{marginBottom:12}}>Selecciona el plan a pagar</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:8}}>
            {PLANES.map(p=>(
              <button key={p.nombre} onClick={()=>setPlanPago(p.nombre)} style={{
                background:planPago===p.nombre?p.color:'var(--gray-900)',
                border:`2px solid ${planPago===p.nombre?p.color:'var(--gray-800)'}`,
                color:planPago===p.nombre?(p.nombre==='Anual'?'var(--black)':'#fff'):'var(--gray-400)',
                padding:'13px 8px',cursor:'pointer',textAlign:'center',transition:'all 0.15s',
              }}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,lineHeight:1,marginBottom:4}}>{p.nombre}</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,marginBottom:2}}>L. {p.monto.toLocaleString('es-HN')}</div>
                <div style={{fontSize:11,opacity:0.75}}>{p.duracion}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{background:'var(--gray-900)',border:'1px solid var(--gray-800)',padding:'12px 18px',marginBottom:isVencido?0:20,display:'flex',gap:20,flexWrap:'wrap',alignItems:'center'}}>
          <div>
            <div style={{fontSize:9,color:'var(--gray-700)',marginBottom:3,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:'0.15em',textTransform:'uppercase'}}>Vence actualmente</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:700,color:'var(--gray-400)'}}>{fmtFecha(client.vence)}</div>
          </div>
          <div style={{color:'var(--gray-700)',fontSize:18}}>→</div>
          <div>
            <div style={{fontSize:9,color:'var(--gray-700)',marginBottom:3,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:'0.15em',textTransform:'uppercase'}}>Nueva fecha de vencimiento</div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:700,color:'var(--gold)'}}>{fmtFecha(newVence)}</div>
          </div>
          <div style={{marginLeft:'auto',textAlign:'right'}}>
            <div style={{fontSize:9,color:'var(--gray-700)',marginBottom:3,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:'0.15em',textTransform:'uppercase'}}>Monto a cobrar</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:'var(--gold)',lineHeight:1}}>L. {monto.toLocaleString('es-HN')}</div>
          </div>
        </div>
        {isVencido&&<p style={{fontSize:12,color:'#fc8181',margin:'8px 0 20px'}}>Membresia vencida — la renovacion parte desde hoy.</p>}

        <div className="form-grid" style={{gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:4}}>
          <div className="field-group" style={{marginBottom:0}}>
            <label className="field-label">Método de pago</label>
            <select className="form-select" value={metodo} onChange={e=>setMetodo(e.target.value)}>
              {METODOS.map(m=><option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="field-group" style={{marginBottom:0}}>
            <label className="field-label">Fecha de pago</label>
            <input type="date" className="field-input" value={fecha} onChange={e=>setFecha(e.target.value)}/>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-primary" onClick={handleConfirmarPago} disabled={guardando}>
            {guardando?'Registrando...':`Confirmar · L. ${monto.toLocaleString('es-HN')} — Descargar recibo PDF`}
          </button>
          <button className="btn-outline" onClick={onClose} disabled={guardando}>Cancelar</button>
        </div>
        <p className="modal-note">Guarda el pago en Supabase, actualiza la membresía y descarga el recibo en PDF.</p>
      </div>
    </div>
  );
};

/* ============================================================
   LOGIN
   ============================================================ */
const LoginPage = ({ onLogin }) => {
  const [pass,setPass]=useState(''); const [error,setError]=useState('');
  const handleLogin=(e)=>{ e.preventDefault(); if(pass==='504admin'){onLogin();}else{setError('Contraseña incorrecta.');} };
  return(
    <div className="login-screen">
      <nav className="nav">
        <a href="https://504hnfitness-public.vercel.app/" className="nav-logo"><div className="nav-logo-icon">⚡</div>504HNFITNESS</a>
        <div className="nav-right">
          <span className="nav-tag">Panel Privado</span>
          <a href="https://504hnfitness-public.vercel.app/" className="nav-btn" style={{textDecoration:'none'}}>← Sitio público</a>
        </div>
      </nav>
      <div className="login-body">
        <div className="login-card fade-up">
          <div style={{marginBottom:24}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,letterSpacing:'0.25em',textTransform:'uppercase',color:'var(--gold)',marginBottom:8,display:'flex',alignItems:'center',gap:10}}>
              <span style={{display:'block',width:20,height:1,background:'var(--gold)'}}></span>Solo administradores
            </div>
            <div className="login-title">ACCESO<br/>ADMIN</div>
            <div className="login-subtitle">Panel de control interno 504HNfitness</div>
          </div>
          {error&&<div className="login-error">{error}</div>}
          <form onSubmit={handleLogin}>
            <div className="field-group">
              <label className="field-label">Contraseña</label>
              <input type="password" className="field-input" placeholder="Ingresa tu contraseña" value={pass} onChange={e=>setPass(e.target.value)} autoFocus/>
            </div>
            <button type="submit" className="login-submit">Entrar al panel →</button>
          </form>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   DASHBOARD (solo métricas y alertas)
   ============================================================ */
const Dashboard = ({ clientes }) => {
  const activos  = clientes.filter(c=>c.estado!=='vencido').length;
  const vencidos = clientes.filter(c=>c.estado==='vencido').length;
  const proximos = clientes.filter(c=>c.estado==='proximo').length;

  return(
    <div className="fade-up">
      <div className="admin-page-title">DASHBOARD</div>
      <div className="admin-page-sub">Resumen general · Datos en tiempo real desde Supabase</div>
      <div className="metrics-grid">
        <div className="metric-card green fade-up fade-up-1"><div className="metric-label">Clientes activos</div><div className="metric-value">{activos}</div><div className="metric-change">De {clientes.length} registrados</div></div>
        <div className="metric-card red fade-up fade-up-2"><div className="metric-label">Pagos vencidos</div><div className="metric-value">{vencidos}</div><div className="metric-change">Requieren atención</div></div>
        <div className="metric-card gold fade-up fade-up-3"><div className="metric-label">Por vencer pronto</div><div className="metric-value">{proximos}</div><div className="metric-change">En los próximos 7 días</div></div>
        <div className="metric-card blue fade-up fade-up-4"><div className="metric-label">Total registrados</div><div className="metric-value">{clientes.length}</div><div className="metric-change">Todos los planes</div></div>
      </div>

      <div className="table-title" style={{marginBottom:16}}>Alertas de cobro</div>
      {clientes.filter(c=>c.estado!=='al-dia').map(c=>(
        <div key={c.id} className={`alert-card ${c.estado==='proximo'?'warn':''}`}>
          <div><div className="alert-name">{c.nombre}</div><div className="alert-detail">Plan {c.plan} · Vence {fmtFecha(c.vence)} · {c.telefono}</div></div>
          <div style={{display:'flex',gap:8}}>
            <span className={`status-badge ${c.estado}`}>{c.estado==='vencido'?'VENCIDO':'POR VENCER'}</span>
            <a href={`https://wa.me/${(c.telefono||'').replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${c.nombre.split(' ')[0]}, te recordamos que tu membresia en 504HNfitness esta por vencer.`)}`}
               target="_blank" rel="noreferrer" className="action-btn" style={{textDecoration:'none',display:'inline-flex',alignItems:'center'}}>
              WhatsApp
            </a>
          </div>
        </div>
      ))}
      {clientes.filter(c=>c.estado!=='al-dia').length===0&&<div style={{color:'var(--gray-700)',fontSize:13,padding:'12px 0'}}>Sin alertas pendientes</div>}
    </div>
  );
};

/* ============================================================
   EGRESOS (panel propio)
   ============================================================ */
const EgresosPanel = () => {
  const [egresos,        setEgresos]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [showForm,       setShowForm]       = useState(false);
  const [form,           setForm]           = useState({descripcion:'',fecha:'',monto:''});
  const [saving,         setSaving]         = useState(false);
  const [confirmEgreso,  setConfirmEgreso]  = useState(null);
  const [toast,          setToast]          = useState(null);
  const [search,         setSearch]         = useState('');

  const showToast=(msg,tipo='ok')=>{setToast({msg,tipo});setTimeout(()=>setToast(null),3500);};
  const total=egresos.reduce((s,e)=>s+parseFloat(e.monto||0),0);
  const filtered=egresos.filter(e=>e.descripcion.toLowerCase().includes(search.toLowerCase())||e.fecha.includes(search));

  useEffect(()=>{
    db.from('egresos').select('*').order('fecha',{ascending:false})
      .then(({data,error})=>{if(!error)setEgresos(data||[]);setLoading(false);});
  },[]);

  const handleSave=async()=>{
    if(!form.descripcion||!form.fecha||!form.monto)return;
    setSaving(true);
    const{data,error}=await db.from('egresos')
      .insert([{descripcion:form.descripcion,fecha:form.fecha,monto:parseFloat(form.monto)}])
      .select().single();
    setSaving(false);
    if(!error){setEgresos([data,...egresos]);setForm({descripcion:'',fecha:'',monto:''});setShowForm(false);showToast('Egreso guardado');}
    else{showToast('Error al guardar','error');console.error(error);}
  };

  const handleDelete=async(id)=>{
    const{error}=await db.from('egresos').delete().eq('id',id);
    if(!error){setEgresos(egresos.filter(x=>x.id!==id));setConfirmEgreso(null);showToast('Egreso eliminado');}
    else showToast('Error al eliminar','error');
  };

  const egresoAEliminar=egresos.find(e=>e.id===confirmEgreso);

  return(
    <div className="fade-up">
      {toast&&<Toast msg={toast.msg} tipo={toast.tipo} onClose={()=>setToast(null)}/>}

      {confirmEgreso&&egresoAEliminar&&(
        <div className="modal-overlay" onClick={()=>setConfirmEgreso(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">ELIMINAR EGRESO?</div>
            <div className="modal-subtitle">Esta accion no se puede deshacer.</div>
            <p style={{fontSize:14,color:'var(--white)',marginBottom:8}}><strong style={{color:'var(--gold)'}}>{egresoAEliminar.descripcion}</strong></p>
            <p style={{fontSize:13,color:'var(--gray-400)'}}>L. {fmtMonto(egresoAEliminar.monto)} · {egresoAEliminar.fecha}</p>
            <div className="modal-actions">
              <button className="btn-danger" onClick={()=>handleDelete(confirmEgreso)}>Si, eliminar</button>
              <button className="btn-outline" onClick={()=>setConfirmEgreso(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-page-title">EGRESOS</div>
      <div className="admin-page-sub">Registro de gastos · {egresos.length} registros en Supabase</div>

      {showForm&&(
        <div className="form-panel fade-up">
          <div className="table-title" style={{marginBottom:16}}>+ Nuevo egreso</div>
          <div className="form-grid">
            <div className="field-group" style={{marginBottom:0}}>
              <label className="field-label">Descripción del pago</label>
              <input className="field-input" value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} placeholder="Ej. Renta del local"/>
            </div>
            <div className="field-group" style={{marginBottom:0}}>
              <label className="field-label">Fecha</label>
              <input type="date" className="field-input" value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})}/>
            </div>
            <div className="field-group" style={{marginBottom:0}}>
              <label className="field-label">Monto (L.)</label>
              <input type="number" className="field-input" value={form.monto} onChange={e=>setForm({...form,monto:e.target.value})} placeholder="0.00" min="0" step="0.01"/>
            </div>
          </div>
          <div style={{display:'flex',gap:12,marginTop:20}}>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving?'Guardando...':'Guardar egreso'}</button>
            <button className="btn-outline" onClick={()=>setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">{loading?'Cargando...':`${filtered.length} egreso${filtered.length!==1?'s':''}`}</span>
          <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
            <input className="table-search" placeholder="Buscar por descripción o fecha..." value={search} onChange={e=>setSearch(e.target.value)}/>
            <button className="btn-primary" onClick={()=>setShowForm(!showForm)}>+ Agregar egreso</button>
          </div>
        </div>
        <div style={{overflowX:'auto'}}>
          <table>
            <thead><tr><th>#</th><th>Descripción</th><th>Fecha</th><th>Monto (L.)</th><th>Acciones</th></tr></thead>
            <tbody>
              {!loading&&filtered.map((e,i)=>(
                <tr key={e.id}>
                  <td style={{color:'var(--gray-700)',fontFamily:"'Barlow Condensed',sans-serif"}}>{i+1}</td>
                  <td style={{fontWeight:600}}>{e.descripcion}</td>
                  <td style={{color:'var(--gray-400)',fontFamily:"'Barlow Condensed',sans-serif"}}>{fmtFecha(e.fecha)}</td>
                  <td style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:'var(--red)'}}>L. {fmtMonto(e.monto)}</td>
                  <td>
                    <button className="action-btn" onClick={()=>setConfirmEgreso(e.id)}
                      style={{color:'var(--red)',borderColor:'rgba(229,62,62,0.3)'}}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {!loading&&filtered.length===0&&<tr><td colSpan={5} style={{textAlign:'center',padding:'36px',color:'var(--gray-700)'}}>{egresos.length===0?'Sin egresos registrados':'Sin resultados'}</td></tr>}
              {loading&&<tr><td colSpan={5} style={{textAlign:'center',padding:'36px',color:'var(--gray-700)'}}>Cargando...</td></tr>}
            </tbody>
            {!loading&&egresos.length>0&&(
              <tfoot><tr>
                <td colSpan={3} style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray-400)'}}>TOTAL EGRESOS</td>
                <td colSpan={2} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:'var(--red)'}}>L. {fmtMonto(total)}</td>
              </tr></tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   HISTORIAL DE PAGOS
   ============================================================ */
const PagosPanel = () => {
  const [pagos,setPagos]=useState([]); const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState(''); const [filtroPlan,setFiltroPlan]=useState('Todos');
  useEffect(()=>{ db.from('pagos').select('*').order('created_at',{ascending:false}).then(({data,error})=>{if(!error)setPagos(data||[]);setLoading(false);}); },[]);
  const filtered=pagos.filter(p=>{
    const ms=p.cliente_nombre.toLowerCase().includes(search.toLowerCase());
    const mp=filtroPlan==='Todos'||p.plan===filtroPlan;
    return ms&&mp;
  });
  const totalFiltrado=filtered.reduce((s,p)=>s+parseFloat(p.monto||0),0);
  const COL={'Efectivo':'#68d391','Transferencia bancaria':'#63b3ed','Tarjeta de debito':'#b794f4','Tarjeta de credito':'#fc8181','Tigo Money':'#f5c518','Otro':'#a1a1aa'};
  return(
    <div className="fade-up">
      <div className="admin-page-title">HISTORIAL DE PAGOS</div>
      <div className="admin-page-sub">{pagos.length} transacciones registradas en Supabase</div>
      {!loading&&(
        <div className="metrics-grid" style={{marginBottom:32}}>
          <div className="metric-card gold fade-up fade-up-1"><div className="metric-label">Total recaudado</div><div className="metric-value" style={{fontSize:28}}>L. {pagos.reduce((s,p)=>s+parseFloat(p.monto||0),0).toLocaleString('es-HN')}</div><div className="metric-change">Todos los pagos</div></div>
          {PLANES.map((p,i)=>{const tot=pagos.filter(x=>x.plan===p.nombre).reduce((s,x)=>s+parseFloat(x.monto||0),0);const cnt=pagos.filter(x=>x.plan===p.nombre).length;return(
            <div key={p.nombre} className={`metric-card fade-up fade-up-${i+2}`} style={{borderTopColor:p.color}}>
              <div className="metric-label">{p.nombre}</div><div className="metric-value" style={{fontSize:28}}>{cnt}</div><div className="metric-change">L. {tot.toLocaleString('es-HN')}</div>
            </div>
          );})}
        </div>
      )}
      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">{loading?'Cargando...':`${filtered.length} pago${filtered.length!==1?'s':''}`}</span>
          <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
            <input className="table-search" placeholder="Buscar por cliente..." value={search} onChange={e=>setSearch(e.target.value)}/>
            <select className="form-select" style={{width:'auto',padding:'8px 14px',fontSize:13}} value={filtroPlan} onChange={e=>setFiltroPlan(e.target.value)}>
              <option value="Todos">Todos los planes</option>
              {PLAN_NAMES.map(n=><option key={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div style={{overflowX:'auto'}}>
          <table>
            <thead><tr><th>Fecha</th><th>Cliente</th><th>Plan</th><th>Monto (L.)</th><th>Método</th><th>Válido hasta</th></tr></thead>
            <tbody>
              {!loading&&filtered.map(p=>(
                <tr key={p.id}>
                  <td style={{color:'var(--gray-400)',fontFamily:"'Barlow Condensed',sans-serif"}}>{fmtFecha(p.fecha)}</td>
                  <td style={{fontWeight:600}}>{p.cliente_nombre}</td>
                  <td><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:PLAN_MAP[p.plan]?.color||'var(--gray-400)',background:(PLAN_MAP[p.plan]?.color||'#888')+'18',padding:'3px 8px',display:'inline-block'}}>{p.plan}</span></td>
                  <td style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:'var(--green)'}}>L. {fmtMonto(p.monto)}</td>
                  <td><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:COL[p.metodo]||'var(--gray-400)',background:(COL[p.metodo]||'#888')+'18',padding:'3px 8px'}}>{p.metodo}</span></td>
                  <td style={{color:'var(--gold)',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>{fmtFecha(p.vence_hasta)}</td>
                </tr>
              ))}
              {!loading&&filtered.length===0&&<tr><td colSpan={6} style={{textAlign:'center',padding:'40px',color:'var(--gray-700)'}}>{pagos.length===0?'Sin pagos registrados':'Sin resultados'}</td></tr>}
              {loading&&<tr><td colSpan={6} style={{textAlign:'center',padding:'40px',color:'var(--gray-700)'}}>Cargando...</td></tr>}
            </tbody>
            {!loading&&filtered.length>0&&<tfoot><tr>
              <td colSpan={3} style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray-400)'}}>TOTAL {filtroPlan!=='Todos'?`· ${filtroPlan}`:''}</td>
              <td colSpan={3} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:'var(--green)'}}>L. {fmtMonto(totalFiltrado)}</td>
            </tr></tfoot>}
          </table>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   GANANCIAS POR MES
   - Ingresos: cada pago distribuido según duración del plan
     · Diario / Mensual → 100% en el mes del pago
     · Trimestral       → 1/3 por mes × 3 meses
     · Anual            → 1/12 por mes × 12 meses
   - Egresos: total del mes según fecha del egreso
   ============================================================ */
const GananciasPanel = () => {
  const [pagos,   setPagos]   = useState([]);
  const [egresos, setEgresos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anio,    setAnio]    = useState(new Date().getFullYear());

  useEffect(()=>{
    Promise.all([
      db.from('pagos').select('fecha,plan,monto'),
      db.from('egresos').select('fecha,monto'),
    ]).then(([{data:p},{data:e}])=>{
      setPagos(p||[]); setEgresos(e||[]); setLoading(false);
    });
  },[]);

  /* Construir mapas mensuales */
  const ingresosMap = useMemo(()=>{
    const m={};
    pagos.forEach(p=>{
      distribuirPago(p).forEach(({clave,monto})=>{
        m[clave]=(m[clave]||0)+monto;
      });
    });
    return m;
  },[pagos]);

  const egresosMap = useMemo(()=>{
    const m={};
    egresos.forEach(e=>{ const c=claveMes(e.fecha); m[c]=(m[c]||0)+parseFloat(e.monto); });
    return m;
  },[egresos]);

  /* Años disponibles (siempre incluir el actual) */
  const aniosDisponibles = useMemo(()=>{
    const claves=[...Object.keys(ingresosMap),...Object.keys(egresosMap)];
    const s=new Set([new Date().getFullYear(),...claves.map(c=>parseInt(c.split('-')[0]))]);
    return [...s].sort((a,b)=>b-a);
  },[ingresosMap,egresosMap]);

  /* Filas del año seleccionado */
  const filas = useMemo(()=>
    MESES_NOMBRES.map((nombre,i)=>{
      const c=`${anio}-${String(i+1).padStart(2,'0')}`;
      const ing=ingresosMap[c]||0;
      const egr=egresosMap[c]||0;
      const gan=ing-egr;
      return{nombre,clave:c,ingresos:ing,egresos:egr,ganancia:gan};
    })
  ,[anio,ingresosMap,egresosMap]);

  const totAnio={
    ingresos:filas.reduce((s,f)=>s+f.ingresos,0),
    egresos: filas.reduce((s,f)=>s+f.egresos,0),
    ganancia:filas.reduce((s,f)=>s+f.ganancia,0),
  };

  /* Barra visual: escalar respecto al máximo del año */
  const maxVal=Math.max(...filas.map(f=>Math.max(f.ingresos,f.egresos)),1);
  const pct=(v)=>Math.round((Math.max(v,0)/maxVal)*100);

  const mesActual=new Date().getMonth(); // 0-indexed
  const anioActual=new Date().getFullYear();

  return(
    <div className="fade-up">
      <div className="admin-page-title">GANANCIAS</div>
      <div className="admin-page-sub">Ingresos vs Egresos por mes · Planes distribuidos automáticamente</div>

      {/* Selector de año */}
      <div style={{display:'flex',gap:8,marginBottom:28,flexWrap:'wrap'}}>
        {aniosDisponibles.map(a=>(
          <button key={a} onClick={()=>setAnio(a)} style={{
            fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:14,
            letterSpacing:'0.1em',textTransform:'uppercase',
            padding:'8px 20px',cursor:'pointer',
            background:anio===a?'var(--gold)':'var(--gray-900)',
            color:anio===a?'var(--black)':'var(--gray-400)',
            border:`1px solid ${anio===a?'var(--gold)':'var(--gray-800)'}`,
            transition:'all 0.15s',
          }}>{a}</button>
        ))}
      </div>

      {loading&&<LoadingScreen mensaje="CALCULANDO..."/>}

      {!loading&&(
        <>
          {/* Resumen del año */}
          <div className="metrics-grid" style={{marginBottom:32}}>
            <div className="metric-card green fade-up fade-up-1">
              <div className="metric-label">Ingresos {anio}</div>
              <div className="metric-value" style={{fontSize:28}}>L. {totAnio.ingresos.toLocaleString('es-HN',{minimumFractionDigits:0,maximumFractionDigits:0})}</div>
              <div className="metric-change">Pagos distribuidos por plan</div>
            </div>
            <div className="metric-card red fade-up fade-up-2">
              <div className="metric-label">Egresos {anio}</div>
              <div className="metric-value" style={{fontSize:28}}>L. {totAnio.egresos.toLocaleString('es-HN',{minimumFractionDigits:0,maximumFractionDigits:0})}</div>
              <div className="metric-change">Total de gastos</div>
            </div>
            <div className={`metric-card ${totAnio.ganancia>=0?'gold':'red'} fade-up fade-up-3`}>
              <div className="metric-label">Ganancia neta {anio}</div>
              <div className="metric-value" style={{fontSize:28,color:totAnio.ganancia>=0?'var(--gold)':'var(--red)'}}>
                {totAnio.ganancia<0?'-':''}L. {Math.abs(totAnio.ganancia).toLocaleString('es-HN',{minimumFractionDigits:0,maximumFractionDigits:0})}
              </div>
              <div className="metric-change">{totAnio.ganancia>=0?'Superávit':'Déficit'} del año</div>
            </div>
          </div>

          {/* Tabla mensual */}
          <div className="table-wrap">
            <div className="table-header">
              <span className="table-title">Desglose mensual {anio}</span>
              <span style={{fontSize:12,color:'var(--gray-700)'}}>Trimestral ÷ 3 · Anual ÷ 12</span>
            </div>
            <div style={{overflowX:'auto'}}>
              <table>
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th>Ingresos (L.)</th>
                    <th>Egresos (L.)</th>
                    <th>Ganancia neta (L.)</th>
                    <th style={{minWidth:160}}>Visual</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f,i)=>{
                    const esFuturo=anio===anioActual&&i>mesActual;
                    const tieneData=f.ingresos>0||f.egresos>0;
                    const gananciaPos=f.ganancia>=0;
                    return(
                      <tr key={f.clave} style={{opacity:esFuturo?0.4:1}}>
                        <td style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:14,color:tieneData?'var(--white)':'var(--gray-700)'}}>
                          {f.nombre}
                          {esFuturo&&<span style={{fontSize:10,color:'var(--gray-700)',marginLeft:8,fontWeight:'normal'}}>pendiente</span>}
                        </td>
                        <td style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:f.ingresos>0?'var(--green)':'var(--gray-800)'}}>
                          {f.ingresos>0?`L. ${fmtMonto(f.ingresos)}`:'—'}
                        </td>
                        <td style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:f.egresos>0?'var(--red)':'var(--gray-800)'}}>
                          {f.egresos>0?`L. ${fmtMonto(f.egresos)}`:'—'}
                        </td>
                        <td>
                          {tieneData?(
                            <span style={{
                              fontFamily:"'Bebas Neue',sans-serif",fontSize:18,
                              color:gananciaPos?'var(--gold)':'var(--red)',
                              display:'inline-flex',alignItems:'center',gap:6
                            }}>
                              <span style={{fontSize:13}}>{gananciaPos?'▲':'▼'}</span>
                              {f.ganancia<0?'-':''}L. {fmtMonto(Math.abs(f.ganancia))}
                            </span>
                          ):<span style={{color:'var(--gray-800)',fontFamily:"'Bebas Neue',sans-serif",fontSize:18}}>—</span>}
                        </td>
                        <td>
                          <div style={{display:'flex',flexDirection:'column',gap:3}}>
                            {/* Barra ingresos */}
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,color:'#68d391',width:10,textAlign:'right'}}>I</span>
                              <div style={{flex:1,height:5,background:'var(--gray-800)',borderRadius:2,overflow:'hidden'}}>
                                <div style={{width:`${pct(f.ingresos)}%`,height:'100%',background:'var(--green)',borderRadius:2,transition:'width 0.5s ease'}}/>
                              </div>
                            </div>
                            {/* Barra egresos */}
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,color:'#fc8181',width:10,textAlign:'right'}}>E</span>
                              <div style={{flex:1,height:5,background:'var(--gray-800)',borderRadius:2,overflow:'hidden'}}>
                                <div style={{width:`${pct(f.egresos)}%`,height:'100%',background:'var(--red)',borderRadius:2,transition:'width 0.5s ease'}}/>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--gray-400)'}}>TOTAL {anio}</td>
                    <td style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:'var(--green)'}}>L. {fmtMonto(totAnio.ingresos)}</td>
                    <td style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:'var(--red)'}}>L. {fmtMonto(totAnio.egresos)}</td>
                    <td style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:totAnio.ganancia>=0?'var(--gold)':'var(--red)'}}>
                      {totAnio.ganancia<0?'-':''}L. {fmtMonto(Math.abs(totAnio.ganancia))}
                    </td>
                    <td/>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Nota sobre prorratio */}
          <div style={{marginTop:20,background:'var(--gray-950)',border:'1px solid var(--gray-900)',padding:'14px 18px',fontSize:12,color:'var(--gray-400)',lineHeight:1.8}}>
            <strong style={{color:'var(--gray-200)',fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:'0.1em',textTransform:'uppercase',fontSize:11}}>Reglas de distribución de ingresos</strong><br/>
            <span style={{color:'#4299e1'}}>● Diario / Mensual</span> — El monto completo se registra en el mes del pago.<br/>
            <span style={{color:'#805ad5'}}>● Trimestral</span> — El monto total se divide entre 3 y se distribuye en los 3 meses que cubre la membresía.<br/>
            <span style={{color:'var(--gold)'}}>● Anual</span> — El monto total se divide entre 12 y se distribuye en los 12 meses que cubre la membresía.
          </div>
        </>
      )}
    </div>
  );
};

/* ============================================================
   GESTIÓN DE CLIENTES
   ============================================================ */
const ClientesPanel = ({ clientes, setClientes }) => {
  const [search,setSearch]=useState(''); const [showForm,setShowForm]=useState(false);
  const [formMode,setFormMode]=useState('add'); const [editId,setEditId]=useState(null);
  const [form,setForm]=useState(FORM_EMPTY); const [saving,setSaving]=useState(false);
  const [confirmId,setConfirmId]=useState(null); const [deleting,setDeleting]=useState(false);
  const [pagoClient,setPagoClient]=useState(null); const [toast,setToast]=useState(null);

  const vencePreview=calcVence(form.plan);
  const estadoLabel={'al-dia':'AL DIA','vencido':'VENCIDO','proximo':'POR VENCER'};
  const showToast=(msg,tipo='ok')=>{setToast({msg,tipo});setTimeout(()=>setToast(null),5000);};
  const filtered=clientes.filter(c=>c.nombre.toLowerCase().includes(search.toLowerCase())||c.plan.toLowerCase().includes(search.toLowerCase()));

  const openAddForm=()=>{setForm(FORM_EMPTY);setFormMode('add');setEditId(null);setShowForm(true);};
  const openEditForm=(c)=>{setForm({nombre:c.nombre,plan:c.plan,telefono:c.telefono||'',metodo:'Efectivo'});setEditId(c.id);setFormMode('edit');setShowForm(true);window.scrollTo({top:0,behavior:'smooth'});};

  const handleSave=async(e)=>{
    e.preventDefault(); if(!form.nombre)return; setSaving(true);

    if(formMode==='edit'){
      const{data,error}=await db.from('clientes').update({nombre:form.nombre,plan:form.plan,telefono:form.telefono}).eq('id',editId).select().single();
      setSaving(false);
      if(!error){setClientes(clientes.map(c=>c.id===editId?data:c));showToast(`${data.nombre} actualizado`);}
      else{showToast('Error al actualizar','error');console.error(error);}
      setForm(FORM_EMPTY);setShowForm(false);setFormMode('add');setEditId(null);
    } else {
      const vence=calcVence(form.plan); const hoy=todayStr(); const monto=PLAN_MAP[form.plan]?.monto||0;
      const{data:c,error:cErr}=await db.from('clientes').insert([{nombre:form.nombre,plan:form.plan,telefono:form.telefono,estado:'al-dia',vence}]).select().single();
      if(cErr){setSaving(false);showToast('Error al crear el cliente','error');console.error(cErr);return;}
      await db.from('pagos').insert([{cliente_id:c.id,cliente_nombre:c.nombre,plan:form.plan,monto,metodo:form.metodo,fecha:hoy,vence_hasta:vence}]);
      setClientes([c,...clientes]); setSaving(false); setForm(FORM_EMPTY); setShowForm(false);
      showToast(`${c.nombre} registrado. Descargando recibo...`,'ok');
      try{
        const{doc,receiptNo}=generarPDFRecibo(c,form.plan,monto,form.metodo,hoy,vence);
        descargarPDF(doc.output('blob'),receiptNo,c.nombre);
        showToast(`Recibo de ${c.nombre.split(' ')[0]} descargado.`,'ok');
      }catch(err){console.error(err);showToast('Cliente creado, error al generar PDF.','warn');}
    }
  };

  const handleCancelForm=()=>{setShowForm(false);setFormMode('add');setEditId(null);setForm(FORM_EMPTY);};

  const handleDeleteConfirmed=async()=>{
    setDeleting(true);
    const{error}=await db.from('clientes').delete().eq('id',confirmId);
    setDeleting(false);
    if(!error){const n=clientes.find(c=>c.id===confirmId)?.nombre||'Cliente';setClientes(clientes.filter(x=>x.id!==confirmId));setConfirmId(null);showToast(`${n} eliminado`);}
    else{showToast('Error al eliminar','error');console.error(error);}
  };

  const handleClientUpdated=(u)=>setClientes(clientes.map(c=>c.id===u.id?u:c));
  const clienteAEliminar=clientes.find(c=>c.id===confirmId);

  return(
    <div className="fade-up">
      {toast&&<Toast msg={toast.msg} tipo={toast.tipo} onClose={()=>setToast(null)}/>}
      <div className="admin-page-title">CLIENTES</div>
      <div className="admin-page-sub">Gestión de membresías · {clientes.length} registros en Supabase</div>

      {confirmId&&clienteAEliminar&&<ConfirmModal nombre={clienteAEliminar.nombre} loading={deleting} onConfirm={handleDeleteConfirmed} onCancel={()=>setConfirmId(null)}/>}
      {pagoClient&&<PagoModal client={pagoClient} onClose={()=>setPagoClient(null)} onClientUpdated={handleClientUpdated} showToastFn={showToast}/>}

      {showForm&&(
        <div className="form-panel fade-up">
          <div className="table-title" style={{marginBottom:6}}>{formMode==='edit'?'Editar cliente':'Registrar nuevo cliente'}</div>
          {formMode==='add'&&<p style={{fontSize:13,color:'var(--gray-400)',marginBottom:20}}>Al guardar se registra el primer pago y se descarga el recibo PDF.</p>}
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="field-group" style={{marginBottom:0}}>
                <label className="field-label">Nombre completo</label>
                <input className="field-input" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} placeholder="Ej. Juan Pérez" required/>
              </div>
              <div className="field-group" style={{marginBottom:0}}>
                <label className="field-label">Teléfono</label>
                <input className="field-input" value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})} placeholder="+504 9xxx-xxxx"/>
              </div>
              <div className="field-group" style={{marginBottom:0}}>
                <label className="field-label">Plan de membresía</label>
                <select className="form-select" value={form.plan} onChange={e=>setForm({...form,plan:e.target.value})}>
                  {PLAN_NAMES.map(n=><option key={n}>{n}</option>)}
                </select>
              </div>
              {formMode==='add'&&(
                <div className="field-group" style={{marginBottom:0}}>
                  <label className="field-label">Método de pago</label>
                  <select className="form-select" value={form.metodo} onChange={e=>setForm({...form,metodo:e.target.value})}>
                    {METODOS.map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
              )}
            </div>
            {formMode==='add'&&(
              <div style={{display:'flex',flexWrap:'wrap',gap:20,background:'var(--gold-bg)',border:'1px solid rgba(245,197,24,0.2)',padding:'14px 18px',marginTop:16}}>
                <div><div style={{fontSize:9,color:'var(--gray-700)',marginBottom:3,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:'0.15em',textTransform:'uppercase'}}>Primer pago</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:'var(--gold)',lineHeight:1}}>L. {(PLAN_MAP[form.plan]?.monto||0).toLocaleString('es-HN')}</div></div>
                <div><div style={{fontSize:9,color:'var(--gray-700)',marginBottom:3,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:'0.15em',textTransform:'uppercase'}}>Duración</div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:700,color:'var(--white)'}}>{PLAN_MAP[form.plan]?.duracion}</div></div>
                <div><div style={{fontSize:9,color:'var(--gray-700)',marginBottom:3,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:'0.15em',textTransform:'uppercase'}}>Válido hasta</div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:700,color:'var(--gold)'}}>{fmtFecha(vencePreview)}</div></div>
              </div>
            )}
            {formMode==='edit'&&<div style={{background:'var(--gray-900)',border:'1px solid var(--gray-800)',padding:'12px 16px',marginTop:16,fontSize:13,color:'var(--gray-400)'}}>Para renovar la membresia usa el boton <strong style={{color:'var(--gold)'}}>Pago</strong> en la tabla.</div>}
            <div style={{display:'flex',gap:12,marginTop:20}}>
              <button type="submit" className="btn-primary" disabled={saving}>{saving?'Guardando...':(formMode==='edit'?'Guardar cambios':'Registrar cliente')}</button>
              <button type="button" className="btn-outline" onClick={handleCancelForm} disabled={saving}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">{filtered.length} cliente{filtered.length!==1?'s':''}</span>
          <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
            <input className="table-search" placeholder="Buscar por nombre o plan..." value={search} onChange={e=>setSearch(e.target.value)}/>
            <button className="btn-primary" onClick={openAddForm}>+ Agregar</button>
          </div>
        </div>
        <div style={{overflowX:'auto'}}>
          <table>
            <thead><tr><th>Nombre</th><th>Plan</th><th>Vence</th><th>Teléfono</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {filtered.map(c=>(
                <tr key={c.id}>
                  <td style={{fontWeight:600}}>{c.nombre}</td>
                  <td style={{color:'var(--gray-400)'}}>{c.plan}</td>
                  <td style={{color:'var(--gray-400)',fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:'0.05em'}}>{fmtFecha(c.vence)}</td>
                  <td style={{color:'var(--gray-400)'}}>{c.telefono}</td>
                  <td><span className={`status-badge ${c.estado}`}>{estadoLabel[c.estado]}</span></td>
                  <td>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      <a href={`https://wa.me/${(c.telefono||'').replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${c.nombre.split(' ')[0]}!`)}`} target="_blank" rel="noreferrer" className="action-btn" style={{textDecoration:'none'}} title="WhatsApp">WA</a>
                      <button className="action-btn" onClick={()=>setPagoClient(c)} style={{color:'var(--gold)',borderColor:'rgba(245,197,24,0.3)'}} title="Registrar pago">Pago</button>
                      <button className="action-btn" onClick={()=>openEditForm(c)} style={{color:'#4299e1',borderColor:'rgba(66,153,225,0.3)'}} title="Editar">Edit</button>
                      <button className="action-btn" onClick={()=>setConfirmId(c.id)} style={{color:'var(--red)',borderColor:'rgba(229,62,62,0.3)'}} title="Eliminar">X</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length===0&&<tr><td colSpan={6} style={{textAlign:'center',padding:'40px',color:'var(--gray-700)'}}>{clientes.length===0?'Sin clientes registrados — agrega el primero':'Sin resultados'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   ADMIN PANEL
   ============================================================ */
const AdminPanel = ({ onLogout }) => {
  const [view,setView]=useState('dashboard'); const [clientes,setClientes]=useState([]); const [loading,setLoading]=useState(true); const [dbError,setDbError]=useState('');
  useEffect(()=>{ db.from('clientes').select('*').order('created_at',{ascending:false}).then(({data,error})=>{ if(error){setDbError('No se pudieron cargar los datos.');console.error(error);}else setClientes(data||[]); setLoading(false); }); },[]);
  if(loading) return <LoadingScreen mensaje="CONECTANDO CON SUPABASE..."/>;

  const navItems=[
    {id:'dashboard', icon:'📊', label:'Dashboard'},
    {id:'clientes',  icon:'👥', label:'Clientes'},
    {id:'pagos',     icon:'💳', label:'Pagos'},
    {id:'egresos',   icon:'📉', label:'Egresos'},
    {id:'ganancias', icon:'📈', label:'Ganancias'},
  ];

  return(
    <div>
      <nav className="nav">
        <a href="https://504hnfitness-public.vercel.app/" className="nav-logo"><div className="nav-logo-icon">⚡</div>504HNFITNESS</a>
        <div className="nav-right"><span className="nav-tag">Panel Admin</span><button className="nav-btn" onClick={onLogout}>Cerrar sesión</button></div>
      </nav>
      {dbError&&<div style={{background:'rgba(229,62,62,0.1)',borderBottom:'1px solid rgba(229,62,62,0.3)',color:'#fc8181',fontSize:13,padding:'10px 32px',textAlign:'center'}}>⚠ {dbError}</div>}
      <div className="admin-wrap">
        <aside className="sidebar">
          <div style={{flex:1}}>
            {navItems.map(item=>(
              <button key={item.id} className={`sidebar-item ${view===item.id?'active':''}`} onClick={()=>setView(item.id)}>
                <span className="sidebar-icon">{item.icon}</span>{item.label}
              </button>
            ))}
          </div>
          <div className="sidebar-bottom">
            <button className="sidebar-item" style={{color:'var(--red)'}} onClick={onLogout}><span className="sidebar-icon">🚪</span> Salir</button>
          </div>
        </aside>
        <main className="admin-main">
          {view==='dashboard' && <Dashboard clientes={clientes}/>}
          {view==='clientes'  && <ClientesPanel clientes={clientes} setClientes={setClientes}/>}
          {view==='pagos'     && <PagosPanel/>}
          {view==='egresos'   && <EgresosPanel/>}
          {view==='ganancias' && <GananciasPanel/>}
        </main>
      </div>
    </div>
  );
};

/* ============================================================
   APP ROOT
   ============================================================ */
const App = () => {
  const [isLoggedIn,setIsLoggedIn]=useState(false);
  return isLoggedIn ? <AdminPanel onLogout={()=>setIsLoggedIn(false)}/> : <LoginPage onLogin={()=>setIsLoggedIn(true)}/>;
};

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
