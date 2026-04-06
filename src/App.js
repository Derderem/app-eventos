import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, 
  Navigation, Clock, ChevronLeft, ChevronRight, LayoutList, Music, Utensils, ShieldAlert, MoreHorizontal 
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Marcadores Mapa
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
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [isDark, setIsDark] = useState(true);
  const [view, setView] = useState('home'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Filtro de Categoría
  const [activeCategory, setActiveCategory] = useState('TODOS');

  // Estados del Calendario
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeDay, setActiveDay] = useState(null);

  // Estado del Formulario
  const [form, setForm] = useState({ title: '', category: 'MUSICA', city: '', address: '', date: '', time: '', image_url: '' });

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchEvents();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchFavorites(session.user.id);
    });
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'approved')
      .gte('date', todayStr)
      .order('date', { ascending: true });
    setEvents(data || []);
  };

  const fetchFavorites = async (userId) => {
    const { data } = await supabase.from('favorites').select('event_id').eq('user_id', userId);
    setFavorites(data ? data.map(f => f.event_id) : []);
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

  // Filtrado lógico de eventos
  const filteredEvents = activeCategory === 'TODOS' 
    ? events 
    : events.filter(e => e.category?.toUpperCase() === activeCategory);

  const categories = [
    { id: 'TODOS', label: 'TODOS', icon: <LayoutList size={16}/> },
    { id: 'MUSICA', label: 'MÚSICA', icon: <Music size={16}/> },
    { id: 'GASTRONOMIA', label: 'GASTRO', icon: <Utensils size={16}/> },
    { id: 'TAURINOS', label: 'TAURINOS', icon: <ShieldAlert size={16}/> },
    { id: 'OTROS', label: 'OTROS', icon: <MoreHorizontal size={16}/> }
  ];

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-500 overflow-hidden font-sans">
        
        {/* NAVBAR */}
        <nav className="h-[70px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 flex justify-between items-center px-6 z-[2000] shrink-0">
          <div className="flex items-center gap-2" onClick={() => {setView('home'); setActiveCategory('TODOS')}}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold shadow-lg">E</div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">Eventos</h1>
          </div>
          <button onClick={() => setIsDark(!isDark)} className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 transition-all">
            {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
          </button>
        </nav>

        <main className="flex-1 relative overflow-y-auto">
          
          {/* HOME: LISTADO CON CATEGORÍAS */}
          {view === 'home' && (
            <div className="p-4 pb-32 animate-in fade-in">
              
              {/* BARRA DE CATEGORÍAS */}
              <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar pt-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-[10px] tracking-widest transition-all shrink-0 shadow-sm
                    ${activeCategory === cat.id 
                      ? 'bg-indigo-600 text-white scale-105 shadow-indigo-500/20' 
                      : 'bg-white dark:bg-slate-900 text-slate-400 border dark:border-slate-800'}`}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-6 mt-2">
                {filteredEvents.map(ev => (
                  <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                    <div className="relative h-60 overflow-hidden" onClick={() => setSelectedEvent(ev)}>
                      <img src={ev.image_url} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" alt="img" />
                      <div className="absolute top-4 left-4 bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-lg">
                        {ev.category}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(ev); }} className="absolute top-4 right-4 p-3 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 shadow-xl active:scale-75 transition">
                        <Heart size={20} fill={favorites.includes(ev.id) ? "red" : "none"} />
                      </button>
                      <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-lg text-[10px] font-bold">
                        {ev.date === todayStr ? "HOY" : ev.date}
                      </div>
                    </div>
                    <div className="p-6 flex justify-between items-center">
                      <h3 className="text-xl font-black truncate pr-4">{ev.title}</h3>
                      <button onClick={() => setSelectedEvent(ev)} className="bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border border-indigo-600/20 active:scale-90 transition">Detalles</button>
                    </div>
                  </div>
                ))}
                {filteredEvents.length === 0 && (
                  <div className="text-center py-20 text-slate-400 font-bold italic">No hay eventos en esta categoría.</div>
                )}
              </div>
            </div>
          )}

          {/* CALENDARIO */}
          {view === 'calendar' && (
            <div className="p-4 pb-32 animate-in slide-in-from-right">
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border dark:border-slate-800 shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                   <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full"><ChevronLeft/></button>
                   <h2 className="text-2xl font-black uppercase italic tracking-tighter text-indigo-500">{currentMonth.toLocaleString('es-ES', { month: 'long' })}</h2>
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
                    const hasEvents = events.some(e => e.date === dateStr);
                    const isSelected = activeDay === dateStr;
                    return (
                      <button key={day} onClick={() => setActiveDay(dateStr === activeDay ? null : dateStr)} className={`aspect-square rounded-2xl flex items-center justify-center text-sm font-black transition-all border-2 ${hasEvents ? 'bg-green-500 border-green-400 text-white' : 'border-transparent text-slate-400'} ${isSelected ? 'bg-indigo-600 !border-indigo-400 text-white scale-110' : ''}`}>
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              {activeDay && (
                <div className="mt-8">
                  {events.filter(e => e.date === activeDay).map(ev => (
                    <div key={ev.id} className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] flex justify-between items-center mb-4 border dark:border-slate-800 shadow-sm" onClick={() => setSelectedEvent(ev)}>
                       <span className="font-black px-2">{ev.title}</span>
                       <div className="bg-indigo-600 p-2 rounded-xl text-white"><ChevronRight size={18}/></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CREAR + */}
          {view === 'create' && (
            <div className="p-6 pb-32">
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border dark:border-slate-800 shadow-2xl">
                <h2 className="text-2xl font-black mb-6 text-indigo-500 flex items-center gap-2 uppercase italic underline decoration-indigo-500/20">Publicar</h2>
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <input required placeholder="Título" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none" onChange={e => setForm({...form, title: e.target.value})} />
                  <select className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="MUSICA">MÚSICA</option>
                    <option value="GASTRONOMIA">GASTRONOMÍA</option>
                    <option value="TAURINOS">TAURINOS</option>
                    <option value="OTROS">OTROS</option>
                  </select>
                  <input required placeholder="Ciudad" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none" onChange={e => setForm({...form, city: e.target.value})} />
                  <input required placeholder="Dirección exacta" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none" onChange={e => setForm({...form, address: e.target.value})} />
                  <input required type="date" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none" onChange={e => setForm({...form, date: e.target.value})} />
                  <button type="submit" className="w-full bg-indigo-600 text-white p-5 rounded-3xl font-black shadow-xl uppercase tracking-widest active:scale-95 transition">Enviar a revisión</button>
                </form>
              </div>
            </div>
          )}

          {view === 'map' && (
            <div className="absolute inset-0 z-0 bg-white">
              <MapContainer center={[40.41, -3.70]} zoom={6} className="h-full w-full">
                <MapResizer /><TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                {events.map(ev => ev.lat && (<Marker key={ev.id} position={[ev.lat, ev.lng]}><Popup><strong>{ev.title}</strong></Popup></Marker>))}
              </MapContainer>
            </div>
          )}

          {view === 'profile' && (
            <div className="p-6 pb-32">
               <h3 className="text-xl font-black mb-8 text-center italic text-indigo-500 uppercase tracking-widest underline underline-offset-8">Favoritos ❤️</h3>
               <div className="space-y-4">
                  {events.filter(e => favorites.includes(e.id)).map(ev => (
                    <div key={ev.id} className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border dark:border-slate-800 flex justify-between items-center">
                       <span className="font-black text-lg px-2 truncate">{ev.title}</span>
                       <button onClick={() => toggleFavorite(ev)} className="p-3 text-slate-300 hover:text-red-500 transition active:scale-75"><Trash2 size={24} /></button>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </main>

        {/* MODAL DETALLES */}
        {selectedEvent && (
          <div className="fixed inset-0 z-[3000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3.5rem] overflow-hidden relative shadow-2xl border dark:border-slate-800 animate-in zoom-in duration-200">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full"><X/></button>
              <img src={selectedEvent.image_url} className="w-full h-64 object-cover" alt="hero" />
              <div className="p-8">
                <div className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black tracking-widest mb-2 uppercase">{selectedEvent.category}</div>
                <h2 className="text-3xl font-black mb-6 leading-tight tracking-tighter">{selectedEvent.title}</h2>
                <div className="space-y-3 mb-8">
                   <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                      <MapPin size={18} className="text-indigo-500 shrink-0 mt-1" />
                      <span className="font-bold">{selectedEvent.address}, {selectedEvent.city}</span>
                   </div>
                   <div className="flex items-center gap-2 font-bold text-sm text-slate-500">
                      <Calendar size={18} className="text-indigo-500" />
                      <span>{selectedEvent.date}</span>
                      <Clock size={18} className="text-indigo-500 ml-2" />
                      <span>{selectedEvent.time || '20:00'}h</span>
                   </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => alert("¡Guardado!")} className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition">¡VOY A IR!</button>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.city)}`} target="_blank" rel="noreferrer" className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white py-4 rounded-[2rem] font-bold text-center flex items-center justify-center gap-2 active:scale-95 transition tracking-widest text-xs">
                    CÓMO LLEGAR
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BARRA INFERIOR */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[94%] max-w-[440px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border dark:border-slate-800 h-[75px] rounded-full shadow-2xl flex items-center justify-around z-[2000] px-4 border-b-4 border-b-indigo-500/20">
          <button onClick={() => {setView('home'); setSelectedEvent(null)}} className={`p-2 transition-all ${view === 'home' ? "text-indigo-600 scale-125" : "text-slate-400"}`}><LayoutList size={26}/></button>
          <button onClick={() => setView('calendar')} className={`p-2 transition-all ${view === 'calendar' ? "text-indigo-600 scale-125" : "text-slate-400"}`}><Calendar size={26}/></button>
          <button onClick={() => setView('create')} className={`p-2 transition-all ${view === 'create' ? "text-indigo-600 scale-125" : "text-slate-400"}`}><PlusCircle size={30}/></button>
          <button onClick={() => setView('map')} className={`p-2 transition-all ${view === 'map' ? "text-indigo-600 scale-125" : "text-slate-400"}`}><MapIcon size={26}/></button>
          <button onClick={() => setView('profile')} className={`p-2 transition-all ${view === 'profile' ? "text-indigo-600 scale-125" : "text-slate-400"}`}><Heart size={26}/></button>
        </div>

      </div>
    </div>
  );
}

export default App;
