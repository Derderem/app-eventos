import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, 
  Navigation, Clock, LayoutList, ShieldCheck, Sparkles, Camera, Loader2, CheckCircle2, Share2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Configuración de Iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapResizer() {
  const map = useMap();
  useEffect(() => { setTimeout(() => { map.invalidateSize(); }, 600); }, [map]);
  return null;
}

// Inicialización de Supabase
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL, 
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } }
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
  const [rejectingId, setRejectingId] = useState(null);
  const [reasonText, setReasonText] = useState("");

  const showNotification = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetchEvents();
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) { setUser(session.user); loadUserData(session.user.id); }
      else { setUser(null); setProfile(null); setFavorites([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) { setUser(session.user); loadUserData(session.user.id); }
  };

  const loadUserData = async (id) => {
    try {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (prof) setProfile(prof);
      if (id === '4d76c965-66de-491d-8cc1-6d37096262c9') setProfile({ role: 'admin' });
      const { data: f } = await supabase.from('favorites').select('event_id').eq('user_id', id);
      if (f) setFavorites(f.map(item => String(item.event_id)));
    } catch (e) { console.log("Error loading profile"); }
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    setEvents(data || []);
  };

  const handleLogin = async () => {
    if (user) await supabase.auth.signOut();
    const e = window.prompt("Introduce tu email:");
    if (e) {
      alert("Enviando enlace...");
      await supabase.auth.signInWithOtp({ email: e, options: { emailRedirectTo: window.location.origin } });
    }
  };

  const generateIA = () => {
    if (!form.title) return showNotification("Escribe un título ✨");
    setIsProcessing(true);
    const q = encodeURIComponent(form.title);
    const url = `https://image.pollinations.ai/prompt/professional_event_photo_of_${q}?width=800&height=1000&nologo=true&seed=${Date.now()}`;
    const img = new Image(); img.src = url;
    img.onload = () => { setForm({...form, image_url: url}); setIsProcessing(false); showNotification("Imagen generada"); };
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.image_url) return showNotification("Añade imagen ✨");
    setIsSubmitting(true);
    const lat = 36 + Math.random() * 7;
    const lng = -9 + Math.random() * 12;
    const isAdmin = profile?.role === 'admin';
    await supabase.from('events').insert([{ ...form, lat, lng, status: isAdmin ? 'approved' : 'pending', organizer_id: user?.id }]);
    showNotification(isAdmin ? "¡Publicado!" : "¡En revisión!");
    setView('home'); fetchEvents(); setIsSubmitting(false);
    setForm({ title: '', category: 'MUSICA', city: '', address: '', date: '', time: '21:00', image_url: '' });
  };

  const handleRejectEvent = async (id) => {
    if (!reasonText) return alert("Escribe el motivo");
    await supabase.from('events').update({ status: 'rejected', rejection_reason: reasonText }).eq('id', id);
    setRejectingId(null); setReasonText(""); fetchEvents();
    showNotification("Evento denegado");
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

  const handleImGoing = async () => {
    if (!user) return showNotification("Inicia sesión");
    if (!favorites.includes(String(selectedEvent.id))) {
      setFavorites(f => [...f, String(selectedEvent.id)]);
      await supabase.from('favorites').insert({ user_id: user.id, event_id: selectedEvent.id });
    }
    showNotification("¡Confirmado!");
  };

  const pendingEvents = events.filter(e => e.status === 'pending');
  const publicEvents = events.filter(e => e.status === 'approved' && (activeCategory === 'TODOS' || e.category === activeCategory));

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-white font-sans overflow-hidden transition-colors duration-500">
        
        {toast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl border-2 border-white/20 animate-in slide-in-from-top">
            <CheckCircle2 size={18} className="inline mr-2"/> 
            <span className="font-black uppercase text-[10px] tracking-widest">{toast}</span>
          </div>
        )}

        <nav className="h-[80px] shrink-0 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b dark:border-slate-800 flex justify-between items-center px-8 z-[2000]">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => {setView('home'); setSelectedEvent(null);}}>
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white font-bold shadow-lg shadow-indigo-500/30 text-2xl italic">E</div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">Eventos</h1>
          </div>
          <div className="flex items-center gap-4">
            {profile?.role === 'admin' && <button onClick={() => setView('admin')} className="p-2 text-slate-400"><ShieldCheck size={28}/></button>}
            <button onClick={() => setIsDark(!isDark)} className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 transition-all">
              {isDark ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} className="text-indigo-600" />}
            </button>
            {user ? (
              <div className="w-11 h-11 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black border-2 border-white shadow-xl cursor-pointer" onClick={() => setView('profile')}>
                {user.email[0].toUpperCase()}
              </div>
            ) : (
              <button onClick={handleLogin} className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase shadow-lg">Entrar</button>
            )}
          </div>
        </nav>

        <main className="flex-1 relative overflow-y-auto no-scrollbar">
          
          {/* VISTA HOME CORREGIDA (Estilo Imagen Derecha) */}
          {view === 'home' && (
            <div className="max-w-6xl mx-auto p-6 pb-96 animate-in fade-in duration-700">
              <div className="flex gap-3 overflow-x-auto pb-10 no-scrollbar pt-2">
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINOS', 'FIESTAS PATRONALES', 'OTROS'].map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setActiveCategory(cat)} 
                    className={`px-6 py-3.5 rounded-2xl font-black text-[10px] tracking-widest transition-all shrink-0 border-2 ${activeCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-500/40 scale-105' : 'bg-slate-900/40 text-slate-500 border-slate-800'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                {publicEvents.map(ev => (
                  <div key={ev.id} className="bg-[#0f172a] rounded-[3.5rem] border border-slate-800 overflow-hidden shadow-2xl flex flex-col group min-h-[580px] transition-all duration-500 hover:border-indigo-500/50">
                    <div className="relative h-[340px] overflow-hidden cursor-pointer" onClick={() => setSelectedEvent(ev)}>
                      <img src={ev.image_url} className="w-full h-full object-cover group-hover:scale-110 transition duration-1000" alt="img" />
                      <div className="absolute top-7 left-7">
                        <span className="bg-black/60 backdrop-blur-md text-white text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-widest">
                          {ev.category}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(ev); }} 
                        className="absolute top-7 right-7 p-4 bg-slate-900/60 backdrop-blur-md rounded-full text-red-500 shadow-xl active:scale-75 transition"
                      >
                        <Heart size={22} fill={favorites.includes(String(ev.id)) ? "red" : "none"} />
                      </button>
                    </div>
                    <div className="p-10 flex flex-col flex-1 justify-between text-center">
                      <h3 className="text-2xl font-black leading-tight uppercase tracking-tighter italic text-white mb-8">
                        {ev.title}
                      </h3>
                      <button 
                        onClick={() => setSelectedEvent(ev)} 
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-[2rem] font-black uppercase text-[12px] tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all duration-300"
                      >
                        Ver Detalles
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'create' && (
            <div className="max-w-xl mx-auto p-6 pb-80 animate-in slide-in-from-bottom duration-500">
              <div className="bg-white dark:bg-[#0f172a] rounded-[3.5rem] p-10 border dark:border-slate-800 shadow-2xl">
                <h2 className="text-3xl font-black mb-8 text-indigo-500 text-center uppercase tracking-tighter italic">Publicar</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                  <input required placeholder="TÍTULO" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-bold uppercase" value={form.title} onChange={e => setForm({...form, title: e.target.value.toUpperCase()})} />
                  <select className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-black text-xs uppercase" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="MUSICA">MÚSICA</option><option value="GASTRONOMIA">GASTRONOMÍA</option><option value="TAURINOS">TAURINOS</option><option value="FIESTAS PATRONALES">FIESTAS PATRONALES</option><option value="OTROS">OTROS</option>
                  </select>
                  <input required placeholder="CIUDAD" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-bold uppercase" value={form.city} onChange={e => setForm({...form, city: e.target.value.toUpperCase()})} />
                  <input required placeholder="DIRECCIÓN" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                  <div className="flex gap-2">
                    <input required type="date" className="flex-1 p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-bold text-slate-400" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                    <input required type="time" className="w-32 p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-bold text-slate-400" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
                  </div>
                  <div className="pt-6 text-center">
                    <div className="h-44 w-full bg-slate-50 dark:bg-slate-800 rounded-[2rem] overflow-hidden mb-4 flex items-center justify-center border-4 border-dashed border-slate-700">
                      {isProcessing ? <Loader2 className="animate-spin text-indigo-600"/> : form.image_url ? <img src={form.image_url} className="w-full h-full object-cover" alt="Preview" /> : <Camera size={32} className="text-slate-300"/>}
                    </div>
                    <button type="button" onClick={generateIA} className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black text-[10px] uppercase shadow-lg flex items-center justify-center gap-2">
                      <Sparkles size={16}/> GENERAR CON IA ✨
                    </button>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full bg-white text-slate-900 p-6 rounded-3xl font-black shadow-xl mt-4 uppercase tracking-widest">
                    {isSubmitting ? 'PUBLICANDO...' : 'PUBLICAR AHORA'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {view === 'admin' && (
            <div className="max-w-2xl mx-auto p-6 pb-80 animate-in slide-in-from-top">
              <h2 className="text-3xl font-black mb-10 text-amber-500 text-center uppercase italic underline underline-offset-8 tracking-tighter">Moderación 🛡️</h2>
              {pendingEvents.map(ev => (
                <div key={ev.id} className="bg-[#0f172a] rounded-[3rem] mb-8 border border-amber-500/30 overflow-hidden shadow-xl">
                  <img src={ev.image_url} className="h-52 w-full object-cover" alt="p"/>
                  <div className="p-8 text-center">
                    <h4 className="font-black text-2xl mb-4 text-white uppercase italic tracking-tighter">{ev.title}</h4>
                    {rejectingId === ev.id ? (
                      <div>
                        <textarea className="w-full p-4 bg-slate-800 rounded-2xl border-2 border-red-500 mb-4 text-white outline-none" placeholder="Motivo..." value={reasonText} onChange={e => setReasonText(e.target.value)} />
                        <div className="flex gap-2">
                           <button onClick={() => handleRejectEvent(ev.id)} className="flex-1 bg-red-600 text-white p-4 rounded-2xl font-black uppercase text-[10px]">DENEGAR</button>
                           <button onClick={() => setRejectingId(null)} className="flex-1 bg-slate-700 p-4 rounded-2xl font-black uppercase text-[10px]">Cerrar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-4">
                        <button onClick={async () => { await supabase.from('events').update({ status: 'approved' }).eq('id', ev.id); fetchEvents(); showNotification("¡Aprobado!"); }} className="flex-1 bg-green-500 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">APROBAR</button>
                        <button onClick={() => setRejectingId(ev.id)} className="flex-1 bg-red-500 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest opacity-60">DENEGAR</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'profile' && (
            <div className="max-w-xl mx-auto p-10 text-center animate-in slide-in-from-bottom">
               <div className="bg-[#0f172a] rounded-[4rem] p-16 shadow-2xl border border-slate-800">
                  <div className="w-28 h-28 bg-indigo-600 rounded-full mx-auto mb-10 flex items-center justify-center text-5xl font-black text-white shadow-2xl border-4 border-white">
                    {user?.email[0].toUpperCase()}
                  </div>
                  <h2 className="text-3xl font-black mb-12 uppercase italic text-indigo-500 tracking-tighter underline underline-offset-8">Mi Perfil</h2>
                  <p className="mb-12 font-black text-slate-400 tracking-widest text-sm uppercase">{user?.email}</p>
                  <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="w-full bg-red-600 text-white p-6 rounded-[2.5rem] font-black uppercase tracking-widest shadow-lg active:scale-95 transition"> Cerrar Sesión </button>
               </div>
            </div>
          )}

          {view === 'favorites' && (
            <div className="max-w-2xl mx-auto p-6 pb-60 animate-in fade-in">
               <h3 className="text-3xl font-black uppercase tracking-tighter text-indigo-600 mb-12 text-center italic">Guardados ❤️</h3>
               <div className="grid grid-cols-1 gap-6">
                  {events.filter(e => favorites.includes(String(e.id))).map(ev => (
                    <div key={ev.id} className="bg-[#0f172a] p-8 rounded-[3rem] border border-slate-800 flex justify-between items-center shadow-2xl">
                       <div className="flex items-center gap-6">
                          <img src={ev.image_url} className="w-20 h-20 rounded-[1.5rem] object-cover" alt="ev" />
                          <div>
                            <span className="font-black text-xl block uppercase tracking-tighter text-white italic">{ev.title}</span>
                            <span className="text-[10px] opacity-50 uppercase font-black text-indigo-400 tracking-widest">{ev.date}</span>
                          </div>
                       </div>
                       <button onClick={() => toggleFavorite(ev)} className="p-4 bg-red-500/10 text-red-500 rounded-2xl active:scale-75 transition"><Trash2 size={24} /></button>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {view === 'map' && ( 
            <div className="absolute inset-0 z-0 bg-white"> 
              <MapContainer center={[40.41, -3.70]} zoom={6} className="h-full w-full"> 
                <MapResizer />
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{y}/{x}{r}.png" /> 
                {events.filter(e => e.status === 'approved').map(ev => ev.lat && (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                    <Popup>
                      <div className="p-2 text-center" onClick={() => setSelectedEvent(ev)}>
                        <img src={ev.image_url} className="w-20 h-20 object-cover rounded-lg mb-2 mx-auto" alt="p"/>
                        <div className="font-black text-[10px] uppercase cursor-pointer">{ev.title}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))} 
              </MapContainer> 
            </div> 
          )}
        </main>

        {/* BARRA DE NAVEGACIÓN INFERIOR MEJORADA */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-[440px] bg-[#0f172a]/90 backdrop-blur-3xl border border-slate-800 h-[95px] rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex items-center justify-around z-[2000] px-5">
          <button onClick={() => {setView('home'); setSelectedEvent(null)}} className={`p-4 rounded-[1.5rem] transition-all duration-300 ${view === 'home' ? "bg-indigo-600 text-white scale-110 shadow-[0_0_20px_rgba(79,70,229,0.5)]" : "text-slate-500"}`}>
            <LayoutList size={28}/>
          </button>
          <button onClick={() => setView('create')} className={`p-4 rounded-[1.5rem] transition-all duration-300 ${view === 'create' ? "bg-indigo-600 text-white scale-110 shadow-[0_0_20px_rgba(79,70,229,0.5)]" : "text-slate-500"}`}>
            <PlusCircle size={28}/>
          </button>
          <button onClick={() => setView('favorites')} className={`p-4 rounded-[1.5rem] transition-all duration-300 ${view === 'favorites' ? "bg-indigo-600 text-white scale-110 shadow-[0_0_20px_rgba(79,70,229,0.5)]" : "text-slate-500"}`}>
            <Heart size={28}/>
          </button>
          <button onClick={() => setView('map')} className={`p-4 rounded-[1.5rem] transition-all duration-300 ${view === 'map' ? "bg-indigo-600 text-white scale-110 shadow-[0_0_20px_rgba(79,70,229,0.5)]" : "text-slate-500"}`}>
            <MapIcon size={28}/>
          </button>
        </div>

        {/* MODAL DETALLES MEJORADO */}
        {selectedEvent && (
          <div className="fixed inset-0 z-[3000] bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-[#0f172a] w-full max-w-[420px] h-[90vh] rounded-[4rem] overflow-hidden relative shadow-2xl border border-slate-800 border-b-[12px] border-b-indigo-600 flex flex-col">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-6 right-6 z-50 p-4 bg-white/10 backdrop-blur-md text-white rounded-full"><X size={24} /></button>
              <div className="relative h-72 shrink-0">
                <img src={selectedEvent.image_url} className="w-full h-full object-cover" alt="hero" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent" />
                <div className="absolute bottom-6 left-8">
                  <span className="bg-indigo-600 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">{selectedEvent.category}</span>
                </div>
              </div>
              <div className="p-10 flex flex-col flex-1 overflow-y-auto no-scrollbar">
                <h2 className="text-4xl font-black mb-8 leading-tight tracking-tighter text-white uppercase italic">{selectedEvent.title}</h2>
                <div className="flex gap-4 mb-10">
                  <button onClick={handleImGoing} className="flex-1 bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-sm shadow-xl flex items-center justify-center gap-2 uppercase tracking-tighter italic"><Sparkles size={18} /> ¡VOY A IR!</button>
                  <button onClick={() => navigator.share ? navigator.share({title: selectedEvent.title, url: window.location.href}) : showNotification("Enlace copiado")} className="p-5 bg-slate-800 text-white rounded-[2rem]"><Share2 size={24} /></button>
                </div>
                <div className="space-y-8">
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.city)}`} target="_blank" rel="noreferrer" className="flex items-center gap-6 p-6 bg-slate-800/40 rounded-[2.5rem] border border-slate-800">
                    <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg"><MapPin size={24} /></div>
                    <div className="overflow-hidden">
                      <p className="font-black text-white uppercase text-xs tracking-widest mb-1">Ubicación</p>
                      <p className="text-sm opacity-60 leading-tight truncate">{selectedEvent.address}</p>
                      <p className="text-[10px] font-black text-indigo-500 uppercase mt-1">{selectedEvent.city}</p>
                    </div>
                  </a>
                  <div className="flex gap-4">
                    <div className="flex-1 flex items-center gap-4 p-5 bg-slate-800/40 rounded-[2.5rem] border border-slate-800">
                      <div className="p-3 bg-amber-500 text-white rounded-xl shadow-lg"><Calendar size={20} /></div>
                      <div><p className="font-black text-white uppercase text-[9px] tracking-widest">Fecha</p><p className="text-xs font-bold opacity-60">{selectedEvent.date}</p></div>
                    </div>
                    <div className="flex-1 flex items-center gap-4 p-5 bg-slate-800/40 rounded-[2.5rem] border border-slate-800">
                      <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg"><Clock size={20} /></div>
                      <div><p className="font-black text-white uppercase text-[9px] tracking-widest">Hora</p><p className="text-xs font-bold opacity-60">{selectedEvent.time || '21:00'}</p></div>
                    </div>
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
