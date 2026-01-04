
import React, { useEffect, useRef, useLayoutEffect } from 'react';
import L from 'leaflet';
import { Hospital, UserLocation } from '../types';

interface EmergencyMapProps {
  hospitals: Hospital[];
  selectedHospitalId?: string;
  onSelectHospital: (id: string) => void;
  userLocation: UserLocation | null;
}

const EmergencyMap: React.FC<EmergencyMapProps> = ({ hospitals, selectedHospitalId, onSelectHospital, userLocation }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map Instance
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialCenter: [number, number] = userLocation 
      ? [userLocation.lat, userLocation.lng] 
      : [26.8467, 80.9462]; // Lucknow Center

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 13,
      zoomControl: false,
      fadeAnimation: true,
      markerZoomAnimation: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapRef.current = map;

    // Trigger an immediate size check after a short delay to account for React's render cycles
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Watch for container size changes to prevent partial rendering
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize({ animate: false });
      }
    });
    
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current = {};
    };
  }, []);

  // Fit Bounds on Load or Location Change
  useEffect(() => {
    if (!mapRef.current || hospitals.length === 0) return;

    const map = mapRef.current;
    const points: L.LatLngExpression[] = hospitals.map(h => [h.lat, h.lng]);
    
    if (userLocation) {
      points.push([userLocation.lat, userLocation.lng]);
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { 
        padding: [50, 50], 
        maxZoom: 14,
        animate: true 
      });
    }
  }, [userLocation === null, hospitals.length]); // Only refit if data actually arrives/changes

  // Sync selection with map panning
  useEffect(() => {
    if (!mapRef.current || !selectedHospitalId) return;
    
    const hospital = hospitals.find(h => h.id === selectedHospitalId);
    if (hospital && markersRef.current[hospital.id]) {
      mapRef.current.panTo([hospital.lat, hospital.lng], { 
        animate: true,
        duration: 0.5
      });
      markersRef.current[hospital.id].openPopup();
    }
  }, [selectedHospitalId, hospitals]);

  // Update User Location Marker
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    const pos: [number, number] = [userLocation.lat, userLocation.lng];
    
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(pos);
    } else {
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
          <div class="relative">
            <div class="absolute -inset-3 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
            <div class="relative w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-xl flex items-center justify-center">
               <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
          </div>
        `,
        iconSize: [20, 20],
      });
      userMarkerRef.current = L.marker(pos, { icon: userIcon, zIndexOffset: 2000 }).addTo(mapRef.current);
      userMarkerRef.current.bindTooltip("Your Location", { permanent: false, direction: 'top' });
    }
  }, [userLocation]);

  // Update Hospital Markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Track which markers we've processed this update to cleanup removals
    const processedIds = new Set<string>();

    hospitals.forEach(hospital => {
      processedIds.add(hospital.id);
      const pos: [number, number] = [hospital.lat, hospital.lng];
      const avail = hospital.generalBeds.available + hospital.icuBeds.available;
      const isSelected = hospital.id === selectedHospitalId;
      
      let color = '#ef4444'; // Rose (Full)
      let statusText = 'Critical / Full';
      if (avail > 20) {
        color = '#10b981'; // Emerald (Available)
        statusText = 'Available';
      } else if (avail > 0) {
        color = '#f59e0b'; // Amber (Limited)
        statusText = 'Limited Beds';
      }

      const icon = L.divIcon({
        className: 'hospital-marker',
        html: `
          <div class="flex flex-col items-center transition-all duration-300 ${isSelected ? 'scale-125' : 'scale-100'}">
            <div class="w-8 h-8 rounded-xl border-2 border-white shadow-lg flex items-center justify-center text-xs font-black text-white transform rotate-45" style="background-color: ${color}; outline: ${isSelected ? '3px solid #0f172a' : 'none'}">
               <span class="transform -rotate-45">H</span>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      if (markersRef.current[hospital.id]) {
        markersRef.current[hospital.id].setIcon(icon);
        markersRef.current[hospital.id].setZIndexOffset(isSelected ? 1000 : 100);
      } else {
        const marker = L.marker(pos, { icon, zIndexOffset: 100 })
          .addTo(mapRef.current!)
          .on('click', () => {
            onSelectHospital(hospital.id);
          });
        
        marker.bindPopup(`
          <div class="p-1 min-w-[150px]">
            <h4 class="font-black text-slate-900 text-sm mb-1">${hospital.name}</h4>
            <div class="flex items-center gap-2 mb-2">
               <span class="w-2 h-2 rounded-full" style="background-color: ${color}"></span>
               <span class="text-[10px] font-bold uppercase text-slate-500">${statusText}</span>
            </div>
            <div class="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
               <div class="text-center">
                  <div class="text-[8px] font-black text-slate-400 uppercase">Ward</div>
                  <div class="text-xs font-bold text-slate-800">${hospital.generalBeds.available}</div>
               </div>
               <div class="text-center">
                  <div class="text-[8px] font-black text-slate-400 uppercase">ICU</div>
                  <div class="text-xs font-bold text-slate-800">${hospital.icuBeds.available}</div>
               </div>
            </div>
          </div>
        `, { closeButton: false, offset: [0, -10] });

        markersRef.current[hospital.id] = marker;
      }
    });

    // Cleanup markers that are no longer in the hospitals array
    Object.keys(markersRef.current).forEach(id => {
      if (!processedIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
  }, [hospitals, selectedHospitalId]);

  const recenter = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.setView([userLocation.lat, userLocation.lng], 14, { animate: true });
      mapRef.current.invalidateSize();
    }
  };

  return (
    <div className="relative w-full overflow-hidden bg-slate-100 rounded-3xl border-4 border-white shadow-2xl aspect-[16/9] lg:aspect-[3/2]">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full relative" 
        style={{ minHeight: '100%', zIndex: 1 }} 
      />
      
      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <button 
          onClick={recenter}
          className="p-3 bg-white text-slate-700 rounded-2xl shadow-xl border border-slate-100 hover:bg-slate-50 transition-all active:scale-90 flex items-center justify-center"
          title="Recenter on me"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Legend overlay */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/50 flex flex-col gap-3 pointer-events-none">
        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-1">Status Legend</h5>
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded-lg bg-emerald-500 shadow-sm shadow-emerald-200"></div>
          <span className="text-[10px] font-black text-slate-700 uppercase">High Capacity</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded-lg bg-amber-500 shadow-sm shadow-amber-200"></div>
          <span className="text-[10px] font-black text-slate-700 uppercase">Limited Access</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded-lg bg-rose-500 shadow-sm shadow-rose-200"></div>
          <span className="text-[10px] font-black text-slate-700 uppercase">Full / Alert</span>
        </div>
        <div className="pt-2 mt-1 border-t border-slate-100 flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-md"></div>
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-tight">Your Location</span>
        </div>
      </div>

      <style>{`
        .leaflet-popup-content-wrapper {
          border-radius: 1.25rem;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
        }
        .leaflet-popup-content {
          margin: 12px 16px;
        }
        .leaflet-popup-tip {
          background: white;
        }
        .leaflet-container {
          width: 100% !important;
          height: 100% !important;
          outline: none;
        }
        /* Fix for potential tile line glitching */
        .leaflet-tile-container img {
          outline: 1px solid transparent;
        }
      `}</style>
    </div>
  );
};

export default EmergencyMap;
