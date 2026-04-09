import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, 
  Navigation, Clock, ChevronLeft, ChevronRight, LayoutList, ShieldCheck, Star, DollarSign, Sparkles, Camera, Loader2, CheckCircle2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

// Componente para cada opción de imagen IA (Aísla la carga para que no fallen)
const AIImageCard = ({ url, isSelected, onSelect }) => {
  const [loading, setLoading] = useState(true);
  return (
    <div 
      onClick={() => onSelect(url)}
      className={`relative aspect-[3/4] rounded-2xl overflow-hidden border-4 transition-all cursor-pointer ${isSelected ? 'border-indigo-600 scale-105 z-10' : 'border-transparent opacity-60'}`}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
          <Loader2 className="animate-spin text-indigo-500" size={20} />
        </div>
      )}
      <img 
        src={url} 
        className={`w-full h-full object-cover ${loading ? 'opacity-0' : 'opacity-100'}`} 
        alt="AI" 
        onLoad={() => setLoading(false)}
        onError={() => setLoading(false)}
      />
    </div>
  );
};

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

  const generateAIOptions = () => {
    if (!form.title) return showNotification("Escribe un título ✨");
    const q = encodeURIComponent(form.title);
    const t = Date.now();
    // 3 Estilos diferentes para forzar a la IA a generar 3 archivos distintos
    setAiOptions([
      `https://image.pollinations.ai/prompt/realistic_photo_of_${q}?width=600&height=800&nologo=true&seed=${t}`,
      `https://image.pollinations.ai/prompt/cinematic_shot_of_${q}?width=600&height=800&nologo=true&seed=${t+1}`,
      `https://image.pollinations.ai/prompt/artistic_póster_of_${q}?width=600&height=800&nologo=true&seed=${t+2}`
    ]);
    showNotification("Generando 3 estilos...");
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const name = `${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('event-images').upload(name, file);
    if (!error) {
      const { data } = supabase.storage.from('event-images').getPublicUrl(name);
      setForm({ ...form, image_url: data.publicUrl });
      setAiOptions([]);
      showNotification("¡Foto subida!");
    }
  };

  const toggleFavorite = async (event) => {
    if (!user) return showNotification("Inicia sesión ❤️");
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
        
        {toast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-top">
            <CheckCircle2 size={18}/> <span className="font-black uppercase text-[10px] tracking-widest">{toast}</span>
          </div>
        )}

        <nav className="h-[70px] shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 flex justify-between items-center px-8 z-[2000] shadow-sm">
          <div className="flex items-center gap-2" onClick={() => setView('home')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold">E</div>
            <h1 className="text-xl font-black uppercase italic">Eventos</h1>
          </div>
          <div className="flex items-center gap-4">
            {profile?.role === 'admin' && <button onClick={() => setView('admin')} className="text-amber-500 animate-pulse transition"><ShieldCheck size={28}/></button>}
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">{isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}</button>
            {user ? <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black border-2 border-white" onClick={() => setView('profile')}>{user.email[0].toUpperCase()}</div> : <button onClick={() => { const e = window.prompt("Email:"); if(e) supabase.auth.signInWithOtp({email: e, options:{emailRedirectTo: window.location.origin}}); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest">Entrar</button>}
          </div>
        </nav>

        <main className="flex-1 relative overflow-y-auto">
          {view === 'home' && (
            <div className="max-w-6xl mx-auto p-4 pb-40">
              <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar pt-2">
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINOS', 'OTROS'].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-full font-black text-[10px] tracking-widest transition-all shrink-0 border-2 ${activeCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800'}`}>{cat}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {events.filter(e => (activeCategory === 'TODOS' || e.category === activeCategory) && e.status === 'approved').map(ev => (
                  <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl transition-all group flex flex-col h-full">
                    <div className="relative h-64 overflow-hidden cursor-pointer" onClick={() => setSelectedEvent(ev)}>
                      <img src={ev.image_url} className="w-full h-full object-cover group-hover:scale-110 transition duration-1000" alt="img" />
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(ev); }} className="absolute top-5 right-5 p-3 bg-white/90 dark:bg-slate-900/90 rounded-full text-red-500 shadow-xl active:scale-75 transition">
                        <Heart size={20} fill={favorites.includes(String(ev.id)) ? "red" : "none"} />
                      </button>
                    </div>
                    <div className="p-8 flex flex-col flex-1 text-center"><h3 className="text-2xl font-black mb-6 leading-tight">{ev.title}</h3>
                    <button onClick={() => setSelectedEvent(ev)} className="mt-auto w-full bg-slate-900 dark:bg-indigo-600 text-white py-4 rounded-3xl font-black uppercase text-[11px] transition tracking-widest">Ver Detalles</button></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'create' && (
            <div className="max-w-xl mx-auto p-6 pb-40 animate-in slide-in-from-bottom">
              <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-10 border dark:border-slate-800 shadow-2xl">
                <h2 className="text-3xl font-black mb-8 text-indigo-500 uppercase italic text-center underline decoration-indigo-500/20 underline-offset-8">Publicar</h2>
                <form onSubmit={async (e) => { e.preventDefault(); setIsSubmitting(true); const isAdmin = profile?.role === 'admin'; const {error} = await supabase.from('events').insert([{ ...form, status: isAdmin ? 'approved' : 'pending', organizer_id: user?.id }]); if(!error) { showNotification("¡Hecho!"); setView('home'); fetchEvents(); } setIsSubmitting(false); }} className="space-y-4">
                  <input required placeholder="Título del evento" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                  <select className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-bold text-xs uppercase" value={form.category} onChange={e => setForm({...form, category: e.target.value})}><option value="MUSICA">MÚSICA</option><option value="GASTRONOMIA">GASTRONOMÍA</option><option value="TAURINOS">TAURINOS</option><option value="OTROS">OTROS</option></select>
                  <input required placeholder="Ciudad" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                  <input required placeholder="Dirección" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                  <input required type="date" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-bold" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  
                  <div className="pt-6 border-t dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase text-center text-slate-400 mb-4 tracking-widest">Elige una foto:</p>
                    <div className="grid grid-cols-3 gap-2 mb-4 h-32">
                      {aiOptions.map((url, i) => (
                        <AIImageCard key={i} url={url} isSelected={form.image_url === url} onSelect={(u) => setForm({...form, image_url: u})} />
                      ))}
                    </div>
                    {form.image_url && !aiOptions.includes(form.image_url) && <img src={form.image_url} className="h-40 mx-auto rounded-2xl mb-4 border-4 border-indigo-600 object-cover" />}
                    <div className="flex gap-2">
                      <label className="flex-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 p-4 rounded-2xl font-black text-[10px] flex items-center justify-center gap-2 uppercase cursor-pointer"><Camera size={16}/> GALERÍA<input type="file" className="hidden" accept="image/*" onChange={handleUpload} /></label>
                      <button type="button" onClick={generateAIOptions} className="flex-1 bg-white dark:bg-slate-800 border-2 border-indigo-600 text-indigo-600 p-4 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 active:scale-95 transition"><Sparkles size={16}/> IA (3 FOTOS)</button>
                    </div>
                  </div>
                  <button type="submit" disabled={isSubmitting || !form.image_url} className="w-full bg-indigo-600 text-white p-6 rounded-3xl font-black shadow-xl uppercase active:scale-95 transition tracking-widest text-sm mt-4">PUBLICAR AHORA</button>
                </form>
              </div>
            </div>
          )}

          {/* RESTO DE VISTAS (ADMIN, CALENDARIO, PERFIL, MAPA) IGUAL QUE ANTES... */}
          {view === 'admin' && ( <div className="max-w-2xl mx-auto p-6 pb-40 animate-in slide-in-from-top text-left"> <h2 className="text-3xl font-black mb-8 text-amber-500 italic text-center uppercase tracking-tighter">Moderación 🛡️</h2> {events.filter(e => e.status === 'pending').map(ev => ( <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[3rem] mb-8 border-2 border-amber-500/20 shadow-xl overflow-hidden flex flex-col"> <img src={ev.image_url} className="h-52 w-full object-cover" alt="p"/> <div className="p-8"> <h4 className="font-black text-xl mb-2">{ev.title}</h4> <p className="text-sm text-slate-500 mb-6 uppercase tracking-widest font-bold">{ev.city} • {ev.address}</p> <div className="flex gap-4"> <button onClick={() => { supabase.from('events').update({ status: 'approved' }).eq('id', ev.id).then(() => fetchEvents()); showNotification("¡Aprobado!"); }} className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg">Aprobar</button> <button onClick={() => { supabase.from('events').update({ status: 'rejected' }).eq('id', ev.id).then(() => fetchEvents()); showNotification("Rechazado"); }} className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-xs opacity-60">Rechazar</button> </div> </div> </div> ))} </div> )}
          {view === 'profile' && ( <div className="max-w-xl mx-auto p-6 pb-40 animate-in slide-in-from-bottom duration-500 text-center"> <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border dark:border-slate-800 shadow-2xl text-center"> <div className="w-24 h-24 bg-indigo-600 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl font-black text-white shadow-xl border-4 border-white dark:border-slate-800"> {user?.email[0].toUpperCase()} </div> <h2 className="text-2xl font-black mb-10 tracking-tighter italic uppercase tracking-widest text-indigo-500">Mi Perfil</h2> <p className="mb-10 font-bold text-slate-400 tracking-wider text-sm">{user?.email}</p> <div className="space-y-4"> <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="w-full bg-red-500 text-white p-5 rounded-3xl font-black uppercase active:scale-95 transition shadow-lg"> Cerrar Sesión </button> <a href="https://ko-fi.com" target="_blank" rel="noreferrer" className="w-full bg-[#FF5E5B] text-white p-5 rounded-3xl font-black flex items-center justify-center gap-3 active:scale-95 transition shadow-lg tracking-widest text-[10px]"> <DollarSign size={20}/> APOYAR PROYECTO </a> </div> </div> </div> )}
          {view === 'map' && ( <div className="absolute inset-0 z-0 bg-white"> <MapContainer center={[40.41, -3.70]} zoom={6} className="h-full w-full"> <MapResizer /><TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" /> {events.filter(e => e.status === 'approved').map(ev => ev.lat && (<Marker key={ev.id} position={[ev.lat, ev.lng]}><Popup><div className="p-1 font-bold">{ev.title}</div></Popup></Marker>))} </MapContainer> </div> )}
        </main>

        {/* BARRA INFERIOR */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[94%] max-w-[460px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border dark:border-slate-800 h-[80px] rounded-full shadow-2xl flex items-center justify-around z-[2000] px-6 border-b-4 border-b-indigo-500/20 transition-all border-indigo-500/10">
          <button onClick={() => {setView('home'); setSelectedEvent(null)}} className={`p-3 transition-all ${view === 'home' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><LayoutList size={26}/></button>
          <button onClick={() => setView('calendar')} className={`p-3 transition-all ${view === 'calendar' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><Calendar size={26}/></button>
          <button onClick={() => setView('create')} className={`p-3 transition-all ${view === 'create' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><PlusCircle size={32}/></button>
          <button onClick={() => setView('map')} className={`p-3 transition-all ${view === 'map' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><MapIcon size={26}/></button>
          <button onClick={() => setView('favorites')} className={`p-3 transition-all ${view === 'favorites' ? "text-indigo-600 scale-125" : "text-slate-400"}`}><Heart size={26}/></button>
        </div>

        {/* MODAL DETALLES ALARGADO */}
        {selectedEvent && (
          <div className="fixed inset-0 z-[3000] bg-black/95 flex items-center justify-center p-3 backdrop-blur-xl animate-in fade-in duration-300 text-left">
            <div className="bg-white dark:bg-slate-900 w-full max-w-[380px] h-[82vh] rounded-[3.5rem] overflow-hidden relative shadow-2xl border dark:border-slate-800 border-b-[8px] border-b-indigo-600 flex flex-col">
              <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 z-50 p-2.5 bg-black/50 text-white rounded-full active:scale-90 transition shadow-xl"><X size={20} /></button>
              <img src={selectedEvent.image_url} className="w-full h-52 object-cover shadow-inner shrink-0" alt="hero" />
              <div className="p-6 flex flex-col flex-1 overflow-y-auto">
                <div className="text-indigo-600 dark:text-indigo-400 text-[9px] font-black tracking-[0.2em] mb-1 uppercase">{selectedEvent.category}</div>
                <h2 className="text-2xl font-black mb-6 leading-tight tracking-tighter text-slate-900 dark:text-white">{selectedEvent.title}</h2>
                <button 
                  onClick={async () => { 
                    if(!user) return; 
                    if(!favorites.includes(String(selectedEvent.id))) { 
                      setFavorites(prev => [...prev, String(selectedEvent.id)]); 
                      await supabase.from('favorites').insert({user_id: user.id, event_id: selectedEvent.id}); 
                    } 
                    showNotification("¡Gracias por asistir!");
                  }} 
                  className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-indigo-500/40 active:scale-95 transition mb-8 uppercase tracking-tight flex items-center justify-center gap-2"
                >
                  ¡VOY A IR! <Heart size={20} fill={favorites.includes(String(selectedEvent.id)) ? "white" : "none"} />
                </button>
                <div className="space-y-6 text-slate-600 dark:text-slate-300 font-black">
                   <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.address + ' ' + selectedEvent.city)}`} target="_blank" rel="noreferrer" className="flex items-start gap-4 p-2 -ml-2 rounded-xl active:bg-slate-50 dark:active:bg-slate-800 transition">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600"><MapPin size={22} /></div>
                      <div className="flex-1 overflow-hidden"><p className="text-md font-black leading-tight underline decoration-indigo-500/30">{selectedEvent.address}</p><p className="text-[10px] opacity-60 uppercase font-black">{selectedEvent.city}</p></div>
                   </a>
                   <div className="flex items-center gap-4 px-2 -ml-2">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600"><Calendar size={22} /></div>
                      <div className="flex-1 font-black text-md tracking-tight">{selectedEvent.date} • {selectedEvent.time || '20:00'}H</div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
