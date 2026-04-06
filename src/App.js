import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, Navigation, Clock 
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Corregir iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Forzar al mapa a medir la pantalla correctamente
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => { map.invalidateSize(); }, 500);
  }, [map]);
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

  useEffect(() => {
    fetchEvents();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchFavorites(session.user.id);
    });
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').eq('status', 'approved');
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

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-500 overflow-hidden font-sans">
        
        {/* CABECERA */}
        <nav className="h-[70px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 p-4 z-[1000] flex justify-between items-center px-6 shrink-0">
          <div className="flex items-center gap-2" onClick={() => setView('home')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold shadow-lg">E</div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">Eventos</h1>
          </div>
          <button onClick={() => setIsDark(!isDark)} className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800">
            {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
          </button>
        </nav>

        {/* CUERPO DE LA APP */}
        <main className="flex-1 relative overflow-y-auto">
          {view === 'home' && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6 pb-32">
              {events.map(ev => (
                <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                  <div className="relative h-56" onClick={() => setSelectedEvent(ev)}>
                    <img src={ev.image_url} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" alt="img" />
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(ev); }} className="absolute top-4 right-4 p-3 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 shadow-xl">
                      <Heart size={20} fill={favorites.includes(ev.id) ? "red" : "none"} />
                    </button>
                  </div>
                  <div className="p-6">
                    <h3 className="text-2xl font-black mb-4 truncate">{ev.title}</h3>
                    <button onClick={() => setSelectedEvent(ev)} className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-4 rounded-2xl font-black active:scale-95 transition">Ver Detalles</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'map' && (
            <div className="absolute inset-0 z-0 bg-white">
              <MapContainer center={[40.41, -3.70]} zoom={6} className="h-full w-full">
                <MapResizer />
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                {events.map(ev => ev.lat && (
                   <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                    <Popup><div className="p-1 font-bold">{ev.title}</div></Popup>
                   </Marker>
                ))}
              </MapContainer>
            </div>
          )}

          {view === 'profile' && (
            <div className="p-6 pb-32">
               <h3 className="text-xl font-black mb-8 text-center italic text-indigo-500 uppercase underline underline-offset-8">Favoritos ❤️</h3>
               <div className="space-y-4">
                  {events.filter(e => favorites.includes(e.id)).map(ev => (
                    <div key={ev.id} className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border dark:border-slate-800 flex justify-between items-center shadow-sm">
                       <span className="font-bold text-lg">{ev.title}</span>
                       <button onClick={() => toggleFavorite(ev)} className="p-3 text-slate-300 hover:text-red-500 transition active:scale-75"><Trash2 size={24} /></button>
                    </div>
                  ))}
                  {favorites.length === 0 && <p className="text-center text-slate-400 py-10">No has guardado nada todavía.</p>}
               </div>
               <button onClick={() => supabase.auth.signOut()} className="w-full mt-10 text-red-500 font-bold border-2 border-red-500/10 p-4 rounded-2xl">Cerrar Sesión</button>
            </div>
          )}
        </main>

        {/* MODAL DETALLES CON DIRECCIÓN */}
        {selectedEvent && (
          <div className="fixed inset-0 z-[3000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] overflow-hidden relative shadow-2xl border dark:border-slate-800">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full"><X/></button>
              <img src={selectedEvent.image_url} className="w-full h-64 object-cover" alt="hero" />
              <div className="p-8">
                <h2 className="text-2xl font-black mb-4 leading-tight">{selectedEvent.title}</h2>
                <div className="space-y-3 mb-8 text-slate-600 dark:text-slate-300">
                   <div className="flex items-start gap-2">
                      <MapPin size={18} className="text-indigo-500 shrink-0 mt-1" />
                      <span className="font-bold">{selectedEvent.address}, {selectedEvent.city}</span>
                   </div>
                   <div className="flex items-center gap-2 font-bold">
                      <Calendar size={18} className="text-indigo-500" />
                      <span>{selectedEvent.date}</span>
                   </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => alert("¡Guardado!")} className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl shadow-indigo-500/20 active:scale-95 transition">¡VOY A IR!</button>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.city)}`}
                    target="_blank" rel="noreferrer"
                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white py-4 rounded-[2rem] font-bold text-center flex items-center justify-center gap-2 active:scale-95 transition"
                  >
                    <Navigation size={18} /> CÓMO LLEGAR
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BARRA INFERIOR (LOS 4 ICONOS) */}
        <div className="h-[85px] shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t dark:border-slate-800 flex items-center justify-around z-[2000] pb-4 px-4 transition-all">
          <button onClick={() => {setView('home'); setSelectedEvent(null)}} className={`p-2 transition-all ${view === 'home' ? "text-indigo-600 scale-125" : "text-slate-400"}`}><Calendar size={26}/></button>
          <button onClick={() => setView('map')} className={`p-2 transition-all ${view === 'map' ? "text-indigo-600 scale-125" : "text-slate-400"}`}><MapIcon size={26}/></button>
          <button onClick={() => setView('create')} className={`p-2 transition-all ${view === 'create' ? "text-indigo-600 scale-125" : "text-slate-400"}`}><PlusCircle size={30}/></button>
          <button onClick={() => setView('profile')} className={`p-2 transition-all ${view === 'profile' ? "text-indigo-600 scale-125" : "text-slate-400"}`}><Heart size={26}/></button>
        </div>

      </div>
    </div>
  );
}

export default App;
