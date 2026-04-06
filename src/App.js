import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon } from 'lucide-react';
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
        
        {/* NAVBAR SUPERIOR */}
        <nav className="h-[70px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 p-4 z-[1000] flex justify-between items-center px-6">
          <div className="flex items-center gap-2" onClick={() => setView('home')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold shadow-lg shadow-indigo-500/20">E</div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">Eventos</h1>
          </div>
          <button onClick={() => setIsDark(!isDark)} className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800">
            {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
          </button>
        </nav>

        {/* CUERPO PRINCIPAL */}
        <main className="flex-1 relative overflow-y-auto">
          {view === 'home' && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6 pb-32">
              {events.map(ev => (
                <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="relative h-56" onClick={() => setSelectedEvent(ev)}>
                    <img src={ev.image_url} className="w-full h-full object-cover" alt="img" />
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(ev); }} className="absolute top-4 right-4 p-2 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 shadow-lg">
                      <Heart size={20} fill={favorites.includes(ev.id) ? "red" : "none"} />
                    </button>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-black mb-4 truncate">{ev.title}</h3>
                    <button onClick={() => setSelectedEvent(ev)} className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-2 rounded-xl font-bold">Detalles</button>
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

          {view === 'profile' && (
            <div className="p-6 pb-32">
               <h3 className="text-xl font-black mb-6 text-center italic text-indigo-500 uppercase tracking-widest underline underline-offset-8">Favoritos ❤️</h3>
               <div className="space-y-4">
                  {events.filter(e => favorites.includes(e.id)).map(ev => (
                    <div key={ev.id} className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border dark:border-slate-800 flex justify-between items-center shadow-sm">
                       <span className="font-bold text-lg px-2">{ev.title}</span>
                       <button onClick={() => toggleFavorite(ev)} className="p-3 text-slate-300 hover:text-red-500 transition active:scale-75"><Trash2 size={24} /></button>
                    </div>
                  ))}
                  {favorites.length === 0 && <p className="text-center text-slate-400 py-10 font-bold">Vacío</p>}
               </div>
               <button onClick={() => supabase.auth.signOut()} className="w-full mt-10 text-red-500 font-bold border-2 border-red-500/10 p-4 rounded-2xl">Cerrar Sesión</button>
            </div>
          )}
        </main>

        {/* MODAL DETALLES */}
        {selectedEvent && (
          <div className="fixed inset-0 z-[3000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] overflow-hidden relative shadow-2xl animate-in zoom-in duration-200">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full"><X/></button>
              <img src={selectedEvent.image_url} className="w-full h-64 object-cover" alt="hero" />
              <div className="p-8 text-center">
                <h2 className="text-2xl font-black mb-6">{selectedEvent.title}</h2>
                <button onClick={() => alert("¡Guardado!")} className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black text-xl active:scale-95 shadow-xl shadow-indigo-500/20">¡VOY A IR!</button>
              </div>
            </div>
          </div>
        )}

        {/* BARRA INFERIOR (AJUSTADA PARA QUE NO SE CORTE) */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border dark:border-slate-800 px-6 py-4 rounded-full shadow-2xl flex items-center gap-8 z-[2000] border-b-4 border-b-indigo-500/20">
          <button onClick={() => setView('home')} className={view === 'home' ? "text-indigo-600 scale-125" : "text-slate-400"}><Calendar size={24}/></button>
          <button onClick={() => setView('map')} className={view === 'map' ? "text-indigo-600 scale-125" : "text-slate-400"}><MapIcon size={24}/></button>
          <button onClick={() => setView('profile')} className={view === 'profile' ? "text-indigo-600 scale-125" : "text-slate-400"}><Heart size={24}/></button>
        </div>

      </div>
    </div>
  );
}

export default App;
