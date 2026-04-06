import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, LogIn, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, Camera, Sparkles, Send, Users
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Corregir iconos de Leaflet
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
  const [form, setForm] = useState({ title: '', category: 'musical', city: '', date: '', image_url: '' });
  const [loading, setLoading] = useState(false);

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
    const email = window.prompt("Introduce tu email:");
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else alert("¡Revisa tu correo!");
  };

  const toggleFavorite = async (event) => {
    if (!user) return alert("Inicia sesión primero ❤️");
    if (favorites.includes(event.id)) {
      await supabase.from('favorites').delete().match({ user_id: user.id, event_id: event.id });
      setFavorites(favorites.filter(id => id !== event.id));
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, event_id: event.id });
      setFavorites([...favorites, event.id]);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('events').insert([{ ...form, status: 'pending' }]);
    if (error) alert(error.message);
    else {
      alert("Enviado a moderación");
      setForm({ title: '', category: 'musical', city: '', date: '', image_url: '' });
      setView('home');
    }
    setLoading(false);
  };

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-500 pb-24">
        
        {/* NAVBAR */}
        <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 p-4 sticky top-0 z-[1000] flex justify-between items-center px-6">
          <div className="flex items-center gap-2" onClick={() => setView('home')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold">E</div>
            <h1 className="text-xl font-black uppercase tracking-tighter italic">Eventos</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
              {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
            </button>
            {user ? (
              <button onClick={() => setView('profile')} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase">Perfil</button>
            ) : (
              <button onClick={handleLogin} className="bg-indigo-600 text-white px-5 py-2 rounded-2xl font-bold text-sm">Entrar</button>
            )}
          </div>
        </nav>

        <main className="max-w-6xl mx-auto p-4">
          {/* VISTA HOME */}
          {view === 'home' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {events.map(event => (
                <div key={event.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm group">
                  <div className="relative h-56 overflow-hidden" onClick={() => setSelectedEvent(event)}>
                    <img src={event.image_url} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" alt="event" />
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(event); }} className="absolute top-4 right-4 p-3 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 shadow-xl">
                      <Heart size={20} fill={favorites.includes(event.id) ? "red" : "none"} />
                    </button>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-black mb-4 truncate">{event.title}</h3>
                    <button onClick={() => setSelectedEvent(event)} className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-3 rounded-2xl font-bold">Ver Detalles</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VISTA MAPA (FIJADA PARA MÓVIL) */}
          {view === 'map' && (
            <div className="fixed inset-0 top-[70px] bottom-[80px] z-0">
              <MapContainer center={[40.41, -3.70]} zoom={6} style={{ height: '100%', width: '100%' }}>
                <TileLayer url={isDark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
                {events.map(event => (
                  <Marker key={event.id} position={[40.41, -3.70]}>
                    <Popup><div className="font-bold p-1">{event.title}</div></Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}

          {/* VISTA CREAR */}
          {view === 'create' && (
            <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl border dark:border-slate-800">
