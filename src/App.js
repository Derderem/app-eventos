import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Heart, MapPin, Calendar, Sun, Moon, PlusCircle, Trash2,
  Map as MapIcon, Clock, LayoutList, ShieldCheck, Sparkles,
  Loader2, ArrowLeft, Search, Share2, Star, Download,
  CheckCircle, XCircle, Info, RefreshCw, Check, X, Edit3
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

const ADMIN_EMAILS = ['garverjacobo@gmail.com', 'jacobogarver@gmail.com'];
const APP_URL = 'https://app-eventos-pro-final.vercel.app';
const INITIAL_FORM = { title: '', city: '', localidad: '', address: '', time: '21:00', date: '', category: 'MUSICA', image_url: '' };
const categoryEmojis = { MUSICA: '🎵', GASTRONOMIA: '🍽️', TAURINO: '🐂', 'FIESTAS PATRONALES': '🎉', OTROS: '📌' };
const darkTileUrl = 'https://mt1.google.com/vt/lyrs=r&hl=es&x={x}&y={y}&z={z}';
const lightTileUrl = 'https://mt1.google.com/vt/lyrs=m&hl=es&x={x}&y={y}&z={z}';

const redPinIcon = L.divIcon({
  html: '<div style="width:22px;height:30px;position:relative;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));"><svg viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 13.3 23.5 14 24.4.3.4.7.4 1 0C16.7 38.5 30 26.2 30 15 30 6.7 23.3 0 15 0z" fill="#ef4444"/><circle cx="15" cy="14" r="5" fill="white"/></svg></div>',
  iconSize: [22, 30], iconAnchor: [11, 30], popupAnchor: [0, -30], className: ''
});

function formatDate(d) { if (!d) return ''; const p = String(d).split('-'); return p.length === 3 ? p[2]+'/'+p[1]+'/'+p[0] : d; }
function formatDateTime(d) { if (!d) return ''; try { return new Date(d).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); } catch { return ''; } }
function normalizeText(v) { return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function eventMatchesSearch(ev, q) { const t = normalizeText(q).trim(); if (!t) return true; const terms = t.split(/\s+/).filter(Boolean); const h = normalizeText([ev.title,ev.city,ev.localidad,ev.address,ev.category,ev.date,formatDate(ev.date),ev.time].join(' ')); return terms.every(term => h.indexOf(term) !== -1); }
function getDaysLeft(d) { if (!d) return null; const e = new Date(d+'T23:59:59'); const t = new Date(); t.setHours(0,0,0,0); return Math.ceil((e-t)/(1000*60*60*24)); }
function getDaysLabel(d) { const days = getDaysLeft(d); if (days===null) return null; if (days===0) return {text:'HOY',color:'#ef4444',bg:'rgba(239,68,68,0.15)'}; if (days===1) return {text:'MAÑANA',color:'#f59e0b',bg:'rgba(245,158,11,0.15)'}; if (days<=3) return {text:'EN '+days+' DÍAS',color:'#ef4444',bg:'rgba(239,68,68,0.15)'}; if (days<=7) return {text:'EN '+days+' DÍAS',color:'#22c55e',bg:'rgba(34,197,94,0.15)'}; return {text:'EN '+days+' DÍAS',color:'#6366f1',bg:'rgba(99,102,241,0.15)'}; }
function cleanImageUrl(u) { if (!u) return null; if (String(u).indexOf('data:image')===0) return null; if (String(u).length>1900) return null; return u; }

function getEventIdFromURL() {
  try {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('evento');
    return id ? parseInt(id, 10) : null;
  } catch {
    return null;
  }
}

function setURLForEvent(id) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('evento', id);
    window.history.replaceState({}, '', url.toString());
  } catch {}
}

function clearEventURL() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('evento');
    window.history.replaceState({}, '', url.toString());
  } catch {}
}

async function compressImage(file, opts={}) {
  const maxSize=opts.maxSize||1600, quality=opts.quality||0.82;
  if (!file||!file.type||file.type.indexOf('image/')!==0) throw new Error('Archivo no válido');
  let img; if (typeof createImageBitmap==='function') { img=await createImageBitmap(file); } else { img=await new Promise((res,rej)=>{ const i=new Image(); const u=URL.createObjectURL(file); i.onload=()=>{URL.revokeObjectURL(u);res(i);}; i.onerror=rej; i.src=u; }); }
  let tw=img.width, th=img.height;
  if (tw>maxSize||th>maxSize) { if (tw>th) { th=Math.round((th*maxSize)/tw); tw=maxSize; } else { tw=Math.round((tw*maxSize)/th); th=maxSize; } }
  const c=document.createElement('canvas'); c.width=tw; c.height=th; c.getContext('2d').drawImage(img,0,0,tw,th);
  const wb=await new Promise(r=>c.toBlob(r,'image/webp',quality));
  if (wb&&wb.size>0) return {blob:wb,extension:'webp',type:'image/webp',originalSize:file.size,compressedSize:wb.size,width:tw,height:th};
  const jb=await new Promise(r=>c.toBlob(r,'image/jpeg',quality));
  if (jb&&jb.size>0) return {blob:jb,extension:'jpg',type:'image/jpeg',originalSize:file.size,compressedSize:jb.size,width:tw,height:th};
  return {blob:file,extension:file.name.split('.').pop()||'jpg',type:file.type,originalSize:file.size,compressedSize:file.size,width:img.width,height:img.height};
}

function Toast({toast}) { if (!toast) return null; const s=toast.type==='success', e=toast.type==='error'; const bg=s?'rgba(22,163,74,0.96)':e?'rgba(220,38,38,0.96)':'rgba(79,70,229,0.96)'; const I=s?CheckCircle:e?XCircle:Info; return (<div style={{position:'fixed',top:62,left:'50%',transform:'translateX(-50%)',zIndex:999999,width:'90%',maxWidth:420,background:bg,color:'white',borderRadius:16,padding:'12px 14px',boxShadow:'0 12px 35px rgba(0,0,0,0.35)',display:'flex',alignItems:'center',gap:10,fontSize:12,fontWeight:900,lineHeight:1.35,border:'1px solid rgba(255,255,255,0.22)',animation:'toastIn 0.25s ease-out'}}><I size={20}/><span style={{flex:1}}>{toast.message}</span></div>); }
function Splash({onDone}) { useEffect(()=>{const t=setTimeout(onDone,1000);return()=>clearTimeout(t);},[onDone]); return (<div style={{position:'fixed',inset:0,zIndex:99999,background:'#020617',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:20}}><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EVENTORA%20%282%29-XHiy1tMtbcc21CX0wfbs51THTEjOvx.png" alt="Eventora" style={{height:50,width:'auto'}}/><p style={{color:'#6366f1',fontSize:11,fontWeight:700}}>Cargando eventos...</p><Loader2 className="animate-spin" size={24} color="#4f46e5"/></div>); }
function MapResizer({center}) { const map=useMap(); const prev=useRef(null); useEffect(()=>{ map.invalidateSize(); if (center) { const isNew=!prev.current||prev.current[0]!==center[0]||prev.current[1]!==center[1]; if (isNew) { map.flyTo(center,9,{animate:true,duration:1.5}); prev.current=center; } } else { map.setView([40.4167,-3.7037],6); prev.current=null; } },[center,map]); return null; }
function exportToCSV(events) { if (!events.length) return alert('No hay eventos.'); const h=['Titulo','Ciudad','Localidad','Direccion','Fecha','Hora','Categoria','Estado','Destacado','Lat','Lng']; const rows=events.map(e=>[e.title||'',e.city||'',e.localidad||'',e.address||'',formatDate(e.date),e.time||'',e.category||'',e.status||'',e.featured?'SI':'NO',e.lat||'',e.lng||''].map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(';')); const csv='\uFEFF'+h.join(';')+'\n'+rows.join('\n'); const b=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const l=document.createElement('a'); l.href=URL.createObjectURL(b); l.download='eventora_eventos_'+new Date().toISOString().split('T')[0]+'.csv'; l.click(); URL.revokeObjectURL(l.href); }

function EventCard({ev,isDark,favorites,animHeart,toggleFavorite,setSelectedEvent}) {
  const dl=getDaysLabel(ev.date);
  const isFeatured = !!ev.featured;
  return (
    <div className={isDark?'card-dark':'card-light'} style={{borderRadius:25,overflow:'hidden',marginBottom:15,border:isFeatured?'2px solid #22c55e':undefined}}>
      <div style={{position:'relative'}}>
        {isFeatured && (<div style={{position:'absolute',top:10,left:10,zIndex:5,background:'#22c55e',color:'white',padding:'4px 10px',borderRadius:8,fontSize:9,fontWeight:900,display:'flex',alignItems:'center',gap:4}}><Star size={12} fill="white"/> DESTACADO</div>)}
        {dl && (<div style={{position:'absolute',top:10,right:50,zIndex:5,background:dl.bg,color:dl.color,padding:'4px 10px',borderRadius:8,fontSize:9,fontWeight:900}}>{dl.text}</div>)}
        <div style={{position:'relative',height:isFeatured?200:160}}>
          <img src={ev.image_url||'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          <button onClick={()=>toggleFavorite(ev.id)} style={{position:'absolute',top:10,right:10,padding:isFeatured?8:7,background:'white',borderRadius:'50%',border:'none',color:'#ef4444',display:'flex',cursor:'pointer'}}>
            <Heart size={isFeatured?18:16} className={animHeart===ev.id?'heart-pop':''} fill={favorites.indexOf(ev.id)!==-1?'red':'none'}/>
          </button>
        </div>
        <div style={{padding:15,textAlign:'center'}}>
          <p style={{fontSize:9,color:'#6366f1',fontWeight:800,letterSpacing:1,marginBottom:5}}>{categoryEmojis[ev.category]||'📌'} {ev.city} | {formatDate(ev.date)}</p>
          <h3 style={{fontWeight:900,fontSize:isFeatured?17:15,marginBottom:10}}>{ev.title}</h3>
          <button onClick={()=>setSelectedEvent(ev)} style={{width:'100%',padding:isFeatured?12:11,borderRadius:14,background:'#4f46e5',color:'white',border:'none',fontWeight:900,fontSize:isFeatured?11:10,cursor:'pointer'}}>{isFeatured?'VER DETALLES':'DETALLES'}</button>
        </div>
      </div>
    </div>
  );
}

function AdminMiniCard({ev,isDark,onClick,onApprove,onReject,onDelete,onView,onEdit,onToggleFeatured,mode}) {
  return (
    <div className={isDark?'card-dark':'card-light'} style={{borderRadius:16,padding:10,marginBottom:10,cursor:'pointer',border:ev.featured?'2px solid #22c55e':undefined}} onClick={onClick}>
      <div style={{display:'flex',gap:10,alignItems:'center'}}>
        <img src={ev.image_url||'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} alt="" style={{width:56,height:56,borderRadius:12,objectFit:'cover',flexShrink:0}}/>
        <div style={{flex:1,minWidth:0}}>
          <p style={{fontWeight:900,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{ev.featured?'⭐ ':''}{ev.title}</p>
          <p style={{fontSize:9,color:'#6366f1',fontWeight:800}}>{ev.city} | {formatDate(ev.date)} | {String(ev.time||'').slice(0,5)}</p>
          <p style={{fontSize:8,opacity:0.65,marginTop:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{ev.address}, {ev.localidad||''}</p>
          {ev.created_at&&mode==='pending'&&(<p style={{fontSize:8,opacity:0.45,marginTop:3}}>Enviado: {formatDateTime(ev.created_at)}</p>)}
        </div>
      </div>
      {mode==='pending'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginTop:10}}>
          <button onClick={e=>{e.stopPropagation();onApprove();}} style={{padding:8,background:'#22c55e',color:'white',border:'none',borderRadius:10,fontWeight:900,fontSize:9,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><Check size={12}/> APROBAR</button>
          <button onClick={e=>{e.stopPropagation();onReject();}} style={{padding:8,background:'#f59e0b',color:'white',border:'none',borderRadius:10,fontWeight:900,fontSize:9,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><X size={12}/> RECHAZAR</button>
          <button onClick={e=>{e.stopPropagation();onDelete();}} style={{padding:8,background:'#ef4444',color:'white',border:'none',borderRadius:10,fontWeight:900,fontSize:9,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><Trash2 size={12}/> BORRAR</button>
        </div>
      )}
      {mode==='approved'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:5,marginTop:10}}>
          <button onClick={e=>{e.stopPropagation();onView();}} style={{padding:7,background:'#4f46e5',color:'white',border:'none',borderRadius:10,fontWeight:900,fontSize:8,cursor:'pointer'}}>VER</button>
          <button onClick={e=>{e.stopPropagation();onEdit();}} style={{padding:7,background:'#f59e0b',color:'white',border:'none',borderRadius:10,fontWeight:900,fontSize:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:3}}><Edit3 size={10}/> EDITAR</button>
          <button onClick={e=>{e.stopPropagation();onToggleFeatured();}} style={{padding:7,background:ev.featured?'#64748b':'#22c55e',color:'white',border:'none',borderRadius:10,fontWeight:900,fontSize:8,cursor:'pointer'}}>{ev.featured?'QUITAR ⭐':'⭐ DEST.'}</button>
          <button onClick={e=>{e.stopPropagation();onDelete();}} style={{padding:7,background:'#ef4444',color:'white',border:'none',borderRadius:10,fontWeight:900,fontSize:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:3}}><Trash2 size={10}/></button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [showSplash,setShowSplash]=useState(true);
  const [events,setEvents]=useState([]);
  const [favorites,setFavorites]=useState(()=>{try{const s=localStorage.getItem('eventora_favs_v5');return s?JSON.parse(s):[];}catch{return[];}});
  const [profile,setProfile]=useState(null);
  const [view,setView]=useState('home');
  const [isDark,setIsDark]=useState(true);
  const [selectedCategory,setSelectedCategory]=useState('TODOS');
  const [selectedCity,setSelectedCity]=useState('TODAS');
  const [selectedEvent,setSelectedEvent]=useState(null);
  const [mapCenter,setMapCenter]=useState(null);
  const [mapSearch,setMapSearch]=useState('');
  const [isGenerating,setIsGenerating]=useState(false);
  const [isSubmitting,setIsSubmitting]=useState(false);
  const [form,setForm]=useState(INITIAL_FORM);
  const [userEmail,setUserEmail]=useState('');
  const [selectedPendingEvent,setSelectedPendingEvent]=useState(null);
  const [editingEvent,setEditingEvent]=useState(null);
  const [editForm,setEditForm]=useState(INITIAL_FORM);
  const [editFeatured,setEditFeatured]=useState(false);
  const [adminTab,setAdminTab]=useState('pending');
  const [searchQuery,setSearchQuery]=useState('');
  const [dateFilter,setDateFilter]=useState('all');
  const [animHeart,setAnimHeart]=useState(null);
  const [toast,setToast]=useState(null);
  const [adminSearch,setAdminSearch]=useState('');
  const [adminCityFilter,setAdminCityFilter]=useState('TODAS');
  const [deepLinkChecked,setDeepLinkChecked]=useState(false);

  const listRef=useRef(null);
  const toastTimerRef=useRef(null);
  const hasAdmin=profile&&profile.role==='admin';

  function showToast(msg,type='info'){if(toastTimerRef.current)clearTimeout(toastTimerRef.current);setToast({message:msg,type});toastTimerRef.current=setTimeout(()=>setToast(null),3600);}

  useEffect(()=>{fetchEvents();return()=>{if(toastTimerRef.current)clearTimeout(toastTimerRef.current);};},[]);
  useEffect(()=>{localStorage.setItem('eventora_favs_v5',JSON.stringify(favorites));},[favorites]);

  // ✅ DEEP LINK: abrir evento desde URL
  useEffect(()=>{
    if (deepLinkChecked || events.length === 0) return;
    const eventId = getEventIdFromURL();
    if (eventId) {
      const found = events.find(e => e.id === eventId);
      if (found) {
        setSelectedEvent(found);
        setView('home');
      }
    }
    setDeepLinkChecked(true);
  },[events, deepLinkChecked]);

  useEffect(()=>{
    function isAdminUser(u){return !!(u&&u.email&&ADMIN_EMAILS.indexOf(u.email)!==-1);}
    function handleSession(s){const u=s&&s.user;setUserEmail(u?u.email:'');setProfile(isAdminUser(u)?{role:'admin'}:null);fetchEvents();}
    supabase.auth.getSession().then(r=>handleSession(r.data&&r.data.session));
    const sub=supabase.auth.onAuthStateChange((ev,s)=>handleSession(s));
    return()=>{if(sub&&sub.data&&sub.data.subscription)sub.data.subscription.unsubscribe();};
  },[]);

  function fetchEvents(){
    supabase.from('events').select('*').order('date',{ascending:true}).then(res=>{
      if(res.error){console.error('❌',res.error);showToast('Error cargando eventos','error');return;}
      const data=res.data||[];
      setEvents(data);
      const ids=data.map(e=>e.id);
      setFavorites(prev=>prev.filter(id=>ids.indexOf(id)!==-1));
    });
  }

  function selectEvent(ev) {
    setSelectedEvent(ev);
    setURLForEvent(ev.id);
  }

  function deselectEvent() {
    setSelectedEvent(null);
    clearEventURL();
  }

  function openAdminPanel(){setView('admin');setSelectedEvent(null);setSelectedPendingEvent(null);setEditingEvent(null);setAdminTab('pending');setAdminSearch('');setAdminCityFilter('TODAS');clearEventURL();fetchEvents();}
  function handleInputChange(e){const n=e.target.name;let v=e.target.value;if(['title','city','localidad'].indexOf(n)!==-1)v=v.toUpperCase();setForm(p=>({...p,[n]:v}));}
  function handleEditInputChange(e){const n=e.target.name;let v=e.target.value;if(['title','city','localidad'].indexOf(n)!==-1)v=v.toUpperCase();setEditForm(p=>({...p,[n]:v}));}

  function toggleFavorite(id){
    setFavorites(prev=>{if(prev.indexOf(id)!==-1){showToast('Evento quitado de guardados','info');return prev.filter(x=>x!==id);}showToast('Evento guardado en favoritos','success');return prev.concat([id]);});
    setAnimHeart(id);setTimeout(()=>setAnimHeart(null),700);
  }

  async function uploadImageToStorage(file){
    if(!file)throw new Error('No hay imagen');
    if(!file.type||file.type.indexOf('image/')!==0)throw new Error('Selecciona una imagen válida');
    if(file.size>12*1024*1024)throw new Error('Máximo 12MB');
    const opt=await compressImage(file,{maxSize:1600,quality:0.82});
    const name=Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+opt.extension;
    const path='uploads/'+name;
    const up=await supabase.storage.from('event-images').upload(path,opt.blob,{cacheControl:'3600',upsert:false,contentType:opt.type});
    if(up.error)throw up.error;
    const url=supabase.storage.from('event-images').getPublicUrl(path);
    return{url:url.data.publicUrl,originalSize:opt.originalSize,compressedSize:opt.compressedSize,width:opt.width,height:opt.height};
  }

  async function handleGalleryUpload(e){const file=e.target.files&&e.target.files[0];if(!file)return;setIsGenerating(true);showToast('Optimizando imagen...','info');try{const r=await uploadImageToStorage(file);setForm(p=>({...p,image_url:r.url}));showToast(`Imagen optimizada (${Math.round(r.compressedSize/1024)}KB)`,'success');}catch(err){showToast(err.message||'Error','error');}finally{setIsGenerating(false);e.target.value='';}}
  async function handleEditGalleryUpload(e){const file=e.target.files&&e.target.files[0];if(!file)return;setIsGenerating(true);showToast('Optimizando imagen...','info');try{const r=await uploadImageToStorage(file);setEditForm(p=>({...p,image_url:r.url}));showToast(`Imagen actualizada (${Math.round(r.compressedSize/1024)}KB)`,'success');}catch(err){showToast(err.message||'Error','error');}finally{setIsGenerating(false);e.target.value='';}}

  function generateAIImage(){if(!form.title){showToast('Escribe un título','error');return;}setIsGenerating(true);showToast('Generando imagen IA...','info');const seed=Math.floor(Math.random()*999999);const url='https://image.pollinations.ai/prompt/'+encodeURIComponent('professional event photography '+form.title)+'?width=800&height=600&seed='+seed+'&nologo=true&t='+Date.now();setForm(p=>({...p,image_url:url}));setTimeout(()=>{setIsGenerating(false);showToast('Imagen generada','success');},1200);}
  function generateAIImageEdit(){if(!editForm.title){showToast('Escribe un título','error');return;}setIsGenerating(true);showToast('Generando imagen IA...','info');const seed=Math.floor(Math.random()*999999);const url='https://image.pollinations.ai/prompt/'+encodeURIComponent('professional event photography '+editForm.title)+'?width=800&height=600&seed='+seed+'&nologo=true&t='+Date.now();setEditForm(p=>({...p,image_url:url}));setTimeout(()=>{setIsGenerating(false);showToast('Imagen generada','success');},1200);}

  function geocodeAddress(address,localidad,city){const full=[address,localidad,city,'España'].filter(Boolean).join(', ');return fetch('https://nominatim.openstreetmap.org/search?format=json&accept-language=es&q='+encodeURIComponent(full)).then(r=>r.json()).then(data=>{if(data&&data[0])return{lat:parseFloat(data[0].lat),lng:parseFloat(data[0].lon)};return fetch('https://nominatim.openstreetmap.org/search?format=json&accept-language=es&q='+encodeURIComponent(city+', España')).then(r2=>r2.json()).then(d2=>{if(d2&&d2[0])return{lat:parseFloat(d2[0].lat),lng:parseFloat(d2[0].lon)};return{lat:null,lng:null};});}).catch(()=>({lat:null,lng:null}));}

  function handleSubmitEvent(){
    if(!form.title||!form.date||!form.city||!form.address){showToast('Faltan campos','error');return;}
    setIsSubmitting(true);showToast('Enviando evento...','info');
    geocodeAddress(form.address,form.localidad,form.city).then(coords=>{
      return supabase.from('events').insert([{title:form.title.trim(),category:form.category,city:form.city.trim(),localidad:form.localidad?form.localidad.trim():null,address:form.address.trim(),date:form.date,time:form.time||'21:00',image_url:cleanImageUrl(form.image_url),status:'pending',featured:false,lat:coords.lat,lng:coords.lng}]);
    }).then(res=>{
      if(res.error){showToast('Error: '+(res.error.message||''),'error');return;}
      showToast('Evento enviado a revisión','success');setForm(INITIAL_FORM);setView('home');fetchEvents();
    }).catch(()=>showToast('Error al enviar','error')).finally(()=>setIsSubmitting(false));
  }

  function startEditEvent(ev){setEditingEvent(ev);setSelectedEvent(null);setSelectedPendingEvent(null);clearEventURL();setEditForm({title:ev.title||'',city:ev.city||'',localidad:ev.localidad||'',address:ev.address||'',date:ev.date||'',time:ev.time?String(ev.time).slice(0,5):'21:00',category:ev.category||'MUSICA',image_url:ev.image_url||''});setEditFeatured(!!ev.featured);}
  function cancelEditEvent(){setEditingEvent(null);setEditForm(INITIAL_FORM);setEditFeatured(false);}

  function handleSaveEditEvent(){
    if(!editingEvent)return;
    if(!editForm.title||!editForm.date||!editForm.city||!editForm.address){showToast('Faltan campos','error');return;}
    setIsSubmitting(true);showToast('Guardando cambios...','info');
    const addrChanged=editForm.address!==(editingEvent.address||'')||editForm.city!==(editingEvent.city||'')||editForm.localidad!==(editingEvent.localidad||'');
    const coordsP=addrChanged?geocodeAddress(editForm.address,editForm.localidad,editForm.city):Promise.resolve({lat:editingEvent.lat||null,lng:editingEvent.lng||null});
    coordsP.then(coords=>{
      return supabase.from('events').update({title:editForm.title.trim(),category:editForm.category,city:editForm.city.trim(),localidad:editForm.localidad?editForm.localidad.trim():null,address:editForm.address.trim(),date:editForm.date,time:editForm.time||'21:00',image_url:cleanImageUrl(editForm.image_url),featured:editFeatured,lat:coords.lat,lng:coords.lng}).eq('id',editingEvent.id);
    }).then(res=>{
      if(res.error){showToast('Error guardando','error');return;}
      showToast('Evento actualizado','success');setEditingEvent(null);setEditForm(INITIAL_FORM);setEditFeatured(false);fetchEvents();setAdminTab('approved');
    }).catch(()=>showToast('Error guardando','error')).finally(()=>setIsSubmitting(false));
  }

  function handleToggleFeatured(id,currentVal){supabase.from('events').update({featured:!currentVal}).eq('id',id).then(res=>{if(res.error){showToast('Error','error');return;}showToast(currentVal?'Evento ya no es destacado':'Evento destacado ⭐','success');fetchEvents();});}
  function handleApproveEvent(id){supabase.from('events').update({status:'approved'}).eq('id',id).then(res=>{if(res.error){showToast('Error','error');return;}showToast('Evento aprobado','success');setSelectedPendingEvent(null);fetchEvents();});}
  function handleRejectEvent(id){supabase.from('events').update({status:'rejected'}).eq('id',id).then(res=>{if(res.error){showToast('Error','error');return;}showToast('Evento rechazado','info');setSelectedPendingEvent(null);fetchEvents();});}
  function handleDeleteEvent(id){if(!window.confirm('¿Borrar este evento?'))return;supabase.from('events').delete().eq('id',id).then(res=>{if(res.error){showToast('Error','error');return;}showToast('Evento borrado','success');setSelectedPendingEvent(null);setEditingEvent(null);fetchEvents();});}

  function handleLogin(){const email=prompt('Escribe tu email:');if(!email)return;supabase.auth.signInWithOtp({email,options:{emailRedirectTo:APP_URL}}).then(res=>{if(res.error){showToast('Error login','error');return;}showToast('Revisa tu email','success');});}
  function handleLogout(){supabase.auth.signOut().then(()=>{setUserEmail('');setProfile(null);fetchEvents();setView('home');setEditingEvent(null);clearEventURL();showToast('Sesión cerrada','success');});}

  function handleCitySearch(city){const c=String(city||'').trim();if(!c){showToast('Escribe una ciudad','error');return;}fetch('https://nominatim.openstreetmap.org/search?format=json&accept-language=es&q='+encodeURIComponent(c+', España')).then(r=>r.json()).then(data=>{if(data&&data[0]){setMapCenter([parseFloat(data[0].lat),parseFloat(data[0].lon)]);showToast('Mostrando '+c.toUpperCase(),'success');}else{showToast('Ciudad no encontrada','error');}}).catch(()=>showToast('Error buscando','error'));}
  function handleMapSearchSubmit(){handleCitySearch(mapSearch);}
  function resetMapToSpain(){setMapSearch('');setMapCenter(null);showToast('Mostrando España','info');}

  // ✅ COMPARTIR CON ENLACE REAL
function shareEvent(ev){
  const eventUrl = APP_URL + '/?evento=' + ev.id;

  if(navigator.share){
    navigator.share({
      title: ev.title,
      url: eventUrl
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(eventUrl).then(()=>showToast('Enlace copiado','success'));
  }
}

  function addToGoogleCalendar(ev){const day=String(ev.date).replace(/-/g,'');const p=String(ev.time||'12:00').split(':');const h=p[0]||'12',m=p[1]||'00';const st=day+'T'+h+m+'00';let eh=parseInt(h,10)+2;if(eh>=24)eh=23;const et=day+'T'+String(eh).padStart(2,'0')+m+'00';const d=ev.title+'\n'+ev.address+', '+(ev.localidad||'')+' - '+ev.city;window.open('https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent(ev.title)+'&dates='+st+'/'+et+'&details='+encodeURIComponent(d)+'&location='+encodeURIComponent(ev.address+', '+(ev.localidad||'')+', '+ev.city),'_blank');}

  function goHome(){setView('home');setSelectedEvent(null);setSelectedPendingEvent(null);setEditingEvent(null);setSearchQuery('');clearEventURL();}
  function handleCategoryChange(cat){setSelectedCategory(cat);if(listRef.current)listRef.current.scrollTop=0;}
  function handleCityFilterChange(city){setSelectedCity(city);if(listRef.current)listRef.current.scrollTop=0;}
  function clearHomeFilters(){setSearchQuery('');setSelectedCategory('TODOS');setSelectedCity('TODAS');setDateFilter('all');if(listRef.current)listRef.current.scrollTop=0;showToast('Filtros limpiados','info');}
  function eventMatchesAdminFilters(e){const cityOk=adminCityFilter==='TODAS'||e.city===adminCityFilter;if(!cityOk)return false;const q=normalizeText(adminSearch).trim();if(!q)return true;const h=normalizeText([e.title,e.city,e.localidad,e.address,e.category,e.status,e.date,e.time].join(' '));return q.split(/\s+/).filter(Boolean).every(t=>h.indexOf(t)!==-1);}

  const today=new Date().toISOString().split('T')[0];
  const publicEvents=events.filter(e=>e.status==='approved'&&e.date>=today);
  const publicCitiesList=[];publicEvents.forEach(e=>{if(e.city&&publicCitiesList.indexOf(e.city)===-1)publicCitiesList.push(e.city);});publicCitiesList.sort();
  const cityFilteredEvents=publicEvents.filter(e=>selectedCity==='TODAS'||e.city===selectedCity);
  const searchedEvents=searchQuery?cityFilteredEvents.filter(e=>eventMatchesSearch(e,searchQuery)):cityFilteredEvents;
  const categoryEvents=searchedEvents.filter(e=>selectedCategory==='TODOS'||e.category===selectedCategory);
  const filteredEvents=categoryEvents.filter(e=>{if(dateFilter==='today')return e.date===today;if(dateFilter==='week'){const ed=new Date(e.date),n=new Date(),we=new Date(n);we.setDate(we.getDate()+7);return ed>=n&&ed<=we;}return true;});
  const sortedEvents=[...filteredEvents].sort((a,b)=>{if(a.featured&&!b.featured)return -1;if(!a.featured&&b.featured)return 1;return new Date(a.date)-new Date(b.date);});
  const favoriteEvents=publicEvents.filter(e=>favorites.indexOf(e.id)!==-1);
  const rawPendingEvents=hasAdmin?events.filter(e=>e.status==='pending'):[];
  const rawApprovedEvents=hasAdmin?events.filter(e=>e.status==='approved'):[];
  const pendingEvents=rawPendingEvents.filter(eventMatchesAdminFilters);
  const approvedEvents=rawApprovedEvents.filter(eventMatchesAdminFilters);
  const adminCitiesList=[];events.forEach(e=>{if(e.city&&adminCitiesList.indexOf(e.city)===-1)adminCitiesList.push(e.city);});adminCitiesList.sort();
  const adminFiltersActive=adminSearch.trim()||adminCityFilter!=='TODAS';
  const homeFiltersActive=searchQuery.trim()||selectedCategory!=='TODOS'||selectedCity!=='TODAS'||dateFilter!=='all';
  const INPUT_STYLE={width:'100%',padding:12,borderRadius:10,border:'none',background:'rgba(128,128,128,0.1)',color:'inherit',fontWeight:700};

  if(showSplash)return <Splash onDone={()=>setShowSplash(false)}/>;

  return (
    <div className={isDark?'dark-theme':'light-theme'} style={{width:'100vw',height:'100vh',overflow:'hidden',display:'flex',flexDirection:'column'}}>
      <Toast toast={toast}/>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;transition:background-color .25s,color .25s;}
        html,body,#root{width:100%;height:100%;overflow:hidden;}
        .dark-theme{background:#020617;color:white;}
        .light-theme{background:#f8fafc;color:#0f172a;}
        .card-dark{background:#0f172a;border:1px solid #1e293b;color:white;}
        .card-light{background:white;border:1px solid #e2e8f0;color:#0f172a;box-shadow:0 4px 12px rgba(0,0,0,.05);}
        .no-scrollbar::-webkit-scrollbar{display:none;}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none;}
        .leaflet-container img{max-width:none!important;max-height:none!important;}
        @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        .animate-spin{animation:spin 1s linear infinite;}
        @keyframes admin-pulse{0%{transform:scale(1);color:#818cf8;}50%{transform:scale(1.2);color:#ef4444;}100%{transform:scale(1);color:#818cf8;}}
        .pulse-admin{animation:admin-pulse 1.4s infinite;}
        @keyframes heartPop{0%{transform:scale(1);}30%{transform:scale(1.5);}60%{transform:scale(.9);}100%{transform:scale(1);}}
        .heart-pop{animation:heartPop .6s ease-out;}
        @keyframes toastIn{from{opacity:0;transform:translate(-50%,-12px);}to{opacity:1;transform:translate(-50%,0);}}
      `}</style>

      <nav style={{height:50,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0 10px',zIndex:2000,borderBottom:'1px solid rgba(128,128,128,.2)',background:isDark?'#0f172a':'#fff',flexShrink:0}}>
        <div style={{cursor:'pointer'}} onClick={goHome}><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EVENTORA%20%282%29-XHiy1tMtbcc21CX0wfbs51THTEjOvx.png" alt="Eventora" style={{height:18,width:'auto'}}/></div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {hasAdmin&&(<button onClick={openAdminPanel} style={{position:'relative',background:'none',border:'none',cursor:'pointer',display:'flex',padding:0}}><ShieldCheck size={21} className={rawPendingEvents.length>0?'pulse-admin':''} style={{color:'#6366f1'}}/>{rawPendingEvents.length>0&&(<span style={{position:'absolute',top:-8,right:-10,background:'#ef4444',color:'white',fontSize:8,fontWeight:900,borderRadius:999,minWidth:16,height:16,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px',border:'2px solid '+(isDark?'#0f172a':'#fff')}}>{rawPendingEvents.length}</span>)}</button>)}
          {!userEmail&&(<button onClick={handleLogin} style={{background:'#4f46e5',color:'white',border:'none',borderRadius:8,padding:'4px 8px',fontSize:8,fontWeight:900,cursor:'pointer'}}>LOGIN</button>)}
          <button onClick={()=>setIsDark(!isDark)} style={{background:'none',border:'none',cursor:'pointer',display:'flex',padding:0}}>{isDark?<Sun size={18} color="#facc15"/>:<Moon size={18} color="#4f46e5"/>}</button>
          <Sparkles size={18} color="#6366f1" style={{cursor:'pointer'}} onClick={()=>setView('profile')}/>
        </div>
      </nav>

      <main style={{flex:1,overflow:'hidden',position:'relative',minHeight:0}}>
        {view==='map'&&(
          <div style={{position:'absolute',inset:0,zIndex:1}}>
            <div style={{position:'absolute',top:12,left:'50%',transform:'translateX(-50%)',zIndex:1000,width:'92%',maxWidth:430}}>
              <div style={{background:'rgba(255,255,255,0.96)',borderRadius:18,padding:8,boxShadow:'0 10px 25px rgba(0,0,0,.22)',display:'grid',gap:8}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:6,alignItems:'center'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,background:'#e2e8f0',borderRadius:12,padding:'0 10px'}}>
                    <Search size={16} color="#6366f1"/>
                    <input value={mapSearch} onChange={e=>setMapSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')handleMapSearchSubmit();}} placeholder="Escribe una ciudad..." style={{width:'100%',padding:'11px 0',border:'none',outline:'none',background:'transparent',color:'#0f172a',fontWeight:900,fontSize:11}}/>
                  </div>
                  <button onClick={handleMapSearchSubmit} style={{padding:'11px 12px',borderRadius:12,border:'none',background:'#4f46e5',color:'white',fontWeight:900,fontSize:10,cursor:'pointer'}}>BUSCAR</button>
                </div>
                <button onClick={resetMapToSpain} style={{padding:9,borderRadius:12,border:'none',background:'rgba(34,197,94,.14)',color:'#16a34a',fontWeight:900,fontSize:10,cursor:'pointer'}}>VER ESPAÑA</button>
              </div>
            </div>
            <MapContainer center={[40.41,-3.70]} zoom={6} style={{height:'100%',width:'100%'}} scrollWheelZoom={true}>
              <MapResizer center={mapCenter}/>
              <TileLayer url={isDark?darkTileUrl:lightTileUrl} attribution="Google Maps" maxZoom={20}/>
              {publicEvents.map(ev=>{if(!ev.lat||!ev.lng)return null;return(<Marker key={ev.id} position={[ev.lat,ev.lng]} icon={redPinIcon}><Popup><b>{ev.title}</b><br/>{ev.address}, {ev.localidad||''} - {ev.city}<br/>{formatDate(ev.date)}</Popup></Marker>);})}
            </MapContainer>
          </div>
        )}

        {view==='home'&&!selectedEvent&&(
          <div style={{height:'100%',display:'flex',flexDirection:'column'}}>
            <div style={{padding:'8px 12px',flexShrink:0,background:isDark?'#020617':'#f8fafc'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,background:isDark?'#1e293b':'#e2e8f0',borderRadius:12,padding:'6px 12px'}}>
                <Search size={16} color="#6366f1"/>
                <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Buscar por evento, ciudad, localidad, categoría..." style={{width:'100%',border:'none',outline:'none',background:'transparent',fontWeight:700,fontSize:11,color:'inherit'}}/>
                {searchQuery&&(<button onClick={()=>setSearchQuery('')} style={{background:'none',border:'none',color:'#6366f1',cursor:'pointer',fontWeight:900}}>X</button>)}
              </div>
            </div>
            <div style={{padding:'0 12px 6px',flexShrink:0}}>
              <select value={selectedCity} onChange={e=>handleCityFilterChange(e.target.value)} style={{width:'100%',padding:10,borderRadius:12,border:'none',outline:'none',background:isDark?'#1e293b':'#e2e8f0',color:'inherit',fontWeight:900,fontSize:10}}>
                <option value="TODAS">TODAS LAS CIUDADES</option>
                {publicCitiesList.map(c=>(<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <div style={{display:'flex',gap:6,padding:'6px 12px',flexShrink:0}}>
              {[{k:'all',l:'TODOS'},{k:'today',l:'HOY'},{k:'week',l:'ESTA SEMANA'}].map(f=>(<button key={f.k} onClick={()=>setDateFilter(f.k)} style={{padding:'5px 10px',borderRadius:10,border:'none',background:dateFilter===f.k?'#22c55e':'transparent',color:dateFilter===f.k?'white':'#6366f1',fontSize:8,fontWeight:900,cursor:'pointer'}}>{f.l}</button>))}
              {homeFiltersActive&&(<button onClick={clearHomeFilters} style={{marginLeft:'auto',padding:'5px 10px',borderRadius:10,border:'none',background:'rgba(239,68,68,.12)',color:'#ef4444',fontSize:8,fontWeight:900,cursor:'pointer'}}>LIMPIAR</button>)}
            </div>
            <div className="no-scrollbar" style={{display:'flex',gap:8,padding:'8px 12px',overflowX:'auto',flexShrink:0}}>
              {['TODOS','MUSICA','GASTRONOMIA','TAURINO','FIESTAS PATRONALES','OTROS'].map(cat=>(<button key={cat} onClick={()=>handleCategoryChange(cat)} style={{padding:'7px 15px',borderRadius:25,border:'none',background:selectedCategory===cat?'#4f46e5':(isDark?'#1e293b':'#e2e8f0'),color:selectedCategory===cat?'white':'inherit',fontSize:10,fontWeight:900,whiteSpace:'nowrap',cursor:'pointer',flexShrink:0}}>{cat}</button>))}
            </div>
            <div style={{padding:'4px 12px',fontSize:9,color:'#6366f1',fontWeight:800,flexShrink:0}}>{sortedEvents.length} evento{sortedEvents.length!==1?'s':''}{selectedCity!=='TODAS'?' en '+selectedCity:''}</div>
            <div ref={listRef} className="no-scrollbar" style={{flex:1,overflowY:'auto',padding:15,paddingBottom:120}}>
              {sortedEvents.length===0&&(<div style={{textAlign:'center',marginTop:60,opacity:0.5}}><Search size={40} style={{margin:'0 auto 15px'}}/><p style={{fontWeight:900,fontSize:14}}>NO SE ENCONTRARON EVENTOS</p><p style={{fontSize:10,marginTop:8}}>Prueba con otra búsqueda, ciudad o categoría</p></div>)}
              {sortedEvents.map(ev=>(<EventCard key={ev.id} ev={ev} isDark={isDark} favorites={favorites} animHeart={animHeart} toggleFavorite={toggleFavorite} setSelectedEvent={selectEvent}/>))}
            </div>
          </div>
        )}

        {selectedEvent&&!selectedPendingEvent&&!editingEvent&&(
          <div className="no-scrollbar" style={{height:'100%',overflow:'hidden',display:'flex',flexDirection:'column'}}>
            <div style={{padding:'6px 10px 0',flexShrink:0}}><button onClick={deselectEvent} style={{background:'none',border:'none',color:'#6366f1',fontWeight:900,display:'flex',gap:4,cursor:'pointer',fontSize:11}}><ArrowLeft size={14}/> VOLVER</button></div>
            <div className={isDark?'card-dark':'card-light'} style={{borderRadius:'15px 15px 0 0',overflow:'hidden',padding:0,flex:1,display:'flex',flexDirection:'column',margin:'0 8px',overflowY:'auto'}}>
              <img src={selectedEvent.image_url||'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} alt="" style={{width:'100%',height:150,objectFit:'cover',flexShrink:0}}/>
              <div style={{padding:12,flex:1}}>
                <p style={{fontSize:9,color:'#6366f1',fontWeight:800,letterSpacing:1,marginBottom:4}}>{categoryEmojis[selectedEvent.category]||'📌'}</p>
                <h2 style={{fontSize:17,fontWeight:900,marginBottom:8}}>{selectedEvent.title}</h2>
                <div style={{display:'flex',gap:15,marginBottom:8}}>
                  <div style={{display:'flex',gap:4,fontSize:11,alignItems:'center'}}><Calendar color="#6366f1" size={13}/> <b>{formatDate(selectedEvent.date)}</b></div>
                  <div style={{display:'flex',gap:4,fontSize:11,alignItems:'center'}}><Clock color="#6366f1" size={13}/> <b>{String(selectedEvent.time||'').slice(0,5)}H</b></div>
                </div>
                {getDaysLabel(selectedEvent.date)&&(<div style={{display:'inline-block',background:getDaysLabel(selectedEvent.date).bg,color:getDaysLabel(selectedEvent.date).color,padding:'3px 10px',borderRadius:8,fontSize:9,fontWeight:900,marginBottom:8}}>{getDaysLabel(selectedEvent.date).text}</div>)}
                <div onClick={()=>window.open('https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(selectedEvent.address+' '+(selectedEvent.localidad||'')+' '+selectedEvent.city))} style={{background:'rgba(99,102,241,.1)',padding:10,borderRadius:8,cursor:'pointer',textAlign:'center',border:'1px dashed #6366f1',marginBottom:8}}>
                  <MapPin color="#6366f1" size={14} style={{margin:'0 auto 2px'}}/><b style={{fontSize:10}}>{selectedEvent.address}, {selectedEvent.localidad||''} - {selectedEvent.city}</b><br/><span style={{fontSize:8,color:'#2563eb',fontWeight:900}}>GPS GOOGLE MAPS</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                  <button onClick={()=>shareEvent(selectedEvent)} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:10,background:'rgba(34,197,94,.1)',border:'1px dashed #22c55e',borderRadius:8,color:'#22c55e',fontWeight:900,fontSize:10,cursor:'pointer'}}><Share2 size={12}/> COMPARTIR</button>
                  <button onClick={()=>addToGoogleCalendar(selectedEvent)} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:10,background:'rgba(66,133,244,.1)',border:'1px dashed #4285f4',borderRadius:8,color:'#4285f4',fontWeight:900,fontSize:10,cursor:'pointer'}}><Calendar size={12}/> CALENDAR</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view==='create'&&(
          <div className="no-scrollbar" style={{padding:12,height:'100%',overflowY:'auto',paddingBottom:120}}>
            <div className={isDark?'card-dark':'card-light'} style={{padding:15,borderRadius:20,gap:8,display:'flex',flexDirection:'column'}}>
              <h2 style={{textAlign:'center',fontWeight:900,fontSize:14}}>AÑADIR EVENTO</h2>
              <input name="title" placeholder="TÍTULO" style={INPUT_STYLE} value={form.title} onChange={handleInputChange}/>
              <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr',gap:6}}>
                <input name="city" placeholder="CIUDAD" style={INPUT_STYLE} value={form.city} onChange={handleInputChange}/>
                <select name="category" style={INPUT_STYLE} value={form.category} onChange={handleInputChange}><option value="MUSICA">MUSICA</option><option value="GASTRONOMIA">GASTRONOMIA</option><option value="TAURINO">TAURINO</option><option value="FIESTAS PATRONALES">FIESTAS PATRONALES</option><option value="OTROS">OTROS</option></select>
              </div>
              <input name="localidad" placeholder="LOCALIDAD" style={INPUT_STYLE} value={form.localidad} onChange={handleInputChange}/>
              <input name="address" placeholder="DIRECCIÓN" style={INPUT_STYLE} value={form.address} onChange={handleInputChange}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                <input name="date" type="date" style={{...INPUT_STYLE,padding:8}} value={form.date} onChange={handleInputChange}/>
                <input name="time" type="time" style={{...INPUT_STYLE,padding:8}} value={form.time} onChange={handleInputChange}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                <button onClick={generateAIImage} disabled={isGenerating} style={{padding:10,background:'#4f46e5',color:'white',border:'none',borderRadius:10,fontSize:9,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',gap:4,cursor:'pointer'}}>{isGenerating?<Loader2 className="animate-spin" size={12}/>:<Sparkles size={12}/>} IA FOTO</button>
                <label style={{padding:10,background:'#1e293b',color:'white',textAlign:'center',borderRadius:10,fontSize:9,fontWeight:900,cursor:'pointer'}}>GALERÍA<input type="file" accept="image/*" style={{display:'none'}} onChange={handleGalleryUpload}/></label>
              </div>
              {form.image_url&&(<img src={form.image_url} alt="" style={{width:'100%',height:100,objectFit:'cover',borderRadius:10}}/>)}
              <button onClick={handleSubmitEvent} disabled={isSubmitting} style={{width:'100%',background:'#4f46e5',color:'white',padding:13,borderRadius:10,border:'none',fontWeight:900,fontSize:11,cursor:isSubmitting?'not-allowed':'pointer',opacity:isSubmitting?0.7:1}}>{isSubmitting?'Enviando...':'ENVIAR REVISIÓN'}</button>
            </div>
          </div>
        )}

        {view==='admin'&&editingEvent&&(
          <div className="no-scrollbar" style={{padding:12,height:'100%',overflowY:'auto',paddingBottom:120}}>
            <button onClick={cancelEditEvent} style={{background:'none',border:'none',color:'#6366f1',fontWeight:900,display:'flex',gap:6,marginBottom:12,cursor:'pointer',fontSize:12}}><ArrowLeft size={16}/> CANCELAR EDICIÓN</button>
            <div className={isDark?'card-dark':'card-light'} style={{padding:15,borderRadius:20,gap:8,display:'flex',flexDirection:'column'}}>
              <h2 style={{textAlign:'center',fontWeight:900,fontSize:15}}>EDITAR EVENTO</h2>
              <input name="title" placeholder="TÍTULO" style={INPUT_STYLE} value={editForm.title} onChange={handleEditInputChange}/>
              <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr',gap:6}}>
                <input name="city" placeholder="CIUDAD" style={INPUT_STYLE} value={editForm.city} onChange={handleEditInputChange}/>
                <select name="category" style={INPUT_STYLE} value={editForm.category} onChange={handleEditInputChange}><option value="MUSICA">MUSICA</option><option value="GASTRONOMIA">GASTRONOMIA</option><option value="TAURINO">TAURINO</option><option value="FIESTAS PATRONALES">FIESTAS PATRONALES</option><option value="OTROS">OTROS</option></select>
              </div>
              <input name="localidad" placeholder="LOCALIDAD" style={INPUT_STYLE} value={editForm.localidad} onChange={handleEditInputChange}/>
              <input name="address" placeholder="DIRECCIÓN" style={INPUT_STYLE} value={editForm.address} onChange={handleEditInputChange}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                <input name="date" type="date" style={{...INPUT_STYLE,padding:8}} value={editForm.date} onChange={handleEditInputChange}/>
                <input name="time" type="time" style={{...INPUT_STYLE,padding:8}} value={editForm.time} onChange={handleEditInputChange}/>
              </div>
              <input name="image_url" placeholder="URL DE IMAGEN" style={INPUT_STYLE} value={editForm.image_url} onChange={handleEditInputChange}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                <button onClick={generateAIImageEdit} disabled={isGenerating} style={{padding:10,background:'#4f46e5',color:'white',border:'none',borderRadius:10,fontSize:9,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',gap:4,cursor:'pointer'}}>{isGenerating?<Loader2 className="animate-spin" size={12}/>:<Sparkles size={12}/>} NUEVA IA</button>
                <label style={{padding:10,background:'#1e293b',color:'white',textAlign:'center',borderRadius:10,fontSize:9,fontWeight:900,cursor:'pointer'}}>NUEVA GALERÍA<input type="file" accept="image/*" style={{display:'none'}} onChange={handleEditGalleryUpload}/></label>
              </div>
              {editForm.image_url&&(<img src={editForm.image_url} alt="" style={{width:'100%',height:140,objectFit:'cover',borderRadius:12}}/>)}
              <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'8px 4px',borderRadius:10,background:editFeatured?'rgba(34,197,94,.12)':'rgba(128,128,128,.08)'}}>
                <input type="checkbox" checked={editFeatured} onChange={e=>setEditFeatured(e.target.checked)} style={{width:18,height:18,accentColor:'#22c55e',cursor:'pointer'}}/>
                <span style={{fontWeight:900,fontSize:11,color:editFeatured?'#22c55e':'inherit'}}>⭐ EVENTO DESTACADO</span>
              </label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:4}}>
                <button onClick={cancelEditEvent} disabled={isSubmitting} style={{width:'100%',background:'#64748b',color:'white',padding:13,borderRadius:10,border:'none',fontWeight:900,fontSize:11,cursor:isSubmitting?'not-allowed':'pointer',opacity:isSubmitting?0.7:1}}>CANCELAR</button>
                <button onClick={handleSaveEditEvent} disabled={isSubmitting} style={{width:'100%',background:'#22c55e',color:'white',padding:13,borderRadius:10,border:'none',fontWeight:900,fontSize:11,cursor:isSubmitting?'not-allowed':'pointer',opacity:isSubmitting?0.7:1}}>{isSubmitting?'Guardando...':'GUARDAR'}</button>
              </div>
            </div>
          </div>
        )}

        {view==='admin'&&!selectedPendingEvent&&!editingEvent&&(
          <div className="no-scrollbar" style={{padding:12,height:'100%',overflowY:'auto',paddingBottom:120}}>
            <button onClick={()=>setView('home')} style={{background:'none',border:'none',color:'#6366f1',fontWeight:900,display:'flex',gap:6,marginBottom:12,cursor:'pointer',fontSize:12}}><ArrowLeft size={16}/> VOLVER</button>
            <div className={isDark?'card-dark':'card-light'} style={{borderRadius:18,padding:12,marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,marginBottom:10}}>
                <div><p style={{fontSize:15,fontWeight:900}}>PANEL ADMIN</p><p style={{fontSize:9,opacity:0.65}}>{userEmail||'No conectado'}</p></div>
                <button onClick={()=>{fetchEvents();showToast('Eventos actualizados','success');}} style={{width:36,height:36,borderRadius:12,border:'none',background:'rgba(99,102,241,.15)',color:'#6366f1',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><RefreshCw size={16}/></button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                <div style={{background:'rgba(239,68,68,.12)',color:'#ef4444',borderRadius:14,padding:10,textAlign:'center',fontWeight:900,fontSize:11}}>{rawPendingEvents.length}<br/><span style={{fontSize:8}}>PENDIENTES</span></div>
                <div style={{background:'rgba(34,197,94,.12)',color:'#22c55e',borderRadius:14,padding:10,textAlign:'center',fontWeight:900,fontSize:11}}>{rawApprovedEvents.length}<br/><span style={{fontSize:8}}>APROBADOS</span></div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,background:isDark?'#1e293b':'#e2e8f0',borderRadius:12,padding:'6px 10px',marginBottom:8}}>
                <Search size={15} color="#6366f1"/>
                <input value={adminSearch} onChange={e=>setAdminSearch(e.target.value)} placeholder="Buscar..." style={{width:'100%',border:'none',outline:'none',background:'transparent',color:'inherit',fontWeight:800,fontSize:10}}/>
                {adminSearch&&(<button onClick={()=>setAdminSearch('')} style={{background:'none',border:'none',color:'#6366f1',cursor:'pointer',fontWeight:900}}>X</button>)}
              </div>
              <select value={adminCityFilter} onChange={e=>setAdminCityFilter(e.target.value)} style={{width:'100%',padding:10,borderRadius:12,border:'none',outline:'none',background:isDark?'#1e293b':'#e2e8f0',color:'inherit',fontWeight:900,fontSize:10}}>
                <option value="TODAS">TODAS LAS CIUDADES</option>
                {adminCitiesList.map(c=>(<option key={c} value={c}>{c}</option>))}
              </select>
              {adminFiltersActive&&(<button onClick={()=>{setAdminSearch('');setAdminCityFilter('TODAS');}} style={{width:'100%',marginTop:8,padding:8,borderRadius:10,border:'none',background:'rgba(99,102,241,.12)',color:'#6366f1',fontWeight:900,fontSize:9,cursor:'pointer'}}>LIMPIAR FILTROS</button>)}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
              <button onClick={()=>{setAdminTab('pending');fetchEvents();}} style={{padding:10,borderRadius:12,border:'none',background:adminTab==='pending'?'#4f46e5':(isDark?'#1e293b':'#e2e8f0'),color:adminTab==='pending'?'white':'inherit',fontWeight:900,fontSize:11,cursor:'pointer'}}>PENDIENTES ({pendingEvents.length}{adminFiltersActive?'/'+rawPendingEvents.length:''})</button>
              <button onClick={()=>{setAdminTab('approved');fetchEvents();}} style={{padding:10,borderRadius:12,border:'none',background:adminTab==='approved'?'#22c55e':(isDark?'#1e293b':'#e2e8f0'),color:adminTab==='approved'?'white':'inherit',fontWeight:900,fontSize:11,cursor:'pointer'}}>APROBADOS ({approvedEvents.length}{adminFiltersActive?'/'+rawApprovedEvents.length:''})</button>
            </div>
            {adminTab==='approved'&&approvedEvents.length>0&&(<button onClick={()=>exportToCSV(approvedEvents)} style={{width:'100%',padding:10,borderRadius:10,border:'none',background:'rgba(99,102,241,.1)',color:'#6366f1',fontWeight:900,fontSize:10,cursor:'pointer',marginBottom:15,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Download size={14}/> EXPORTAR CSV</button>)}
            {adminTab==='pending'&&pendingEvents.length===0&&(<p style={{textAlign:'center',opacity:0.7,marginTop:50,fontWeight:700}}>NO HAY EVENTOS PENDIENTES</p>)}
            {adminTab==='pending'&&pendingEvents.map(ev=>(<AdminMiniCard key={ev.id} ev={ev} isDark={isDark} mode="pending" onClick={()=>setSelectedPendingEvent(ev)} onApprove={()=>handleApproveEvent(ev.id)} onReject={()=>handleRejectEvent(ev.id)} onDelete={()=>handleDeleteEvent(ev.id)}/>))}
            {adminTab==='approved'&&approvedEvents.length===0&&(<p style={{textAlign:'center',opacity:0.7,marginTop:50,fontWeight:700}}>NO HAY EVENTOS APROBADOS</p>)}
            {adminTab==='approved'&&approvedEvents.map(ev=>(<AdminMiniCard key={ev.id} ev={ev} isDark={isDark} mode="approved" onClick={()=>selectEvent(ev)} onView={()=>selectEvent(ev)} onEdit={()=>startEditEvent(ev)} onDelete={()=>handleDeleteEvent(ev.id)} onToggleFeatured={()=>handleToggleFeatured(ev.id,ev.featured)}/>))}
          </div>
        )}

        {view==='admin'&&selectedPendingEvent&&!editingEvent&&(
          <div className="no-scrollbar" style={{padding:12,height:'100%',overflowY:'auto',paddingBottom:120}}>
            <button onClick={()=>setSelectedPendingEvent(null)} style={{background:'none',border:'none',color:'#6366f1',fontWeight:900,display:'flex',gap:6,marginBottom:12,cursor:'pointer',fontSize:12}}><ArrowLeft size={16}/> VOLVER A LISTA</button>
            <div className={isDark?'card-dark':'card-light'} style={{borderRadius:20,overflow:'hidden',padding:0}}>
              <img src={selectedPendingEvent.image_url||'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} alt="" style={{width:'100%',height:220,objectFit:'cover'}}/>
              <div style={{padding:18}}>
                <h2 style={{fontSize:20,fontWeight:900,marginBottom:15}}>{selectedPendingEvent.title}</h2>
                <div style={{display:'grid',gap:12,marginBottom:20}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13}}><Calendar color="#6366f1" size={16}/><b>{formatDate(selectedPendingEvent.date)}</b></div>
                  <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13}}><Clock color="#6366f1" size={16}/><b>{String(selectedPendingEvent.time||'').slice(0,5)}H</b></div>
                  <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13}}><MapPin color="#6366f1" size={16}/><b>{selectedPendingEvent.address}, {selectedPendingEvent.localidad||''} - {selectedPendingEvent.city}</b></div>
                  <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13}}><span style={{fontWeight:900,color:'#6366f1'}}>CAT:</span><b>{selectedPendingEvent.category}</b></div>
                  {selectedPendingEvent.created_at&&(<div style={{fontSize:11,opacity:0.65}}>Enviado: {formatDateTime(selectedPendingEvent.created_at)}</div>)}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                  <button onClick={()=>handleApproveEvent(selectedPendingEvent.id)} style={{padding:12,background:'#22c55e',color:'white',border:'none',borderRadius:10,fontWeight:900,fontSize:10,cursor:'pointer'}}>APROBAR</button>
                  <button onClick={()=>handleRejectEvent(selectedPendingEvent.id)} style={{padding:12,background:'#f59e0b',color:'white',border:'none',borderRadius:10,fontWeight:900,fontSize:10,cursor:'pointer'}}>RECHAZAR</button>
                  <button onClick={()=>handleDeleteEvent(selectedPendingEvent.id)} style={{padding:12,background:'#ef4444',color:'white',border:'none',borderRadius:10,fontWeight:900,fontSize:10,cursor:'pointer'}}>BORRAR</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view==='favorites'&&(
          <div className="no-scrollbar" style={{padding:12,height:'100%',overflowY:'auto',paddingBottom:120}}>
            <h2 style={{textAlign:'center',fontWeight:900,marginBottom:12,fontSize:16}}>MIS GUARDADOS ({favoriteEvents.length})</h2>
            {favoriteEvents.length===0?(<p style={{textAlign:'center',opacity:0.7,marginTop:50,fontWeight:700}}>NO HAY EVENTOS GUARDADOS</p>):favoriteEvents.map(ev=>{const dl=getDaysLabel(ev.date);return(
              <div key={ev.id} className={isDark?'card-dark':'card-light'} style={{display:'flex',gap:10,padding:10,borderRadius:18,marginBottom:8,alignItems:'center'}}>
                <img src={ev.image_url||'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} alt="" style={{width:45,height:45,borderRadius:10,objectFit:'cover'}}/>
                <div style={{flex:1}}><p style={{fontWeight:900,fontSize:13}}>{ev.title}</p><p style={{fontSize:9,color:'#6366f1'}}>{ev.city}</p>{dl&&(<span style={{fontSize:8,color:dl.color,fontWeight:900,background:dl.bg,padding:'2px 6px',borderRadius:6}}>{dl.text}</span>)}</div>
                <button onClick={()=>toggleFavorite(ev.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer'}}><Trash2 size={18}/></button>
              </div>
            );})}
          </div>
        )}

        {view==='profile'&&(
          <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
            <div className={isDark?'card-dark':'card-light'} style={{padding:22,borderRadius:35,width:'100%',maxWidth:300,textAlign:'center'}}>
              <h2 style={{fontWeight:900,marginBottom:12,fontSize:16}}>SOPORTE</h2>
              {userEmail&&(<p style={{fontSize:9,opacity:0.6,marginBottom:8}}>Conectado: {userEmail}</p>)}
              <div style={{display:'grid',gap:8,marginBottom:12}}>
                <a href="https://ko-fi.com/eventora" target="_blank" rel="noreferrer" style={{background:'#29abe0',color:'white',padding:14,borderRadius:12,textDecoration:'none',fontWeight:900,fontSize:11}}>APOYAR EN KO-FI</a>
                <a href="https://www.paypal.com/paypalme/jacobogarbas" target="_blank" rel="noreferrer" style={{background:'#003087',color:'white',padding:14,borderRadius:12,textDecoration:'none',fontWeight:900,fontSize:11}}>APOYAR EN PAYPAL</a>
              </div>
              {!userEmail?(<button onClick={handleLogin} style={{background:'#4f46e5',color:'white',fontSize:10,padding:'8px 15px',borderRadius:8,border:'none',fontWeight:900,cursor:'pointer'}}>LOGIN</button>):(<button onClick={handleLogout} style={{background:'#ef4444',color:'white',fontSize:10,padding:'8px 15px',borderRadius:8,border:'none',fontWeight:900,cursor:'pointer'}}>CERRAR SESIÓN</button>)}
            </div>
          </div>
        )}
      </main>

      <nav style={{position:'fixed',bottom:10,left:'50%',transform:'translateX(-50%)',width:'88%',maxWidth:360,height:55,borderRadius:28,display:'flex',alignItems:'center',justifyContent:'space-around',boxShadow:'0 8px 25px rgba(0,0,0,.4)',zIndex:3000,background:isDark?'rgba(15,23,42,.95)':'rgba(255,255,255,.95)'}}>
        <button onClick={goHome} style={{background:'none',border:'none',color:view==='home'?'#4f46e5':'#64748b',cursor:'pointer'}}><LayoutList size={22}/></button>
        <button onClick={()=>{setView('favorites');deselectEvent();setSelectedPendingEvent(null);setEditingEvent(null);}} style={{background:'none',border:'none',color:view==='favorites'?'#ef4444':'#64748b',cursor:'pointer',position:'relative'}}><Heart size={22} fill={view==='favorites'?'#ef4444':'none'}/>{favoriteEvents.length>0&&(<span style={{position:'absolute',top:-4,right:-8,background:'#ef4444',color:'white',fontSize:8,fontWeight:900,borderRadius:10,padding:'1px 5px',minWidth:14,textAlign:'center'}}>{favoriteEvents.length}</span>)}</button>
        <button onClick={()=>{setView('create');deselectEvent();setSelectedPendingEvent(null);setEditingEvent(null);}} style={{background:'none',border:'none',color:view==='create'?'#4f46e5':'#64748b',cursor:'pointer'}}><PlusCircle size={22}/></button>
        <button onClick={()=>{setView('map');deselectEvent();setSelectedPendingEvent(null);setEditingEvent(null);}} style={{background:'none',border:'none',color:view==='map'?'#4f46e5':'#64748b',cursor:'pointer'}}><MapIcon size={22}/></button>
      </nav>
    </div>
  );
}
