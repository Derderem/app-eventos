import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, 
  Navigation, Clock, ChevronLeft, ChevronRight, LayoutList, ShieldCheck, Star, DollarSign
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
  useEffect(() => { setTimeout(() => { map.invalidateSize(); }, 500); }, [map]);
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
  const [form, setForm] = useState({ title: '', category: 'MUSICA', city: '', address: '', date: '', time: '', image_url: '' });

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchEvents();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        fetchProfile(session.user.id);
        fetchFavorites(session.user.id);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchFavorites(session.user.id);
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const fetchProfile = async (id) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    setProfile(data);
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    setEvents(data || []);
  };

  const fetchFavorites = async (userId) => {
    const { data } = await supabase.from('favorites').select('event_id').eq('user_id', userId);
    setFavorites(data ? data.map(f => f.event_id) : []);
  };

  const handleLogin = async () => {
    const email = window.prompt("Email:");
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ 
      email, options: { emailRedirectTo: 'https://app-eventos-pro-final.vercel.app' }
    });
    if (error) alert(error.message);
    else alert("¡Enviado! Revisa tu correo.");
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

  const updateEventStatus = async (id, status) => {
    await supabase.from('events').update({ status }).eq('id', id);
    fetchEvents();
    alert(`Evento ${status === 'approved' ? 'Aprobado' : 'Rechazado'}`);
  };

  const filteredEvents = events.filter(e => {
    const matchesCat = activeCategory === 'TODOS' || e.category === activeCategory;
    const isApproved = e.status === 'approved';
    const isFuture = e.date >= todayStr;
    return matchesCat && isApproved && isFuture;
  });

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-500 overflow-hidden font-sans">
        
        {/* HEADER */}
        <nav className="h-[70px] shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 flex justify-between items-center px-8 z-[2000] shadow-sm">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => {setView('home'); setActiveDay(null); setActiveCategory('TODOS');}}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold shadow-lg shadow-indigo-500/20">E</div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">Eventos</h1>
          </div>
          <div className="flex items-center gap-4">
            {profile?.role === 'admin' && (
              <button onClick={() => setView('admin')} className="text-amber-500 hover:scale-110 transition"><ShieldCheck size={24}/></button>
            )}
            <button onClick={() => setIsDark(!isDark)} className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 transition-all active:scale-90">
              {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
            </button>
            {user ? (
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black border-2 border-white shadow-md cursor-pointer" onClick={() => setView('profile')}>
                {user.email[0].toUpperCase()}
              </div>
            ) : (
              <button onClick={handleLogin} className="bg-indigo-600 text-white px-6 py-2 rounded-2xl font-black text-xs shadow-lg active:scale-95 transition tracking-widest uppercase">ENTRAR</button>
            )}
          </div>
        </nav>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 relative overflow-y-auto">
          {view === 'home' && (
            <div className="max-w-6xl mx-auto p-6 pb-40">
              {/* Categorías con mejor diseño */}
              <div className="flex gap-3 overflow-x-auto pb-8 no-scrollbar pt-2">
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINOS', 'OTROS'].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} 
                    className={`px-6 py-2.5 rounded-full font-black text-[10px] tracking-[0.2em] transition-all shrink-0 border-2
                    ${activeCategory === cat 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-500/30 scale-105' 
                      : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800'}`}>
                    {cat}
                  </button>
                ))}
              </div>

              {/* GRID RESPONSIVO: 1 columna en móvil, 2 en tablet, 3 en PC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredEvents.map(ev => (
                  <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[3rem] border dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 group flex flex-col h-full">
                    <div className="relative h-64 overflow-hidden cursor-pointer" onClick={() => setSelectedEvent(ev)}>
                      <img src={ev.image_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30'} className="w-full h-full object-cover group-hover:scale-110 transition duration-1000" alt="img" />
                      <div className="absolute top-5 left-5 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] shadow-lg">
                        {ev.category}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(ev); }} className="absolute top-5 right-5 p-3 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 shadow-xl active:scale-75 transition">
                        <Heart size={20} fill={favorites.includes(ev.id) ? "red" : "none"} />
                      </button>
                      <div className="absolute bottom-5 right-5 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-2xl text-[11px] font-black">
                        {ev.date === todayStr ? "¡HOY!" : ev.date}
                      </div>
                    </div>
                    <div className="p-8 flex flex-col flex-1">
                      <h3 className="text-2xl font-black mb-6 leading-tight tracking-tighter line-clamp-2">{ev.title}</h3>
                      <button onClick={() => setSelectedEvent(ev)} className="mt-auto w-full bg-slate-900 dark:bg-indigo-600 text-white py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] hover:shadow-xl active:scale-95 transition">Ver Detalles</button>
                    </div>
                  </div>
                ))}
              </div>
              {filteredEvents.length === 0 && (
                <div className="text-center py-24 text-slate-400 font-black italic uppercase tracking-widest opacity-30">No hay eventos próximos</div>
              )}
            </div>
          )}

          {/* ADMIN */}
          {view === 'admin' && (
            <div className="max-w-2xl mx-auto p-6 pb-40">
              <h2 className="text-3xl font-black mb-8 text-amber-500 italic">MODERACIÓN</h2>
              {events.filter(e => e.status === 'pending').map(ev => (
                <div key={ev.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] mb-6 border-2 border-amber-500/20 shadow-xl">
                  <h4 className="font-black text-xl mb-2">{ev.title}</h4>
                  <p className="text-sm text-slate-500 mb-6">{ev.city} • {ev.date}</p>
                  <div className="flex gap-3">
                    <button onClick={() => updateEventStatus(ev.id, 'approved')} className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-xs">Aprobar</button>
                    <button onClick={() => updateEventStatus(ev.id, 'rejected')} className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-xs">Rechazar</button>
                  </div>
                </div>
              ))}
              {events.filter(e => e.status === 'pending').length === 0 && <p className="text-center py-20 text-slate-500">Bandeja limpia ☕</p>}
            </div>
          )}

          {/* CALENDARIO */}
          {view === 'calendar' && (
            <div className="max-w-xl mx-auto p-4 pb-40 animate-in slide-in-from-right duration-500">
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border dark:border-slate-800 shadow-2xl">
                <div className="flex justify-between items-center mb-8 text-indigo-500">
                   <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full"><ChevronLeft/></button>
                   <h2 className="text-xl font-black uppercase italic tracking-tighter">{currentMonth.toLocaleString('es-ES', { month: 'long' })}</h2>
                   <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full"><ChevronRight/></button>
                </div>
                <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black text-slate-400 mb-4 uppercase">
                  <span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sá</span><span>Do</span>
                </div>
                <div className="grid grid-cols-7 gap-2 text-center">
                  {[...Array(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() === 0 ? 6 : new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() - 1)].map((_, i) => <div key={i}></div>)}
                  {[...Array(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate())].map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const hasEvents = events.some(e => e.date === dateStr && e.status === 'approved');
                    return (
                      <button key={day} onClick={() => setActiveDay(dateStr === activeDay ? null : dateStr)} className={`aspect-square rounded-2xl flex items-center justify-center text-sm font-black transition-all border-2 ${hasEvents ? 'bg-green-500 border-green-400 text-white shadow-lg shadow-green-500/20' : 'border-transparent text-slate-400'} ${activeDay === dateStr ? 'bg-indigo-600 !border-indigo-400 text-white scale-110 shadow-lg' : ''}`}>
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              {activeDay && (
                <div className="mt-8 animate-in fade-in">
                  {events.filter(e => e.date === activeDay && e.status === 'approved').map(ev => (
                    <div key={ev.id} className="bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] flex justify-between items-center mb-4 border dark:border-slate-800 shadow-sm active:scale-95 transition" onClick={() => setSelectedEvent(ev)}>
                       <span className="font-black px-4">{ev.title}</span>
                       <div className="bg-indigo-600 p-2 rounded-2xl text-white shadow-lg"><ChevronRight size={18}/></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CREAR */}
          {view === 'create' && (
            <div className="max-w-xl mx-auto p-6 pb-40 animate-in slide-in-from-bottom duration-500">
              <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-10 border dark:border-slate-800 shadow-2xl">
                <h2 className="text-3xl font-black mb-8 text-indigo-500 uppercase italic tracking-tighter">Publicar</h2>
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <input required placeholder="Título del evento" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none border-2 border-transparent focus:border-indigo-500 transition font-bold" onChange={e => setForm({...form, title: e.target.value})} />
                  <select className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-black text-xs uppercase tracking-widest" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="MUSICA">MÚSICA</option><option value="GASTRONOMIA">GASTRONOMÍA</option><option value="TAURINOS">TAURINOS</option><option value="OTROS">OTROS</option>
                  </select>
                  <input required placeholder="Ciudad" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none border-2 border-transparent focus:border-indigo-500 transition font-bold" onChange={e => setForm({...form, city: e.target.value})} />
                  <input required placeholder="Dirección exacta" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none border-2 border-transparent focus:border-indigo-500 transition font-bold" onChange={e => setForm({...form, address: e.target.value})} />
                  <input required type="date" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-bold" onChange={e => setForm({...form, date: e.target.value})} />
                  <button type="submit" className="w-full bg-indigo-600 text-white p-6 rounded-[2rem] font-black shadow-xl shadow-indigo-500/20 uppercase active:scale-95 transition tracking-widest text-sm mt-4">ENVIAR A REVISIÓN</button>
                </form>
              </div>
            </div>
          )}

          {view === 'map' && (
            <div className="absolute inset-0 z-0 bg-white">
              <MapContainer center={[40.41, -3.70]} zoom={6} className="h-full w-full">
                <MapResizer /><TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                {events.filter(e => e.status === 'approved').map(ev => ev.lat && (<Marker key={ev.id} position={[ev.lat, ev.lng]}><Popup><div className="p-2 font-black text-indigo-600">{ev.title}</div></Popup></Marker>))}
              </MapContainer>
            </div>
          )}

          {/* PERFIL */}
          {view === 'profile' && (
            <div className="max-w-2xl mx-auto p-6 pb-40">
               <div className="text-center mb-16">
                  <h3 className="text-4xl font-black mb-8 uppercase italic text-indigo-500 underline underline-offset-8 decoration-4">Favoritos ❤️</h3>
                  <a href="https://ko-fi.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 bg-[#FF5E5B] text-white px-8 py-4 rounded-3xl font-black text-xs shadow-xl shadow-red-500/30 transition hover:scale-110 active:scale-95 uppercase tracking-widest"><DollarSign size={20}/> APOYAR EL PROYECTO</a>
               </div>
               <div className="grid grid-cols-1 gap-4">
                  {events.filter(e => favorites.includes(e.id)).map(ev => (
                    <div key={ev.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border dark:border-slate-800 flex justify-between items-center shadow-md">
                       <span className="font-black text-xl px-4 truncate">{ev.title}</span>
                       <button onClick={() => toggleFavorite(ev)} className="p-3 text-slate-300 hover:text-red-500 transition active:scale-75"><Trash2 size={28} /></button>
                    </div>
                  ))}
               </div>
               {user && <button onClick={() => supabase.auth.signOut()} className="w-full mt-24 text-slate-400 font-black border-2 border-slate-100 dark:border-slate-800 p-6 rounded-[2.5rem] text-xs uppercase tracking-[0.3em] hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-500">Cerrar Sesión</button>}
            </div>
          )}
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
                  <button onClick={() => alert("¡Registrado! 🎸")} className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black text-2xl shadow-2xl shadow-indigo-500/40 active:scale-95 transition tracking-tighter">¡VOY A IR!</button>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.city)}`} target="_blank" rel="noreferrer" className="w-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-white py-5 rounded-[2rem] font-black text-center flex items-center justify-center gap-2 active:scale-95 transition tracking-widest text-[11px] uppercase">CÓMO LLEGAR</a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BARRA INFERIOR (ISLA FLOTANTE) */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[94%] max-w-[460px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border dark:border-slate-800 h-[80px] rounded-full shadow-2xl flex items-center justify-around z-[2000] px-6 border-b-4 border-b-indigo-500/20 transition-all">
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
