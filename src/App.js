import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, LayoutList, ShieldCheck, Sparkles, Camera, Loader2, CheckCircle2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY);

function App() {
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [events, setEvents] = useState([]);
  const [isDark, setIsDark] = useState(true);
  const [view, setView] = useState('home');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [form, setForm] = useState({ title: '', category: 'MUSICA', city: '', address: '', date: '', image_url: '' });
  const [aiOptions, setAiOptions] = useState([]);
  const [isProcessingIA, setIsProcessingIA] = useState(false);

  useEffect(() => {
    fetchEvents();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setUser(session.user); loadFavs(session.user.id); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) { setUser(session.user); loadFavs(session.user.id); }
      else { setUser(null); setFavorites([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadFavs = async (id) => {
    const { data } = await supabase.from('favorites').select('event_id').eq('user_id', id);
    if (data) setFavorites(data.map(f => String(f.event_id)));
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    setEvents(data || []);
  };

  // --- IA CON 3 FUENTES DIFERENTES (IMPOSIBLE DE BLOQUEAR) ---
  const generateAIOptions = () => {
    if (!form.title) return alert("Escribe un título ✨");
    setIsProcessingIA(true);
    const q = encodeURIComponent(form.title);
    const t = Date.now();

    // Pedimos a 3 servidores distintos: Pollinations, LoremFlickr y Unsplash
    const options = [
      `https://image.pollinations.ai/prompt/photography_of_${q}_event?width=600&height=800&nologo=true&seed=${t}`,
      `https://loremflickr.com/600/800/${q},festival/all?lock=${t}`,
      `https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=600&auto=format&fit=crop`
    ];
    
    setAiOptions(options);
    setForm({...form, image_url: options[0]});
    setIsProcessingIA(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.image_url) return;
    const { error } = await supabase.from('events').insert([form]);
    if (!error) { setView('home'); fetchEvents(); setForm({ title: '', category: 'MUSICA', city: '', address: '', date: '', image_url: '' }); setAiOptions([]); }
  };

  const toggleFavorite = async (event) => {
    if (!user) return;
    const id = String(event.id);
    if (favorites.includes(id)) {
      setFavorites(prev => prev.filter(i => i !== id));
      await supabase.from('favorites').delete().match({ user_id: user.id, event_id: id });
    } else {
      setFavorites(prev => [...prev, id]);
      await supabase.from('favorites').insert({ user_id: user.id, event_id: id });
    }
  };

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans overflow-hidden">
        
        {/* HEADER: SIN "?" NUNCA MÁS */}
        <nav className="h-[70px] bg-white/80 dark:bg-slate-900/80 border-b dark:border-slate-800 flex justify-between items-center px-6 z-[2000] shrink-0">
          <div className="flex items-center gap-2" onClick={() => setView('home')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold text-xl">E</div>
            <h1 className="text-xl font-black uppercase italic">Eventos</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
              {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
            </button>
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black border-2 border-white" onClick={() => setView('profile')}>
              {user ? user.email[0].toUpperCase() : '👤'}
            </div>
          </div>
        </nav>

        <main className="flex-1 relative overflow-y-auto">
          {view === 'home' && (
            <div className="max-w-6xl mx-auto p-4 pb-40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(ev => (
                <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm flex flex-col h-full">
                  <div className="relative h-60 overflow-hidden cursor-pointer" onClick={() => setSelectedEvent(ev)}>
                    <img src={ev.image_url} className="w-full h-full object-cover" alt="event" />
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(ev); }} className="absolute top-5 right-5 p-3 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 shadow-xl">
                      <Heart size={20} fill={favorites.includes(String(ev.id)) ? "red" : "none"} />
                    </button>
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-xl font-black mb-4 truncate">{ev.title}</h3>
                    <button onClick={() => setSelectedEvent(ev)} className="mt-auto w-full bg-slate-900 dark:bg-indigo-600 text-white py-3 rounded-2xl font-black uppercase text-[10px]">Detalles</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'create' && (
            <div className="max-w-xl mx-auto p-6 pb-40">
              <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-8 border dark:border-slate-800 shadow-2xl">
                <h2 className="text-3xl font-black mb-8 text-indigo-500 text-center uppercase">Publicar</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                  <input required placeholder="Título" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                  <input required placeholder="Ciudad" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                  <input required placeholder="Dirección" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                  <input required type="date" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  
                  <div className="pt-6 border-t dark:border-slate-800">
                    <div className="grid grid-cols-3 gap-2 h-32 mb-4">
                       {isProcessingIA ? <div className="col-span-3 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div> : aiOptions.map((url, i) => (
                        <div key={i} onClick={() => setForm({...form, image_url: url})} className={`aspect-square rounded-xl overflow-hidden border-4 transition-all ${form.image_url === url ? 'border-indigo-600 scale-105' : 'border-transparent opacity-60'}`}>
                          <img src={url} className="w-full h-full object-cover" alt="IA" />
                        </div>
                       ))}
                    </div>
                    <button type="button" onClick={generateAIOptions} className="w-full bg-white dark:bg-slate-800 border-2 border-indigo-600 text-indigo-600 p-4 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2">
                      <Sparkles size={16}/> GENERAR 3 FOTOS (3 SITIOS DIFERENTES)
                    </button>
                  </div>
                  <button type="submit" disabled={!form.image_url} className="w-full bg-indigo-600 text-white p-6 rounded-3xl font-black shadow-xl uppercase active:scale-95 transition mt-4">PUBLICAR AHORA</button>
                </form>
              </div>
            </div>
          )}

          {view === 'profile' && (
            <div className="max-w-xl mx-auto p-10 text-center animate-in slide-in-from-bottom duration-500">
               <div className="bg-white dark:bg-slate-900 rounded-[4rem] p-12 shadow-2xl border dark:border-slate-800">
                  <div className="w-24 h-24 bg-indigo-600 rounded-full mx-auto mb-8 flex items-center justify-center text-4xl font-black text-white shadow-xl">{user?.email[0].toUpperCase()}</div>
                  <h2 className="text-2xl font-black mb-10 text-slate-500 uppercase tracking-widest">{user?.email}</h2>
                  <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="w-full bg-red-500 text-white p-6 rounded-[2rem] font-black uppercase tracking-widest shadow-xl active:scale-95 transition">Cerrar Sesión</button>
               </div>
            </div>
          )}
        </main>

        {/* MODAL DETALLES ALARGADO */}
        {selectedEvent && (
          <div className="fixed inset-0 z-[3000] bg-black/95 flex items-center justify-center p-3 animate-in fade-in duration-300 text-left">
            <div className="bg-white dark:bg-slate-900 w-full max-w-[380px] h-[85vh] rounded-[3.5rem] overflow-hidden relative shadow-2xl border dark:border-slate-800 border-b-[8px] border-b-indigo-600 flex flex-col">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 z-50 p-2.5 bg-black/50 text-white rounded-full"><X size={20} /></button>
              <img src={selectedEvent.image_url} className="w-full h-52 object-cover shrink-0" alt="hero" />
              <div className="p-8 flex flex-col flex-1 overflow-y-auto">
                <h2 className="text-3xl font-black mb-8 leading-tight text-slate-900 dark:text-white">{selectedEvent.title}</h2>
                <button onClick={() => { if(!user) return; toggleFavorite(selectedEvent); alert("¡Apuntado!"); }} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition mb-8 uppercase">¡VOY A IR! ❤️</button>
                <div className="space-y-6 text-slate-600 dark:text-slate-300 font-black">
                   <div className="flex items-start gap-4 p-2 -ml-2"><MapPin size={22} className="text-indigo-600"/><div className="flex-1"><p className="text-md leading-tight">{selectedEvent.address}</p><p className="text-[10px] opacity-60 uppercase">{selectedEvent.city}</p></div></div>
                   <div className="flex items-center gap-4 px-2 -ml-2"><Calendar size={22} className="text-indigo-600"/><p className="text-md">{selectedEvent.date}</p></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[94%] max-w-[460px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border dark:border-slate-800 h-[80px] rounded-full shadow-2xl flex items-center justify-around z-[2000] px-6 border-b-4 border-b-indigo-500/20">
          <button onClick={() => setView('home')} className={`p-3 ${view === 'home' ? "text-indigo-600 scale-125" : "text-slate-400 opacity-40"}`}><LayoutList size={26}/></button>
          <button onClick={() => setView('create')} className={`p-3 ${view === 'create' ? "text-indigo-600 scale-125" : "text-slate-400 opacity-40"}`}><PlusCircle size={32}/></button>
          <button onClick={() => setView('profile')} className={`p-3 ${view === 'profile' ? "text-indigo-600 scale-125" : "text-slate-400 opacity-40"}`}><UserCircle size={26}/></button>
        </div>

      </div>
    </div>
  );
}

export default App;
