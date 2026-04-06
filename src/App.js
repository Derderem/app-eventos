import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, LogIn, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, Camera, Sparkles, Send, CheckCircle
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Arreglo para los iconos de Leaflet que a veces desaparecen
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
  
  // Estado para el formulario de nuevo evento
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
    const email = window.prompt("Introduce tu email para recibir el enlace mágico:");
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else alert("¡Revisa tu correo! Te hemos enviado un acceso directo.");
  };

  const toggleFavorite = async (event) => {
    if (!user) return alert("Inicia sesión para guardar ❤️");
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
    if (!user) return alert("Debes estar conectado para publicar");
    setLoading(true);
    const { error } = await supabase.from('events').insert([
      { ...form, status: 'pending', organizer_id: user.id }
    ]);
    if (error) alert(error.message);
    else {
      alert("¡Evento enviado! Un administrador lo revisará pronto.");
      setForm({ title: '', category: 'musical', city: '', date: '', image_url: '' });
      setView('home');
    }
    setLoading(false);
  };

  const generateAIImage = () => {
    const images = {
      musical: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4",
      gastronómicos: "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
      taurinos: "https://images.unsplash.com/photo-1563914119213-73934f5906f6",
      "fiestas patronales": "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3"
    };
    setForm({...form, image_url: images[form.category] + "?auto=format&fit=crop&w=800"});
  };

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-500 pb-24">
        
        {/* HEADER */}
        <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 p-4 sticky top-0 z-[1000] flex justify-between items-center px-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => {setView('home'); setSelectedEvent(null)}}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold">E</div>
            <h1 className="text-xl font-black uppercase tracking-tighter italic">Eventos</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 transition-all">
              {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
            </button>
            {user ? (
              <button onClick={() => setView('profile')} className="w-10 h-10 rounded-full border-2 border-indigo-500 bg-indigo-600 flex items-center justify-center text-white font-bold">
                {user.email[0].toUpperCase()}
              </button>
            ) : (
              <button onClick={handleLogin} className="bg-indigo-600 text-white px-5 py-2 rounded-2xl font-bold text-sm shadow-xl active:scale-95 transition">Entrar</button>
            )}
          </div>
        </nav>

        <main className="max-w-6xl mx-auto p-6">
          {/* HOME */}
          {view === 'home' && (
            <div className="grid md:grid-cols-3 gap-8">
              {events.map(event => (
                <div key={event.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl transition-all group">
                  <div className="relative h-56 overflow-hidden cursor-pointer" onClick={() => setSelectedEvent(event)}>
                    <img src={event.image_url} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" alt="event" />
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(event); }} className="absolute top-4 right-4 p-3 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 shadow-xl">
                      <Heart size={20} fill={favorites.includes(event.id) ? "red" : "none"} />
                    </button>
                  </div>
                  <div className="p-6 text-center">
                    <h3 className="text-xl font-black mb-4 truncate">{event.title}</h3>
                    <button onClick={() => setSelectedEvent(event)} className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-3 rounded-2xl font-bold active:scale-95 transition">Ver Detalles</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MAPA */}
          {view === 'map' && (
            <div className="h-[70vh] w-full rounded-[3rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl">
              <MapContainer center={[40.41, -3.70]} zoom={6} style={{ height: '100%', width: '100%' }}>
                <TileLayer url={isDark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
                {events.map(event => (
                  <Marker key={event.id} position={[40.41, -3.70]}>
                    <Popup><div className="font-bold">{event.title}</div></Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}

          {/* CREAR EVENTO */}
          {view === 'create' && (
            <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl border dark:border-slate-800 animate-in slide-in-from-bottom duration-500">
               <h2 className="text-2xl font-black mb-6 flex items-center gap-2 text-indigo-600"><PlusCircle/> Publicar Evento</h2>
               <form onSubmit={handleCreateEvent} className="space-y-4">
                  <input required type="text" placeholder="Título del evento" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-indigo-500" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                  <select className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none ring-1 ring-slate-200 dark:ring-slate-700" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="musical">Musical</option>
                    <option value="gastronómicos">Gastronómico</option>
                    <option value="fiestas patronales">Fiestas Patronales</option>
                    <option value="taurinos">Taurino</option>
                  </select>
                  <input required type="text" placeholder="Ciudad" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none ring-1 ring-slate-200 dark:ring-slate-700" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                  <input required type="date" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none ring-1 ring-slate-200 dark:ring-slate-700 text-slate-400" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  
                  <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center gap-3">
                     {form.image_url ? <img src={form.image_url} className="h-32 rounded-xl" /> : <div className="text-center text-xs text-slate-400">¿Tienes foto?</div>}
                     <div className="flex gap-2">
                       <button type="button" className="p-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold flex items-center gap-1"><Camera size={16}/> Subir</button>
                       <button type="button" onClick={generateAIImage} className="p-2 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold flex items-center gap-1"><Sparkles size={16}/> IA</button>
                     </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white p-4 rounded-3xl font-black shadow-xl disabled:opacity-50">
                    {loading ? "Enviando..." : "ENVIAR A MODERACIÓN"}
                  </button>
               </form>
            </div>
          )}

          {/* PERFIL / FAVORITOS */}
          {view === 'profile' && (
            <div className="max-w-xl mx-auto py-10">
               <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm mb-8 text-center border dark:border-slate-800">
                  <div className="w-20 h-20 bg-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-black text-white">{user?.email[0].toUpperCase()}</div>
                  <p className="font-bold text-slate-500 mb-6">{user?.email}</p>
                  <button onClick={() => supabase.auth.signOut()} className="text-red-500 font-bold text-xs flex items-center gap-2 mx-auto"><Trash2 size={14}/> Cerrar Sesión</button>
               </div>
               <h3 className="text-xl font-black mb-6">MIS FAVORITOS ❤️</h3>
               <div className="space-y-3">
                  {events.filter(e => favorites.includes(e.id)).map(event => (
                    <div key={event.id} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border dark:border-slate-800 flex justify-between items-center shadow-sm">
                       <span className="font-bold px-4">{event.title}</span>
                       <button onClick={() => toggleFavorite(event)} className="p-2 text-slate-300 hover:text-red-500 transition" title="ELIMINAR EVENTO 🤍"><Trash2 size={20} /></button>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </main>

        {/* MODAL DETALLES */}
        {selectedEvent && (
          <div className="fixed inset-0 z-[2000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3.5rem] overflow-hidden shadow-2xl relative border dark:border-slate-800 animate-in zoom-in duration-300">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-6 right-6 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 transition"><X/></button>
              <img src={selectedEvent.image_url} className="w-full h-80 object-cover" alt="hero" />
              <div className="p-10">
                <h2 className="text-3xl font-black mb-6 leading-tight">{selectedEvent.title}</h2>
                <div className="flex gap-6 text-slate-500 font-bold mb-10 text-sm">
                   <div className="flex items-center gap-1"><MapPin size={18} className="text-indigo-500"/> {selectedEvent.city}</div>
                   <div className="flex items-center gap-1"><Calendar size={18} className="text-indigo-500"/> {selectedEvent.date}</div>
                </div>
                <button onClick={() => alert("¡Registrado! Te hemos guardado el sitio.")} className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black text-xl shadow-xl shadow-indigo-500/20 active:scale-95 transition">¡VOY A IR!</button>
              </div>
            </div>
          </div>
        )}

        {/* BARRA DE NAVEGACIÓN INFERIOR ACTIVA */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border dark:border-slate-800 px-10 py-5 rounded-full shadow-2xl flex items-center gap-10 z-[1000]">
          <button onClick={() => {setView('home'); setSelectedEvent(null)}} className={`transition-all ${view === 'home' ? 'text-indigo-600 scale-125' : 'text-slate-400'}`}><Calendar size={24}/></button>
          <button onClick={() => setView('map')} className={`transition-all ${view === 'map' ? 'text-indigo-600 scale-125' : 'text-slate-400'}`}><MapIcon size={24}/></button>
          <button onClick={() => setView('create')} className={`transition-all ${view === 'create' ? 'text-indigo-600 scale-125' : 'text-slate-400'}`}><PlusCircle size={32}/></button>
          <button onClick={() => setView('profile')} className={`transition-all ${view === 'profile' ? 'text-indigo-600 scale-125' : 'text-slate-400'}`}><Heart size={24}/></button>
        </div>
      </div>
    </div>
  );
}

export default App;
