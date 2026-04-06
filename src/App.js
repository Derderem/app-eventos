import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Corregir iconos del mapa
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY);

function App() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [isDark, setIsDark] = useState(true);
  const [view, setView] = useState('home');
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data: f } = await supabase.from('favorites').select('event_id').eq('user_id', session.user.id);
        setFavorites(f ? f.map(item => item.event_id) : []);
      }
      const { data: evs } = await supabase.from('events').select('*').eq('status', 'approved');
      setEvents(evs || []);
    };
    loadData();
  }, []);

  const toggleFavorite = async (event) => {
    if (!user) { alert("Inicia sesión ❤️"); return; }
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-500 pb-24">
        
        <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 p-4 sticky top-0 z-[1000] flex justify-between items-center px-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold">E</div>
            <h1 className="text-xl font-black uppercase italic">Eventos</h1>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setIsDark(!isDark)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
            </button>
            <button onClick={() => alert("Enlace en tu email")} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm">Entrar</button>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto p-4">
          {view === 'home' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              {events.map(event => (
                <div key={event.id} className="bg-white dark:bg-slate-900 rounded-[2rem] border dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="relative h-52 overflow-hidden" onClick={() => setSelectedEvent(event)}>
                    <img src={event.image_url} className="w-full h-full object-cover" alt="img" />
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(event); }} className="absolute top-4 right-4 p-2 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 shadow-lg">
                      <Heart size={20} fill={favorites.includes(event.id) ? "red" : "none"} />
                    </button>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-black mb-4 truncate">{event.title}</h3>
                    <button onClick={() => setSelectedEvent(event)} className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-2 rounded-xl font-bold">Detalles</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'map' && (
            <div className="fixed inset-0 top-[70px] bottom-[80px] z-0">
              <MapContainer center={[40.41, -3.70]} zoom={6} style={{ height: '100%', width: '100%' }}>
                <TileLayer url={isDark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
                {events.map(ev => ev.lat && (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]}><Popup><strong>{ev.title}</strong></Popup></Marker>
                ))}
              </MapContainer>
            </div>
          )}

          {view === 'create' && (
            <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-xl text-center border dark:border-slate-800">
               <PlusCircle className="mx-auto mb-4 text-indigo-600" size={40}/>
               <h2 className="text-2xl font-black mb-4 uppercase italic">Publicar</h2>
               <p className="text-slate-500 mb-8 font-medium">Usa el SQL Editor de Supabase para añadir eventos ahora mismo.</p>
               <button onClick={() => setView('home')} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold w-full">Volver al Inicio</button>
            </div>
          )}

          {view === 'profile' && (
            <div className="max-w-xl mx-auto py-6">
               <h3 className="text-xl font-black mb-6 text-center italic text-indigo-500">MIS FAVORITOS ❤️</h3>
               {events.filter(e => favorites.includes(e.id)).map(event => (
                  <div key={event.id} className="bg-white dark:bg-slate-900 p-4 mb-3 rounded-2xl border dark:border-slate-800 flex justify-between items-center shadow-sm">
                    <span className="font-bold px-4">{event.title}</span>
                    <button onClick={() => toggleFavorite(event)} className="text-red-500 p-2"><Trash2 size={24} /></button>
                  </div>
               ))}
               {favorites.length === 0 && <p className="text-center text-slate-500 py-10">No hay favoritos guardados todavía.</p>}
            </div>
          )}
        </main>

        {selectedEvent && (
          <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] overflow-hidden relative shadow-2xl">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full"><X/></button>
              <img src={selectedEvent.image_url} className="w-full h-64 object-cover" alt="hero" />
              <div className="p-8">
                <h2 className="text-2xl font-black mb-4">{selectedEvent.title}</h2>
                <div className="flex gap-4 text-slate-500 font-bold mb-8 text-sm uppercase">
                   <span><MapPin size={16} className="inline mr-1 text-indigo-600"/>{selectedEvent.city}</span>
                   <span><Calendar size={16} className="inline mr-1 text-indigo-600"/>{selectedEvent.date}</span>
                </div>
                <button onClick={() => alert("¡Apuntado!")} className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black text-xl shadow-xl active:scale-95 transition">¡VOY A IR!</button>
              </div>
            </div>
          </div>
        )}

        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border dark:border-slate-800 px-8 py-4 rounded-full shadow-2xl flex items-center gap-10 z-[1000]">
          <button onClick={() => setView('home')} className={view === 'home' ? "text-i
