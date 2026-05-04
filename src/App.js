export default function App() {
  const [events, setEvents] = useState([]);
  const [view, setView] = useState('home');
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [profile, setProfile] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const showToast = (m, t = 'info') => { setToast({ message: m, type: t }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserEmail(session.user.email);
        if (ADMIN_EMAILS.includes(session.user.email)) setProfile({ role: 'admin' });
      }
    });
    fetchEvents();
  }, []);

  async function fetchEvents() {
    const { data } = await supabase.from('events').select('*');
    if (data) setEvents(data);
  }

  async function openImagePicker() {
    if (!form.category) { showToast('Selecciona categoría', 'error'); return; }
    const folder = form.category === 'FIESTAS PATRONALES' ? 'FIESTAS POPULARES' : form.category;
    setIsGenerating(true);
    const { data } = await supabase.storage.from('event-images').list(folder);
    setIsGenerating(false);
    
    if (!data || data.length === 0) { showToast('No hay fotos en esta carpeta', 'error'); return; }

    const modal = document.createElement('div');
    modal.id = 'picker-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;';
    
    let html = `<div style="background:#1e293b;padding:20px;border-radius:20px;width:90%;max-width:400px;max-height:80vh;overflow:auto;color:white;">
                  <h3 style="text-align:center;margin-bottom:15px;">Elige una foto</h3>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">`;
    
    data.forEach(f => {
       const { data: u } = supabase.storage.from('event-images').getPublicUrl(folder + '/' + f.name);
       html += `<img src="${u.publicUrl}" style="width:100%;height:100px;object-fit:cover;cursor:pointer;border-radius:10px;" onclick="window.pickImage('${u.publicUrl}')" />`;
    });
    
    html += '</div><button id="close" style="width:100%;margin-top:15px;padding:10px;background:#ef4444;border:none;color:white;border-radius:10px;cursor:pointer;">Cerrar</button></div>';
    modal.innerHTML = html; document.body.appendChild(modal);

    window.pickImage = (url) => { setForm(p => ({...p, image_url: url })); modal.remove(); delete window.pickImage; };
    document.getElementById('close').onclick = () => { modal.remove(); delete window.pickImage; };
  }

  async function handleSubmitEvent() {
    if (!form.title || !form.date || !form.city || !form.address) { showToast('Faltan campos', 'error'); return; }
    if (!form.image_url) { showToast('Debes añadir una foto', 'error'); return; }
    
    setIsSubmitting(true);
    const { error } = await supabase.from('events').insert([{ ...form, status: 'pending', created_by: userEmail }]);
    
    if (error) { 
        showToast('Error: ' + error.message, 'error'); 
        setIsSubmitting(false); 
    } else { 
        showToast('Evento enviado', 'success'); 
        setForm(INITIAL_FORM); 
        setView('home'); 
        fetchEvents(); 
        setIsSubmitting(false); 
    }
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#020617', color: 'white' }}>
      <Toast toast={toast} />
      <main style={{ padding: 20 }}>
        {view === 'home' && (
           <div>
             {events.filter(e => e.status === 'approved').sort((a,b) => new Date(a.date) - new Date(b.date)).map(ev => (
               <div key={ev.id} style={{ padding: 15, borderRadius: 20, marginBottom: 10, background: '#1e293b' }}>
                 <img src={ev.image_url} style={{ width: '100%', borderRadius: 10 }} alt="event"/>
                 <h3>{ev.title}</h3>
               </div>
             ))}
           </div>
        )}
        {view === 'create' && (
           <div style={{ padding: 20, background: '#1e293b', borderRadius: 20 }}>
             <input name="title" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Título" style={{ width: '100%', padding: 10, marginBottom: 10 }} />
             <select name="category" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} style={{ width: '100%', padding: 10 }}>
                <option value="MUSICA">MUSICA</option>
                <option value="GASTRONOMIA">GASTRONOMIA</option>
                <option value="TAURINO">TAURINO</option>
                <option value="FIESTAS PATRONALES">FIESTAS PATRONALES</option>
                <option value="OTROS">OTROS</option>
             </select>
             <button onClick={openImagePicker} style={{ marginTop: 10, width: '100%', padding: 10 }}>ELEGIR FOTO CATÁLOGO</button>
             {form.image_url && <img src={form.image_url} style={{ width: '100%', marginTop: 10, borderRadius: 10 }} alt="prev"/>}
             <button onClick={handleSubmitEvent} style={{ marginTop: 20, width: '100%', padding: 15, background: '#4f46e5', color: 'white', borderRadius: 10, border: 'none' }}>
                {isSubmitting ? 'Enviando...' : 'ENVIAR REVISIÓN'}
             </button>
           </div>
        )}
      </main>
      <nav style={{ position: 'fixed', bottom: 0, width: '100%', display: 'flex', justifyContent: 'space-around', padding: 15, background: '#1e293b' }}>
        <button onClick={() => setView('home')}><LayoutList color="white" /></button>
        <button onClick={() => setView('create')}><PlusCircle color="white" /></button>
      </nav>
    </div>
  );
}

  return { blob: file, extension: file.name.split('.').pop() || 'jpg', type: file.type, originalSize: file.size, compressedSize: file.size };
}

function Toast({ toast }) {
  if (!toast) return null;
  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';
  const bg = isSuccess ? 'rgba(22, 163, 74, 0.96)' : isError ? 'rgba(220, 38, 38, 0.96)' : 'rgba(79, 70, 229, 0.96)';
  const Icon = isSuccess ? CheckCircle : isError ? XCircle : Info;

  return (
    <div style={{
      position: 'fixed', top: 62, left: '50%', transform: 'translateX(-50%)',
      zIndex: 999999, width: '90%', maxWidth: 420, background: bg, color: 'white',
      borderRadius: 16, padding: '12px 14px', boxShadow: '0 12px 35px rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 900,
      lineHeight: 1.35, border: '1px solid rgba(255,255,255,0.22)', animation: 'toastIn 0.25s ease-out'
    }}>
      <Icon size={20} />
      <span style={{ flex: 1 }}>{toast.message}</span>
    </div>
  );
}

function Splash({ onDone }) {
  useEffect(() => {
    const t = setTimeout(() => {
      if (onDone) onDone();
    }, 1000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999, background: '#020617',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20
    }}>
      <img src="/icon-512.png" alt="Eventora" style={{ height: 74, width: 74, borderRadius: 18, objectFit: 'cover' }} />
      <p style={{ color: '#6366f1', fontSize: 11, fontWeight: 700 }}>Cargando eventos...</p>
      <Loader2 className="animate-spin" size={24} color="#4f46e5" />
    </div>
  );
}

function MapResizer({ center }) {
  const map = useMap();
  const prevCenter = useRef(null);

  useEffect(() => {
    map.invalidateSize();
    if (center) {
      const isNew = !prevCenter.current || prevCenter.current[0] !== center[0] || prevCenter.current[1] !== center[1];
      if (isNew) {
        map.flyTo(center, 11, { animate: true, duration: 1.5 });
        prevCenter.current = center;
      }
    } else {
      map.setView([40.4167, -3.7037], 6);
      prevCenter.current = null;
    }
  }, [center, map]);

  return null;
}

function exportToCSV(events) {
  if (!events.length) return alert('No hay eventos para exportar.');
  const headers = ['Titulo', 'Ciudad', 'Localidad', 'Direccion', 'Fecha', 'Hora', 'Categoria', 'Estado', 'Lat', 'Lng'];
  const rows = events.map((e) => {
    return [e.title || '', e.city || '', e.localidad || '', e.address || '', formatDate(e.date), e.time || '', e.category || '', e.status || '', e.lat || '', e.lng || '']
      .map((x) => '"' + String(x).replace(/"/g, '""') + '"').join(';');
  });
  const csv = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'eventora_eventos_' + new Date().toISOString().split('T')[0] + '.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}
