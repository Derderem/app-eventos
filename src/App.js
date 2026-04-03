import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, Camera, Sparkles, LogIn, LogOut, 
  ShieldCheck, Upload, Trash2, Sun, Moon, Share2, DollarSign 
} from 'lucide-react';

// CONEXIÓN A TU SUPABASE
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL, 
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

function App() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [isDark, setIsDark] = useState(false);
  const [view, setView] = useState('home');

  useEffect(() => {
    fetchEvents();
    checkUser();
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) setIsDark(true);
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    if (session?.user) fetchFavorites(session.user.id);
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').eq('status', 'approved');
    setEvents(data || []);
  };

  const fetchFavorites = async (userId) => {
    const { data } = await supabase.from('favorites').select('event_id').eq('user_id', userId);
    setFavorites(data.map(f => f.event_id));
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

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
        <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 p-4 sticky top-0 z-50 flex justify-between items-center px-8">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold">E</div>
            <h1 className="text-xl font-black dark:text-white tracking-tighter uppercase">Eventos</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsDark(!isDark)} className="p-2 text-slate-600 dark:text-slate-300">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            {user ? (
              <button onClick={() => setView('profile')} className="w-8 h-8 rounded-full overflow-hidden border-2 border-indigo-500">
                <img src={user.user_metadata.avatar_url} alt="profile" />
              </button>
            ) : (
              <button onClick={() => supabase.auth.signInWithOAuth({provider: 'google'})} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200">Entrar</button>
            )}
          </div>
        </nav>

        <main className="max-w-6xl mx-auto p-6">
          {view === 'home' && (
            <div className="grid md:grid-cols-3 gap-8 mt-8">
              {events.map(event => (
                <div key={event.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                  <div className="relative h-48 overflow-hidden">
                    <img src={event.image_url} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" alt="event" />
                    <button onClick={() => toggleFavorite(event)} className="absolute top-4 right-4 p-3 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 shadow-xl">
                      <Heart size={20} fill={favorites.includes(event.id) ? "red" : "none"} />
                    </button>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold dark:text-white mb-2">{event.title}</h3>
                    <p className="text-slate-500 text-sm flex items-center gap-1 mb-6"><MapPin size={14}/> {event.city}</p>
                    <button className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-3 rounded-2xl font-bold active:scale-95 transition">Ver Detalles</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'profile' && (
            <div className="max-w-2xl mx-auto py-10">
               <h2 className="text-3xl font-black dark:text-white mb-8">Mis Favoritos ❤️</h2>
               <div className="space-y-4">
                  {events.filter(e => favorites.includes(e.id)).map(event => (
                    <div key={event.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border dark:border-slate-800 flex justify-between items-center shadow-sm">
                       <div className="flex items-center gap-4">
                         <img src={event.image_url} className="w-16 h-16 rounded-2xl object-cover" alt="thumb" />
                         <div>
                            <p className="font-bold dark:text-white text-lg">{event.title}</p>
                            <p className="text-xs text-slate-500 italic">Guardado en favoritos</p>
                         </div>
                       </div>
                       <button onClick={() => toggleFavorite(event)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition" title="ELIMINAR EVENTO 🤍">
                         <Trash2 size={24} />
                       </button>
                    </div>
                  ))}
                  {favorites.length === 0 && <p className="text-center text-slate-400 py-20">No tienes eventos guardados todavía.</p>}
               </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
