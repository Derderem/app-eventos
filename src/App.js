import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, 
  Navigation, Clock, LayoutList, ShieldCheck, Sparkles, Camera, Loader2, CheckCircle2, Share2, Upload
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// CSS OBLIGATORIO DE LEAFLET
import 'leaflet/dist/leaflet.css';

// Reparación de iconos de marcadores
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// COMPONENTE QUE FUERZA EL MAPA A ESPAÑA Y EN ESPAÑOL
function SpainMapFix() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize(); // Corrige los cuadros blancos
      map.setView([40.4167, -3.7037], 6); // Centra en Madrid
    }, 400);
    return () => clearTimeout(timer);
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
    try {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (prof) setProfile(prof);
      // Forzar Admin por tu ID
      if (id === '4d76c965-66de-491d-8cc1-6d37096262c9') setProfile({ role: 'admin' });
      const { data: f } = await supabase.from('favorites').select('event_id').eq('user_id', id);
      if (f) setFavorites(f.map(item => String(item.event_id)));
    } catch (e) { console.log("Cargando..."); }
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    setEvents(data || []);
  };

  const handleLogin = async () => {
    const e = window.prompt("Email:");
    if (e) await supabase.auth.signInWithOtp({ email: e, options: { emailRedirectTo: window.location.origin } });
  };

  const generateIA = () => {
    if (!form.title) return showNotification("Escribe un título ✨");
    setIsProcessing(true);
    const urlIA = `https://image.pollinations.ai/prompt/professional_event_photography_of_${encodeURIComponent(form.title)}?width=800&height=1000&seed=${Date.now()}&nologo=true`;
    const img = new Image();
    img.src = urlIA;
    img.onload = () => { setForm({...form, image_url: urlIA}); setIsProcessing(false); showNotification("Imagen Lista ✨"); };
  };

  const handleGalleryUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const fileName = `${Date.now()}.jpg`;
      await supabase.storage.from('event-images').upload(fileName, file);
      const { data } = supabase.storage.from('event-images').getPublicUrl(fileName);
      setForm({ ...form, image_url: data.publicUrl });
      showNotification("Foto subida!");
    } catch (err) { alert("Error de subida"); }
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
      <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-white font-sans overflow-hidden">
        
        {toast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top">
            <CheckCircle2 size={18} className="inline mr-2"/> <span className="font-black uppercase text-[10px] tracking-widest">{toast}</span>
          </div>
        )}

        {/* HEADER CON ESCUDO */}
        <nav className="h-[70px] shrink-0 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b dark:border-slate-800 flex justify-between items-center px-8 z-[2000] shadow-sm">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold shadow-lg shadow-indigo-500/30 text-xl italic">E</div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">Eventos</h1>
          </div>
          <div className="flex items-center gap-4">
            {(profile?.role === 'admin' || user?.id === '4d76c965-66de-491d-8cc1-6d37096262c9') && (
              <button onClick={() => setView('admin')} className={`p-2 transition ${pendingCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`}>
                <ShieldCheck size={28}/>
              </button>
            )}
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 transition-all">
              {isDark ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} className="text-indigo-600" />}
            </button>
            {user ? <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black border-2 border-white shadow-xl cursor-pointer" onClick={() => setView('profile')}>{user.email[0].toUpperCase()}</div> : <button onClick={handleLogin} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase shadow-lg">Entrar</button>}
          </div>
        </nav>

        <main className="flex-1 relative overflow-y-auto no-scrollbar">
          
          {/* HOME CON TARJETAS COMPACTAS */}
          {view === 'home' && (
            <div className="max-w-6xl mx-auto p-4 pb-40 animate-in fade-in">
              <div className="flex gap-2 overflow-x-auto pb-8 no-scrollbar pt-2">
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINOS', 'FIESTAS PATRONALES', 'OTROS'].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2.5 rounded-full font-black text-[9px] tracking-widest transition-all shrink-0 border-2 ${activeCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-[#0f172a] text-slate-400 border-slate-100 dark:border-slate-800'}`}>{cat}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-2">
                {publicEvents.map(ev => (
                  <div key={ev.id} className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl flex flex-col h-[480px] group transition-all">
                    <div className="relative h-60 overflow-hidden cursor-pointer" onClick={() => setSelectedEvent(ev)}>
                      <img src={ev.image_url} className="w-full h-full object-cover group-hover:scale-105 transition duration-1000" alt="img" />
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(ev); }} className="absolute top-5 right-5 p-3 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 shadow-xl active:scale-75 transition">
                        <Heart size={20} fill={favorites.includes(String(ev.id)) ? "red" : "none"} />
                      </button>
                    </div>
                    <div className="p-6 flex flex-col flex-1 justify-between text-center">
                      <h3 className="text-xl font-black leading-tight uppercase tracking-tighter italic">{ev.title}</h3>
                      <button onClick={() => setSelectedEvent(ev)} className="w-full bg-indigo-600 text-white py-4 rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-lg active:scale-95 transition-all">Ver Detalles</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA MAPA - FORZADA ESPAÑA Y ESPAÑOL */}
          {view === 'map' && ( 
            <div className="absolute inset-0 z-0 bg-[#020617]"> 
              <MapContainer 
                key={view} 
                center={[40.41, -3.70]} 
                zoom={6} 
                className="h-full w-full" 
                zoomControl={false}
              > 
                <SpainMapFix />
                <TileLayer 
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{y}/{x}{r}.png" 
                  attribution='&copy; OpenStreetMap contributors' 
                /> 
                {publicEvents.map(ev => ev.lat && (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                    <Popup>
                      <div className="p-1 font-bold text-center" onClick={() => setSelectedEvent(ev)}>
                        <p className="uppercase text-[10px] text-indigo-600 leading-tight">{ev.title}</p>
                        <p className="text-[8px] opacity-60 uppercase">{ev.city}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))} 
              </MapContainer> 
            </div> 
          )}

          {/* CREAR EVENTO - RELOJ 24H */}
          {view === 'create' && (
            <div className="max-w-xl mx-auto p-6 pb-80 animate-in slide-in-from-bottom">
              <div className="bg-white dark:bg-[#0f172a] rounded-[3.5rem] p-10 border dark:border-slate-800 shadow-2xl">
                <h2 className="text-3xl font-black mb-8 text-indigo-500 text-center uppercase tracking-tighter italic underline underline-offset-8">Publicar</h2>
                <form onSubmit={handleCreate} className="space-y-4 text-left">
                  <input required placeholder="TÍTULO" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-bold uppercase" value={form.title} onChange={e => setForm({...form, title: e.target.value.toUpperCase()})} />
                  <select className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-black text-xs uppercase" value={form.category} onChange={e => setForm({...form, category: e.target.value})}><option value="MUSICA">MÚSICA</option><option value="GASTRONOMIA">GASTRONOMÍA</option><option value="TAURINOS">TAURINOS</option><option value="FIESTAS PATRONALES">FIESTAS PATRONALES</option><option value="OTROS">OTROS</option></select>
                  <input required placeholder="CIUDAD" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-bold uppercase" value={form.city} onChange={e => setForm({...form, city: e.target.value.toUpperCase()})} />
                  <input required placeholder="DIRECCIÓN EXACTA" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none text-sm" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                  <div className="flex gap-2">
                    <input required type="date" className="flex-1 p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl text-xs font-bold" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                    <input required type="time" className="w-32 p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl text-xs font-bold" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
                  </div>
                  <div className="pt-6 border-t dark:border-slate-800 text-center">
                    <div className="h-44 w-full bg-slate-50 dark:bg-slate-800 rounded-[2rem] overflow-hidden mb-4 flex items-center justify-center border-4 border-dashed border-indigo-500/20">
                      {isProcessing ? <Loader2 className="animate-spin text-indigo-600"/> : form.image_url ? <img src={form.image_url} className="w-full h-full object-cover" alt="IA" /> : <Camera size={32} className="text-slate-300"/>}
                    </div>
                    <div className="flex gap-2 w-full">
                       <label className="flex-1 bg-slate-900 dark:bg-slate-700 text-white p-4 rounded-2xl font-black text-[10px] flex items-center justify-center gap-2 uppercase cursor-pointer transition shadow-lg"><Upload size={16}/> GALERÍA<input type="file" className="hidden" accept="image/*" onChange={handleGalleryUpload} /></label>
                       <button type="button" onClick={generateIA} className="flex-1 bg-white dark:bg-indigo-600 dark:text-white border-2 border-indigo-600 text-indigo-600 p-4 rounded-2xl font-black text-[10px] uppercase shadow-sm font-black">IA ✨</button>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white p-6 rounded-3xl font-black shadow-xl mt-4 uppercase">PUBLICAR AHORA</button>
                </form>
              </div>
            </div>
          )}

          {view === 'admin' && (
            <div className="max-w-2xl mx-auto p-6 pb-80 animate-in slide-in-from-top text-left">
              <h2 className="text-3xl font-black mb-8 text-amber-500 italic text-center uppercase tracking-tighter underline underline-offset-8">Moderación 🛡️</h2>
              {events.filter(e => e.status === 'pending').map(ev => (
                <div key={ev.id} className="bg-white dark:bg-[#0f172a] rounded-[3rem] mb-8 border-2 border-amber-500/20 shadow-xl overflow-hidden flex flex-col">
                  <img src={ev.image_url} className="h-52 w-full object-cover" alt="p"/>
                  <div className="p-8 text-center">
                    <h4 className="font-black text-xl mb-4 italic uppercase">{ev.title}</h4>
                    <div className="flex gap-4">
                      <button onClick={async () => { await supabase.from('events').update({ status: 'approved' }).eq('id', ev.id); fetchEvents(); showNotification("¡Aprobado!"); }} className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg">Aprobar</button>
                      <button onClick={async () => { await supabase.from('events').delete().eq('id', ev.id); fetchEvents(); showNotification("¡Borrado!"); }} className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-xs opacity-60">Borrar</button>
                    </div>
                  </div>
                </div>
              ))}
              {events.filter(e => e.status === 'pending').length === 0 && <p className="text-center opacity-40 font-bold uppercase italic">Nada pendiente</p>}
            </div>
          )}

        </main>

        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[460px] bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-2xl border dark:border-slate-800 h-[80px] rounded-[2.5rem] shadow-2xl flex items-center justify-around z-[2000] px-6 border-b-4 border-b-indigo-500/20 transition-all">
          <button onClick={() => {setView('home'); setSelectedEvent(null)}} className={`p-3 transition-all ${view === 'home' ? "text-indigo-600 scale-125 shadow-indigo-500/50" : "text-slate-400 opacity-40"}`}><LayoutList size={26}/></button>
          <button onClick={() => setView('create')} className={`p-3 transition-all ${view === 'create' ? "text-indigo-600 scale-125 shadow-indigo-500/50" : "text-slate-400 opacity-40"}`}><PlusCircle size={32}/></button>
          <button onClick={() => {setView('favorites'); setSelectedEvent(null)}} className={`p-3 transition-all ${view === 'favorites' ? "text-indigo-600 scale-125" : "text-slate-400"}`}><Heart size={26}/></button>
          <button onClick={() => setView('map')} className={`p-3 transition-all ${view === 'map' ? "text-indigo-600 scale-125 shadow-indigo-500/50" : "text-slate-400 opacity-40"}`}><MapIcon size={26}/></button>
        </nav>

        {selectedEvent && (
          <div className="fixed inset-0 z-[3000] bg-black/95 flex items-center justify-center p-3 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#0f172a] w-full max-w-[380px] h-[85vh] rounded-[3.5rem] overflow-hidden relative shadow-2xl border dark:border-slate-800 border-b-[8px] border-b-indigo-600 flex flex-col text-left">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 z-50 p-2.5 bg-black/50 text-white rounded-full active:scale-90 transition shadow-xl"><X size={20} /></button>
              <img src={selectedEvent.image_url} className="h-52 w-full object-cover shrink-0" alt="hero" />
              <div className="p-8 flex flex-col flex-1 overflow-y-auto no-scrollbar">
                <h2 className="text-2xl font-black mb-6 leading-tight tracking-tighter uppercase italic">{selectedEvent.title}</h2>
                <button onClick={() => {toggleFavorite(selectedEvent); showNotification("¡Confirmado!");}} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl transition mb-8 uppercase italic flex items-center justify-center gap-2"> ¡VOY A IR! <Heart size={20} fill={favorites.includes(String(selectedEvent.id)) ? "white" : "none"} /> </button>
                <div className="space-y-6 text-slate-600 dark:text-slate-300 font-black">
                   <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.city)}`} target="_blank" rel="noreferrer" className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl transition active:scale-95"><div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600"><MapPin size={22} /></div><div className="flex-1 overflow-hidden uppercase italic"><p className="text-xs line-clamp-1">{selectedEvent.address}</p><p className="text-[10px] opacity-60">{selectedEvent.city}</p></div></a>
                   <div className="flex gap-3">
                     <div className="flex-1 flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl"><Calendar size={20} className="text-indigo-600" /><div className="text-[10px] uppercase italic">{selectedEvent.date}</div></div>
                     <div className="flex-1 flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl"><Clock size={20} className="text-indigo-600" /><div className="text-[10px] uppercase italic">{selectedEvent.time} HS</div></div>
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
