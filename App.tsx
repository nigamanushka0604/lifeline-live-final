
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Hospital, ViewMode, TriageMessage, UserLocation, Booking } from './types';
import { INITIAL_HOSPITALS } from './constants';
import EmergencyMap from './components/EmergencyMap';
import AdminPanel from './components/AdminPanel';
import { GeminiService } from './services/geminiService';

const LUCKNOW_CENTER = { lat: 26.8467, lng: 80.9462 };

const App: React.FC = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>(INITIAL_HOSPITALS);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.PATIENT);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | undefined>();
  const [triageHistory, setTriageHistory] = useState<TriageMessage[]>([]);
  const [triageInput, setTriageInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeAdminId, setActiveAdminId] = useState<string>(INITIAL_HOSPITALS[0].id);
  const [filter, setFilter] = useState<'ALL' | 'ICU_ONLY' | 'GENERAL_ONLY'>('ALL');
  
  // Modals States
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [bookingFormData, setBookingFormData] = useState({ name: '', phone: '', type: 'Emergency' });
  const [lastBookingId, setLastBookingId] = useState<string | null>(null);

  // Location States
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const gemini = useMemo(() => new GeminiService(), []);

  // Request location on load
  useEffect(() => {
    requestLocation();
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return parseFloat((R * c).toFixed(1));
  };

  const requestLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      setUserLocation(LUCKNOW_CENTER);
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setIsLocating(false); },
      () => { setUserLocation(LUCKNOW_CENTER); setIsLocating(false); },
      { enableHighAccuracy: true }
    );
  };

  const updateBeds = useCallback((hospitalId: string, type: 'general' | 'icu', delta: number) => {
    setHospitals(prev => prev.map(h => {
      if (h.id !== hospitalId) return h;
      const key = type === 'general' ? 'generalBeds' : 'icuBeds';
      const newVal = Math.max(0, Math.min(h[key].total, h[key].available + delta));
      return { ...h, lastUpdated: new Date(), [key]: { ...h[key], available: newVal } };
    }));
  }, []);

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHospitalId) return;
    const newBooking: Booking = {
      id: Math.random().toString(36).substr(2, 9),
      hospitalId: selectedHospitalId,
      patientName: bookingFormData.name,
      contactNumber: bookingFormData.phone,
      emergencyType: bookingFormData.type,
      timestamp: new Date(),
      status: 'PENDING'
    };
    setBookings(prev => [...prev, newBooking]);
    updateBeds(selectedHospitalId, 'general', -1);
    setLastBookingId(newBooking.id);
    setIsBookingModalOpen(false);
    setBookingFormData({ name: '', phone: '', type: 'Emergency' });
  };

  const selectedHospital = useMemo(() => hospitals.find(h => h.id === selectedHospitalId), [hospitals, selectedHospitalId]);

  const filteredHospitals = useMemo(() => {
    let list = hospitals.map(h => ({
      ...h,
      distance: userLocation ? calculateDistance(userLocation.lat, userLocation.lng, h.lat, h.lng) : 0
    }));
    if (filter === 'ICU_ONLY') list = list.filter(h => h.icuBeds.available > 0);
    if (filter === 'GENERAL_ONLY') list = list.filter(h => h.generalBeds.available > 0);
    return list.sort((a, b) => a.distance - b.distance);
  }, [hospitals, filter, userLocation]);

  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triageInput.trim()) return;
    const userMsg: TriageMessage = { role: 'user', content: triageInput, timestamp: new Date() };
    setTriageHistory(prev => [...prev, userMsg]);
    setTriageInput('');
    setIsAiLoading(true);
    const advice = await gemini.getTriageAdvice(triageInput, hospitals);
    setTriageHistory(prev => [...prev, { role: 'assistant', content: advice, timestamp: new Date() }]);
    setIsAiLoading(false);
  };

  const handleRouting = (h: Hospital) => {
    // Precise coordinate-based routing
    let url = `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`;
    
    // Add origin if user location is available for an instant route
    if (userLocation) {
      url += `&origin=${userLocation.lat},${userLocation.lng}`;
    }
    
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfdfe]">
      {/* Hospital Info Modal */}
      {isInfoModalOpen && selectedHospital && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-6">
          <div className="bg-white rounded-[2.5rem] overflow-hidden max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-8 text-white relative">
              <button onClick={() => setIsInfoModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-all">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <h3 className="text-2xl font-black uppercase tracking-tight pr-8">{selectedHospital.name}</h3>
              <div className="flex items-center gap-2 mt-2 opacity-70">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="text-xs font-bold uppercase tracking-widest">{selectedHospital.address}</span>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {selectedHospital.establishmentYear ? (
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Established</h4>
                      <p className="text-lg font-black text-slate-800">Circa {selectedHospital.establishmentYear}</p>
                    </div>
                  </div>
                </section>
              ) : null}

              {selectedHospital.achievements && selectedHospital.achievements.length > 0 ? (
                <section>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Notable Achievements</h4>
                  <ul className="space-y-4">
                    {selectedHospital.achievements.map((item, i) => (
                      <li key={i} className="flex gap-4 group">
                        <div className="mt-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full flex-shrink-0 group-hover:scale-150 transition-all"></div>
                        <p className="text-sm font-medium text-slate-600 leading-relaxed">{item}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Contact Directory</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-700">Reception:</span>
                      <span className="text-sm font-black text-rose-600">{selectedHospital.contact}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">Please contact the main desk for non-emergency inquiries or documentation requests.</p>
                  </div>
                </section>
              )}

              <div className="pt-6 border-t border-slate-100 flex gap-4">
                <a 
                  href={`tel:${selectedHospital.contact}`}
                  className="flex-grow py-4 bg-rose-600 text-white text-center font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-rose-700 transition-all shadow-lg active:scale-95"
                >
                  Emergency Call
                </a>
                <button 
                  onClick={() => setIsInfoModalOpen(false)}
                  className="px-8 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Form & Success Modals */}
      {lastBookingId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-6">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase">Bed Reserved</h3>
            <p className="text-slate-500 mt-2 text-sm font-medium">Notification sent to {selectedHospital?.name}. Preparation is underway.</p>
            <button onClick={() => setLastBookingId(null)} className="mt-8 w-full py-4 bg-slate-900 text-white font-black rounded-xl uppercase tracking-widest text-xs">Dismiss</button>
          </div>
        </div>
      )}

      {isBookingModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-6">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Reserve a Bed</h3>
              <button onClick={() => setIsBookingModalOpen(false)} className="text-slate-400 hover:text-slate-900">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-6">Routing to: {selectedHospital?.name}</p>
            <form onSubmit={handleBooking} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Patient Name</label>
                <input required type="text" value={bookingFormData.name} onChange={e => setBookingFormData({...bookingFormData, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none" placeholder="Full Name" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Emergency Contact</label>
                <input required type="tel" value={bookingFormData.phone} onChange={e => setBookingFormData({...bookingFormData, phone: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none" placeholder="+91 XXXXX XXXXX" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Emergency Type</label>
                <select value={bookingFormData.type} onChange={e => setBookingFormData({...bookingFormData, type: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none">
                  <option>Respiratory Distress</option>
                  <option>Accident / Trauma</option>
                  <option>High Fever</option>
                  <option>Cardiac Concern</option>
                </select>
              </div>
              <button type="submit" className="w-full mt-4 py-5 bg-rose-600 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl hover:bg-rose-700 active:scale-95 transition-all">Confirm Reservation</button>
            </form>
          </div>
        </div>
      )}

      {/* Precision Header */}
      <header className={`py-4 px-6 sticky top-0 z-50 transition-all border-b ${viewMode === ViewMode.PATIENT ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800 text-white'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center text-white shadow-lg ring-4 ring-rose-50">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            </div>
            <div>
              <h1 className={`text-xl font-black tracking-tight uppercase ${viewMode === ViewMode.PATIENT ? 'text-black' : 'text-white'}`}>LifeLine</h1>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${viewMode === ViewMode.PATIENT ? 'text-slate-400' : 'text-slate-500'}`}>Emergency Response MVP</p>
            </div>
          </div>
          <nav className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button onClick={() => setViewMode(ViewMode.PATIENT)} className={`px-5 py-2 rounded-lg text-xs font-black uppercase transition-all ${viewMode === ViewMode.PATIENT ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-800'}`}>Public Map</button>
            <button onClick={() => setViewMode(ViewMode.ADMIN)} className={`px-5 py-2 rounded-lg text-xs font-black uppercase transition-all ${viewMode === ViewMode.ADMIN ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Admin Portal</button>
          </nav>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full p-6">
        {viewMode === ViewMode.PATIENT ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <section className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Interactive Coverage Area</h3>
                  <div className="flex gap-2">
                    {['ALL', 'GENERAL_ONLY', 'ICU_ONLY'].map((f) => (
                      <button key={f} onClick={() => setFilter(f as any)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${filter === f ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                        {f.replace('_ONLY', '').replace('ALL', 'Show All')}
                      </button>
                    ))}
                  </div>
                </div>
                <EmergencyMap hospitals={hospitals} selectedHospitalId={selectedHospitalId} onSelectHospital={setSelectedHospitalId} userLocation={userLocation} />
              </section>

              <section className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg"><svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight">Rapid Triage Assistant</h3>
                      <p className="text-rose-400 text-xs font-bold uppercase tracking-widest">Medical Routing AI v1.0</p>
                    </div>
                  </div>
                  <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {triageHistory.length === 0 ? (
                      <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 text-center"><p className="text-slate-400 text-sm font-medium">Describe the emergency. I'll recommend the best facility.</p></div>
                    ) : (
                      triageHistory.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] px-5 py-4 rounded-2xl text-sm font-medium ${msg.role === 'user' ? 'bg-rose-600 shadow-lg' : 'bg-slate-800 border border-slate-700'}`}>{msg.content}</div>
                        </div>
                      ))
                    )}
                  </div>
                  <form onSubmit={handleTriageSubmit} className="relative group">
                    <input type="text" value={triageInput} onChange={(e) => setTriageInput(e.target.value)} placeholder="Describe symptoms..." className="w-full pl-6 pr-14 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-white outline-none focus:ring-2 focus:ring-rose-500" />
                    <button type="submit" className="absolute right-3 top-3 p-2 bg-rose-600 rounded-xl hover:bg-rose-700 active:scale-95 transition-all"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg></button>
                  </form>
                </div>
              </section>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Nearby Results</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{filteredHospitals.length} Found</span>
              </div>
              <div className="space-y-4 max-h-[1000px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredHospitals.map(h => (
                  <div key={h.id} onClick={() => setSelectedHospitalId(h.id)} className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${selectedHospitalId === h.id ? 'bg-white border-rose-600 shadow-xl' : 'bg-white border-transparent shadow-sm hover:border-slate-200'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-grow">
                        <h4 className="font-black text-slate-900 group-hover:text-rose-600 transition-colors text-lg leading-tight">{h.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{h.distance} KM AWAY</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">Live Update</span>
                        </div>
                      </div>
                      <div className={`w-3.5 h-3.5 rounded-full ring-4 ${h.generalBeds.available + h.icuBeds.available > 0 ? 'bg-emerald-500 ring-emerald-50' : 'bg-rose-500 ring-rose-50'}`}></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center"><span className="text-[9px] font-black text-slate-400 uppercase mb-1">Ward</span><span className={`text-2xl font-black ${h.generalBeds.available > 0 ? 'text-slate-900' : 'text-rose-500'}`}>{h.generalBeds.available}</span></div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center"><span className="text-[9px] font-black text-slate-400 uppercase mb-1">ICU</span><span className={`text-2xl font-black ${h.icuBeds.available > 0 ? 'text-slate-900' : 'text-rose-500'}`}>{h.icuBeds.available}</span></div>
                    </div>
                    {selectedHospitalId === h.id && (
                      <div className="mt-6 space-y-3 pt-6 border-t border-slate-100">
                        <button onClick={(e) => { e.stopPropagation(); setIsBookingModalOpen(true); }} className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg active:scale-95">Book Bed Now</button>
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={(e) => { e.stopPropagation(); handleRouting(h); }} className="flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all">Route</button>
                          <button onClick={(e) => { e.stopPropagation(); setIsInfoModalOpen(true); }} className="flex items-center justify-center gap-2 py-3 bg-white border-2 border-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 transition-all">Info</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto py-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Facility Management</h2>
              <p className="text-slate-500 font-medium mt-2">Staff Access Only</p>
            </div>
            <div className="mb-12 max-w-md mx-auto">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Active Facility</label>
              <select value={activeAdminId} onChange={(e) => setActiveAdminId(e.target.value)} className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl font-black text-slate-800 outline-none">
                {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            {hospitals.filter(h => h.id === activeAdminId).map(h => (
              <AdminPanel key={h.id} hospital={h} bookings={bookings} onUpdate={updateBeds} />
            ))}
          </div>
        )}
      </main>

      {viewMode === ViewMode.PATIENT && (
        <a href="tel:112" className="fixed bottom-8 right-8 lg:bottom-12 lg:right-12 bg-rose-600 text-white px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-4 font-black hover:bg-rose-700 transition-all z-50 ring-8 ring-rose-50">
          <div className="bg-white/20 p-2 rounded-xl"><svg className="w-8 h-8 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg></div>
          <div className="flex flex-col"><span className="text-xs opacity-80 leading-none mb-1 uppercase">Emergency</span><span className="text-xl tracking-tight leading-none font-black">CALL 112 NOW</span></div>
        </a>
      )}

      <footer className="bg-white border-t border-slate-100 py-12 px-6 text-center">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
           <div className="flex items-center gap-2 grayscale opacity-30"><div className="w-6 h-6 bg-slate-800 rounded-md"></div><span className="font-black text-slate-800 uppercase tracking-widest text-xs">LifeLine Systems</span></div>
           <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] max-w-md leading-loose">&copy; 2024 LifeLine MVP. For demonstration only.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
