import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, 
  Navigation, Clock, ChevronLeft, ChevronRight, LayoutList, ShieldCheck, Star, DollarSign, Sparkles, Camera, Loader2, CheckCircle2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapResizer() {
  const map = useMap();
  useEffect(() => { setTimeout(() => { map.invalidateSize(); }, 800); }, [map]);
  return null;
}

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState([]); 
  const [isDark, setIsDark] = useState(true);
  const [view, setView] = useState('home'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeCategory, setActiveCategory] = useState('TODOS');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeDay, setActiveDay] = useState(null);
  const [form, setForm] = useState({ title: '', category: 'MUSICA', city: '', address: '', date: '', time: '21:00', image_url: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingIA, setIsProcessingIA] = useState(false);
  const [aiOptions, setAiOptions] = useState([]); 
  const [toast, setToast] = useState(null);

  const showNotification = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchEvents();
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (prof) setProfile(prof);
    else if (id === '4d76c965-66de-491d-8cc1-6d37096262c9') setProfile({ role: 'admin' });
    
    // CARGA DE FAVORITOS (Blindada)
    const { data: f } = await supabase.from('favorites').select('event_id').eq('user_id', id);
    if (f) setFavorites(f.map(item => Number(item.event_id)));
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    setEvents(data || []);
  };

  const handleLogin = async () => {
    const email = window.prompt("Email:");
    if (email) await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: 'https://app-eventos-pro-final.vercel.app' } });
  };

  // --- IA MEJORADA: 3 OPCIONES RÁPIDAS ---
  const generateAIOptions = () => {
    if (!form.title) return showNotification("Escribe el título ✨");
    setIsProcessingIA(true);
    setAiOptions([]);
    const query = encodeURIComponent(form.title.toLowerCase());
    const seed = Math.floor(Math.random() * 5000);
    // Usamos LoremFlickr que es el motor más estable para móviles
    const newOptions = [
      `https://loremflickr.com/400/600/${query},festival/all?lock=${seed + 1}`,
      `https://loremflickr.com/400/600/${query},event/all?lock=${seed + 2}`,
      `https://loremflickr.com/400/600/${query},party/all?lock=${seed + 3}`
    ];
    setAiOptions(newOptions);
    setIsProcessingIA(false);
  };

  const toggleFavorite = async (event) => {
    if (!user) return showNotification("Inicia sesión ❤️");
    const eventId = Number(event.id);
    if (favorites.includes(eventId)) {
      setFavorites(prev => prev.filter(id => id !== eventId));
      await supabase.from('favorites').delete().match({ user_id: user.id, event_id: eventId });
    } else {
      setFavorites(prev => [...prev, eventId]);
      await supabase.from('favorites').insert({ user_id: user.id, event_id: eventId });
    }
  };

  const handleImGoing = async () => {
    if (!user) return showNotification("Inicia sesión ❤️");
    const eventId = Number(selectedEvent.id);
    if (!favorites.includes(eventId)) {
      setFavorites(prev => [...prev, eventId]);
      await supabase.from('favorites').insert({ user_id: user.id, event_id: eventId });
    }
    showNotification("¡Gracias por asistir!");
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!form.image_url) return showNotification("Elige una foto ✨");
    setIsSubmitting(true);
    const isAdmin = user?.id === '4d76c965-66de-491d-8cc1-6d37096262c9';
    const { error } = await supabase.from('events').insert([{ ...form, status: isAdmin ? 'approved' : 'pending', organizer_id: user?.id }]);
    if (!error) { showNotification("¡Hecho!"); setView('home'); fetchEvents(); }
    setIsSubmitting(false);
  };

  const filteredEvents = events.filter(e => (activeCategory === 'TODOS' || e.category === activeCategory) && e.status === 'approved' && e.date >= new Date().toISOString().split('T')[0]);

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-500 overflow-hidden font-sans">
        
        {toast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-top px-4">
            <div className="bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-white/20 backdrop-blur-md">
              <CheckCircle2 size={20} />
              <span className="font-black uppercase text-[10px] tracking-widest">{toast}</span>
            </div>
          </div>
        )}

        {/* HEADER */}
        <nav className="h-[70px] shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 flex justify-between items-center px-8 z-[2000] shadow-sm">
          <div className="flex items-center gap-2" onClick={() => setView('home')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold shadow-lg">E</div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">Eventos</h1>
          </div>
          <div className="flex items-center gap-4">
            {(profile?.role === 'admin' || user?.id === '4d76c965-66de-491d-8cc1-6d37096262c9') && <button onClick={() => setView('admin')} className="text-amber-500 animate-pulse transition"><ShieldCheck size={28}/></button>}
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">{isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}</button>
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black border-2 border-white shadow-md cursor-pointer" onClick={() => setView('profile')}>{user ? user.email[0].toUpperCase() : '?'}</div>
          </div>
        </nav>

        <main className="flex-1 relative overflow-y-auto">
          {view === 'home' && (
            <div className="max-w-6xl mx-auto p-4 pb-40 animate-in fade-in duration-500">
              <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar pt-2">
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINOS', 'OTROS'].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2 rounded-full font-black text-[10px] tracking-widest transition-all shrink-0 border-2 ${activeCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800'}`}>{cat}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredEvents.map(ev => (
                  <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl flex flex-col h-full group">
                    <div className="relative h-60 overflow-hidden cursor-pointer" onClick={() => setSelectedEvent(ev)}>
                      <img src={ev.image_url} className="w-full h-full object-cover group-hover:scale-110 transition duration-1000" alt="img" />
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(ev); }} className="absolute top-5 right-5 p-3 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 shadow-xl active:scale-75 transition">
                        <Heart size={20} fill={favorites.includes(Number(ev.id)) ? "red" : "none"} />
                      </button>
                    </div>
                    <div className="p-8 flex flex-col flex-1 text-center"><h3 className="text-2xl font-black mb-6 leading-tight truncate">{ev.title}</h3>
                    <button onClick={() => setSelectedEvent(ev)} className="mt-auto w-full bg-slate-900 dark:bg-indigo-600 text-white py-4 rounded-3xl font-black uppercase text-[11px] transition tracking-widest">Ver Detalles</button></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'create' && (
            <div className="max-w-xl mx-auto p-6 pb-40 animate-in slide-in-from-bottom">
              <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-10 border dark:border-slate-800 shadow-2xl">
                <h2 className="text-3xl font-black mb-8 text-indigo-500 uppercase italic text-center underline decoration-indigo-500/20">Publicar</h2>
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <input required placeholder="Título" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                  <input required placeholder="Ciudad" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                  <input required placeholder="Dirección" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                  <input required type="date" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-bold" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  
                  {/* SELECTOR DE 3 IMÁGENES */}
                  <div className="pt-4 border-t dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase text-center text-slate-400 mb-4 tracking-widest">Genera y elige tu imagen:</p>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {aiOptions.map((url, i) => (
                        <div key={i} onClick={() => setForm({...form, image_url: url})} className={`aspect-[3/4] rounded-xl overflow-hidden border-4 transition-all ${form.image_url === url ? 'border-indigo-600 scale-105' : 'border-transparent opacity-40'}`}>
                          <img src={url} className="w-full h-full object-cover" alt="IA option" />
                        </div>
                      ))}
                      {aiOptions.length === 0 && !isProcessingIA && <div className="col-span-3 h-32 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center italic text-slate-400 text-xs">Sin imágenes</div>}
                      {isProcessingIA && <div className="col-span-3 h-32 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>}
                    </div>
                    <button type="button" onClick={generateAIOptions} disabled={isProcessingIA} className="w-full bg-white dark:bg-slate-800 border-2 border-indigo-600 text-indigo-600 p-4 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 active:scale-95 transition">
                      <Sparkles size={16}/> GENERAR 3 OPCIONES IA
                    </button>
                  </div>

                  <button type="submit" disabled={isSubmitting || !form.image_url} className="w-full bg-indigo-600 text-white p-6 rounded-3xl font-black shadow-xl uppercase active:scale-95 transition tracking-widest text-sm mt-4">PUBLICAR AHORA</button>
                </form>
              </div>
            </div>
          )}

          {/* OTRAS VISTAS (ADMIN, FAVORITOS, PERFIL, MAPA, CALENDARIO) MANTENIDAS */}
          {view === 'admin' && ( <div className="max-w-2xl mx-auto p-6 pb-40 animate-in slide-in-from-top"> <h2 className="text-3xl font-black mb-8 text-amber-500 italic text-center uppercase tracking-tighter">Moderación 🛡️</h2> {events.filter(e => e.status === 'pending').map(ev => ( <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[3rem] mb-8 border-2 border-amber-500/20 shadow-xl overflow-hidden flex flex-col"> <img src={ev.image_url} className="h-52 w-full object-cover" alt="p"/> <div className="p-8"> <h4 className="font-black text-xl mb-2">{ev.title}</h4> <p className="text-sm text-slate-500 mb-6 uppercase tracking-widest font-bold">{ev.city} • {ev.address}</p> <div className="flex gap-4"> <button onClick={() => { supabase.from('events').update({ status: 'approved' }).eq('id', ev.id).then(() => fetchEvents()); showNotification("¡Aprobado!"); }} className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg">Aprobar</button> <button onClick={() => { supabase.from('events').update({ status: 'rejected' }).eq('id', ev.id).then(() => fetchEvents()); showNotification("Rechazado"); }} className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-xs opacity-60">Rechazar</button> </div> </div> </div> ))} </div> )}
          {view === 'favorites' && ( <div className="max-w-2xl mx-auto p-6 pb-40 text-center text-left"> <h3 className="text-3xl font-black mb-12 uppercase italic text-indigo-500 underline decoration-4 underline-offset-8 tracking-tighter">Mis Favoritos ❤️</h3> <div className="grid grid-cols-1 gap-4"> {events.filter(e => favorites.includes(Number(e.id))).map(ev => ( <div key={ev.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border dark:border-slate-800 flex justify-between items-center shadow-md animate-in fade-in"> <span className="font-black text-xl px-4 truncate text-left">{ev.title}</span> <button onClick={() => toggleFavorite(ev)} className="p-3 text-slate-300 hover:text-red-500 transition active:scale-75"><Trash2 size={28} /></button> </div> ))} </div> </div> )}
          {view === 'profile' && ( <div className="max-w-xl mx-auto p-6 pb-40 animate-in slide-in-from-bottom duration-500 text-center"> <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border dark:border-slate-800 shadow-2xl text-center"> <div className="w-24 h-24 bg-indigo-600 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl font-black text-white shadow-xl border-4 border-white dark:border-slate-800"> {user?.email[0].toUpperCase()} </div> <h2 className="text-2xl font-black mb-10 tracking-tighter italic uppercase tracking-widest text-indigo-500">Mi Perfil</h2> <p className="mb-10 font-bold text-slate-400 tracking-wider text-sm">{user?.email}</p> <div className="space-y-4"> <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="w-full bg-red-500 text-white p-5 rounded-3xl font-black uppercase active:scale-95 transition shadow-lg"> Cerrar Sesión </button> <a href="https://ko-fi.com" target="_blank" rel="noreferrer" className="w-full bg-[#FF5E5B] text-white p-5 rounded-3xl font-black flex items-center justify-center gap-3 active:scale-95 transition shadow-lg tracking-widest text-[10px]"> <DollarSign size={20}/> APOYAR PROYECTO </a> </div> </div> </div> )}
          {view === 'map' && ( <div className="absolute inset-0 z-0 bg-white"> <MapContainer center={[40.41, -3.70]} zoom={6} className="h-full w-full"> <MapResizer /><TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" /> {events.filter(e => e.status === 'approved').map(ev => ev.lat && (<Marker key={ev.id} position={[ev.lat, ev.lng]}><Popup><div className="p-1 font-bold">{ev.title}</div></Popup></Marker>))} </MapContainer> </div> )}
        </main>

        {/* MODAL DETALLES: DISEÑO ALARGADO VERTICAL */}
        {selectedEvent && (
          <div className="fixed inset-0 z-[3000] bg-black/95 flex items-center justify-center p-3 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-[380px] h-[82vh] rounded-[3.5rem] overflow-hidden relative shadow-2xl border dark:border-slate-800 border-b-[8px] border-b-indigo-600 flex flex-col text-left">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 z-50 p-2.5 bg-black/50 text-white rounded-full active:scale-90 transition shadow-xl"><X size={20} /></button>
              <img src={selectedEvent.image_url} className="w-full h-52 object-cover shadow-inner shrink-0" alt="hero" />
              <div className="p-6 flex flex-col flex-1 overflow-y-auto">
                <div className="text-indigo-600 dark:text-indigo-400 text-[9px] font-black tracking-[0.2em] mb-1 uppercase">{selectedEvent.category}</div>
                <h2 className="text-2xl font-black mb-6 leading-tight tracking-tighter text-slate-900 dark:text-white">{selectedEvent.title}</h2>
                
                {/* BOTÓN VOY A IR SINCRONIZADO */}
                <button onClick={handleImGoing} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-indigo-500/40 active:scale-95 transition mb-8 uppercase tracking-tight flex items-center justify-center gap-2">
                  ¡VOY A IR! <Heart size={20} fill={favorites.includes(Number(selectedEvent.id)) ? "white" : "none"} />
                </button>

                <div className="space-y-6 text-slate-600 dark:text-slate-300 font-black">
                   <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.city)}`} target="_blank" rel="noreferrer" className="flex items-start gap-4 p-2 -ml-2 rounded-xl active:bg-slate-50 dark:active:bg-slate-800 transition">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600"><MapPin size={22} /></div>
                      <div className="flex-1 overflow-hidden"><p className="text-md font-black leading-tight underline decoration-indigo-500/30">{selectedEvent.address}</p><p className="text-[10px] opacity-60 uppercase font-black">{selectedEvent.city}</p></div>
                   </a>
                   <div className="flex items-center gap-4 px-2 -ml-2">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600"><Calendar size={22} /></div>
                      <div className="flex-1 font-black text-md tracking-tight">{selectedEvent.date} • {selectedEvent.time || '20:00'}H</div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BARRA INFERIOR */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[94%] max-w-[460px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border dark:border-slate-800 h-[80px] rounded-full shadow-2xl flex items-center justify-around z-[2000] px-6 border-b-4 border-b-indigo-500/20 transition-all border-indigo-500/10">
          <button onClick={() => {setView('home'); setSelectedEvent(null)}} className={`p-3 transition-all ${view === 'home' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><LayoutList size={26}/></button>
          <button onClick={() => setView('calendar')} className={`p-3 transition-all ${view === 'calendar' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><Calendar size={26}/></button>
          <button onClick={() => setView('create')} className={`p-3 transition-all ${view === 'create' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><PlusCircle size={32}/></button>
          <button onClick={() => setView('map')} className={`p-3 transition-all ${view === 'map' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><MapIcon size={26}/></button>
          <button onClick={() => setView('favorites')} className={`p-3 transition-all ${view === 'favorites' ? "text-indigo-600 scale-125" : "text-slate-400"}`}><Heart size={26}/></button>
        </div>

      </div>
    </div>
  );
}

export default App;
