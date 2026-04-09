import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, 
  Navigation, Clock, LayoutList, ShieldCheck, Star, DollarSign, Sparkles, Camera, Loader2, CheckCircle2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Iconos
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
  const [activeCategory, setActiveCategory] = useState('TODOS');
  const [form, setForm] = useState({ title: '', category: 'MUSICA', city: '', address: '', date: '', time: '21:00', image_url: '' });
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [toast, setToast] = useState(null);

  const isAdmin = user?.id === '4d76c965-66de-491d-8cc1-6d37096262c9';

  useEffect(() => {
    fetchEvents();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setUser(session.user); loadFavs(session.user.id); }
    });
  }, []);

  const loadFavs = async (id) => {
    const { data } = await supabase.from('favorites').select('event_id').eq('user_id', id);
    if (data) setFavorites(data.map(f => String(f.event_id)));
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    setEvents(data || []);
  };

  const handleLogin = async () => {
    const email = window.prompt("Email:");
    if (email) await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
  };

  const generateIA = () => {
    if (!form.title) return alert("Escribe un título ✨");
    setIsProcessingImg(true);
    const seed = Math.floor(Math.random() * 99999);
    const url = `https://image.pollinations.ai/prompt/professional_photography_of_${encodeURIComponent(form.title)}?width=800&height=1000&nologo=true&seed=${seed}`;
    const img = new Image();
    img.src = url;
    img.onload = () => { setForm({ ...form, image_url: url }); setIsProcessingImg(false); };
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

  const filteredEvents = events.filter(e => (activeCategory === 'TODOS' || e.category === activeCategory) && e.status === 'approved');

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans overflow-hidden">
        
        {/* HEADER */}
        <nav className="h-[70px] bg-white/80 dark:bg-slate-900/80 border-b dark:border-slate-800 flex justify-between items-center px-6 z-[2000] shrink-0">
          <div className="flex items-center gap-2" onClick={() => setView('home')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold">E</div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">Eventos</h1>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && <button onClick={() => setView('admin')} className="text-amber-500 animate-pulse"><ShieldCheck size={28}/></button>}
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">{isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}</button>
            {user ? (
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black border-2 border-white" onClick={() => setView('profile')}>{user.email[0].toUpperCase()}</div>
            ) : (
              <button onClick={handleLogin} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase">Entrar</button>
            )}
          </div>
        </nav>

        {/* CONTENIDO */}
        <main className="flex-1 relative overflow-y-auto">
          {view === 'home' && (
            <div className="max-w-5xl mx-auto p-4 pb-32">
              <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar">
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINOS', 'OTROS'].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2 rounded-full font-black text-[10px] tracking-widest transition-all shrink-0 border-2 ${activeCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800'}`}>{cat}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map(ev => (
                  <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl flex flex-col h-full">
                    <div className="relative h-60 overflow-hidden cursor-pointer" onClick={() => setSelectedEvent(ev)}>
                      <img src={ev.image_url} className="w-full h-full object-cover group-hover:scale-105 transition duration-1000" alt="img" />
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
            </div>
          )}

          {view === 'create' && (
            <div className="max-w-xl mx-auto p-6 pb-40 animate-in slide-in-from-bottom">
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border dark:border-slate-800 shadow-2xl">
                <h2 className="text-2xl font-black mb-8 text-indigo-500 uppercase italic text-center">Publicar</h2>
                <form onSubmit={async (e) => { e.preventDefault(); if(!form.image_url) return; const res = await supabase.from('events').insert([{ ...form, status: isAdmin ? 'approved' : 'pending', organizer_id: user?.id }]); if(!res.error) { setView('home'); fetchEvents(); } }} className="space-y-4">
                  <input required placeholder="Título" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                  <select className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none" value={form.category} onChange={e => setForm({...form, category: e.target.value})}><option value="MUSICA">MÚSICA</option><option value="GASTRONOMIA">GASTRONOMÍA</option><option value="TAURINOS">TAURINOS</option><option value="OTROS">OTROS</option></select>
                  <input required placeholder="Ciudad" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                  <input required placeholder="Dirección" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                  <input required type="date" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  <div className="p-4 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] text-center min-h-[200px] flex flex-col justify-center items-center overflow-hidden">
                    {isProcessingImg ? <Loader2 className="animate-spin text-indigo-600" /> : form.image_url ? <img src={form.image_url} className="w-full h-full object-cover rounded-2xl" alt="IA" /> : <p className="text-[10px] font-black text-slate-400 uppercase">Sin Foto</p>}
                  </div>
                  <button type="button" onClick={generateIA} className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black text-[10px] flex items-center justify-center gap-2 active:scale-95 transition"><Sparkles size={16}/> GENERAR CON IA</button>
                  <button type="submit" className="w-full bg-indigo-600 text-white p-5 rounded-3xl font-black shadow-xl">PUBLICAR AHORA</button>
                </form>
              </div>
            </div>
          )}

          {view === 'admin' && (
            <div className="max-w-2xl mx-auto p-6 pb-40 animate-in slide-in-from-top text-left">
              <h2 className="text-3xl font-black mb-8 text-amber-500 italic text-center underline">MODERACIÓN 🛡️</h2>
              {events.filter(e => e.status === 'pending').map(ev => (
                <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[3rem] mb-8 border-2 border-amber-500/20 shadow-xl overflow-hidden">
                  <img src={ev.image_url} className="h-52 w-full object-cover" alt="p"/>
                  <div className="p-8">
                    <h4 className="font-black text-xl mb-4">{ev.title}</h4>
                    <div className="flex gap-4">
                      <button onClick={async () => { await supabase.from('events').update({ status: 'approved' }).eq('id', ev.id); fetchEvents(); }} className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-xs">Aprobar</button>
                      <button onClick={async () => { await supabase.from('events').update({ status: 'rejected' }).eq('id', ev.id); fetchEvents(); }} className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-xs">Rechazar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'profile' && (
            <div className="max-w-xl mx-auto p-6 pb-40 animate-in slide-in-from-bottom text-center">
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border dark:border-slate-800 shadow-2xl">
                <div className="w-24 h-24 bg-indigo-600 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl font-black text-white">{user?.email[0].toUpperCase()}</div>
                <h2 className="text-2xl font-black mb-10 tracking-tighter italic uppercase text-indigo-500">Mi Perfil</h2>
                <div className="space-y-4">
                  <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="w-full bg-red-500 text-white p-5 rounded-3xl font-black uppercase shadow-lg">Cerrar Sesión</button>
                </div>
              </div>
            </div>
          )}

          {view === 'map' && ( <div className="absolute inset-0 z-0 bg-white"> <MapContainer center={[40.41, -3.70]} zoom={6} className="h-full w-full"><TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" /> {events.filter(e => e.status === 'approved').map(ev => ev.lat && (<Marker key={ev.id} position={[ev.lat, ev.lng]}><Popup><div className="p-1 font-bold">{ev.title}</div></Popup></Marker>))} </MapContainer> </div> )}
          {view === 'calendar' && ( <div className="max-w-xl mx-auto p-4 pb-40 animate-in slide-in-from-right duration-500"> <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border dark:border-slate-800 shadow-2xl"> <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black text-slate-400 mb-4 uppercase"> <span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sá</span><span>Do</span> </div> <div className="grid grid-cols-7 gap-2 text-center"> {[...Array(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate())].map((_, i) => { const day = i + 1; const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; const hasEvents = events.some(e => e.date === dateStr && e.status === 'approved'); return ( <button key={day} className={`aspect-square rounded-2xl flex items-center justify-center text-sm font-black border-2 ${hasEvents ? 'bg-green-500 border-green-400 text-white' : 'border-transparent text-slate-400'}`}> {day} </button> ); })} </div> </div> </div> )}
        </main>

        {/* MODAL DETALLES */}
        {selectedEvent && (
          <div className="fixed inset-0 z-[3000] bg-black/95 flex items-center justify-center p-3 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-[380px] h-[82vh] rounded-[3.5rem] overflow-hidden relative shadow-2xl border dark:border-slate-800 border-b-[10px] border-b-indigo-600 flex flex-col">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 z-50 p-2.5 bg-black/50 text-white rounded-full"><X size={20} /></button>
              <img src={selectedEvent.image_url} className="w-full h-52 object-cover shrink-0" alt="hero" />
              <div className="p-6 flex flex-col flex-1 overflow-y-auto text-left">
                <div className="text-indigo-600 text-[9px] font-black tracking-[0.2em] mb-1 uppercase">{selectedEvent.category}</div>
                <h2 className="text-2xl font-black mb-6 leading-tight text-slate-900 dark:text-white">{selectedEvent.title}</h2>
                <button onClick={async () => { if(!user) return; if(!favorites.includes(String(selectedEvent.id))) { setFavorites([...favorites, String(selectedEvent.id)]); await supabase.from('favorites').insert({user_id: user.id, event_id: selectedEvent.id}); } alert("¡Apuntado!"); }} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition mb-8"> ¡VOY A IR! <Heart size={20} fill={favorites.includes(String(selectedEvent.id)) ? "white" : "none"} className="inline ml-2"/> </button>
                <div className="space-y-6 text-slate-600 dark:text-slate-300 font-black">
                   <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.city)}`} target="_blank" rel="noreferrer" className="flex items-start gap-4">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600"><MapPin size={22} /></div>
                      <div className="flex-1"><p className="text-md leading-tight underline decoration-indigo-500/30">{selectedEvent.address}</p><p className="text-[10px] opacity-60 uppercase">{selectedEvent.city}</p></div>
                   </a>
                   <div className="flex items-center gap-4">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600"><Calendar size={22} /></div>
                      <div className="flex-1 text-md tracking-tight">{selectedEvent.date} • {selectedEvent.time || '20:00'}H</div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM NAV */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[94%] max-w-[460px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border dark:border-slate-800 h-[80px] rounded-full shadow-2xl flex items-center justify-around z-[2000] px-6 border-b-4 border-b-indigo-500/20">
          <button onClick={() => {setView('home'); setSelectedEvent(null)}} className={`p-3 ${view === 'home' ? "text-indigo-600 scale-110" : "text-slate-400 opacity-40"}`}><LayoutList size={26}/></button>
          <button onClick={() => setView('calendar')} className={`p-3 ${view === 'calendar' ? "text-indigo-600 scale-110" : "text-slate-400 opacity-40"}`}><Calendar size={26}/></button>
          <button onClick={() => setView('create')} className={`p-3 ${view === 'create' ? "text-indigo-600 scale-110" : "text-slate-400 opacity-40"}`}><PlusCircle size={32}/></button>
          <button onClick={() => setView('map')} className={`p-3 ${view === 'map' ? "text-indigo-600 scale-110" : "text-slate-400 opacity-40"}`}><MapIcon size={26}/></button>
          <button onClick={() => setView('favorites')} className={`p-3 ${view === 'favorites' ? "text-indigo-600 scale-110" : "text-slate-400 opacity-40"}`}><Heart size={26}/></button>
        </div>

      </div>
    </div>
  );
}

export default App;
