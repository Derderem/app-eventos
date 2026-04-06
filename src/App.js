import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, LogIn, Sun, Moon, PlusCircle, X, Trash2
} from 'lucide-react';

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
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
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
    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) alert(error.message);
    else alert("¡Enlace enviado! Revisa tu correo (mira en SPAM).");
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

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-500 pb-24">
        
        {/* HEADER */}
        <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 p-4 sticky top-0 z-[1000] flex justify-between items-center px-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold">E</div>
            <h1 className="text-xl font-black uppercase tracking-tighter italic">Eventos</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 transition-all active:scale-90">
              {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
            </button>
            {user ? (
              <button onClick={() => setView('profile')} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest">Mi Perfil</button>
            ) : (
              <button onClick={handleLogin} className="bg-indigo-600 text-white px-5 py-2 rounded-2xl font-bold text-sm shadow-xl active:scale-95 transition">Entrar</button>
            )}
          </div>
        </nav>

        <main className="max-w-6xl mx-auto p-6">
          {/* LISTADO */}
          {view === 'home' && (
            <div className="grid md:grid-cols-3 gap-8 mt-4">
              {events.map(event => (
                <div key={event.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl transition-all group border-b-4 border-indigo-500/20">
                  <div className="relative h-56 overflow-hidden cursor-pointer" onClick={() => setSelectedEvent(event)}>
                    <img src={event.image_url} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" alt="event" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(event); }}
                      className="absolute top-4 right-4 p-3 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 shadow-xl"
                    >
                      <Heart size={20} fill={favorites.includes(event.id) ? "red" : "none"} />
                    </button>
                  </div>
                  <div className="p-6">
                    <h3 className="text-2xl font-black mb-4 line-clamp-1">{event.title}</h3>
                    <button onClick={() => setSelectedEvent(event)} className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-3 rounded-2xl font-bold active:scale-95 transition">Ver Detalles</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PERFIL */}
          {view === 'profile' && (
            <div className="max-w-xl mx-auto py-10">
               <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm mb-8 text-center border dark:border-slate-800">
                  <div className="w-20 h-20 bg-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-black text-white">{user?.email[0].toUpperCase()}</div>
                  <p className="font-bold text-slate-400 mb-4">{user?.email}</p>
                  <button onClick={() => supabase.auth.signOut()} className="text-red-500 font-bold text-sm">Cerrar Sesión</button>
               </div>
               <h3 className="text-xl font-black mb-6">MIS FAVORITOS ❤️</h3>
               <div className="space-y-3">
                  {events.filter(e => favorites.includes(e.id)).map(event => (
                    <div key={event.id} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border dark:border-slate-800 flex justify-between items-center">
                       <span className="font-bold px-4">{event.title}</span>
                       <button onClick={() => toggleFavorite(event)} className="p-2 text-slate-300 hover:text-red-500 transition"><Trash2 size={20} /></button>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </main>

        {/* MODAL DETALLES */}
        {selectedEvent && (
          <div className="fixed inset-0 z-[2000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl relative border dark:border-slate-800">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-6 right-6 z-10 p-2 bg-black/50 text-white rounded-full"><X/></button>
              <img src={selectedEvent.image_url} className="w-full h-72 object-cover" alt="hero" />
              <div className="p-8">
                <h2 className="text-3xl font-black mb-6">{selectedEvent.title}</h2>
                <div className="flex gap-4 text-slate-500 font-bold mb-8">
                   <div className="flex items-center gap-1"><MapPin size={16}/> {selectedEvent.city}</div>
                   <div className="flex items-center gap-1"><Calendar size={16}/> {selectedEvent.date}</div>
                </div>
                <button onClick={() => alert("¡Apuntado!")} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xl shadow-xl shadow-indigo-500/20 active:scale-95 transition">¡VOY A IR!</button>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM NAV BAR */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border dark:border-slate-800 px-8 py-4 rounded-full shadow-2xl flex items-center gap-12 z-[1000]">
          <button onClick={() => setView('home')} className={`transition ${view === 'home' ? 'text-indigo-600 scale-125' : 'text-slate-400'}`}><Calendar size={24}/></button>
          <button onClick={() => alert("Próximamente: Mapa")} className="text-slate-400"><MapPin size={24}/></button>
          <button onClick={() => alert("Próximamente: Crear")} className="text-slate-400"><PlusCircle size={28}/></button>
          <button onClick={() => setView('profile')} className={`transition ${view === 'profile' ? 'text-indigo-600 scale-125' : 'text-slate-400'}`}><Heart size={24}/></button>
        </div>
      </div>
    </div>
  );
}

export default App;
