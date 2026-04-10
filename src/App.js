import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, 
  Navigation, Clock, LayoutList, ShieldCheck, Sparkles, Camera, Loader2, CheckCircle2, Share2, Upload
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// CSS de Leaflet
import 'leaflet/dist/leaflet.css';

// Fix Marcadores Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// COMPONENTE PARA FORZAR EL MAPA A ESPAÑA
function MapSpainControl() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
      map.setView([40.4167, -3.7037], 6); // Madrid, Centro de España
    }, 500);
  }, [map]);
  return null;
}

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL, 
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState([]); 
  const [isDark, setIsDark] = useState(true);
  const [view, setView] = useState('home'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeCategory, setActiveCategory] = useState('TODOS');
  const [form, setForm] = useState({ title: '', category: 'MUSICA', city: '', address: '', date: '', time: '21:00', image_url: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState(null);

  const showNotification = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetchEvents();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) { setUser(session.user); loadUserData(session.user.id); }
      else { setUser(null); setProfile(null); setFavorites([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (id) => {
    if (id === '4d76c965-66de-491d-8cc1-6d37096262c9') {
      setProfile({ role: 'admin' });
    } else {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (prof) setProfile(prof);
    }
    const { data: f } = await supabase.from('favorites').select('event_id').eq('user_id', id);
    if (f) setFavorites(f.map(item => String(item.event_id)));
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    setEvents(data || []);
  };

  const generateIA = () => {
    if (!form.title) return showNotification("Pon un título ✨");
    setIsProcessing(true);
    const urlIA = `https://image.pollinations.ai/prompt/professional_event_photo_of_${encodeURIComponent(form.title)}?width=800&height=1000&seed=${Date.now()}&nologo=true`;
    const img = new Image();
    img.src = urlIA;
    img.onload = () => { setForm({...form, image_url: urlIA}); setIsProcessing(false); showNotification("IA: Imagen Lista ✨"); };
  };

  const handleGalleryUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const name = `${Date.now()}_img.jpg`;
      await supabase.storage.from('event-images').upload(name, file);
      const { data } = supabase.storage.from('event-images').getPublicUrl(name);
      setForm({ ...form, image_url: data.publicUrl });
      showNotification("¡Foto subida!");
    } catch (err) { alert("Error"); }
    finally { setIsProcessing(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.image_url) return showNotification("Falta foto ✨");
    setIsSubmitting(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.address + ', ' + form.city + ', España')}&limit=1`);
      const geo = await res.json();
      let lat = 40.41; let lng = -3.70;
      if (geo && geo.length > 0) { lat = parseFloat(geo[0].lat); lng = parseFloat(geo[0].lon); }
      await supabase.from('events').insert([{ ...form, lat, lng, status: profile?.role === 'admin' ? 'approved' : 'pending', organizer_id: user?.id }]);
      showNotification("¡Enviado!");
      setView('home'); fetchEvents();
      setForm({ title: '', category: 'MUSICA', city: '', address: '', date: '', time: '21:00', image_url: '' });
    } catch (err) { alert("Error"); }
    finally { setIsSubmitting(false); }
  };

  const toggleFavorite = async (ev) => {
    if (!user) return showNotification("Inicia sesión ❤️");
    const id = String(ev.id);
    if (favorites.includes(id)) {
      setFavorites(f => f.filter(i => i !== id));
      await supabase.from('favorites').delete().match({ user_id: user.id, event_id: id });
    } else {
      setFavorites(f => [...f, id]);
      await supabase.from('favorites').insert({ user_id: user.id, event_id: id });
    }
  };

  const publicEvents = events.filter(e => e.status === 'approved' && (activeCategory === 'TODOS' || e.category === activeCategory));
  const pendingCount = events.filter(e => e.status === 'pending').length;

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-white font-sans overflow-hidden transition-all duration-500">
        
        {toast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-2xl animate-in slide-in-from-top">
            <span className="font-black uppercase text-[10px] tracking-widest italic">{toast}</span>
          </div>
        )}

        {/* HEADER */}
        <nav className="h-[65px] shrink-0 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b dark:border-slate-800 flex justify-between items-center px-6 z-[2000] shadow-sm">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white font-bold text-xl shadow-lg">E</div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">Eventos</h1>
          </div>
          <div className="flex items-center gap-3">
            {(profile?.role === 'admin' || user?.id === '4d76c965-66de-491d-8cc1-6d37096262c9') && (
              <button onClick={() => setView('admin')} className={`p-2 transition ${pendingCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`}>
                <ShieldCheck size={26}/>
              </button>
            )}
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
              {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
            </button>
            {user ? <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black text-sm cursor-pointer shadow-md" onClick={() => setView('profile')}>{user.email[0].toUpperCase()}</div> : <button onClick={() => {const e = window.prompt("Email:"); if(e) supabase.auth.signInWithOtp({email:e})}} className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase shadow-md">Entrar</button>}
          </div>
        </nav>

        <main className="flex-1 relative overflow-y-auto no-scrollbar">
          
          {/* HOME - TARJETAS COMPACTAS PARA QUE SE VEA EL BOTÓN */}
          {view === 'home' && (
            <div className="max-w-xl mx-auto p-4 pb-40 animate-in fade-in">
              <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar pt-2">
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINOS', 'FIESTAS PATRONALES', 'OTROS'].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2.5 rounded-xl font-black text-[9px] tracking-widest transition-all shrink-0 border-2 ${activeCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-900/40 text-slate-500 border-slate-800'}`}>{cat}</button>
                ))}
              </div>
              <div className="space-y-6">
                {publicEvents.map(ev => (
                  <div key={ev.id} className="bg-[#0f172a] rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl flex flex-col h-[480px] transition-all">
                    <div className="relative h-56 overflow-hidden cursor-pointer" onClick={() => setSelectedEvent(ev)}>
                      <img src={ev.image_url} className="w-full h-full object-cover" alt="img" />
                      <div className="absolute top-4 left-4 font-black bg-black/60 text-white text-[8px] px-3 py-1 rounded-full uppercase tracking-widest backdrop-blur-md">{ev.category}</div>
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(ev); }} className="absolute top-4 right-4 p-3 bg-slate-900/60 backdrop-blur-md rounded-full text-red-500 shadow-lg"><Heart size={18} fill={favorites.includes(String(ev.id)) ? "red" : "none"} /></button>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between text-center">
                      <h3 className="text-xl font-black leading-tight uppercase tracking-tighter italic text-white line-clamp-2">{ev.title}</h3>
                      <button onClick={() => setSelectedEvent(ev)} className="w-full bg-indigo-600 text-white py-4 rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">Ver Detalles</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA MAPA - ESPAÑA EN ESPAÑOL (ARCGIS ORIGINAL) */}
          {view === 'map' && ( 
            <div className="absolute inset-0 z-0 bg-[#020617]"> 
              <MapContainer center={[40.41, -3.70]} zoom={6} className="h-full w-full" zoomControl={false}> 
                <SpainMapControl />
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" attribution='ESPAÑA' /> 
                {publicEvents.map(ev => ev.lat && (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                    <Popup>
                      <div className="p-1 text-center" onClick={() => setSelectedEvent(ev)}>
                        <div className="font-black text-[9px] uppercase text-indigo-600 mb-1">{ev.title}</div>
                        <button className="text-[7px] bg-indigo-600 text-white px-2 py-0.5 rounded-md">VER</button>
                      </div>
                    </Popup>
                  </Marker>
                ))} 
              </MapContainer> 
            </div> 
          )}

          {/* CREAR, ADMIN, FAVORITOS (Mantenidos igual) */}
          {view === 'create' && (
            <div className="max-w-xl mx-auto p-4 pb-60 animate-in slide-in-from-bottom">
              <div className="bg-[#0f172a] rounded-[2.5rem] p-6 border border-slate-800 shadow-2xl text-left">
                <h2 className="text-xl font-black mb-6 text-indigo-500 text-center uppercase italic underline underline-offset-8">Publicar</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                  <input required placeholder="TÍTULO" className="w-full p-4 bg-slate-800 rounded-2xl outline-none font-bold uppercase text-xs text-white" value={form.title} onChange={e => setForm({...form, title: e.target.value.toUpperCase()})} />
                  <select className="w-full p-4 bg-slate-800 rounded-2xl outline-none font-black text-[10px] uppercase text-white" value={form.category} onChange={e => setForm({...form, category: e.target.value})}><option value="MUSICA">MÚSICA</option><option value="GASTRONOMIA">GASTRONOMÍA</option><option value="TAURINOS">TAURINOS</option><option value="FIESTAS PATRONALES">FIESTAS PATRONALES</option><option value="OTROS">OTROS</option></select>
                  <div className="grid grid-cols-2 gap-3">
                    <input required placeholder="CIUDAD" className="w-full p-4 bg-slate-800 rounded-2xl outline-none font-bold uppercase text-[10px] text-white" value={form.city} onChange={e => setForm({...form, city: e.target.value.toUpperCase()})} />
                    <input required placeholder="DIRECCIÓN" className="w-full p-4 bg-slate-800 rounded-2xl outline-none font-bold text-[10px] text-white uppercase" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                  </div>
                  <div className="flex gap-2">
                    <input required type="date" className="flex-1 p-4 bg-slate-800 rounded-2xl text-[10px] font-bold text-white outline-none" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                    <input required type="time" className="w-24 p-4 bg-slate-800 rounded-2xl text-[10px] font-bold text-white outline-none" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
                  </div>
                  <div className="pt-2 text-center">
                    <div className="h-40 w-full bg-slate-800 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-dashed border-indigo-500/20 mb-4">
                      {isProcessing ? <Loader2 className="animate-spin text-indigo-500"/> : form.image_url ? <img src={form.image_url} className="w-full h-full object-cover" alt="p" /> : <Camera className="text-slate-600" size={30}/>}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={generateIA} className="flex-1 bg-indigo-600 text-white p-3 rounded-xl font-black text-[8px] uppercase flex items-center justify-center gap-1 shadow-lg shadow-indigo-500/20"><Sparkles size={14}/> GENERAR IA</button>
                      <label className="flex-1 bg-slate-700 text-white p-3 rounded-xl font-black text-[8px] uppercase flex items-center justify-center gap-1 cursor-pointer"><Upload size={14}/> GALERÍA<input type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} /></label>
                    </div>
                  </div>
                  <button type="submit" disabled={isSubmitting || isProcessing} className="w-full bg-white text-slate-900 p-4 rounded-xl font-black shadow-xl mt-4 uppercase text-[9px] tracking-widest active:scale-95 transition-all">PUBLICAR</button>
                </form>
              </div>
            </div>
          )}

          {view === 'admin' && (
            <div className="max-w-xl mx-auto p-6 pb-60 text-center animate-in slide-in-from-top">
              <h2 className="text-xl font-black mb-8 text-amber-500 uppercase italic tracking-tighter underline underline-offset-8">Moderación</h2>
              {events.filter(e => e.status === 'pending').map(ev => (
                <div key={ev.id} className="bg-[#0f172a] rounded-[2rem] mb-6 border border-slate-800 overflow-hidden shadow-xl text-left">
                  <img src={ev.image_url} className="h-44 w-full object-cover" alt="p"/>
                  <div className="p-6">
                    <h4 className="font-black text-xl mb-2 text-white uppercase italic">{ev.title}</h4>
                    <div className="flex gap-4 mt-4">
                        <button onClick={async () => { await supabase.from('events').update({ status: 'approved' }).eq('id', ev.id); fetchEvents(); showNotification("¡Aprobado!"); }} className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-[10px]">Aprobar</button>
                        <button onClick={async () => { await supabase.from('events').delete().eq('id', ev.id); fetchEvents(); showNotification("¡Borrado!"); }} className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-[10px] opacity-60">Borrar</button>
                    </div>
                  </div>
                </div>
              ))}
              {events.filter(e => e.status === 'pending').length === 0 && <p className="opacity-40 font-black uppercase text-[10px]">No hay pendientes</p>}
            </div>
          )}

        </main>

        {/* NAVEGACIÓN INFERIOR */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] bg-[#0f172a]/95 backdrop-blur-3xl border border-slate-800 h-[75px] rounded-[2rem] shadow-2xl flex items-center justify-around z-[2000] px-4 transition-all">
          <button onClick={() => {setView('home'); setSelectedEvent(null);}} className={`p-3 rounded-xl transition-all ${view === 'home' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "text-slate-500"}`}><LayoutList size={22}/></button>
          <button onClick={() => setView('create')} className={`p-3 rounded-xl transition-all ${view === 'create' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "text-slate-500"}`}><PlusCircle size={22}/></button>
          <button onClick={() => setView('favorites')} className={`p-3 rounded-xl transition-all ${view === 'favorites' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "text-slate-500"}`}><Heart size={22}/></button>
          <button onClick={() => setView('map')} className={`p-3 rounded-xl transition-all ${view === 'map' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "text-slate-500"}`}><MapIcon size={22}/></button>
        </div>

        {/* MODAL DETALLES */}
        {selectedEvent && (
          <div className="fixed inset-0 z-[3000] bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-300 text-left">
            <div className="bg-[#0f172a] w-full max-w-[380px] h-[85vh] rounded-[3rem] overflow-hidden relative border border-slate-800 border-b-8 border-indigo-600 flex flex-col shadow-2xl">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 z-50 p-3 bg-white/10 rounded-full text-white active:scale-90 transition shadow-xl"><X size={20} /></button>
              <img src={selectedEvent.image_url} className="h-52 w-full object-cover shrink-0" alt="hero" />
              <div className="p-8 flex flex-col flex-1 overflow-y-auto no-scrollbar">
                <h2 className="text-2xl font-black mb-6 leading-tight text-white uppercase italic tracking-tighter">{selectedEvent.title}</h2>
                <div className="flex gap-2 mb-8 text-center">
                  <button onClick={() => { toggleFavorite(selectedEvent); showNotification("¡Apuntado!"); }} className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-black text-xs shadow-xl flex items-center justify-center gap-2 uppercase italic transition active:scale-95 shadow-indigo-500/20"><Sparkles size={14} /> ¡VOY A IR!</button>
                  <button onClick={() => { if(navigator.share) { navigator.share({title: selectedEvent.title, url: window.location.href}); } else { showNotification("Copiado"); } }} className="p-4 bg-slate-800 text-white rounded-xl active:scale-90 transition"><Share2 size={20} /></button>
                </div>
                <div className="space-y-4">
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.city)}`} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 bg-slate-800 rounded-2xl border border-slate-800 transition active:scale-95">
                    <div className="p-2 bg-indigo-600 text-white rounded-lg"><MapPin size={20} /></div>
                    <div className="overflow-hidden"><p className="text-[9px] font-black text-white uppercase mb-1 tracking-tighter line-clamp-1">{selectedEvent.address}</p><p className="text-[8px] font-black text-indigo-500 uppercase">{selectedEvent.city}</p></div>
                  </a>
                  <div className="flex gap-2 text-center">
                    <div className="flex-1 flex items-center gap-3 p-4 bg-slate-800 rounded-2xl border border-slate-800 text-white text-[9px] font-black tracking-tighter uppercase italic"><Calendar size={18} className="text-amber-500" /> {selectedEvent.date}</div>
                    <div className="flex-1 flex items-center gap-3 p-4 bg-slate-800 rounded-2xl border border-slate-800 text-white text-[9px] font-black tracking-tighter uppercase italic"><Clock size={18} className="text-emerald-500" /> {selectedEvent.time} HS</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
