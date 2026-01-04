
import React from 'react';
import { Hospital, Booking } from '../types';

interface AdminPanelProps {
  hospital: Hospital;
  bookings: Booking[];
  onUpdate: (hospitalId: string, type: 'general' | 'icu', delta: number) => void;
  onUpdateBookingStatus?: (bookingId: string, status: Booking['status']) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ hospital, bookings, onUpdate, onUpdateBookingStatus }) => {
  const getStressLevel = (avail: number, total: number) => {
    const ratio = avail / total;
    if (ratio === 0) return { label: 'CRITICAL', color: 'text-rose-600 bg-rose-100 border-rose-200' };
    if (ratio < 0.1) return { label: 'STRESSED', color: 'text-amber-600 bg-amber-100 border-amber-200' };
    return { label: 'OPTIMAL', color: 'text-emerald-600 bg-emerald-100 border-emerald-200' };
  };

  const generalStress = getStressLevel(hospital.generalBeds.available, hospital.generalBeds.total);
  const icuStress = getStressLevel(hospital.icuBeds.available, hospital.icuBeds.total);

  const activeBookings = bookings.filter(b => b.hospitalId === hospital.id && b.status === 'PENDING');

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-8 text-white relative">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-black tracking-tight">{hospital.name}</h2>
              <p className="text-slate-400 font-medium mt-1 uppercase tracking-widest text-xs">Official Staff Command Center</p>
            </div>
            <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold animate-pulse">
              LIVE BROADCAST
            </div>
          </div>
        </div>

        <div className="p-8 space-y-12 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Ward 1: General */}
            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">General Ward</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-4xl font-bold text-slate-900">{hospital.generalBeds.available}</span>
                    <span className="text-slate-400 text-lg font-medium">/ {hospital.generalBeds.total}</span>
                  </div>
                </div>
                <span className={`px-3 py-1.5 rounded-lg border font-black text-xs ${generalStress.color}`}>
                  {generalStress.label}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => onUpdate(hospital.id, 'general', -1)}
                  disabled={hospital.generalBeds.available <= 0}
                  className="group flex items-center justify-center h-16 bg-slate-100 hover:bg-rose-600 hover:text-white rounded-xl transition-all active:scale-95 disabled:opacity-30"
                >
                  <span className="text-3xl">−</span>
                </button>
                <button 
                  onClick={() => onUpdate(hospital.id, 'general', 1)}
                  disabled={hospital.generalBeds.available >= hospital.generalBeds.total}
                  className="group flex items-center justify-center h-16 bg-slate-100 hover:bg-emerald-600 hover:text-white rounded-xl transition-all active:scale-95 disabled:opacity-30"
                >
                  <span className="text-3xl">+</span>
                </button>
              </div>
            </section>

            {/* Ward 2: ICU */}
            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Intensive Care</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-4xl font-bold text-slate-900">{hospital.icuBeds.available}</span>
                    <span className="text-slate-400 text-lg font-medium">/ {hospital.icuBeds.total}</span>
                  </div>
                </div>
                <span className={`px-3 py-1.5 rounded-lg border font-black text-xs ${icuStress.color}`}>
                  {icuStress.label}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => onUpdate(hospital.id, 'icu', -1)}
                  disabled={hospital.icuBeds.available <= 0}
                  className="group flex items-center justify-center h-16 bg-slate-100 hover:bg-rose-600 hover:text-white rounded-xl transition-all active:scale-95 disabled:opacity-30"
                >
                  <span className="text-3xl">−</span>
                </button>
                <button 
                  onClick={() => onUpdate(hospital.id, 'icu', 1)}
                  disabled={hospital.icuBeds.available >= hospital.icuBeds.total}
                  className="group flex items-center justify-center h-16 bg-slate-100 hover:bg-emerald-600 hover:text-white rounded-xl transition-all active:scale-95 disabled:opacity-30"
                >
                  <span className="text-3xl">+</span>
                </button>
              </div>
            </section>
          </div>

          <div className="flex gap-4">
             <button 
              onClick={() => {
                if (confirm('Are you sure you want to set all beds to 0 for emergency lockdown?')) {
                  onUpdate(hospital.id, 'general', -hospital.generalBeds.available);
                  onUpdate(hospital.id, 'icu', -hospital.icuBeds.available);
                }
              }}
              className="w-full py-4 bg-rose-50 text-rose-600 font-bold rounded-xl border border-rose-100 hover:bg-rose-100 transition-colors uppercase tracking-widest text-xs"
             >
               Emergency Lockdown (All 0)
             </button>
          </div>
        </div>

        <div className="bg-white p-6 border-t border-slate-100 text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          Security Protocol: Bed counts sync to the LifeLine Public API every 5 seconds
        </div>
      </div>

      {/* Upcoming Patients Section */}
      <section className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Incoming Patients</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Real-time Emergency Notifications</p>
          </div>
          <span className="bg-rose-600 text-white text-[10px] font-black px-3 py-1 rounded-full">
            {activeBookings.length} PENDING
          </span>
        </div>
        
        <div className="divide-y divide-slate-100">
          {activeBookings.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-medium">
              No upcoming patient reservations at this time.
            </div>
          ) : (
            activeBookings.map(booking => (
              <div key={booking.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center font-black">
                    {booking.patientName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900">{booking.patientName}</h4>
                    <p className="text-xs font-bold text-slate-500 uppercase">{booking.emergencyType} • {booking.contactNumber}</p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Booked {new Date(booking.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onUpdateBookingStatus?.(booking.id, 'ARRIVED')}
                    className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-emerald-700 transition-all active:scale-95"
                  >
                    Mark Arrived
                  </button>
                  <button 
                    onClick={() => onUpdateBookingStatus?.(booking.id, 'CANCELLED')}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-500 text-[10px] font-black uppercase rounded-lg hover:bg-slate-50 transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminPanel;
