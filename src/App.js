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
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchEvents();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setUser(session.user); loadUser(session.user.id); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) { setUser(session.user); loadUser(session.user.id); }
      else { setUser(null); setFavorites([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadUser = async (id) => {
    const { data: f } = await supabase.from('favorites').select('event_id').eq('user_id', id);
    if (f) setFavorites(f.map(item => String(item.event_id)));
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    setEvents(data || []);
  };

  // --- IA CON 3 SERVIDORES DISTINTOS (PRO) ---
  const generateAIOptions = () => {
    if (!form.title) return alert("Escribe un título ✨");
    setIsProcessing(true);
    const q = encodeURIComponent(form.title);
    const t = Date.now();
    
    // 3 Fuentes de imagen totalmente diferentes
    const op1 = `https://image.pollinations.ai/prompt/photography_of_${q}?width=600&height=800&nologo=true&seed=${t}`;
    const op2 = `https://source.unsplash.com/featured/600x800/?${q},festival`;
    const op3 = `https://picsum.photos/seed/${t}/600/800`;

    setAiOptions([op1, op2, op3]);
    setForm({...form, image_url: op1});
    setIsProcessing(false);
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
        
        {/* HEADER */}
        <nav className="h-[70px] bg-white/80 dark:bg-slate-900/80 border-b dark:border-slate-800 flex justify-between items-center px-6 z-[2000] shrink-0">
          <div className="flex items-center gap-2" onClick={() => setView('home')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold text-xl shadow-lg">E</div>
            <h1 className="text-xl font-black uppercase italic">Eventos</h1>
          </div>
          <button onClick={() => setIsDark(!isDark)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl transition-all">
            {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
          </button>
        </nav>

        <main className="flex-1 relative overflow-y-auto">
          {view === 'home' && (
            <div className="max-w-6xl mx-auto p-4 pb-40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(ev => (
                <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm flex flex-col h-full group">
                  <div className="relative h-64 overflow-hidden cursor-pointer" onClick={() => setSelectedEvent(ev)}>
                    <img src={ev.image_url} className="w-full h-full object-cover group-hover:scale-105 transition duration-1000" alt="event" />
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(ev); }} className="absolute top-5 right-5 p-3 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 shadow-xl">
                      <Heart size={20} fill={favorites.includes(String(ev.id)) ? "red" : "none"} />
                    </button>
                  </div>
                  <div className="p-6 flex flex-col flex-1 text-center">
                    <h3 className="text-xl font-black mb-4 truncate">{ev.title}</h3>
                    <button onClick={() => setSelectedEvent(ev)} className="mt-auto w-full bg-slate-900 dark:bg-indigo-600 text-white py-3 rounded-2xl font-black uppercase text-[10px]">Detalles</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'create' && (
            <div className="max-w-xl mx-auto p-6 pb-40">
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border dark:border-slate-800 shadow-2xl">
                <h2 className="text-3xl font-black mb-8 text-indigo-500 text-center uppercase tracking-tighter italic">Publicar</h2>
                <form onSubmit={async (e) => { e.preventDefault(); if(!form.image_url) return; await supabase.from('events').insert([form]); setView('home'); fetchEvents(); }} className="space-y-4">
                  <input required placeholder="Título" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                  <input required placeholder="Ciudad" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                  <input required placeholder="Dirección" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                  <input required type="date" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  
                  {/* TRIPLE IMAGEN IA */}
                  <div className="pt-6 border-t dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase text-center text-slate-400 mb-4 tracking-widest">Toca la foto que prefieras:</p>
                    <div className="grid grid-cols-3 gap-2 h-32 mb-4">
                       {isProcessing ? <div className="col-span-3 flex items-center justify-center h-full"><Loader2 className="animate-spin text-indigo-600" /></div> : aiOptions.map((url, i) => (
                        <div key={i} onClick={() => setForm({...form, image_url: url})} className={`aspect-square rounded-xl overflow-hidden border-4 transition-all ${form.image_url === url ? 'border-indigo-600 scale-105 z-10' : 'border-transparent opacity-60'}`}>
                          <img src={url} className="w-full h-full object-cover" alt="IA" />
                        </div>
                       ))}
                    </div>
                    <button type="button" onClick={generateAIOptions} className="w-full bg-white dark:bg-slate-800 border-2 border-indigo-600 text-indigo-600 p-4 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 active:scale-95 transition">
                      <Sparkles size={16}/> GENERAR 3 OPCIONES IA
                    </button>
                  </div>
                  <button type="submit" disabled={!form.image_url} className="w-full bg-indigo-600 text-white p-6 rounded-3xl font-black shadow-xl uppercase mt-4 active:scale-95 transition">PUBLICAR AHORA</button>
                </form>
              </div>
            </div>
          )}

          {view === 'favorites' && (
            <div className="max-w-2xl mx-auto p-6 pb-40 text-left">
               <h3 className="text-3xl font-black mb-12 uppercase italic text-indigo-500 underline decoration-4 underline-offset-8 tracking-tighter text-center">Mis Favoritos ❤️</h3>
               <div className="grid grid-cols-1 gap-4">
                  {events.filter(e => favorites.includes(String(e.id))).map(ev => (
                    <div key={ev.id} className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border dark:border-slate-800 flex justify-between items-center shadow-md animate-in fade-in">
                       <span className="font-black text-xl px-4 truncate text-left">{ev.title}</span>
                       <button onClick={() => toggleFavorite(ev)} className="p-3 text-slate-300 hover:text-red-500 transition active:scale-75"><Trash2 size={28} /></button>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </main>

        {/* MODAL DETALLES ALARGADO */}
        {selectedEvent && (
          <div className="fixed inset-0 z-[3000] bg-black/95 flex items-center justify-center p-3 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-[380px] h-[82vh] rounded-[4rem] overflow-hidden relative shadow-2xl border dark:border-slate-800 border-b-[8px] border-b-indigo-600 flex flex-col">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 z-50 p-2.5 bg-black/50 text-white rounded-full active:scale-90 transition shadow-xl"><X size={20} /></button>
              <img src={selectedEvent.image_url} className="w-full h-52 object-cover shadow-inner shrink-0" alt="hero" />
              <div className="p-8 flex flex-col flex-1 overflow-y-auto text-left">
                <h2 className="text-3xl font-black mb-8 leading-tight text-slate-900 dark:text-white">{selectedEvent.title}</h2>
                <button onClick={async () => { if(!user) return; if(!favorites.includes(String(selectedEvent.id))) { setFavorites(prev => [...prev, String(selectedEvent.id)]); await supabase.from('favorites').insert({user_id: user.id, event_id: selectedEvent.id}); } }} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition mb-8 uppercase">¡VOY A IR! ❤️</button>
                <div className="space-y-6 text-slate-600 dark:text-slate-300 font-black">
                   <div className="flex items-start gap-4 p-2 -ml-2 rounded-xl active:bg-slate-50 dark:active:bg-slate-800 transition"><MapPin size={22} className="text-indigo-600"/><div className="flex-1"><p className="text-md leading-tight underline decoration-indigo-500/30">{selectedEvent.address}</p><p className="text-[10px] opacity-60 uppercase">{selectedEvent.city}</p></div></div>
                   <div className="flex items-center gap-4 px-2 -ml-2"><Calendar size={22} className="text-indigo-600"/><p className="text-md">{selectedEvent.date}</p></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BARRA INFERIOR (ISLA FLOTANTE PRO) */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[94%] max-w-[440px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border dark:border-slate-800 h-[75px] rounded-full shadow-2xl flex items-center justify-around z-[2000] px-6 border-b-4 border-b-indigo-500/20 transition-all">
          <button onClick={() => setView('home')} className={`p-3 ${view === 'home' ? "text-indigo-600 scale-125" : "text-slate-400 opacity-40"}`}><LayoutList size={26}/></button>
          <button onClick={() => setView('create')} className={`p-3 ${view === 'create' ? "text-indigo-600 scale-125" : "text-slate-400 opacity-40"}`}><PlusCircle size={32}/></button>
          <button onClick={() => setView('favorites')} className={`p-3 ${view === 'favorites' ? "text-indigo-600 scale-125" : "text-slate-400 opacity-40"}`}><Heart size={26}/></button>
          <button onClick={() => setView('map')} className={`p-3 ${view === 'map' ? "text-indigo-600 scale-125" : "text-slate-400 opacity-40"}`}><MapIcon size={26}/></button>
        </div>

      </div>
    </div>
  );
}

export default App;
