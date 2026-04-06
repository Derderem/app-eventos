import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Corregir iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Función para que el mapa se ajuste al tamaño del móvil
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
      <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-500 overflow-hidden">
        
        {/* NAVBAR */}
        <nav className="h-[70px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 flex justify-between items-center px-6 z-[2000] shrink-0">
          <div className="flex items-center gap-2" onClick={() => setView('home')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold shadow-lg shadow-indigo-500/20">E</div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">Eventos</h1>
          </div>
          <button onClick={() => setIsDark(!isDark)} className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 transition-all active:scale-90">
            {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
          </button>
        </nav>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 relative overflow-y-auto">
          {view === 'home' && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6 pb-24 animate-in fade-in duration-500">
              {events.map(ev => (
                <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                  <div className="relative h-56 overflow-hidden" onClick={() => setSelectedEvent(ev)}>
                    <img src={ev.image_url} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" alt="img" />
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(ev); }} className="absolute top-4 right-4 p-3 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 shadow-xl active:scale-75 transition">
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
                    <Popup><div className="p-1 font-bold text-slate-800">{ev.title}</div></Popup>
                   </Marker>
                ))}
              </MapContainer>
            </div>
          )}

          {view === 'create' && (
            <div className="p-10 text-center bg-white dark:bg-slate-900 h-full flex flex-col justify-center items-center">
               <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-full mb-6 text-indigo-600"><PlusCircle size={60}/></div>
               <h2 className="text-3xl font-black mb-4 uppercase italic tracking-tighter">Nuevo Evento</h2>
               <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-xs font-medium">Usa el SQL Editor de Supabase para publicar por ahora.</p>
               <button onClick={() => setView('home')} className="bg-indigo-600 text-white px-10 py-4 rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-500/20 active:scale-95 transition">VOLVER AL INICIO</button>
            </div>
          )}

          {view === 'profile' && (
            <div className="p-6 pb-28 animate-in slide-in-from-bottom duration-500">
               <h3 className="text-xl font-black mb-8 text-center italic text-indigo-500 uppercase tracking-widest decoration-indigo-500/30 underline underline-offset-8">Favoritos ❤️</h3>
               <div className="space-y-4">
                  {events.filter(e => favorites.includes(e.id)).map(ev => (
                    <div key={ev.id} className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border dark:border-slate-800 flex justify-between items-center shadow-sm">
                       <span className="font-bold text-lg px-2">{ev.title}</span>
                       <button onClick={() => toggleFavorite(ev)} className="p-3 text-slate-300 hover:text-red-500 transition active:scale-75"><Trash2 size={24} /></button>
                    </div>
                  ))}
                  {favorites.length === 0 && <p className="text-center text-slate-400 py-10 font-bold">No tienes nada guardado aún.</p>}
               </div>
               <button onClick={() => supabase.auth.signOut()} className="w-full mt-10 text-red-500 font-bold border-2 border-red-500/10 p-5 rounded-3xl text-sm uppercase">Cerrar Sesión</button>
            </div>
          )}
        </main>

        {/* MODAL DETALLES */}
        {selectedEvent && (
          <div className="fixed inset-0 z-[3000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] overflow-hidden relative shadow-2xl">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full"><X/></button>
              <img src={selectedEvent.image_url} className="w-full h-72 object-cover" alt="hero" />
              <div className="p-8 text-center">
                <h2 className="text-3xl font-black mb-6 leading-tight">{selectedEvent.title}</h2>
                <div className="flex justify-center gap-6 text-slate-500 font-bold mb-10 text-sm uppercase">
                   <span className="flex items-center gap-1"><MapPin size={16}/>{selectedEvent.city}</span>
                   <span className="flex items-center gap-1"><Calendar size={16}/>{selectedEvent.date}</span>
                </div>
                <button onClick={() => alert("¡Apuntado!")} className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition tracking-tighter">¡VOY A IR!</button>
              </div>
            </div>
          </div>
        )}

        {/* BARRA INFERIOR (LOS 4 ICONOS ACTIVOS) */}
        <div className="h-[85px] shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t dark:border-slate-800 flex items-center justify-around z-[2000] pb-4 px-4">
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
