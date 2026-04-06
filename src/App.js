import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix para los iconos del mapa
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
    fetchEvents();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchFavorites(session.user.id);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').eq('status', 'approved');
    setEvents(data || []);
  };

  const fetchFavorites = async (userId) => {
    const { data } = await supabase.from('favorites').select('event_id').eq('user_id', userId);
    setFavorites(data.map(f => f.event_id));
  };

  const handleLogin = async () => {
    const email = window.prompt("Email:");
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else alert("¡Revisa tu correo!");
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-500 pb-24">
        
        {/* NAVBAR */}
        <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 p-4 sticky top-0 z-[1000] flex justify-between items-center px-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold text-xl shadow-lg shadow-indigo-500/20">E</div>
            <h1 className="text-xl font-black uppercase tracking-tighter italic">Eventos</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
              {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
            </button>
            {user ? (
              <button onClick={() => setView('profile')} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest">Mi Perfil</button>
            ) : (
              <button onClick={handleLogin} className="bg-indigo-600 text-white px-5 py-2 rounded-2xl font-bold text-sm shadow-xl active:scale-95 transition">Entrar</button>
            )}
          </div>
        </nav>

        <main className="max-w-6xl mx-auto p-4">
          {view === 'home' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              {events.map(event => (
                <div key={event.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl transition-all group">
                  <div className="relative h-56 overflow-hidden cursor-pointer" onClick={() => setSelectedEvent(event)}>
                    <img src={event.image_url} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" alt="event" />
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(event); }} className="absolute top-4 right-4 p-3 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 shadow-xl">
                      <Heart size={20} fill={favorites.includes(event.id) ? "red" : "none"} />
                    </button>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-black mb-4 truncate">{event.title}</h3>
                    <button onClick={() => setSelectedEvent(event)} className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-3 rounded-2xl font-bold active:scale-95 transition">Ver Detalles</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'map' && (
            <div className="fixed inset-0 top-[75px] bottom-[85px] z-0">
              <MapContainer center={[40.41, -3.70]} zoom={6} style={{ height: '100%', width: '100%' }}>
                <TileLayer url={isDark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
                {events.map(event => event.lat && (
                  <Marker key={event.id} position={[event.lat, event.lng]}>
                    <Popup><div className="font-bold p-1">{event.title}</div></Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}

          {view === 'create' && (
            <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl border dark:border-slate-800 text-center animate-in slide-in-from-bottom duration-500">
               <PlusCircle className="mx-auto mb-4 text-indigo-600" size={48}/>
               <h2 className="text-2xl font-black mb-4">Publicar Evento</h2>
               <p className="text-slate-500 mb-6 font-medium text-sm text-balance">Para publicar un evento, envía los detalles a moderación. Estará activo pronto.</p>
               <button onClick={() => setView('home')} className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-bold uppercase tracking-widest text-xs">Vo
