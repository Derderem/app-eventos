import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, 
  Navigation, Clock, ChevronLeft, ChevronRight, LayoutList 
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
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [isDark, setIsDark] = useState(true);
  const [view, setView] = useState('home'); 
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Estados del Calendario
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeDay, setActiveDay] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchEvents();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchFavorites(session.user.id);
    });
  }, []);

  const fetchEvents = async () => {
    // Pedimos eventos ordenados por fecha ascendente
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'approved')
      .gte('date', todayStr) // Solo eventos de hoy en adelante
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

  // --- LÓGICA DEL CALENDARIO ---
  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const monthName = currentMonth.toLocaleString('es-ES', { month: 'long' });
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const changeMonth = (offset) => {
    setCurrentMonth(new Date(year, month + offset, 1));
    setActiveDay(null);
  };

  const handleDayClick = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setActiveDay(dateStr === activeDay ? null : dateStr);
  };

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-500 overflow-hidden font-sans">
        
        {/* NAVBAR SUPERIOR */}
        <nav className="h-[70px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 flex justify-between items-center px-6 z-[2000] shrink-0">
          <div className="flex items-center gap-2" onClick={() => {setView('home'); setActiveDay(null)}}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold shadow-lg">E</div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">Eventos</h1>
          </div>
          <button onClick={() => setIsDark(!isDark)} className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800">
            {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
          </button>
        </nav>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 relative overflow-y-auto">
          
          {/* VISTA HOME: LISTADO CRONOLÓGICO */}
          {view === 'home' && (
            <div className="p-4 pb-32 animate-in fade-in duration-500">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500 mb-6 ml-2">Próximos Eventos</h2>
              <div className="grid grid-cols-1 gap-6">
                {events.map(ev => (
                  <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                    <div className="relative h-56 overflow-hidden" onClick={() => setSelectedEvent(ev)}>
                      <img src={ev.image_url} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" alt="img" />
                      <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 px-3 py-1 rounded-full text-[10px] font-black text-indigo-600 uppercase shadow-sm">
                        {ev.date === todayStr ? "Hoy" : ev.date}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(ev); }} className="absolute top-4 right-4 p-3 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 shadow-xl">
                        <Heart size={20} fill={favorites.includes(ev.id) ? "red" : "none"} />
                      </button>
                    </div>
                    <div className="p-6">
                      <h3 className="text-2xl font-black mb-4 truncate leading-tight">{ev.title}</h3>
                      <button onClick={() => setSelectedEvent(ev)} className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-4 rounded-2xl font-black active:scale-95 transition">Ver Detalles</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA CALENDARIO EXCLUSIVA */}
          {view === 'calendar' && (
            <div className="p-4 pb-32 animate-in slide-in-from-right duration-500">
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border dark:border-slate-800 shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                   <button onClick={() => changeMonth(-1)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full"><ChevronLeft/></button>
                   <h2 className="text-2xl font-black uppercase italic tracking-tighter text-indigo-500">{monthName}</h2>
                   <button onClick={() => changeMonth(1)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full"><ChevronRight/></button>
                </div>
                <div className="grid grid-cols-7 gap-3 text-center text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest">
                  <span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sá</span><span>Do</span>
                </div>
                <div className="grid grid-cols-7 gap-3 text-center">
                  {[...Array(firstDayOfMonth(year, month))].map((_, i) => <div key={i}></div>)}
                  {[...Array(daysInMonth(year, month))].map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const hasEvents = events.some(e => e.date === dateStr);
                    const isSelected = activeDay === dateStr;
                    return (
                      <button key={day} onClick={() => handleDayClick(day)} className={`aspect-square rounded-2xl flex items-center justify-center text-sm font-black transition-all border-2 ${hasEvents ? 'bg-green-500 border-green-400 text-white shadow-lg shadow-green-500/20' : 'border-transparent text-slate-400'} ${isSelected ? 'bg-indigo-600 border-indigo-400 text-white scale-110' : ''}`}>
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              {activeDay && (
                <div className="mt-8 animate-in fade-in">
                  <h3 className="font-black mb-4 ml-2 uppercase text-xs text-slate-500">Eventos para el {activeDay}</h3>
                  {events.filter(e => e.date === activeDay).map(ev => (
                    <div key={ev.id} className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] flex justify-between items-center mb-4 border dark:border-slate-800 shadow-sm" onClick={() => setSelectedEvent(ev)}>
                       <span className="font-black px-2">{ev.title}</span>
                       <div className="bg-indigo-600 p-2 rounded-xl text-white"><ChevronRight size={16}/></div>
                    </div>
                  ))}
                </div>
              )}
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
                    <div key={ev.id} className="bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] border dark:border-slate-800 flex justify-between items-center">
                       <span className="font-black text-lg px-2">{ev.title}</span>
                       <button onClick={() => toggleFavorite(ev)} className="p-3 text-slate-300 hover:text-red-500 transition"><Trash2 size={24} /></button>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </main>

        {/* MODAL DETALLES */}
        {selectedEvent && (
          <div className="fixed inset-0 z-[3000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3.5rem] overflow-hidden relative shadow-2xl">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full"><X/></button>
              <img src={selectedEvent.image_url} className="w-full h-64 object-cover" alt="hero" />
              <div className="p-10">
                <h2 className="text-3xl font-black mb-6 leading-tight tracking-tighter">{selectedEvent.title}</h2>
                <div className="space-y-4 mb-10">
                   <div className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                      <MapPin size={22} className="text-indigo-500 shrink-0" />
                      <span className="font-bold text-lg">{selectedEvent.address}, {selectedEvent.city}</span>
                   </div>
                   <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-black">
                      <Calendar size={22} className="text-indigo-500" />
                      <span>{selectedEvent.date}</span>
                      <Clock size={22} className="text-indigo-500 ml-2" />
                      <span>{selectedEvent.time || '20:00'}h</span>
                   </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => alert("¡Guardado!")} className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-xl active:scale-95 shadow-xl">¡VOY A IR!</button>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.city)}`} target="_blank" rel="noreferrer" className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white py-4 rounded-[2rem] font-bold text-center flex items-center justify-center gap-2 active:scale-95 transition">
                    <Navigation size={18} /> CÓMO LLEGAR
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BARRA INFERIOR CON 4 ICONOS CLAROS */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border dark:border-slate-800 h-[75px] rounded-full shadow-2xl flex items-center justify-around z-[2000] px-6 border-b-4 border-b-indigo-500/20">
          <button onClick={() => setView('home')} className={`p-2 transition-all ${view === 'home' ? "text-indigo-600 scale-125" : "text-slate-400"}`}><LayoutList size={28}/></button>
          <button onClick={() => setView('calendar')} className={`p-2 transition-all ${view === 'calendar' ? "text-indigo-600 scale-125" : "text-slate-400"}`}><Calendar size={28}/></button>
          <button onClick={() => setView('map')} className={`p-2 transition-all ${view === 'map' ? "text-indigo-600 scale-125" : "text-slate-400"}`}><MapIcon size={28}/></button>
          <button onClick={() => setView('profile')} className={`p-2 transition-all ${view === 'profile' ? "text-indigo-600 scale-125" : "text-slate-400"}`}><Heart size={28}/></button>
        </div>

      </div>
    </div>
  );
}

export default App;
