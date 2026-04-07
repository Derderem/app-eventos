import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, 
  Navigation, Clock, ChevronLeft, ChevronRight, LayoutList, ShieldCheck, Star, DollarSign, Sparkles, Send 
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Marcadores
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

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY);

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
  
  // Estado del Formulario PRO
  const [form, setForm] = useState({ title: '', category: 'MUSICA', city: '', address: '', date: '', time: '', image_url: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchEvents();
    checkSession();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => checkSession());
    return () => authListener.subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(prof);
      const { data: favs } = await supabase.from('favorites').select('event_id').eq('user_id', session.user.id);
      setFavorites(favs ? favs.map(f => f.event_id) : []);
    } else {
      setUser(null); setProfile(null); setFavorites([]);
    }
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    setEvents(data || []);
  };

  const handleLogin = async () => {
    const email = window.prompt("Introduce tu email:");
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ 
      email, options: { emailRedirectTo: 'https://app-eventos-pro-final.vercel.app' }
    });
    if (error) alert(error.message);
    else alert("¡Enlace enviado! Revisa tu email.");
  };

  // FUNCIÓN PARA PUBLICAR EVENTO REAL
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!user) return alert("Debes iniciar sesión para publicar");
    if (!form.image_url) return alert("Por favor, añade una imagen o usa el botón IA ✨");
    
    setIsSubmitting(true);
    const { error } = await supabase.from('events').insert([{ 
      ...form, 
      status: 'pending', 
      organizer_id: user.id,
      lat: 40.41, // Coordenadas por defecto (Madrid) para que salgan en el mapa
      lng: -3.70
    }]);

    if (error) {
      alert("Error al publicar: " + error.message);
    } else {
      alert("¡Evento enviado! Aparecerá en la App cuando el Admin lo apruebe 🛡️");
      setForm({ title: '', category: 'MUSICA', city: '', address: '', date: '', time: '', image_url: '' });
      setView('home');
      fetchEvents();
    }
    setIsSubmitting(false);
  };

  // Función Generadora de Imágenes por IA (Simulada con Unsplash)
  const generateImage = () => {
    const keywords = { MUSICA: 'concert', GASTRONOMIA: 'food,festival', TAURINOS: 'bullring', OTROS: 'party' };
    const randomNum = Math.floor(Math.random() * 1000);
    const url = `https://images.unsplash.com/photo-${randomNum}?q=80&w=800&auto=format&fit=crop&sig=${randomNum}&${keywords[form.category]}`;
    setForm({ ...form, image_url: url });
  };

  const toggleFavorite = async (event) => {
    if (!user) return alert("Inicia sesión ❤️");
    if (favorites.includes(event.id)) {
      await supabase.from('favorites').delete().match({ user_id: user.id, event_id: event.id });
      setFavorites(favorites.filter(id => id !== event.id));
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, event_id: event.id });
      setFavorites([...favorites, event.id]);
    }
  };

  const filteredEvents = events.filter(e => {
    const matchesCat = activeCategory === 'TODOS' || e.category === activeCategory;
    return matchesCat && e.status === 'approved' && e.date >= todayStr;
  });

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-500 overflow-hidden font-sans">
        
        {/* NAV */}
        <nav className="h-[70px] shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 flex justify-between items-center px-6 z-[2000] shadow-sm">
          <div className="flex items-center gap-2" onClick={() => setView('home')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold shadow-lg">E</div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">Eventos</h1>
          </div>
          <div className="flex items-center gap-4">
            {profile?.role === 'admin' && (
              <button onClick={() => setView('admin')} className="text-amber-500 animate-pulse transition"><ShieldCheck size={26}/></button>
            )}
            <button onClick={() => setIsDark(!isDark)} className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 transition-all">
              {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
            </button>
            {user ? (
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black border-2 border-white shadow-md cursor-pointer" onClick={() => setView('profile')}>
                {user.email[0].toUpperCase()}
              </div>
            ) : (
              <button onClick={handleLogin} className="bg-indigo-600 text-white px-5 py-2 rounded-2xl font-bold text-xs shadow-lg active:scale-95 transition tracking-widest uppercase">ENTRAR</button>
            )}
          </div>
        </nav>

        <main className="flex-1 relative overflow-y-auto">
          {view === 'home' && (
            <div className="max-w-6xl mx-auto p-4 pb-40">
              <div className="flex gap-3 overflow-x-auto pb-8 no-scrollbar pt-2">
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINOS', 'OTROS'].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} 
                    className={`px-6 py-2.5 rounded-full font-black text-[10px] tracking-widest transition-all shrink-0 border-2
                    ${activeCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-105' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800'}`}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredEvents.map(ev => (
                  <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[3rem] border dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 group flex flex-col h-full">
                    <div className="relative h-64 overflow-hidden cursor-pointer" onClick={() => setSelectedEvent(ev)}>
                      <img src={ev.image_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30'} className="w-full h-full object-cover group-hover:scale-110 transition duration-1000" alt="img" />
                      <div className="absolute top-5 left-5 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">{ev.category}</div>
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(ev); }} className="absolute top-5 right-5 p-3 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 shadow-xl active:scale-75 transition"><Heart size={20} fill={favorites.includes(ev.id) ? "red" : "none"} /></button>
                      <div className="absolute bottom-5 right-5 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-2xl text-[11px] font-black">{ev.date}</div>
                    </div>
                    <div className="p-8 flex flex-col flex-1 text-center">
                      <h3 className="text-2xl font-black mb-6 leading-tight tracking-tighter line-clamp-2">{ev.title}</h3>
                      <button onClick={() => setSelectedEvent(ev)} className="mt-auto w-full bg-slate-900 dark:bg-indigo-600 text-white py-4 rounded-3xl font-black uppercase text-[11px] tracking-widest transition">Ver Detalles</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'create' && (
            <div className="max-w-xl mx-auto p-6 pb-40 animate-in slide-in-from-bottom duration-500">
              <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-8 border dark:border-slate-800 shadow-2xl">
                <h2 className="text-3xl font-black mb-8 text-indigo-500 uppercase italic tracking-tighter text-center">Publicar</h2>
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <div className="relative group">
                    <input required placeholder="Título del evento" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none border-2 border-transparent focus:border-indigo-500 transition font-bold" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                  </div>
                  <select className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-black text-xs tracking-widest uppercase" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="MUSICA">MÚSICA</option><option value="GASTRONOMIA">GASTRONOMÍA</option><option value="TAURINOS">TAURINOS</option><option value="OTROS">OTROS</option>
                  </select>
                  <input required placeholder="Ciudad" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-bold" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                  <input required placeholder="Dirección completa" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-bold" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                  <div className="grid grid-cols-2 gap-3">
                    <input required type="date" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-bold text-slate-400" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                    <input required type="time" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-bold text-slate-400" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
                  </div>
                  
                  {/* SECCIÓN DE IMAGEN CON IA */}
                  <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] bg-slate-50/30 dark:bg-slate-800/30 text-center">
                    {form.image_url ? (
                      <div className="relative h-32 rounded-2xl overflow-hidden mb-4 shadow-md">
                        <img src={form.image_url} className="w-full h-full object-cover" alt="preview" />
                        <button type="button" onClick={() => setForm({...form, image_url: ''})} className="absolute top-2 right-2 bg-black/50 p-1 rounded-full text-white"><X size={16}/></button>
                      </div>
                    ) : (
                      <div className="mb-4 text-slate-400 font-bold text-xs uppercase tracking-widest">Añadir Imagen</div>
                    )}
                    <div className="flex gap-2">
                       <button type="button" onClick={() => { const url = window.prompt("Pega la URL de tu imagen:"); if(url) setForm({...form, image_url: url}) }} className="flex-1 bg-white dark:bg-slate-700 p-3 rounded-2xl font-black text-[10px] uppercase shadow-sm border dark:border-slate-600 flex items-center justify-center gap-2"><MapIcon size={14}/> URL Propia</button>
                       <button type="button" onClick={generateImage} className="flex-1 bg-indigo-600 text-white p-3 rounded-2xl font-black text-[10px] uppercase shadow-lg flex items-center justify-center gap-2 active:scale-95 transition"><Sparkles size={14}/> Generar IA</button>
                    </div>
                  </div>

                  <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white p-6 rounded-[2rem] font-black shadow-xl uppercase active:scale-95 transition tracking-widest text-sm mt-4 disabled:opacity-50">
                    {isSubmitting ? "ENVIANDO..." : "PUBLICAR AHORA"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* OTRAS VISTAS (MODERACIÓN, CALENDARIO, MAPA, PERFIL) SE MANTIENEN IGUAL QUE ANTES... */}
          {view === 'admin' && ( <div className="max-w-2xl mx-auto p-6 pb-40"> <h2 className="text-3xl font-black mb-8 text-amber-500 italic tracking-tighter">MODERACIÓN 🛡️</h2> {events.filter(e => e.status === 'pending').map(ev => ( <div key={ev.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] mb-6 border-2 border-amber-500/20 shadow-xl overflow-hidden"> <h4 className="font-black text-xl mb-2">{ev.title}</h4> <p className="text-sm text-slate-500 mb-6 font-bold uppercase tracking-widest">{ev.city} • {ev.date}</p> <div className="flex gap-3"> <button onClick={() => { supabase.from('events').update({ status: 'approved' }).eq('id', ev.id).then(() => fetchEvents()); }} className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-green-500/20">Aprobar</button> <button onClick={() => { supabase.from('events').update({ status: 'rejected' }).eq('id', ev.id).then(() => fetchEvents()); }} className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest opacity-70">Rechazar</button> </div> </div> ))} {events.filter(e => e.status === 'pending').length === 0 && <p className="text-center py-20 text-slate-500 font-black uppercase opacity-30">Nada que moderar ☕</p>} </div> )}
          {view === 'calendar' && ( <div className="max-w-xl mx-auto p-4 pb-40 animate-in slide-in-from-right duration-500"> <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border dark:border-slate-800 shadow-2xl"> <div className="flex justify-between items-center mb-8 text-indigo-500 font-black italic uppercase tracking-tighter"> <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><ChevronLeft/></button> <h2>{currentMonth.toLocaleString('es-ES', { month: 'long' })}</h2> <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><ChevronRight/></button> </div> <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest"> <span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sá</span><span>Do</span> </div> <div className="grid grid-cols-7 gap-2 text-center"> {[...Array(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() === 0 ? 6 : new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() - 1)].map((_, i) => <div key={i}></div>)} {[...Array(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate())].map((_, i) => { const day = i + 1; const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; const hasEvents = events.some(e => e.date === dateStr && e.status === 'approved'); return ( <button key={day} onClick={() => setActiveDay(dateStr === activeDay ? null : dateStr)} className={`aspect-square rounded-2xl flex items-center justify-center text-sm font-black transition-all border-2 ${hasEvents ? 'bg-green-500 border-green-400 text-white shadow-lg shadow-green-500/20' : 'border-transparent text-slate-400'} ${activeDay === dateStr ? 'bg-indigo-600 !border-indigo-400 text-white scale-110 shadow-lg' : ''}`}> {day} </button> ); })} </div> </div> {activeDay && ( <div className="mt-8 animate-in fade-in"> {events.filter(e => e.date === activeDay && e.status === 'approved').map(ev => ( <div key={ev.id} className="bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] flex justify-between items-center mb-4 border dark:border-slate-800 shadow-sm active:scale-95 transition" onClick={() => setSelectedEvent(ev)}> <span className="font-black px-4">{ev.title}</span> <div className="bg-indigo-600 p-2 rounded-2xl text-white shadow-lg shadow-indigo-500/20"><ChevronRight size={18}/></div> </div> ))} </div> )} </div> )}
          {view === 'map' && ( <div className="absolute inset-0 z-0 bg-white"> <MapContainer center={[40.41, -3.70]} zoom={6} className="h-full w-full"> <MapResizer /><TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" /> {events.filter(e => e.status === 'approved').map(ev => ev.lat && (<Marker key={ev.id} position={[ev.lat, ev.lng]}><Popup><div className="p-2 font-black text-indigo-600">{ev.title}</div></Popup></Marker>))} </MapContainer> </div> )}
          {view === 'profile' && ( <div className="max-w-2xl mx-auto p-6 pb-40"> <h3 className="text-3xl font-black mb-12 uppercase italic text-indigo-500 text-center underline underline-offset-8 decoration-4 tracking-tighter">Favoritos ❤️</h3> <div className="grid grid-cols-1 gap-4"> {events.filter(e => favorites.includes(e.id)).map(ev => ( <div key={ev.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border dark:border-slate-800 flex justify-between items-center shadow-md animate-in fade-in"> <span className="font-black text-xl px-4 truncate">{ev.title}</span> <button onClick={() => toggleFavorite(ev)} className="p-3 text-slate-300 hover:text-red-500 transition active:scale-75"><Trash2 size={28} /></button> </div> ))} </div> <div className="flex justify-center mt-16 mb-12"> <a href="https://ko-fi.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 bg-[#FF5E5B] text-white px-8 py-4 rounded-3xl font-black text-xs shadow-xl shadow-red-500/30 transition hover:scale-110 active:scale-95 uppercase tracking-widest"><DollarSign size={20}/> APOYAR PROYECTO</a> </div> {user && <button onClick={() => supabase.auth.signOut()} className="w-full mt-10 text-slate-400 font-black border-2 border-slate-100 dark:border-slate-800 p-6 rounded-[2.5rem] text-xs uppercase tracking-[0.3em] hover:bg-red-500 hover:text-white transition-all duration-500">Cerrar Sesión</button>} </div> )}

        </main>

        {/* MODAL DETALLES */}
        {selectedEvent && (
          <div className="fixed inset-0 z-[3000] bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[4rem] overflow-hidden relative shadow-2xl border dark:border-slate-800 border-b-[12px] border-b-indigo-600">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-8 right-8 z-10 p-2 bg-black/40 text-white rounded-full active:scale-90 transition"><X/></button>
              <img src={selectedEvent.image_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30'} className="w-full h-72 object-cover shadow-inner" alt="hero" />
              <div className="p-12">
                <div className="text-indigo-600 dark:text-indigo-400 text-[11px] font-black tracking-[0.4em] mb-4 uppercase">{selectedEvent.category}</div>
                <h2 className="text-4xl font-black mb-10 leading-none tracking-tighter">{selectedEvent.title}</h2>
                <div className="space-y-6 mb-12">
                   <div className="flex items-start gap-5 text-slate-600 dark:text-slate-300">
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600"><MapPin size={24} /></div>
                      <div className="flex-1"><p className="font-black text-xl leading-tight">{selectedEvent.address}</p><p className="text-xs opacity-50 uppercase font-black tracking-widest">{selectedEvent.city}</p></div>
                   </div>
                   <div className="flex items-center gap-5 text-slate-600 dark:text-slate-300">
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600"><Calendar size={24} /></div>
                      <div className="flex-1 font-black text-xl">{selectedEvent.date} • {selectedEvent.time || '20:00'}H</div>
                   </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <button onClick={() => alert("¡Registrado! Nos vemos allí 🚀")} className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black text-2xl shadow-xl shadow-indigo-500/40 active:scale-95 transition tracking-tighter">¡VOY A IR!</button>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.city)}`} target="_blank" rel="noreferrer" className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white py-5 rounded-[2.5rem] font-black text-center flex items-center justify-center gap-2 active:scale-95 transition tracking-widest text-[11px] uppercase">CÓMO LLEGAR</a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BARRA INFERIOR */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[94%] max-w-[460px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border dark:border-slate-800 h-[80px] rounded-full shadow-2xl flex items-center justify-around z-[2000] px-6 border-b-4 border-b-indigo-500/20 transition-all border-indigo-500/10">
          <button onClick={() => {setView('home'); setSelectedEvent(null)}} className={`p-3 transition-all ${view === 'home' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><LayoutList size={28}/></button>
          <button onClick={() => setView('calendar')} className={`p-3 transition-all ${view === 'calendar' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><Calendar size={28}/></button>
          <button onClick={() => setView('create')} className={`p-3 transition-all ${view === 'create' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><PlusCircle size={34}/></button>
          <button onClick={() => setView('map')} className={`p-3 transition-all ${view === 'map' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><MapIcon size={28}/></button>
          <button onClick={() => setView('profile')} className={`p-3 transition-all ${view === 'profile' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><Heart size={28}/></button>
        </div>

      </div>
    </div>
  );
}

export default App;
