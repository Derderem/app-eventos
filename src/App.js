import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, X, Trash2, Map as MapIcon, 
  Navigation, Clock, ChevronLeft, ChevronRight, LayoutList, ShieldCheck, Star, DollarSign, Sparkles, Camera, Loader2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Configuración de Supabase con Persistencia Máxima
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL, 
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

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
  
  // Estados del Formulario
  const [form, setForm] = useState({ title: '', category: 'MUSICA', city: '', address: '', date: '', time: '21:00', image_url: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingImg, setIsProcessingImg] = useState(false);

  useEffect(() => {
    fetchEvents();
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        loadProfile(session.user.id);
      } else { setUser(null); setProfile(null); }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
      loadProfile(session.user.id);
    }
  };

  const loadProfile = async (id) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (data) setProfile(data);
    const { data: f } = await supabase.from('favorites').select('event_id').eq('user_id', id);
    setFavorites(f ? f.map(item => item.event_id) : []);
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    setEvents(data || []);
  };

  const handleLogin = async () => {
    const email = window.prompt("Introduce tu email:");
    if (!email) return;
    alert("🚀 Enviando enlace de acceso a " + email + "... Revisa tu bandeja de entrada en unos segundos.");
    const { error } = await supabase.auth.signInWithOtp({ 
      email, options: { emailRedirectTo: 'https://app-eventos-pro-final.vercel.app' } 
    });
    if (error) alert("Error: " + error.message);
  };

  // --- FUNCIÓN SUBIR FOTO GALERÍA ---
  const uploadGalleryImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsProcessingImg(true);
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from('event-images').upload(fileName, file);
    
    if (error) {
        alert("Error al subir: " + error.message);
    } else {
        const { data: urlData } = supabase.storage.from('event-images').getPublicUrl(fileName);
        setForm({ ...form, image_url: urlData.publicUrl });
    }
    setIsProcessingImg(false);
  };

  // --- FUNCIÓN IA GENERATIVA REAL ---
  const generateAIImage = () => {
    if (!form.title) return alert("Escribe un título para que la IA sepa qué dibujar ✨");
    setIsProcessingImg(true);
    const prompt = encodeURIComponent(`${form.title} ${form.category} realistic photography high quality`);
    const aiUrl = `https://image.pollinations.ai/prompt/${prompt}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random()*1000)}`;
    
    const img = new Image();
    img.src = aiUrl;
    img.onload = () => {
      setForm({ ...form, image_url: aiUrl });
      setIsProcessingImg(false);
    };
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!form.image_url) return alert("Añade una foto (Galería o IA) ✨");
    setIsSubmitting(true);
    const isBoss = user?.id === '4d76c965-66de-491d-8cc1-6d37096262c9';
    const { error } = await supabase.from('events').insert([{ 
      ...form, status: isBoss ? 'approved' : 'pending', organizer_id: user?.id 
    }]);
    if (error) alert(error.message);
    else {
      alert(isBoss ? "¡Publicado directamente! 🚀" : "¡Enviado a revisión! 🛡️");
      setForm({ title: '', category: 'MUSICA', city: '', address: '', date: '', time: '21:00', image_url: '' });
      setView('home');
      fetchEvents();
    }
    setIsSubmitting(false);
  };

  const filteredEvents = events.filter(e => (activeCategory === 'TODOS' || e.category === activeCategory) && e.status === 'approved');

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-500 overflow-hidden font-sans">
        
        {/* HEADER */}
        <nav className="h-[70px] shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 flex justify-between items-center px-8 z-[2000] shadow-sm">
          <div className="flex items-center gap-2" onClick={() => setView('home')}>
            <div className="bg-indigo-600 p-2 rounded-xl text-white font-bold shadow-lg">E</div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">Eventos</h1>
          </div>
          <div className="flex items-center gap-4">
            {(profile?.role === 'admin' || user?.id === '4d76c965-66de-491d-8cc1-6d37096262c9') && (
              <button onClick={() => setView('admin')} className="text-amber-500 animate-pulse"><ShieldCheck size={28}/></button>
            )}
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">{isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}</button>
            {user ? (
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black border-2 border-white cursor-pointer" onClick={() => setView('profile')}>{user.email[0].toUpperCase()}</div>
            ) : (
              <button onClick={handleLogin} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-xs uppercase shadow-lg">Entrar</button>
            )}
          </div>
        </nav>

        <main className="flex-1 relative overflow-y-auto">
          {view === 'home' && (
            <div className="max-w-6xl mx-auto p-4 pb-40 animate-in fade-in">
              <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar pt-2">
                {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINOS', 'OTROS'].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2 rounded-full font-black text-[10px] tracking-widest transition-all shrink-0 border-2 ${activeCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800'}`}>{cat}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredEvents.map(ev => (
                  <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 group flex flex-col h-full">
                    <div className="relative h-60 overflow-hidden cursor-pointer" onClick={() => setSelectedEvent(ev)}>
                      <img src={ev.image_url} className="w-full h-full object-cover group-hover:scale-110 transition duration-1000" alt="img" />
                      <div className="absolute top-5 left-5 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-lg">{ev.category}</div>
                    </div>
                    <div className="p-8 flex flex-col flex-1 text-center">
                      <h3 className="text-2xl font-black mb-6 leading-tight">{ev.title}</h3>
                      <button onClick={() => setSelectedEvent(ev)} className="mt-auto w-full bg-slate-900 dark:bg-indigo-600 text-white py-4 rounded-3xl font-black uppercase text-[11px] transition">Ver Detalles</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'create' && (
            <div className="max-w-xl mx-auto p-6 pb-40 animate-in slide-in-from-bottom">
              <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-10 border dark:border-slate-800 shadow-2xl">
                <h2 className="text-3xl font-black mb-8 text-indigo-500 uppercase italic text-center">Publicar</h2>
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <input required placeholder="Título" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                  <select className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-bold uppercase text-[10px]" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="MUSICA">MÚSICA</option><option value="GASTRONOMIA">GASTRONOMÍA</option><option value="TAURINOS">TAURINOS</option><option value="OTROS">OTROS</option>
                  </select>
                  <input required placeholder="Ciudad" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                  <input required placeholder="Dirección" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                  <input required type="date" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl outline-none font-bold" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  
                  {/* PANTALLA DE CARGA DE IMAGEN */}
                  <div className="p-4 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] text-center bg-slate-50/50 dark:bg-slate-800/50 relative overflow-hidden min-h-[200px] flex flex-col justify-center items-center">
                    {isProcessingImg ? (
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="animate-spin text-indigo-600" size={40}/>
                            <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Procesando...</p>
                        </div>
                    ) : form.image_url ? (
                        <img src={form.image_url} className="w-full h-full object-cover rounded-2xl" alt="Preview" />
                    ) : (
                        <p className="text-[10px] uppercase font-black text-slate-400">Sin Imagen</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <label className="flex-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 p-4 rounded-2xl font-black text-[10px] flex items-center justify-center gap-2 uppercase cursor-pointer active:scale-95 transition">
                      <Camera size={16}/> GALERÍA
                      <input type="file" className="hidden" accept="image/*" onChange={uploadGalleryImage} />
                    </label>
                    <button type="button" onClick={generateAIImage} className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-2xl font-black text-[10px] flex items-center justify-center gap-2 uppercase border-2 dark:border-slate-700 active:scale-95 transition">
                      <Sparkles size={16} className="text-indigo-500"/> USAR IA
                    </button>
                  </div>

                  <button type="submit" disabled={isSubmitting || isProcessingImg} className="w-full bg-indigo-600 text-white p-6 rounded-3xl font-black shadow-xl uppercase active:scale-95 transition tracking-widest text-sm mt-4 disabled:opacity-50">
                    {isSubmitting ? "PUBLICANDO..." : "PUBLICAR AHORA"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* OTRAS VISTAS (ADMIN, PERFIL, ETC) SE MANTIENEN IGUAL... */}
          {view === 'admin' && ( <div className="max-w-2xl mx-auto p-6 pb-40"> <h2 className="text-3xl font-black mb-8 text-amber-500 italic tracking-tighter text-center">MODERACIÓN 🛡️</h2> {events.filter(e => e.status === 'pending').map(ev => ( <div key={ev.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] mb-6 border-2 border-amber-500/20 shadow-xl overflow-hidden flex flex-col animate-in slide-in-from-top"> <div className="h-52 w-full relative"> <img src={ev.image_url} className="w-full h-full object-cover" alt="p"/> </div> <div className="p-8"> <h4 className="font-black text-xl mb-2">{ev.title}</h4> <p className="text-sm text-slate-500 mb-6 uppercase">{ev.city} • {ev.address}</p> <div className="flex gap-3"> <button onClick={() => { supabase.from('events').update({ status: 'approved' }).eq('id', ev.id).then(() => fetchEvents()); }} className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg">Aprobar</button> <button onClick={() => { supabase.from('events').update({ status: 'rejected' }).eq('id', ev.id).then(() => fetchEvents()); }} className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-xs opacity-60">Rechazar</button> </div> </div> </div> ))} </div> )}
        </main>

        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[94%] max-w-[460px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border dark:border-slate-800 h-[80px] rounded-full shadow-2xl flex items-center justify-around z-[2000] px-6 border-b-4 border-b-indigo-500/20 transition-all border-indigo-500/10">
          <button onClick={() => {setView('home'); setSelectedEvent(null)}} className={`p-3 transition-all ${view === 'home' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><LayoutList size={28}/></button>
          <button onClick={() => setView('calendar')} className={`p-3 transition-all ${view === 'calendar' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><Calendar size={28}/></button>
          <button onClick={() => setView('create')} className={`p-3 transition-all ${view === 'create' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><PlusCircle size={34}/></button>
          <button onClick={() => setView('map')} className={`p-3 transition-all ${view === 'map' ? "text-indigo-600 scale-125 drop-shadow-xl" : "text-slate-400 opacity-40"}`}><MapIcon size={28}/></button>
          <button onClick={() => setView('profile')} className={`p-3 transition-all ${view === 'profile' ? "text-indigo-600 scale-125" : "text-slate-400"}`}><Heart size={28}/></button>
        </div>

      </div>

      {/* MODAL DETALLES */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[3000] bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[4rem] overflow-hidden relative shadow-2xl border dark:border-slate-800 border-b-[12px] border-b-indigo-600">
            <button onClick={() => setSelectedEvent(null)} className="absolute top-8 right-8 z-10 p-2 bg-black/40 text-white rounded-full active:scale-90 transition"><X/></button>
            <img src={selectedEvent.image_url} className="w-full h-72 object-cover shadow-inner" alt="hero" />
            <div className="p-12 text-left">
              <div className="text-indigo-600 dark:text-indigo-400 text-[11px] font-black tracking-[0.4em] mb-4 uppercase">{selectedEvent.category}</div>
              <h2 className="text-4xl font-black mb-10 leading-none tracking-tighter">{selectedEvent.title}</h2>
              <div className="space-y-6 mb-12 text-slate-600 dark:text-slate-300">
                 <div className="flex items-start gap-5"><div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600"><MapPin size={24} /></div><div className="flex-1"><p className="font-black text-xl leading-tight">{selectedEvent.address}</p><p className="text-xs opacity-50 uppercase font-black">{selectedEvent.city}</p></div></div>
                 <div className="flex items-center gap-5"><div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600"><Calendar size={24} /></div><div className="flex-1 font-black text-xl">{selectedEvent.date} • {selectedEvent.time || '20:00'}H</div></div>
              </div>
              <button onClick={() => alert("¡Registrado!")} className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black text-2xl shadow-xl shadow-indigo-500/40 active:scale-95 transition tracking-tighter uppercase font-sans">¡VOY A IR!</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
