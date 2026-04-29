  }

  function shareEvent(ev) {
    const realLink = APP_URL + '/evento/' + ev.id;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(realLink).then(() => {
        showToast('✅ Enlace copiado: ' + realLink, 'success');
      }).catch(() => {
        fallbackCopyText(realLink, showToast);
      });
    } else {
      fallbackCopyText(realLink, showToast);
    }
  }

  function goHome() {
    setView('home');
    setSelectedEvent(null);
    setSelectedPendingEvent(null);
    setEditingEvent(null);
    setSearchQuery('');
    window.history.pushState({}, '', '/');
  }

  function handleCategoryChange(cat) {
    setSelectedCategory(cat);
    if (listRef.current) listRef.current.scrollTop = 0;
  }

  function eventMatchesAdminFilters(e) {
    const cityOk = adminCityFilter === 'TODAS' || e.city === adminCityFilter;
    if (!cityOk) return false;
    const q = normalizeText(adminSearch).trim();
    if (!q) return true;
    const haystack = normalizeText([e.title, e.city, e.localidad, e.address, e.category, e.status, e.date, e.time].join(' '));
    const terms = q.split(/\s+/).filter(Boolean);
    return terms.every((term) => haystack.indexOf(term) !== -1);
  }

  const today = new Date().toISOString().split('T')[0];
  const publicEvents = events.filter((e) => e.status === 'approved' && e.date >= today);

  const searchedEvents = searchQuery
    ? publicEvents.filter((e) => {
        const q = normalizeText(searchQuery).trim();
        const terms = q.split(/\s+/).filter(Boolean);
        const haystack = normalizeText([e.title, e.city, e.localidad, e.address, e.category, e.date].join(' '));
        return terms.every((term) => haystack.indexOf(term) !== -1);
      })
    : publicEvents;

  const categoryEvents = searchedEvents.filter((e) => selectedCategory === 'TODOS' || e.category === selectedCategory);

  const filteredEvents = categoryEvents.filter((e) => {
    if (dateFilter === 'today') return e.date === today;
    if (dateFilter === 'week') {
      const eventDate = new Date(e.date);
      const now = new Date();
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return eventDate >= now && eventDate <= weekEnd;
    }
    return true;
  });

  const favoriteEvents = publicEvents.filter((e) => favorites.indexOf(e.id) !== -1);
  const rawPendingEvents = hasAdmin ? events.filter((e) => e.status === 'pending') : [];
  const rawApprovedEvents = hasAdmin ? events.filter((e) => e.status === 'approved') : [];
  const pendingEvents = rawPendingEvents.filter(eventMatchesAdminFilters);
  const approvedEvents = rawApprovedEvents.filter(eventMatchesAdminFilters);

  const adminCitiesList = [];
  events.forEach((e) => { if (e.city && adminCitiesList.indexOf(e.city) === -1) adminCitiesList.push(e.city); });
  adminCitiesList.sort();

  const sortedFiltered = filteredEvents.slice().sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return 0;
  });

  const featuredEvent = sortedFiltered.length ? sortedFiltered[0] : null;
  const restEvents = sortedFiltered.length ? sortedFiltered.slice(1) : [];
  const adminFiltersActive = adminSearch.trim() || adminCityFilter !== 'TODAS';

  const INPUT_STYLE = {
    width: '100%', padding: 12, borderRadius: 10, border: 'none',
    background: 'rgba(128,128,128,0.1)', color: 'inherit', fontWeight: 700
  };

  if (showSplash) return <Splash onDone={() => setShowSplash(false)} />;

  return (
    <div className={isDark ? 'dark-theme' : 'light-theme'} style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Toast toast={toast} />

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; transition: background-color .25s, color .25s; }
        html, body, #root { width: 100%; height: 100%; overflow: hidden; }
        .dark-theme { background:#020617; color:white; }
        .light-theme { background:#f8fafc; color:#0f172a; }
        .card-dark { background:#0f172a; border:1px solid #1e293b; color:white; }
        .card-light { background:white; border:1px solid #e2e8f0; color:#0f172a; box-shadow:0 4px 12px rgba(0,0,0,.05); }
        .no-scrollbar::-webkit-scrollbar { display:none; }
        .no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
        .leaflet-container img { max-width:none!important; max-height:none!important; }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .animate-spin { animation:spin 1s linear infinite; }
        @keyframes admin-pulse { 0%{transform:scale(1);color:#818cf8;} 50%{transform:scale(1.2);color:#ef4444;} 100%{transform:scale(1);color:#818cf8;} }
        .pulse-admin { animation:admin-pulse 1.4s infinite; }
        @keyframes heartPop { 0%{transform:scale(1);} 30%{transform:scale(1.5);} 60%{transform:scale(.9);} 100%{transform:scale(1);} }
        .heart-pop { animation:heartPop .6s ease-out; }
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
      `}</style>

      <nav style={{ height: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px', zIndex: 2000, borderBottom: '1px solid rgba(128,128,128,.2)', background: isDark ? '#0f172a' : '#fff', flexShrink: 0 }}>
        <div style={{ cursor: 'pointer' }} onClick={goHome}>
          <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EVENTORA%20%282%29-XHiy1tMtbcc21CX0wfbs51THTEjOvx.png" alt="Eventora" style={{ height: 18, width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasAdmin && (
            <button onClick={() => { setView('admin'); setSelectedEvent(null); setSelectedPendingEvent(null); setEditingEvent(null); setAdminTab('pending'); fetchEvents(); }} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
              <ShieldCheck size={21} className={rawPendingEvents.length > 0 ? 'pulse-admin' : ''} style={{ color: '#6366f1' }} />
              {rawPendingEvents.length > 0 && (
                <span style={{ position: 'absolute', top: -8, right: -10, background: '#ef4444', color: 'white', fontSize: 8, fontWeight: 900, borderRadius: 999, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid ' + (isDark ? '#0f172a' : '#fff') }}>
                  {rawPendingEvents.length}
                </span>
              )}
            </button>
          )}
          {!userEmail && (
            <button onClick={handleLogin} style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: 8, padding: '4px 8px', fontSize: 8, fontWeight: 900, cursor: 'pointer' }}>LOGIN</button>
          )}
          <button onClick={() => setIsDark(!isDark)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
            {isDark ? <Sun size={18} color="#facc15" /> : <Moon size={18} color="#4f46e5" />}
          </button>
          <Sparkles size={18} color="#6366f1" style={{ cursor: 'pointer' }} onClick={() => setView('profile')} />
        </div>
      </nav>

      <main style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>

        {view === 'map' && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            <div style={{ position: 'absolute', top: 15, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '85%', maxWidth: 320 }}>
              <div style={{ background: '#fff', borderRadius: 15, padding: '4px 12px', display: 'flex', alignItems: 'center', boxShadow: '0 10px 25px rgba(0,0,0,.2)' }}>
                <Search size={16} color="#6366f1" />
                <input
                  type="text"
                  value={mapSearch}
                  onChange={handleMapSearchChange}
                  placeholder="Buscar ciudad, pueblo o lugar..."
                  style={{ width: '100%', padding: 10, border: 'none', outline: 'none', fontWeight: 700, fontSize: 12, color: '#0f172a', background: 'transparent' }}
                />
                {mapSearch && (
                  <button onClick={() => { setMapSearch(''); setMapCenter(null); }} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 900 }}>X</button>
                )}
              </div>
            </div>

            <MapContainer center={[40.41, -3.70]} zoom={6} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
              <MapResizer center={mapCenter} />
              <TileLayer url={isDark ? darkTileUrl : lightTileUrl} attribution="Google Maps" maxZoom={20} />
              {publicEvents.map((ev) => {
                if (!ev.lat || !ev.lng) return null;
                return (
                  <Marker key={ev.id} position={[ev.lat, ev.lng]} icon={redPinIcon}>
                    <Popup>
                      <b>{ev.title}</b><br />
                      {ev.address}, {ev.localidad || ''} - {ev.city}<br />
                      {formatDate(ev.date)}
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        )}

        {view === 'home' && !selectedEvent && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 12px', flexShrink: 0, background: isDark ? '#020617' : '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: isDark ? '#1e293b' : '#e2e8f0', borderRadius: 12, padding: '6px 12px' }}>
                <Search size={16} color="#6366f1" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar evento, ciudad, localidad..." style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: 11, color: 'inherit' }} />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer' }}>X</button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, padding: '6px 12px', flexShrink: 0 }}>
              {[{ k: 'all', l: 'TODOS' }, { k: 'today', l: 'HOY' }, { k: 'week', l: 'ESTA SEMANA' }].map((f) => (
                <button key={f.k} onClick={() => setDateFilter(f.k)} style={{ padding: '5px 10px', borderRadius: 10, border: 'none', background: dateFilter === f.k ? '#22c55e' : 'transparent', color: dateFilter === f.k ? 'white' : '#6366f1', fontSize: 8, fontWeight: 900, cursor: 'pointer' }}>{f.l}</button>
              ))}
            </div>

            <div className="no-scrollbar" style={{ display: 'flex', gap: 8, padding: '8px 12px', overflowX: 'auto', flexShrink: 0 }}>
              {['TODOS', 'MUSICA', 'GASTRONOMIA', 'TAURINO', 'FIESTAS PATRONALES', 'OTROS'].map((cat) => (
                <button key={cat} onClick={() => handleCategoryChange(cat)} style={{ padding: '7px 15px', borderRadius: 25, border: 'none', background: selectedCategory === cat ? '#4f46e5' : (isDark ? '#1e293b' : '#e2e8f0'), color: selectedCategory === cat ? 'white' : 'inherit', fontSize: 10, fontWeight: 900, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0 }}>{cat}</button>
              ))}
            </div>

            <div style={{ padding: '4px 12px', fontSize: 9, color: '#6366f1', fontWeight: 800, flexShrink: 0 }}>
              {filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''}
            </div>

            <div ref={listRef} className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 15, paddingBottom: 120 }}>
              {filteredEvents.length === 0 && (
                <div style={{ textAlign: 'center', marginTop: 60, opacity: 0.5 }}>
                  <Search size={40} style={{ margin: '0 auto 15px' }} />
                  <p style={{ fontWeight: 900, fontSize: 14 }}>NO SE ENCONTRARON EVENTOS</p>
                  <p style={{ fontSize: 10, marginTop: 8 }}>Prueba con otra búsqueda o categoría</p>
                </div>
              )}

              {featuredEvent && <EventCard ev={featuredEvent} featured={true} isDark={isDark} favorites={favorites} animHeart={animHeart} toggleFavorite={toggleFavorite} setSelectedEvent={setSelectedEvent} />}
              {restEvents.map((ev) => <EventCard key={ev.id} ev={ev} featured={false} isDark={isDark} favorites={favorites} animHeart={animHeart} toggleFavorite={toggleFavorite} setSelectedEvent={setSelectedEvent} />)}
            </div>
          </div>
        )}

        {selectedEvent && !selectedPendingEvent && !editingEvent && (
          <div className="no-scrollbar" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '6px 10px 0', flexShrink: 0 }}>
              <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 4, cursor: 'pointer', fontSize: 11 }}>
                <ArrowLeft size={14} /> VOLVER
              </button>
            </div>

            <div className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: '15px 15px 0 0', overflow: 'hidden', padding: 0, flex: 1, display: 'flex', flexDirection: 'column', margin: '0 8px', overflowY: 'auto' }}>
              <img src={selectedEvent.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} alt="" style={{ width: '100%', height: 150, objectFit: 'cover', flexShrink: 0 }} />

              <div style={{ padding: 12, flex: 1 }}>
                <p style={{ fontSize: 9, color: '#6366f1', fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>
                  {categoryEmojis[selectedEvent.category] || '📌'}
                </p>
                <h2 style={{ fontSize: 17, fontWeight: 900, marginBottom: 8 }}>{selectedEvent.title}</h2>

                <div style={{ display: 'flex', gap: 15, marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 4, fontSize: 11, alignItems: 'center' }}>
                    <Calendar color="#6366f1" size={13} /> <b>{formatDate(selectedEvent.date)}</b>
                  </div>
                  <div style={{ display: 'flex', gap: 4, fontSize: 11, alignItems: 'center' }}>
                    <Clock color="#6366f1" size={13} /> <b>{selectedEvent.time}H</b>
                  </div>
                </div>

                {getDaysLabel(selectedEvent.date) && (
                  <div style={{ display: 'inline-block', background: getDaysLabel(selectedEvent.date).bg, color: getDaysLabel(selectedEvent.date).color, padding: '3px 10px', borderRadius: 8, fontSize: 9, fontWeight: 900, marginBottom: 8 }}>
                    {getDaysLabel(selectedEvent.date).text}
                  </div>
                )}

                <div onClick={() => window.open('https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(selectedEvent.address + ' ' + (selectedEvent.localidad || '') + ' ' + selectedEvent.city))} style={{ background: 'rgba(99,102,241,.1)', padding: 10, borderRadius: 8, cursor: 'pointer', textAlign: 'center', border: '1px dashed #6366f1', marginBottom: 8 }}>
                  <MapPin color="#6366f1" size={14} style={{ margin: '0 auto 2px' }} />
                  <b style={{ fontSize: 10 }}>{selectedEvent.address}, {selectedEvent.localidad || ''} - {selectedEvent.city}</b><br />
                  <span style={{ fontSize: 8, color: '#2563eb', fontWeight: 900 }}>GPS GOOGLE MAPS</span>
                </div>

                <button onClick={() => shareEvent(selectedEvent)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: 12, background: 'rgba(34,197,94,.1)', border: '1px dashed #22c55e', borderRadius: 8, color: '#22c55e', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>
                  <Share2 size={14} /> COMPARTIR EVENTO
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'create' && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
            <div className={isDark ? 'card-dark' : 'card-light'} style={{ padding: 15, borderRadius: 20, gap: 8, display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ textAlign: 'center', fontWeight: 900, fontSize: 14 }}>AÑADIR EVENTO</h2>
              <input name="title" placeholder="TÍTULO" style={INPUT_STYLE} value={form.title} onChange={handleInputChange} />
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 6 }}>
                <input name="city" placeholder="CIUDAD" style={INPUT_STYLE} value={form.city} onChange={handleInputChange} />
                <select name="category" style={INPUT_STYLE} value={form.category} onChange={handleInputChange}>
                  <option value="MUSICA">MUSICA</option>
                  <option value="GASTRONOMIA">GASTRONOMIA</option>
                  <option value="TAURINO">TAURINO</option>
                  <option value="FIESTAS PATRONALES">FIESTAS PATRONALES</option>
                  <option value="OTROS">OTROS</option>
                </select>
              </div>
              <input name="localidad" placeholder="LOCALIDAD" style={INPUT_STYLE} value={form.localidad} onChange={handleInputChange} />
              <input name="address" placeholder="DIRECCIÓN" style={INPUT_STYLE} value={form.address} onChange={handleInputChange} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <input name="date" type="date" style={{ ...INPUT_STYLE, padding: 8 }} value={form.date} onChange={handleInputChange} />
                <input name="time" type="time" style={{ ...INPUT_STYLE, padding: 8 }} value={form.time} onChange={handleInputChange} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button onClick={generateAIImage} disabled={isGenerating} style={{ padding: 10, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}>
                  {isGenerating ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />} IA FOTO
                </button>
                <label style={{ padding: 10, background: '#1e293b', color: 'white', textAlign: 'center', borderRadius: 10, fontSize: 9, fontWeight: 900, cursor: 'pointer' }}>
                  GALERÍA
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleGalleryUpload} />
                </label>
              </div>
              {form.image_url && <img src={form.image_url} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 10 }} />}
              <button onClick={handleSubmitEvent} disabled={isSubmitting} style={{ width: '100%', background: '#4f46e5', color: 'white', padding: 13, borderRadius: 10, border: 'none', fontWeight: 900, fontSize: 11, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                {isSubmitting ? 'Enviando...' : 'ENVIAR REVISIÓN'}
              </button>
            </div>
          </div>
        )}

        {view === 'admin' && editingEvent && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
            <button onClick={cancelEditEvent} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 6, marginBottom: 12, cursor: 'pointer', fontSize: 12 }}>
              <ArrowLeft size={16} /> CANCELAR EDICIÓN
            </button>

            <div className={isDark ? 'card-dark' : 'card-light'} style={{ padding: 15, borderRadius: 20, gap: 8, display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ textAlign: 'center', fontWeight: 900, fontSize: 15 }}>EDITAR EVENTO</h2>
              <input name="title" placeholder="TÍTULO" style={INPUT_STYLE} value={editForm.title} onChange={handleEditInputChange} />
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 6 }}>
                <input name="city" placeholder="CIUDAD" style={INPUT_STYLE} value={editForm.city} onChange={handleEditInputChange} />
                <select name="category" style={INPUT_STYLE} value={editForm.category} onChange={handleEditInputChange}>
                  <option value="MUSICA">MUSICA</option>
                  <option value="GASTRONOMIA">GASTRONOMIA</option>
                  <option value="TAURINO">TAURINO</option>
                  <option value="FIESTAS PATRONALES">FIESTAS PATRONALES</option>
                  <option value="OTROS">OTROS</option>
                </select>
              </div>
              <input name="localidad" placeholder="LOCALIDAD" style={INPUT_STYLE} value={editForm.localidad} onChange={handleEditInputChange} />
              <input name="address" placeholder="DIRECCIÓN" style={INPUT_STYLE} value={editForm.address} onChange={handleEditInputChange} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <input name="date" type="date" style={{ ...INPUT_STYLE, padding: 8 }} value={editForm.date} onChange={handleEditInputChange} />
                <input name="time" type="time" style={{ ...INPUT_STYLE, padding: 8 }} value={editForm.time} onChange={handleEditInputChange} />
              </div>

              <label style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: 12,
                background: editForm.featured ? 'rgba(34,197,94,.15)' : 'rgba(128,128,128,0.1)',
                borderRadius: 10, cursor: 'pointer',
                border: editForm.featured ? '2px solid #22c55e' : '2px solid transparent'
              }}>
                <input
                  type="checkbox"
                  checked={editForm.featured === true}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, featured: e.target.checked }))}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <Star size={16} fill={editForm.featured ? '#22c55e' : 'none'} color={editForm.featured ? '#22c55e' : '#6366f1'} />
                <span style={{ fontSize: 12, fontWeight: 900, color: editForm.featured ? '#22c55e' : 'inherit' }}>
                  MARCAR COMO DESTACADO
                </span>
              </label>

              <input name="image_url" placeholder="URL DE IMAGEN" style={INPUT_STYLE} value={editForm.image_url} onChange={handleEditInputChange} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button onClick={generateAIImageEdit} disabled={isGenerating} style={{ padding: 10, background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}>
                  {isGenerating ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />} NUEVA IA
                </button>
                <label style={{ padding: 10, background: '#1e293b', color: 'white', textAlign: 'center', borderRadius: 10, fontSize: 9, fontWeight: 900, cursor: 'pointer' }}>
                  NUEVA GALERÍA
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleEditGalleryUpload} />
                </label>
              </div>
              {editForm.image_url && <img src={editForm.image_url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 12 }} />}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                <button onClick={cancelEditEvent} disabled={isSubmitting} style={{ width: '100%', background: '#64748b', color: 'white', padding: 13, borderRadius: 10, border: 'none', fontWeight: 900, fontSize: 11, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                  CANCELAR
                </button>
                <button onClick={handleSaveEditEvent} disabled={isSubmitting} style={{ width: '100%', background: '#22c55e', color: 'white', padding: 13, borderRadius: 10, border: 'none', fontWeight: 900, fontSize: 11, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Guardando...' : 'GUARDAR'}
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'admin' && !selectedPendingEvent && !editingEvent && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
            <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 6, marginBottom: 12, cursor: 'pointer', fontSize: 12 }}>
              <ArrowLeft size={16} /> VOLVER
            </button>

            <div className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: 18, padding: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 900 }}>PANEL ADMIN</p>
                  <p style={{ fontSize: 9, opacity: 0.65 }}>{userEmail || 'No conectado'}</p>
                </div>
                <button onClick={() => { fetchEvents(); showToast('Eventos actualizados', 'success'); }} style={{ width: 36, height: 36, borderRadius: 12, border: 'none', background: 'rgba(99,102,241,.15)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <RefreshCw size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div style={{ background: 'rgba(239,68,68,.12)', color: '#ef4444', borderRadius: 14, padding: 10, textAlign: 'center', fontWeight: 900, fontSize: 11 }}>
                  {rawPendingEvents.length}<br /><span style={{ fontSize: 8 }}>PENDIENTES</span>
                </div>
                <div style={{ background: 'rgba(34,197,94,.12)', color: '#22c55e', borderRadius: 14, padding: 10, textAlign: 'center', fontWeight: 900, fontSize: 11 }}>
                  {rawApprovedEvents.length}<br /><span style={{ fontSize: 8 }}>APROBADOS</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: isDark ? '#1e293b' : '#e2e8f0', borderRadius: 12, padding: '6px 10px', marginBottom: 8 }}>
                <Search size={15} color="#6366f1" />
                <input value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)} placeholder="Buscar por título, ciudad, dirección..." style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', color: 'inherit', fontWeight: 800, fontSize: 10 }} />
                {adminSearch && <button onClick={() => setAdminSearch('')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 900 }}>X</button>}
              </div>

              <select value={adminCityFilter} onChange={(e) => setAdminCityFilter(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 12, border: 'none', outline: 'none', background: isDark ? '#1e293b' : '#e2e8f0', color: 'inherit', fontWeight: 900, fontSize: 10 }}>
                <option value="TODAS">TODAS LAS CIUDADES</option>
                {adminCitiesList.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>

              {adminFiltersActive && (
                <button onClick={() => { setAdminSearch(''); setAdminCityFilter('TODAS'); }} style={{ width: '100%', marginTop: 8, padding: 8, borderRadius: 10, border: 'none', background: 'rgba(99,102,241,.12)', color: '#6366f1', fontWeight: 900, fontSize: 9, cursor: 'pointer' }}>
                  LIMPIAR FILTROS
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <button onClick={() => { setAdminTab('pending'); fetchEvents(); }} style={{ padding: 10, borderRadius: 12, border: 'none', background: adminTab === 'pending' ? '#4f46e5' : (isDark ? '#1e293b' : '#e2e8f0'), color: adminTab === 'pending' ? 'white' : 'inherit', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>
                PENDIENTES ({pendingEvents.length}{adminFiltersActive ? '/' + rawPendingEvents.length : ''})
              </button>
              <button onClick={() => { setAdminTab('approved'); fetchEvents(); }} style={{ padding: 10, borderRadius: 12, border: 'none', background: adminTab === 'approved' ? '#22c55e' : (isDark ? '#1e293b' : '#e2e8f0'), color: adminTab === 'approved' ? 'white' : 'inherit', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>
                APROBADOS ({approvedEvents.length}{adminFiltersActive ? '/' + rawApprovedEvents.length : ''})
              </button>
            </div>

            {adminTab === 'approved' && approvedEvents.length > 0 && (
              <button onClick={() => exportToCSV(approvedEvents)} style={{ width: '100%', padding: 10, borderRadius: 10, border: 'none', background: 'rgba(99,102,241,.1)', color: '#6366f1', fontWeight: 900, fontSize: 10, cursor: 'pointer', marginBottom: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Download size={14} /> EXPORTAR RESULTADOS A CSV
              </button>
            )}

            {adminTab === 'pending' && pendingEvents.length === 0 && <p style={{ textAlign: 'center', opacity: 0.7, marginTop: 50, fontWeight: 700 }}>NO HAY EVENTOS PENDIENTES</p>}
            {adminTab === 'pending' && pendingEvents.map((ev) => (
              <AdminMiniCard key={ev.id} ev={ev} isDark={isDark} mode="pending"
                onClick={() => setSelectedPendingEvent(ev)}
                onApprove={() => handleApproveEvent(ev.id)}
                onReject={() => handleRejectEvent(ev.id)}
                onDelete={() => handleDeleteEvent(ev.id)} />
            ))}

            {adminTab === 'approved' && approvedEvents.length === 0 && <p style={{ textAlign: 'center', opacity: 0.7, marginTop: 50, fontWeight: 700 }}>NO HAY EVENTOS APROBADOS</p>}
            {adminTab === 'approved' && approvedEvents.map((ev) => (
              <AdminMiniCard key={ev.id} ev={ev} isDark={isDark} mode="approved"
                onClick={() => setSelectedEvent(ev)}
                onView={() => setSelectedEvent(ev)}
                onEdit={() => startEditEvent(ev)}
                onDelete={() => handleDeleteEvent(ev.id)} />
            ))}
          </div>
        )}

        {view === 'admin' && selectedPendingEvent && !editingEvent && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
            <button onClick={() => setSelectedPendingEvent(null)} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 900, display: 'flex', gap: 6, marginBottom: 12, cursor: 'pointer', fontSize: 12 }}>
              <ArrowLeft size={16} /> VOLVER A LISTA
            </button>

            <div className={isDark ? 'card-dark' : 'card-light'} style={{ borderRadius: 20, overflow: 'hidden', padding: 0 }}>
              <img src={selectedPendingEvent.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} alt="" style={{ width: '100%', height: 220, objectFit: 'cover' }} />
              <div style={{ padding: 18 }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 15 }}>{selectedPendingEvent.title}</h2>
                <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><Calendar color="#6366f1" size={16} /><b>{formatDate(selectedPendingEvent.date)}</b></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><Clock color="#6366f1" size={16} /><b>{selectedPendingEvent.time}H</b></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><MapPin color="#6366f1" size={16} /><b>{selectedPendingEvent.address}, {selectedPendingEvent.localidad || ''} - {selectedPendingEvent.city}</b></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><span style={{ fontWeight: 900, color: '#6366f1' }}>CAT:</span><b>{selectedPendingEvent.category}</b></div>
                  {selectedPendingEvent.created_at && <div style={{ fontSize: 11, opacity: 0.65 }}>Enviado: {formatDateTime(selectedPendingEvent.created_at)}</div>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <button onClick={() => handleApproveEvent(selectedPendingEvent.id)} style={{ padding: 12, background: '#22c55e', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 10, cursor: 'pointer' }}>APROBAR</button>
                  <button onClick={() => handleRejectEvent(selectedPendingEvent.id)} style={{ padding: 12, background: '#f59e0b', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 10, cursor: 'pointer' }}>RECHAZAR</button>
                  <button onClick={() => handleDeleteEvent(selectedPendingEvent.id)} style={{ padding: 12, background: '#ef4444', color: 'white', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 10, cursor: 'pointer' }}>BORRAR</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'favorites' && (
          <div className="no-scrollbar" style={{ padding: 12, height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
            <h2 style={{ textAlign: 'center', fontWeight: 900, marginBottom: 12, fontSize: 16 }}>MIS GUARDADOS ({favoriteEvents.length})</h2>
            {favoriteEvents.length === 0 ? (
              <p style={{ textAlign: 'center', opacity: 0.7, marginTop: 50, fontWeight: 700 }}>NO HAY EVENTOS GUARDADOS</p>
            ) : favoriteEvents.map((ev) => {
              const dl = getDaysLabel(ev.date);
              return (
                <div key={ev.id} className={isDark ? 'card-dark' : 'card-light'} style={{ display: 'flex', gap: 10, padding: 10, borderRadius: 18, marginBottom: 8, alignItems: 'center', cursor: 'pointer' }} onClick={() => setSelectedEvent(ev)}>
                  <img src={ev.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'} alt="" style={{ width: 45, height: 45, borderRadius: 10, objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 900, fontSize: 13 }}>{ev.title}</p>
                    <p style={{ fontSize: 9, color: '#6366f1' }}>{ev.city}</p>
                    {dl && <span style={{ fontSize: 8, color: dl.color, fontWeight: 900, background: dl.bg, padding: '2px 6px', borderRadius: 6 }}>{dl.text}</span>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); toggleFavorite(ev.id); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {view === 'profile' && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className={isDark ? 'card-dark' : 'card-light'} style={{ padding: 22, borderRadius: 35, width: '100%', maxWidth: 300, textAlign: 'center' }}>
              <h2 style={{ fontWeight: 900, marginBottom: 12, fontSize: 16 }}>SOPORTE</h2>
              {userEmail && <p style={{ fontSize: 9, opacity: 0.6, marginBottom: 8 }}>Conectado: {userEmail}</p>}
              <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                <a href="https://ko-fi.com/eventora" target="_blank" rel="noreferrer" style={{ background: '#29abe0', color: 'white', padding: 14, borderRadius: 12, textDecoration: 'none', fontWeight: 900, fontSize: 11 }}>
                  ☕ INVITAR A UN CAFÉ (KO-FI)
                </a>
                <a href="https://paypal.me/EVENTORA" target="_blank" rel="noreferrer" style={{ background: '#003087', color: 'white', padding: 14, borderRadius: 12, textDecoration: 'none', fontWeight: 900, fontSize: 11 }}>
                  💙 APOYAR EN PAYPAL
                </a>
              </div>
              {!userEmail ? (
                <button onClick={handleLogin} style={{ background: '#4f46e5', color: 'white', fontSize: 10, padding: '8px 15px', borderRadius: 8, border: 'none', fontWeight: 900, cursor: 'pointer' }}>LOGIN</button>
              ) : (
                <button onClick={handleLogout} style={{ background: '#ef4444', color: 'white', fontSize: 10, padding: '8px 15px', borderRadius: 8, border: 'none', fontWeight: 900, cursor: 'pointer' }}>CERRAR SESIÓN</button>
              )}
            </div>
          </div>
        )}
      </main>

      <nav style={{ position: 'fixed', bottom: 10, left: '50%', transform: 'translateX(-50%)', width: '88%', maxWidth: 360, height: 55, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-around', boxShadow: '0 8px 25px rgba(0,0,0,.4)', zIndex: 3000, background: isDark ? 'rgba(15,23,42,.95)' : 'rgba(255,255,255,.95)' }}>
        <button onClick={goHome} style={{ background: 'none', border: 'none', color: view === 'home' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}>
          <LayoutList size={22} />
        </button>
        <button onClick={() => { setView('favorites'); setSelectedEvent(null); setSelectedPendingEvent(null); setEditingEvent(null); }} style={{ background: 'none', border: 'none', color: view === 'favorites' ? '#ef4444' : '#64748b', cursor: 'pointer', position: 'relative' }}>
          <Heart size={22} fill={view === 'favorites' ? '#ef4444' : 'none'} />
          {favoriteEvents.length > 0 && (
            <span style={{ position: 'absolute', top: -4, right: -8, background: '#ef4444', color: 'white', fontSize: 8, fontWeight: 900, borderRadius: 10, padding: '1px 5px', minWidth: 14, textAlign: 'center' }}>{favoriteEvents.length}</span>
          )}
        </button>
        <button onClick={() => { setView('create'); setSelectedEvent(null); setSelectedPendingEvent(null); setEditingEvent(null); }} style={{ background: 'none', border: 'none', color: view === 'create' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}>
          <PlusCircle size={22} />
        </button>
        <button onClick={() => { setView('map'); setSelectedEvent(null); setSelectedPendingEvent(null); setEditingEvent(null); }} style={{ background: 'none', border: 'none', color: view === 'map' ? '#4f46e5' : '#64748b', cursor: 'pointer' }}>
          <MapIcon size={22} />
        </button>
      </nav>
    </div>
  );
}
