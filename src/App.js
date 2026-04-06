import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Corregir iconos de marcadores
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Componente para arreglar el tamaño del mapa al cargar
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
        
        {/* HEADER */}
        <nav className="h-[70px] bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex justify-between items-center px-6 z-[2000]">
          <div className="flex items-center gap-2" onClick={() => setView('home')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold">E</div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">Eventos</h1>
          </div>
          <button onClick={() => setIsDark(!isDark)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
          </button>
        </nav>

        {/* CONTENIDO */}
        <main className="flex-1 relative overflow-y-auto">
          {view === 'home' && (
            <div className="p-4 grid grid-cols-1 gap-6 pb-24">
              {events.map(ev => (
                <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="relative h-52" onClick={() => setSelectedEvent(ev)}>
                    <img src={ev.image_url} className="w-full h-full object-cover" alt="img" />
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(ev); }} className="absolute top-4 right-4 p-2 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 shadow-lg">
                      <Heart size={20} fill={favorites.includes(ev.id) ? "red" : "none"} />
                    </button>
                  </div>
                  <div className="p-4"><h3 className="text-lg font-black mb-4">{ev.title}</h3>
                  <button onClick={() => setSelectedEvent(ev)} className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-2 rounded-xl font-bold">Detalles</button></div>
                </div>
              ))}
            </div>
          )}

          {view === 'map' && (
            <div className="absolute inset-0 z-0 map-wrapper">
              <MapContainer center={[40.41, -3.70]} zoom={6} className="h-full w-full">
                <MapResizer />
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {events.map(ev => ev.lat && (
                   <Marker key={ev.id} position={[ev.lat, ev.lng]}>
                    <Popup><div className="font-bold">{ev.title}</div></Popup>
                   </Marker>
                ))}
              </MapContainer>
            </div>
          )}

          {view === 'create' && (
            <div className="p-8 text-center bg-white dark:bg-slate-900 h-full">
               <PlusCircle className="mx-auto mb-4 text-indigo-600" size={48}/>
               <h2 className="text-2xl font-black mb-4">Publicar Evento</h2>
               <p className="text-slate-500 mb-8">Envía tu evento a través del SQL Editor en Supabase.</p>
               <button onClick={() => setView('home')} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold w-full">Volver</button>
            </div>
          )}

          {view === 'profile' && (
            <div className="p-6 text-center">
               <h3 className="text-xl font-black mb-6 flex items-center justify-center gap-2 italic text-indigo-500 underline decoration-4">FAVORITOS ❤️</h3>
               {events.filter(e => favorites.includes(e.id)).map(ev => (
                  <div key={ev.id} className="bg-white dark:bg-slate-900 p-4 mb-3 rounded-2xl border dark:border-slate-800 flex justify-between items-center">
                    <span className="font-bold">{ev.title}</span>
                    <button onClick={() => toggleFavorite(ev)} className="text-red-500"><Trash2 size={24} /></button>
                  </div>
               ))}
               {favorites.length === 0 && <p className="text-slate-500">Vacío</p>}
            </div>
          )}
        </main>

        {/* MODAL DETALLES */}
        {selectedEvent && (
          <div className="fixed inset-0 z-[3000] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] overflow-hidden relative shadow-2xl">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full"><X/></button>
              <img src={selectedEvent.image_url} className="w-full h-64 object-cover" alt="hero" />
              <div className="p-8 text-center">
                <h2 className="text-2xl font-black mb-4 leading-tight">{selectedEvent.title}</h2>
                <div className="flex justify-center gap-4 text-slate-500 font-bold mb-8">
                   <span>{selectedEvent.city}</span>
                   <span>{selectedEvent.date}</span>
                </div>
                <button onClick={() => alert("¡Apuntado!")} className="w-full bg-indigo-600 text-white py-4 rounded-3xl font-black text-xl">¡VOY A IR!</button>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER NAV */}
        <div className="h-[80px] bg-white dark:bg-slate-900 border-t dark:border-slate-800 flex items-center justify-around z-[2000] pb-2">
          <button onClick={() => setView('home')} className={view === 'home' ? "text-indigo-600" : "text-slate-400"}><Calendar size={24}/></button>
          <button onClick={() => setView('map')} className={view === 'map' ? "text-indigo-600" : "text-slate-400"}><MapIcon size={24}/></button>
          <button onClick={() => setView('create')} className={view === 'create' ? "text-indigo-600" : "text-slate-400"}><PlusCircle size={24}/></button>
          <button onClick={() => setView('profile')} className={view === 'profile' ? "text-indigo-600" : "text-slate-400"}><Heart size={24}/></button>
        </div>

      </div>
    </div>
  );
}

export default App;
