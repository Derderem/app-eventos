import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, 
  Navigation, Clock, ChevronLeft, ChevronRight, LayoutList, ShieldCheck, Sparkles, Camera, Loader2, CheckCircle2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Marcadores
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapResizer() {
  const map = useMap();
  useEffect(() => { setTimeout(() => { map.invalidateSize(); }, 600); }, [map]);
  return null;
}

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY);

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [favorites, setFavorites] = useState([]); 
  const [isDark, setIsDark] = useState(true);
  const [view, setView] = useState('home'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeCategory, setActiveCategory] = useState('TODOS');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeDay, setActiveDay] = useState(null);
  const [form, setForm] = useState({ title: '', category: 'MUSICA', city: '', address: '', date: '', time: '21:00', image_url: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiOptions, setAiOptions] = useState([]);
  const [toast, setToast] = useState(null);

  const showNotification = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetchEvents();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setUser(session.user); loadUserData(session.user.id); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) { setUser(session.user); loadUserData(session.user.id); }
      else { setUser(null); setProfile(null); setFavorites([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (id) => {
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (prof) setProfile(prof);
    if (id === '4d76c965-66de-491d-8cc1-6d37096262c9') setProfile({ role: 'admin' });
    const { data: f } = await supabase.from('favorites').select('event_id').eq('user_id', id);
    if (f) setFavorites(f.map(item => String(item.event_id)));
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    setEvents(data || []);
  };

  const handleLogin = async () => {
    const e = window.prompt("Email:");
    if (e) await supabase.auth.signInWithOtp({ email: e, options: { emailRedirectTo: window.location.origin } });
  };

  const generateAI = () => {
    if (!form.title) return showNotification("Título primero ✨");
    setIsProcessing(true);
    const q = encodeURIComponent(form.title);
    const t = Date.now();
    const ops = [
      `https://image.pollinations.ai/prompt/photo_of_${q}?width=500&height=700&nologo=true&seed=${t}`,
      `https://image.pollinations.ai/prompt/cinematic_${q}?width=500&height=700&nologo=true&seed=${t+1}`,
      `https://image.pollinations.ai/prompt/realistic_${q}?width=500&height=700&nologo=true&seed=${t+2}`
    ];
    setAiOptions(ops);
    setForm({...form, image_url: ops[0]});
    setIsProcessing(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsProcessing(true);
    const name = `${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('event-images').upload(name, file);
    if (!error) {
      const { data } = supabase.storage.from('event-images').getPublicUrl(name);
      setForm({ ...form, image_url: data.publicUrl });
      setAiOptions([]);
    }
    setIsProcessing(false);
  };

  const toggleFavorite = async (ev) => {
    if (!user) return;
    const id = String(ev.id);
    if (favorites.includes(id)) {
      setFavorites(f => f.filter(i => i !== id));
      await supabase.from('favorites').delete().match({ user_id: user.id, event_id: id });
    } else {
      setFavorites(f => [...f, id]);
      await supabase.from('favorites').insert({ user_id: user.id, event_id: id });
    }
  };

  const handleImGoing = async () => {
    if (!user) return;
    if (!favorites.includes(String(selectedEvent.id))) {
      setFavorites(f => [...f, String(selectedEvent.id)]);
      await supabase.from('favorites').insert({ user_id: user.id, event_id: selectedEvent.id });
    }
    showNotification("¡Gracias por asistir!");
  };

  const filtered = events.filter(e => (activeCategory === 'TODOS' || e.category === activeCategory) && e.status === 'approved');

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans overflow-hidden">
        
        {toast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border-2 border-white/20 animate-in slide-in-from-top">
            <CheckCircle2 size={18}/> <span className="font-black uppercase text-[10px] tracking-widest">{toast}</span>
          </div>
        )}

        {/* HEADER */}
        <nav className="h-[70px] shrink-0 bg-white/80 dark:bg-slate-900/80 border-b dark:border-slate-800 flex justify-between items-center px-6 z-[2000]">
          <div className="flex items-center gap-2" onClick={() => setView('home')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold">E</div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">Eventos</h1>
          </div>
          <div className="flex items-center gap-4">
            {profile?.role === 'admin' && <button onClick={() => setView('admin')} className="text-amber-500 animate-pulse transition"><ShieldCheck size={28}/></button>}
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 transition-all">{isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}</button>
            {user ? <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black border-2 border-white shadow-md cursor-pointer" onClick={() => setView('profile')}>{user.email[0].toUpperCase()}</div> : <button onClick={handleLogin} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs">Entrar</button>}
          </div>
        </nav>

        <main className="flex-1 relative overflow-y-auto">
          {view === 'home' && (
            <div className="max-w-6xl mx-auto p-4 pb-40">
              <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar pt-2">
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINOS', 'OTROS'].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-full font-black text-[10px] transition-all shrink-0 border-2 ${activeCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800'}`}>{cat}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(ev => (
                  <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm flex flex-col h-full group">
                    <div className="relative h-64 overflow-hidden cursor-pointer" onClick={() => setSelectedEvent(ev)}>
                      <img src={ev.image_url} className="w-full h-full object-cover group-hover:scale-105 transition duration-1000" alt="img" />
                      <button onClick={(e) => { e.stopPropagation(); toggleFav(ev); }} className="absolute top-5 right-5 p-3 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 shadow-xl">
                        <Heart size={20} fill={favorites.includes(String(ev.id)) ? "red" : "none"} />
                      </button>
                    </div>
                    <div className="p-6 flex flex-col flex-1 text-center"><h3 className="text-xl font-black mb-4 truncate">{ev.title}</h3>
                    <button onClick={() => setSelectedEvent(ev)} className="mt-auto w-full bg-slate-900 dark:bg-indigo-600 text-white py-3 rounded-2xl font-black uppercase text-[10px]">Detalles</button></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'create' && (
            <div className="max-w-xl mx-auto p-6 pb-40">
              <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-10 border dark:border-slate-800 shadow-2xl">
                <h2 className="text-3xl font-black mb-8 text-indigo-500 uppercase italic text-center">Publicar</h2>
                <form onSubmit={async (e) => { e.preventDefault(); if(!form.image_url) return; await supabase.from('events').insert([{ ...form, status: profile?.role === 'admin' ? 'approved' : 'pending', organizer_id: user?.id }]); setView('home'); fetchEvents(); }} className="space-y-4">
                  <input required placeholder="Título" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                  <input required placeholder="Ciudad" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                  <input required placeholder="Dirección" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                  <input required type="date" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  <div className="pt-6 border-t dark:border-slate-800 text-center">
                    <div className="grid grid-cols-3 gap-2 h-32 mb-4">
                       {isProcessing ? <div className="col-span-3 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600"/></div> : aiOptions.map((url, i) => (
                        <div key={i} onClick={() => setForm({...form, image_url: url})} className={`aspect-square rounded-xl overflow-hidden border-4 transition-all ${form.image_url === url ? 'border-indigo-600 scale-105 z-10 shadow-lg' : 'border-transparent opacity-40'}`}>
                          <img src={url} className="w-full h-full object-cover" alt="IA" />
                        </div>
                       ))}
                    </div>
                    {form.image_url && !aiOptions.includes(form.image_url) && <img src={form.image_url} className="h-40 mx-auto rounded-2xl mb-4 border-4 border-indigo-600 object-cover shadow-xl" />}
                    <div className="flex gap-2">
                      <label className="flex-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 p-4 rounded-2xl font-black text-[10px] flex items-center justify-center gap-2 cursor-pointer uppercase active:scale-95 transition shadow-lg"><Camera size={16}/> GALERÍA<input type="file" className="hidden" accept="image/*" onChange={handleUpload} /></label>
                      <button type="button" onClick={generateAI} className="flex-1 bg-white dark:bg-slate-800 border-2 border-indigo-600 text-indigo-600 p-4 rounded-2xl font-black text-[10px] uppercase active:scale-95 transition shadow-lg flex items-center justify-center gap-2"><Sparkles size={16}/> IA (3 FOTOS)</button>
                    </div>
                  </div>
                  <button type="submit" disabled={!form.image_url} className="w-full bg-indigo-600 text-white p-6 rounded-3xl font-black shadow-xl uppercase mt-4 active:scale-95 transition tracking-widest text-sm">PUBLAR AHORA</button>
                </form>
              </div>
            </div>
          )}

          {view === 'profile' && (
            <div className="max-w-xl mx-auto p-10 text-center animate-in slide-in-from-bottom duration-500">
               <div className="bg-white dark:bg-slate-900 rounded-[4rem] p-12 shadow-2xl border dark:border-slate-800">
                  <div className="w-24 h-24 bg-indigo-600 rounded-full mx-auto mb-8 flex items-center justify-center text-4xl font-black text-white shadow-xl">{user?.email[0].toUpperCase()}</div>
                  <h2 className="text-2xl font-black mb-10 text-slate-500 uppercase italic tracking-widest">Mi Perfil</h2>
                  <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="w-full bg-red-500 text-white p-6 rounded-[2rem] font-black uppercase active:scale-95 transition shadow-lg"> Cerrar Sesión </button>
               </div>
            </div>
          )}

          {view === 'favorites' && ( <div className="max-w-2xl mx-auto p-6 pb-40"> <h3 className="text-3xl font-black mb-12 uppercase italic text-indigo-500 underline decoration-4 underline-offset-8 tracking-tighter text-center">Mis Favoritos ❤️</h3> <div className="grid grid-cols-1 gap-4"> {events.filter(e => favorites.includes(String(e.id))).map(ev => ( <div key={ev.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border dark:border-slate-800 flex justify-between items-center shadow-md animate-in fade-in"> <span className="font-black text-xl px-4 truncate text-left">{ev.title}</span> <button onClick={() => toggleFav(ev)} className="p-3 text-slate-300 hover:text-red-500 transition active:scale-75"><Trash2 size={28} /></button> </div> ))} </div> </div> )}
          {view === 'admin' && ( <div className="max-w-2xl mx-auto p-6 pb-40 animate-in slide-in-from-top text-left"> <h2 className="text-3xl font-black mb-8 text-amber-500 italic text-center uppercase tracking-tighter underline decoration-amber-500/20">Moderación 🛡️</h2> {events.filter(e => e.status === 'pending').map(ev => ( <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[3rem] mb-8 border-2 border-amber-500/20 shadow-xl overflow-hidden flex flex-col"> <img src={ev.image_url} className="h-52 w-full object-cover" alt="p"/> <div className="p-8"> <h4 className="font-black text-xl mb-2">{ev.title}</h4> <p className="text-sm text-slate-500 mb-6 uppercase tracking-widest font-bold">{ev.city} • {ev.address}</p> <div className="flex gap-4"> <button onClick={async () => { await supabase.from('events').update({ status: 'approved' }).eq('id', ev.id); fetchEvents(); }} className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg">Aprobar</button> <button onClick={async () => { await supabase.from('events').update({ status: 'rejected' }).eq('id', ev.id); fetchEvents(); }} className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-xs opacity-60">Rechazar</button> </div> </div> </div> ))} </div> )}
          {view === 'map' && ( <div className="absolute inset-0 z-0 bg-white"> <MapContainer center={[40.41, -3.70]} zoom={6} className="h-full w-full"> <MapResizer /><TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" /> {events.filter(e => e.status === 'approved').map(ev => ev.lat && (<Marker key={ev.id} position={[ev.lat, ev.lng]}><Popup><div className="p-1 font-bold">{ev.title}</div></Popup></Marker>))} </MapContainer> </div> )}
          {view === 'calendar' && ( <div className="max-w-xl mx-auto p-4 pb-40 animate-in slide-in-from-right duration-500"> <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border dark:border-slate-800 shadow-2xl"> <div className="flex justify-between items-center mb-8 text-indigo-500 font-black italic uppercase tracking-tighter"> <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><ChevronLeft/></button> <h2>{currentMonth.toLocaleString('es-ES', { month: 'long' })}</h2> <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><ChevronRight/></button> </div> <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest"> <span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sá</span><span>Do</span> </div> <div className="grid grid-cols-7 gap-2 text-center"> {[...Array(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() === 0 ? 6 : new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() - 1)].map((_, i) => <div key={i}></div>)} {[...Array(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate())].map((_, i) => { const day = i + 1; const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; const hasEvents = events.some(e => e.date === dateStr && e.status === 'approved'); return ( <button key={day} onClick={() => setActiveDay(dateStr === activeDay ? null : dateStr)} className={`aspect-square rounded-2xl flex items-center justify-center text-sm font-black transition-all border-2 ${hasEvents ? 'bg-green-500 border-green-400 text-white shadow-lg shadow-green-500/20' : 'border-transparent text-slate-400'} ${activeDay === dateStr ? 'bg-indigo-600 !border-indigo-400 text-white scale-110 shadow-lg' : ''}`}> {day} </button> ); })} </div> </div> {activeDay && ( <div className="mt-8 animate-in fade-in"> {events.filter(e => e.date === activeDay && e.status === 'approved').map(ev => ( <div key={ev.id} className="bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] flex justify-between items-center mb-4 border dark:border-slate-800 shadow-sm active:scale-95 transition" onClick={() => setSelectedEvent(ev)}> <span className="font-black px-4">{ev.title}</span> <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20"><ChevronRight size={18}/></div> </div> ))} </div> )} </div> )}
        </main>

        {/* MODAL DETALLES */}
        {selectedEvent && (
          <div className="fixed inset-0 z-[3000] bg-black/95 flex items-center justify-center p-3 backdrop-blur-xl animate-in fade-in duration-300 text-left">
            <div className="bg-white dark:bg-slate-900 w-full max-w-[380px] h-[85vh] rounded-[3.5rem] overflow-hidden relative shadow-2xl border dark:border-slate-800 border-b-[8px] border-b-indigo-600 flex flex-col">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 z-50 p-2.5 bg-black/50 text-white rounded-full active:scale-90 transition shadow-xl"><X size={20} /></button>
              <img src={selectedEvent.image_url} className="w-full h-52 object-cover shrink-0" alt="hero" />
              <div className="p-6 flex flex-col flex-1 overflow-y-auto">
                <h2 className="text-2xl font-black mb-6 leading-tight tracking-tighter text-slate-900 dark:text-white">{selectedEvent.title}</h2>
                <button onClick={handleImGoing} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition mb-8 uppercase tracking-tight flex items-center justify-center gap-2">¡VOY A IR! <Heart size={20} fill={favorites.includes(String(selectedEvent.id)) ? "white" : "none"} /></button>
                <div className="space-y-6 text-slate-600 dark:text-slate-300 font-black">
                   <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.city)}`} target="_blank" rel="noreferrer" className="flex items-start gap-4 p-2 -ml-2 rounded-xl active:bg-slate-50 transition"><div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600"><MapPin size={22} /></div><div className="flex-1 overflow-hidden"><p className="text-md underline decoration-indigo-500/30">{selectedEvent.address}</p><p className="text-[10px] opacity-60 uppercase font-black">{selectedEvent.city}</p></div></a>
                   <div className="flex items-center gap-4 px-2 -ml-2"><div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600"><Calendar size={22} /></div><div className="flex-1 font-black text-md tracking-tight">{selectedEvent.date}</div></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BARRA INFERIOR (LOS 5 ICONOS) */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[94%] max-w-[460px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border dark:border-slate-800 h-[80px] rounded-full shadow-2xl flex items-center justify-around z-[2000] px-6 border-b-4 border-b-indigo-500/20 transition-all">
          <button onClick={() => {setView('home'); setSelectedEvent(null)}} className={`p-3 transition-all ${view === 'home' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><LayoutList size={26}/></button>
          <button onClick={() => setView('calendar')} className={`p-3 transition-all ${view === 'calendar' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><Calendar size={26}/></button>
          <button onClick={() => setView('create')} className={`p-3 transition-all ${view === 'create' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><PlusCircle size={32}/></button>
          <button onClick={() => setView('favorites')} className={`p-3 transition-all ${view === 'favorites' ? "text-indigo-600 scale-125" : "text-slate-400"}`}><Heart size={26}/></button>
          <button onClick={() => setView('map')} className={`p-3 transition-all ${view === 'map' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><MapIcon size={26}/></button>
        </div>

      </div>
    </div>
  );
}

export default App;
