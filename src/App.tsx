import React, { useState, useEffect, type ReactNode, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  BookHeart, 
  Baby as BabyIcon, 
  Pill, 
  UserCircle,
  PlusCircle,
  ChevronRight,
  Bell,
  Calendar,
  Camera,
  Pencil,
  Heart,
  Stethoscope,
  Syringe,
  Smile,
  LogOut,
  X,
  Play,
  TrendingUp,
  Download,
  Upload,
  ClipboardList,
  FileText,
  Check,
  BellRing,
  History,
  Trash2,
  Sun,
  Moon,
  Sparkles,
  Settings,
  Briefcase,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { db, type Baby } from './db';
import { Card, Button, Input } from './components/UI';
import TravelAssistant from './components/TravelAssistant';
import { format, differenceInMonths, isValid } from 'date-fns';
import { cn } from './lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ReminderSystem } from './components/ReminderSystem';
import { 
  WHO_WEIGHT_BOYS, 
  WHO_WEIGHT_GIRLS, 
  WHO_LENGTH_BOYS, 
  WHO_LENGTH_GIRLS 
} from './constants/growthCharts';


// --- Types ---
type Screen = 'dashboard' | 'journal' | 'milestones' | 'medicines' | 'profile' | 'vaccines' | 'travel';

// --- Dashboard Component ---
const Dashboard = ({ baby, onNavigate }: { baby: Baby; onNavigate: (screen: Screen) => void }) => {
  const ageInMonths = differenceInMonths(new Date(), new Date(baby.dob));
  const visits = useLiveQuery(() => db.doctorVisits.orderBy('date').reverse().limit(1).toArray()) || [];
  const medicines = useLiveQuery(() => db.medicines.where('isActive').equals(1).toArray()) || [];
  const vaccines = useLiveQuery(() => db.vaccines.where('status').equals('upcoming').limit(1).toArray()) || [];
  const milestones = useLiveQuery(() => db.milestones.orderBy('date').reverse().limit(1).toArray()) || [];

  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  const allUpcomingVaccines = useLiveQuery(() => 
    baby.id ? db.vaccines.where('babyId').equals(baby.id).and(v => v.status === 'upcoming').toArray() : []
  , [baby.id]) || [];

  const takenMedicinesLog = useLiveQuery(() => db.takenMedicines.toArray()) || [];

  const brushingLogs = useLiveQuery(() => 
    baby.id ? db.teethBrushingLogs.where('babyId').equals(baby.id).toArray() : []
  , [baby.id]) || [];

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const [morningTime, setMorningTime] = useState(() => {
    return localStorage.getItem(`brushing_morning_${baby.id}`) || '08:00';
  });
  const [eveningTime, setEveningTime] = useState(() => {
    return localStorage.getItem(`brushing_evening_${baby.id}`) || '20:00';
  });
  const [brushingRemindersActive, setBrushingRemindersActive] = useState(() => {
    return localStorage.getItem(`brushing_active_${baby.id}`) !== 'false';
  });
  const [showBrushingSettings, setShowBrushingSettings] = useState(false);

  const handleBrushingToggle = async () => {
    const newVal = !brushingRemindersActive;
    setBrushingRemindersActive(newVal);
    localStorage.setItem(`brushing_active_${baby.id}`, String(newVal));
    
    if (newVal) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission !== 'granted') {
          try {
            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
              toast.success("Teeth brushing reminders active!", {
                icon: <Smile className="text-theme-teal" size={18} />
              });
            } else {
              toast.warning("Please enable browser notifications to get teeth brushing daily alerts.");
            }
          } catch (e) {
            console.error(e);
          }
        } else {
          toast.success("Teeth brushing daily push reminders configured!");
        }
      }
    } else {
      toast.info("Teeth brushing reminders muted.");
    }
  };

  const handleMorningTimeChange = (t: string) => {
    setMorningTime(t);
    localStorage.setItem(`brushing_morning_${baby.id}`, t);
  };

  const handleEveningTimeChange = (t: string) => {
    setEveningTime(t);
    localStorage.setItem(`brushing_evening_${baby.id}`, t);
  };

  const logBrushing = async (timeOfDay: 'morning' | 'evening') => {
    try {
      await db.teethBrushingLogs.add({
        babyId: baby.id!,
        timeOfDay,
        timestamp: new Date()
      });
      toast.success(`${timeOfDay === 'morning' ? 'Morning ☀️' : 'Evening 🌙'} teeth brushing logged! Sparkle on!`, {
        icon: <Smile className="text-theme-teal" size={18} />
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to log brushing record.");
    }
  };

  const undoBrushing = async (logId: number, label: string) => {
    try {
      await db.teethBrushingLogs.delete(logId);
      toast.info(`Deleted ${label} brushing item.`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete record.");
    }
  };

  const calculateStreak = () => {
    let streak = 0;
    let checkDate = new Date();
    
    while (true) {
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      const dayLogs = brushingLogs.filter(l => format(new Date(l.timestamp), 'yyyy-MM-dd') === dateStr);
      
      if (dayLogs.length > 0) {
        streak++;
        checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
      } else {
        // Allow a grace period for today: if they brushed yesterday but haven't brushed today, the streak remains unbroken.
        if (streak === 0) {
          const yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
          const yDateStr = format(yesterday, 'yyyy-MM-dd');
          const yLogs = brushingLogs.filter(l => format(new Date(l.timestamp), 'yyyy-MM-dd') === yDateStr);
          if (yLogs.length > 0) {
            checkDate = yesterday;
            continue;
          }
        }
        break;
      }
    }
    return streak;
  };

  const requestDesktopPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error("Desktop notifications are not supported in this browser.");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        toast.success("Desktop notifications enabled successfully!", {
          icon: <BellRing className="text-theme-teal" size={18} />
        });
        new Notification("Baby Journal", {
          body: `Reminders and sweet alerts for ${baby.name} are active!`,
          icon: baby.photo || undefined
        });
      } else {
        toast.warning("Notification permission was denied.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to request permission.");
    }
  };

  const markMedicineAsTaken = async (medId: number, name: string) => {
    try {
      await db.takenMedicines.add({
        medicineId: medId,
        takenAt: new Date()
      });
      toast.success(`${name} marked as taken today!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to record entry.");
    }
  };

  const sendTestAlarm = () => {
    toast(`⏰ Sound and visual reminder alarm!`, {
      description: `Time to feed ${baby.name} and check vitals. Everything is working perfectly.`,
      icon: <Smile className="text-theme-teal" size={18} />,
      duration: 6000
    });
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification("⏰ Baby Journal Alarm Room", {
        body: `Sweet reminder alarm check! Feed ${baby.name} and check medicines.`
      });
    }
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="flex items-end justify-between px-2 pt-4">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-theme-teal-light flex items-center justify-center">
            {baby.photo ? (
              <img src={baby.photo} alt={baby.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-4xl">👶</span>
            )}
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-theme-heading">{baby.name}</h1>
            <p className="text-sm text-theme-muted font-bold uppercase tracking-widest mt-1">
              {ageInMonths} {ageInMonths === 1 ? 'month' : 'months'} Old
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowNotificationsModal(true)}
          className="p-4 bg-white rounded-2xl shadow-sm text-theme-teal border border-[#E0E7E5] hover:bg-slate-50 transition-colors relative hover:scale-105 duration-100"
          title="Notification & Reminder Center"
        >
          <Bell size={24} />
          {medicines.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-theme-salmon text-white rounded-full flex items-center justify-center text-[9px] font-black animate-pulse">
              {medicines.length}
            </span>
          )}
        </button>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="flex flex-col gap-3 bg-theme-salmon-light border-theme-salmon/20">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-bold text-theme-salmon">Medicine</h3>
            <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-bold text-theme-salmon uppercase">Active</span>
          </div>
          <div className="space-y-2">
            {medicines.length > 0 ? medicines.slice(0, 3).map(med => {
              const dosesToday = takenMedicinesLog.filter(t => 
                t.medicineId === med.id && 
                new Date(t.takenAt).toDateString() === new Date().toDateString()
              ).length;
              const isTakenToday = dosesToday > 0;

              return (
                <div key={med.id} className="bg-white rounded-xl p-2.5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-left flex-1 min-w-0 pr-1">
                    <p className="font-bold text-xs text-theme-text truncate" title={med.name}>{med.name}</p>
                    <p className="text-[9px] text-theme-muted font-bold uppercase tracking-wider mt-0.5">
                      {isTakenToday ? `Given ${dosesToday}x today` : 'Not given today'}
                    </p>
                  </div>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (med.id) {
                        await markMedicineAsTaken(med.id, med.name);
                      }
                    }}
                    className={cn(
                      "w-7 h-7 rounded-xl flex items-center justify-center transition-all shrink-0 border",
                      isTakenToday 
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100" 
                        : "bg-theme-salmon-light/30 text-theme-salmon border-transparent hover:bg-theme-salmon/10"
                    )}
                    title={isTakenToday ? `Click to record another dose` : `Click to record dose taken`}
                    id={`btn-dashboard-log-med-${med.id}`}
                  >
                    {isTakenToday ? <Check size={14} className="stroke-[3]" /> : <Pill size={14} />}
                  </button>
                </div>
              );
            }) : <p className="text-xs text-theme-salmon/60 italic">No meds scheduled</p>}
          </div>
        </Card>

        <Card className="flex flex-col gap-3 bg-theme-blue-light border-theme-blue/20">
          <h3 className="text-lg font-bold text-theme-blue">Next Vax</h3>
          <div className="bg-white rounded-xl p-4 border border-dashed border-theme-blue flex flex-col justify-center flex-grow">
            <p className="text-[10px] font-bold text-theme-blue uppercase mb-1">
              {vaccines[0] ? format(vaccines[0].dueDate, 'MMM d') : 'Done'}
            </p>
            <p className="text-sm font-bold text-theme-text leading-tight">
              {vaccines[0]?.name || 'All caught up!'}
            </p>
          </div>
        </Card>

        <Card className="col-span-2 flex items-center justify-between bg-theme-green-light border-theme-green/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white text-theme-green rounded-2xl shadow-sm">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-theme-muted uppercase tracking-wider">Growth Trend</p>
              <p className="text-lg font-bold text-theme-text">
                {milestones[0]?.title || 'Healthy & Growing'}
              </p>
            </div>
          </div>
          <ChevronRight size={24} className="text-theme-muted" />
        </Card>

        {/* Travel Packing Assistant Launcher Card */}
        <Card 
          onClick={() => onNavigate('travel')} 
          className="col-span-2 flex items-center justify-between bg-gradient-to-br from-theme-blue-light/45 to-theme-teal-light/20 border-theme-blue/15 hover:bg-theme-blue-light/75 transition-all cursor-pointer shadow-sm hover:scale-[1.01] duration-150 py-5"
          id="btn-dashboard-travel"
        >
          <div className="flex items-center gap-5 text-left">
            <div className="p-3 bg-white text-theme-blue rounded-2xl shadow-sm relative shrink-0">
              <Briefcase size={22} className="text-theme-blue" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-teal opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-theme-teal"></span>
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-theme-blue uppercase tracking-widest leading-none">Travel Prep</p>
              <p className="text-base font-extrabold text-theme-heading mt-1 leading-tight">Travel Packing Lists</p>
              <p className="text-xs text-theme-muted font-medium mt-0.5 leading-normal">
                Smart age-adaptive lists, calculated diaper totals, weather items & PDF export
              </p>
            </div>
          </div>
          <ChevronRight size={20} className="text-theme-muted shrink-0" />
        </Card>
      </div>

      {/* Teeth Brushing Morning & Evening Routine Tracker */}
      <section className="bg-white rounded-[2.5rem] p-6 shadow-md border border-[#E8ECEB] space-y-5 text-left relative overflow-hidden">
        {/* Soft decorative visual background element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-100/40 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center shrink-0 border border-sky-100">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-theme-heading flex items-center gap-1.5 leading-tight">
                Teeth Brushing
              </h3>
              <p className="text-[10px] text-theme-muted font-bold uppercase tracking-wider mt-0.5">Morning & Evening Reminders</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {calculateStreak() > 0 && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider animate-bounce">
                🔥 {calculateStreak()} Day{calculateStreak() > 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={() => setShowBrushingSettings(!showBrushingSettings)}
              className={cn(
                "p-2.5 rounded-xl transition-all duration-150 border",
                showBrushingSettings 
                  ? "bg-slate-100 text-slate-700 border-slate-200" 
                  : "bg-slate-50 text-theme-muted hover:text-theme-heading border-[#E0E7E5]"
              )}
              title="Reminder schedule & Push Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Customizable reminders setting block */}
        <AnimatePresence>
          {showBrushingSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-slate-50 border border-[#E0E7E5] rounded-[2rem] p-5 space-y-4 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-[#E0E7E5] pb-3 mb-1">
                <div>
                  <h4 className="font-bold text-xs text-theme-heading uppercase tracking-wider">Reminder Alerts</h4>
                  <p className="text-[10px] text-theme-muted font-medium mt-0.5">Set daily push alert notifications</p>
                </div>
                <button
                  onClick={handleBrushingToggle}
                  className={cn(
                    "w-12 h-6 rounded-full p-1 transition-all duration-200 outline-none flex items-center shrink-0",
                    brushingRemindersActive ? "bg-theme-teal justify-end" : "bg-slate-200 justify-start"
                  )}
                >
                  <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-sm" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider flex items-center gap-1">
                    <Sun size={12} className="text-amber-500" /> Morning Alert
                  </label>
                  <input
                    type="time"
                    value={morningTime}
                    onChange={(e) => handleMorningTimeChange(e.target.value)}
                    disabled={!brushingRemindersActive}
                    className="w-full bg-white border border-[#E0E7E5] px-3 py-2 rounded-xl text-sm font-bold text-theme-text font-serif disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-theme-teal/20"
                  />
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider flex items-center gap-1">
                    <Moon size={12} className="text-indigo-500" /> Evening Alert
                  </label>
                  <input
                    type="time"
                    value={eveningTime}
                    onChange={(e) => handleEveningTimeChange(e.target.value)}
                    disabled={!brushingRemindersActive}
                    className="w-full bg-white border border-[#E0E7E5] px-3 py-2 rounded-xl text-sm font-bold text-theme-text font-serif disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-theme-teal/20"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tracking control layout block */}
        <div className="grid grid-cols-2 gap-4">
          {/* Morning Brushing Entry */}
          {(() => {
            const morningBrushed = brushingLogs.find(log => log.timeOfDay === 'morning' && format(new Date(log.timestamp), 'yyyy-MM-dd') === todayStr);
            return (
              <div className={cn(
                "rounded-[2rem] p-5 border transition-all duration-200 relative flex flex-col justify-between h-40",
                morningBrushed 
                  ? "bg-sky-50/50 border-sky-100" 
                  : "bg-amber-50/50 border-amber-100 hover:bg-amber-50/70"
              )}>
                <div className="flex justify-between items-start">
                  <span className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center border",
                    morningBrushed 
                      ? "bg-sky-50 border-sky-200 text-sky-500" 
                      : "bg-amber-50 border-amber-200 text-amber-500"
                  )}>
                    <Sun size={20} />
                  </span>
                  {morningBrushed && (
                    <button
                      onClick={() => undoBrushing(morningBrushed.id!, "Morning")}
                      className="p-1.5 text-slate-300 hover:text-theme-salmon hover:bg-white rounded-lg transition-all shrink-0"
                      title="Undo morning log"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="mt-2 text-left">
                  <h4 className="font-extrabold text-sm text-theme-heading">Morning Brush</h4>
                  <p className="text-[10px] text-theme-muted font-bold tracking-wider uppercase mt-0.5">
                    {morningBrushed ? `Today at ${format(new Date(morningBrushed.timestamp), 'hh:mm a')}` : `Scheduled at ${morningTime}`}
                  </p>
                </div>

                {!morningBrushed ? (
                  <Button
                    onClick={() => logBrushing('morning')}
                    className="mt-2 py-1.5 px-3 h-8 text-[10px] font-black tracking-widest uppercase bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-none w-full shrink-0"
                  >
                    Log Done
                  </Button>
                ) : (
                  <span className="mt-2 h-8 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider text-green-600 bg-white border border-green-200 rounded-xl leading-none">
                    <Check size={12} className="stroke-[3]" /> Clean!
                  </span>
                )}
              </div>
            );
          })()}

          {/* Evening Brushing Entry */}
          {(() => {
            const eveningBrushed = brushingLogs.find(log => log.timeOfDay === 'evening' && format(new Date(log.timestamp), 'yyyy-MM-dd') === todayStr);
            return (
              <div className={cn(
                "rounded-[2rem] p-5 border transition-all duration-200 relative flex flex-col justify-between h-40",
                eveningBrushed 
                  ? "bg-indigo-50/50 border-indigo-100" 
                  : "bg-slate-50 border-[#E0E7E5] hover:bg-slate-100/50"
              )}>
                <div className="flex justify-between items-start">
                  <span className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center border",
                    eveningBrushed 
                      ? "bg-indigo-50 border-indigo-200 text-indigo-500" 
                      : "bg-slate-100 border-[#E0E7E5] text-slate-500"
                  )}>
                    <Moon size={20} />
                  </span>
                  {eveningBrushed && (
                    <button
                      onClick={() => undoBrushing(eveningBrushed.id!, "Evening")}
                      className="p-1.5 text-slate-300 hover:text-theme-salmon hover:bg-white rounded-lg transition-all shrink-0"
                      title="Undo evening log"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="mt-2 text-left">
                  <h4 className="font-extrabold text-sm text-theme-heading">Evening Brush</h4>
                  <p className="text-[10px] text-theme-muted font-bold tracking-wider uppercase mt-0.5">
                    {eveningBrushed ? `Today at ${format(new Date(eveningBrushed.timestamp), 'hh:mm a')}` : `Scheduled at ${eveningTime}`}
                  </p>
                </div>

                {!eveningBrushed ? (
                  <Button
                    onClick={() => logBrushing('evening')}
                    className="mt-2 py-1.5 px-3 h-8 text-[10px] font-black tracking-widest uppercase bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-none w-full shrink-0"
                  >
                    Log Done
                  </Button>
                ) : (
                  <span className="mt-2 h-8 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-white border border-indigo-200 rounded-xl leading-none">
                    <Check size={12} className="stroke-[3]" /> Clean!
                  </span>
                )}
              </div>
            );
          })()}
        </div>

        {/* 7 Days Histographical Timeline Row */}
        <div className="border-t border-[#F0F2F1] pt-4 mt-2">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#5C6E68]">
              Weekly Progress Review
            </h4>
            <div className="flex items-center gap-3 text-[9px] font-bold text-theme-muted uppercase tracking-wider">
              <span className="flex items-center gap-1"><Sun size={10} className="text-amber-500" /> Morning</span>
              <span className="flex items-center gap-1"><Moon size={10} className="text-indigo-500" /> Evening</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              return d;
            }).map((day, idx) => {
              const dStr = format(day, 'yyyy-MM-dd');
              const dLogs = brushingLogs.filter(l => format(new Date(l.timestamp), 'yyyy-MM-dd') === dStr);
              const mDone = dLogs.some(l => l.timeOfDay === 'morning');
              const eDone = dLogs.some(l => l.timeOfDay === 'evening');
              const isTodayDay = dStr === todayStr;

              return (
                <div 
                  key={idx} 
                  className={cn(
                    "flex flex-col items-center p-2 rounded-2xl gap-2",
                    isTodayDay ? "bg-sky-50/50 border border-sky-100" : "bg-transparent"
                  )}
                >
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-wider",
                    isTodayDay ? "text-sky-600 font-extrabold" : "text-theme-muted"
                  )}>
                    {format(day, 'eee').slice(0, 2)}
                  </span>
                  
                  <div className="flex flex-col gap-1.5">
                    {/* Morning bubble icon indicator */}
                    <div 
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center border transition-all text-[9.5px] font-black uppercase",
                        mDone 
                          ? "bg-amber-400 border-amber-300 text-white shadow-sm" 
                          : "bg-slate-50 border-slate-100 text-slate-300 pointer-events-none"
                      )}
                      title={mDone ? "Morning brush complete!" : "Morning brush incomplete"}
                    >
                      <Sun size={10} />
                    </div>

                    {/* Evening bubble icon indicator */}
                    <div 
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center border transition-all text-[9.5px] font-black uppercase",
                        eDone 
                          ? "bg-indigo-500 border-indigo-400 text-white shadow-sm" 
                          : "bg-slate-50 border-slate-100 text-slate-300 pointer-events-none"
                      )}
                      title={eDone ? "Evening brush complete!" : "Evening brush incomplete"}
                    >
                      <Moon size={10} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recent Activity Section */}
      <section className="bg-white rounded-[2.5rem] p-8 shadow-md border border-[#E8ECEB]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-theme-heading flex items-center gap-2">
            <span>📅</span> Activity
          </h2>
          <Button variant="ghost" className="text-xs uppercase tracking-widest font-bold">Details</Button>
        </div>
        
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[#F0F2F1]"></div>
          <div className="space-y-8 relative">
            {visits.length > 0 ? (
              <div className="flex gap-6 items-start pl-0">
                <div className="w-8 h-8 rounded-full bg-theme-salmon text-white flex items-center justify-center relative z-10">
                  <Stethoscope size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-theme-muted uppercase">{format(visits[0].date, 'PPPP')}</p>
                  <p className="font-bold text-theme-text">Visit with {visits[0].doctorName}</p>
                  <p className="text-sm text-theme-muted mt-1 leading-relaxed line-clamp-2">{visits[0].advice}</p>
                </div>
              </div>
            ) : null}
            
            {milestones.length > 0 ? (
              <div className="flex gap-6 items-start pl-0">
                <div className="w-8 h-8 rounded-full bg-theme-teal text-white flex items-center justify-center relative z-10 text-xs">★</div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-theme-muted uppercase">{format(milestones[0].date, 'PPPP')}</p>
                  <p className="font-bold text-theme-text">{milestones[0].title}</p>
                  <p className="text-sm text-theme-muted mt-1 leading-relaxed line-clamp-2">{milestones[0].description}</p>
                </div>
              </div>
            ) : null}
            
            {visits.length === 0 && milestones.length === 0 && (
              <div className="py-12 text-center">
                <Smile className="mx-auto text-slate-200 mb-2" size={32} />
                <p className="text-sm text-theme-muted">No recent activities logged.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Notification Center Modal */}
      <AnimatePresence>
        {showNotificationsModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-theme-heading/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-[2.5rem] p-8 shadow-2xl relative border border-[#E0E7E5] max-h-[85vh] overflow-y-auto flex flex-col gap-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-theme-teal-light text-theme-teal rounded-2xl">
                    <BellRing size={22} className="text-theme-teal" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-theme-heading tracking-tight">Notification Center</h3>
                    <p className="text-[10px] text-theme-muted font-bold uppercase tracking-widest mt-0.5">Control & check alerts</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowNotificationsModal(false)}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-theme-muted hover:text-theme-heading transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Browser Permission Setup */}
              <div className="bg-slate-50 border border-[#E0E7E5] p-5 rounded-[2rem] space-y-3 text-left">
                <h4 className="text-xs font-black uppercase tracking-widest text-theme-heading">Desktop Notification Subscription</h4>
                <p className="text-xs text-theme-muted font-medium leading-relaxed">
                  Enable desktop-wide reminder push alerts so you never miss medicine dosages, vaccinations, and milestones even if this tab is closed.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {notificationPermission === 'granted' ? (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 animate-pulse">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      Notifications Subscribed
                    </span>
                  ) : notificationPermission === 'denied' ? (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-rose-200">
                      Permission Blocked / Denied
                    </span>
                  ) : (
                    <Button 
                      onClick={requestDesktopPermission}
                      className="py-2.5 h-10 px-4 text-xs font-bold bg-theme-teal text-white rounded-xl"
                    >
                      Allow Browser Alerts
                    </Button>
                  )}
                  <Button 
                    variant="secondary"
                    onClick={sendTestAlarm}
                    className="py-2.5 h-10 px-4 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border-none rounded-xl"
                  >
                    Send Test Alert
                  </Button>
                </div>
              </div>

              {/* Medicine Checklist */}
              <div className="space-y-4 text-left">
                <h4 className="text-xs font-black uppercase tracking-widest text-theme-heading">Today's Medicine Dose Schedule</h4>
                {medicines.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-[#E0E7E5] rounded-3xl bg-slate-50">
                    <Pill size={32} className="mx-auto text-slate-300 mb-2 animate-bounce duration-1000" />
                    <p className="text-xs text-theme-muted font-medium">No active scheduled medicines found.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {medicines.map((med) => {
                      const takenTimesToday = takenMedicinesLog.filter(t => 
                        t.medicineId === med.id && 
                        new Date(t.takenAt).toDateString() === new Date().toDateString()
                      ).length;

                      return (
                        <div key={med.id} className="flex gap-4 items-center justify-between p-4 bg-white border border-[#E0E7E5] rounded-3xl shadow-sm hover:shadow transition-shadow">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-theme-salmon-light/30 text-theme-salmon rounded-2xl flex items-center justify-center shrink-0">
                              <Pill size={20} />
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-sm text-theme-text">{med.name}</p>
                              <p className="text-xs text-theme-muted font-medium mt-0.5">
                                {med.dosage} · Scheduled: {med.reminders?.join(', ') || 'as-needed'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs font-bold text-theme-muted bg-slate-100 px-2 py-1 rounded-lg">
                              Taken: {takenTimesToday}x today
                            </span>
                            <button
                              onClick={() => med.id && markMedicineAsTaken(med.id, med.name)}
                              className="p-2.5 bg-theme-teal text-white hover:bg-teal-600 rounded-xl transition-all shadow-sm flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 duration-100"
                              title="Log Dose Taken Now"
                            >
                              <Check size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Upcoming Vaccine Alerts */}
              <div className="space-y-4 text-left">
                <h4 className="text-xs font-black uppercase tracking-widest text-theme-heading">Upcoming Vaccine Schedule</h4>
                {allUpcomingVaccines.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-[#E0E7E5] rounded-3xl bg-slate-50">
                    <Syringe size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs text-theme-muted font-medium">No impending upcoming vaccinations in system.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {allUpcomingVaccines.map((vax) => (
                      <div key={vax.id} className="flex items-center gap-4 justify-between p-4 bg-white border border-[#E0E7E5] rounded-3xl shadow-sm hover:shadow transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-theme-blue-light/50 text-theme-blue rounded-2xl flex items-center justify-center shrink-0">
                            <Syringe size={20} />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-sm text-theme-text">{vax.name}</p>
                            <p className="text-xs text-theme-muted font-medium mt-0.5 text-ellipsis overflow-hidden whitespace-nowrap max-w-[200px]">
                              Due date: {format(new Date(vax.dueDate), 'PPPP')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Visit Preparation Section ---
const VisitPrepSection = ({ babyId }: { babyId: number }) => {
  const baby = useLiveQuery(() => babyId ? db.babies.get(babyId) : undefined, [babyId]);
  const questions = useLiveQuery(() => babyId ? db.visitQuestions.where('babyId').equals(babyId).reverse().toArray() : [], [babyId]) || [];
  
  const [newQuestion, setNewQuestion] = useState('');
  const [category, setCategory] = useState('General');
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [notesVal, setNotesVal] = useState('');

  const babyDob = baby?.dob;
  const ageInMonths = babyDob ? differenceInMonths(new Date(), new Date(babyDob)) : 0;

  const categories = ['Feeding', 'Sleep', 'Development', 'Vaccines', 'General'];

  const getAgeSuggestions = (months: number) => {
    if (months <= 1) {
      return [
        { q: "Is my baby getting enough breastmilk or formula?", cat: "Feeding" },
        { q: "Is it normal for a newborn to sleep up to 18 hours a day?", cat: "Sleep" },
        { q: "What body temperature is considered a fever for a newborn?", cat: "General" },
        { q: "How do I clean and care for the umbilical cord stump?", cat: "General" }
      ];
    } else if (months <= 3) {
      return [
        { q: "What side effects are expected from the 2-month vaccine shots?", cat: "Vaccines" },
        { q: "How much tummy time should we do every day?", cat: "Development" },
        { q: "Is spit-up supposed to happen after almost every feed?", cat: "Feeding" },
        { q: "How do I safely establish a consistent bedtime routine?", cat: "Sleep" }
      ];
    } else if (months <= 5) {
      return [
        { q: "When and how should we introduce solid foods or baby purées?", cat: "Feeding" },
        { q: "How do we survive or deal with the 4-month sleep regression?", cat: "Sleep" },
        { q: "Should my baby be rolling over or actively reaching for toys?", cat: "Development" },
        { q: "My baby drools constantly - is teething starting?", cat: "General" }
      ];
    } else if (months <= 8) {
      return [
        { q: "How do we structure finger foods or start baby-led weaning?", cat: "Feeding" },
        { q: "How can I encourage sitting unsupported, crawling, or rolling?", cat: "Development" },
        { q: "Can teething pain disrupt sleep, and what care can I give?", cat: "Sleep" },
        { q: "When and how much water can we start offering to drink?", cat: "Feeding" }
      ];
    } else if (months <= 11) {
      return [
        { q: "Should my baby be saying consonant sounds like 'ba-ba'?", cat: "Development" },
        { q: "What are critical baby-proofing actions now that baby crawls?", cat: "General" },
        { q: "When should we transition from baby bottles to an open cup?", cat: "Feeding" },
        { q: "How much table food should they be eating relative to milk?", cat: "Feeding" }
      ];
    } else {
      return [
        { q: "How do I transition from formula/breastmilk to whole milk?", cat: "Feeding" },
        { q: "What words, hand gestures, or walking behaviors are expected?", cat: "Development" },
        { q: "What is the timeline for upcoming MMR or Varicella vaccine shots?", cat: "Vaccines" },
        { q: "How should we handle toddler tantrums or head-shaking behavior?", cat: "General" }
      ];
    }
  };

  const suggestions = getAgeSuggestions(ageInMonths);

  const handleAddQuestion = async (text: string, cat: string) => {
    if (!text.trim()) return;
    try {
      await db.visitQuestions.add({
        babyId,
        question: text.trim(),
        category: cat,
        isAnswered: 0,
        createdAt: new Date()
      });
      toast.success("Question prepared for doctor visit!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to add question.");
    }
  };

  const toggleAnswered = async (id: number, currentVal: number) => {
    try {
      await db.visitQuestions.update(id, {
        isAnswered: currentVal === 1 ? 0 : 1
      });
    } catch (e) {
      console.error(e);
    }
  };

  const saveNotes = async (id: number) => {
    try {
      await db.visitQuestions.update(id, {
        notes: notesVal
      });
      setEditingNotesId(null);
      toast.success("Doctor's response saved!");
    } catch (e) {
      console.error(e);
    }
  };

  const deleteQuestion = async (id: number) => {
    try {
      await db.visitQuestions.delete(id);
      toast.success("Question deleted");
    } catch (e) {
      console.error(e);
    }
  };

  const unanswered = questions.filter(q => q.isAnswered === 0);
  const answered = questions.filter(q => q.isAnswered === 1);

  return (
    <div className="space-y-6">
       {/* Card to add custom question */}
       <Card id="add-prep-question-card" className="p-6 border-none shadow-sm bg-white rounded-3xl">
          <h3 className="font-bold text-lg text-theme-heading mb-4">Add a Question to Ask</h3>
          <div className="space-y-4">
             <div className="flex gap-2">
               <input 
                 id="prep-question-input"
                 type="text"
                 placeholder="Type your question..."
                 value={newQuestion}
                 onChange={e => setNewQuestion(e.target.value)}
                 className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 placeholder-slate-400 focus:bg-white focus:border-theme-teal outline-none text-sm transition-all shadow-sm"
               />
               <Button 
                 id="add-prep-question-btn"
                 onClick={() => {
                   handleAddQuestion(newQuestion, category);
                   setNewQuestion('');
                 }}
                 className="px-6 bg-theme-teal text-white h-auto"
               >
                 Add
               </Button>
             </div>
             
             <div className="flex flex-wrap gap-2 items-center">
               <span className="text-[10px] uppercase font-black tracking-wider text-theme-muted mr-1">Category:</span>
               {categories.map(cat => (
                 <button
                   id={`category-btn-${cat}`}
                   key={cat}
                   onClick={() => setCategory(cat)}
                   className={cn(
                     "px-3 py-1.5 text-xs font-bold rounded-xl transition-all uppercase tracking-wider",
                     category === cat 
                       ? "bg-slate-900 text-white" 
                       : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                   )}
                 >
                   {cat}
                 </button>
               ))}
             </div>
          </div>
       </Card>

       {/* Suggested Questions based on child size / age */}
       {suggestions.length > 0 && (
         <div className="space-y-3">
           <h3 id="hints-for-baby-age" className="text-[10px] font-black uppercase tracking-widest text-theme-muted pl-1">
             AI Suggestions for {baby?.name || 'baby'} ({ageInMonths} {ageInMonths === 1 ? 'month' : 'months'} old)
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
             {suggestions.map((sug, i) => (
               <div 
                 id={`suggest-${sug.cat}-${i}`}
                 key={i}
                 onClick={() => handleAddQuestion(sug.q, sug.cat)}
                 className="bg-white p-4 rounded-2xl cursor-pointer hover:border-theme-teal/30 hover:bg-slate-50 border border-slate-100 shadow-sm flex justify-between items-center transition-all group"
               >
                 <div className="flex-1 text-left pr-2">
                   <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 mb-1 inline-block">
                     {sug.cat}
                   </span>
                   <p className="text-sm font-semibold text-theme-text leading-snug">{sug.q}</p>
                 </div>
                 <div className="w-8 h-8 rounded-full bg-theme-teal-light text-theme-teal flex items-center justify-center font-bold text-sm shrink-0 transition-colors group-hover:bg-theme-teal group-hover:text-white">
                   +
                 </div>
               </div>
             ))}
           </div>
         </div>
       )}

       {/* Active Questions list */}
       <div className="space-y-4 pt-2">
         <h3 id="prep-list-header" className="text-[10px] font-black uppercase tracking-widest text-theme-muted pl-1">
           Your Prep List ({questions.length} total)
         </h3>

         {unanswered.length > 0 && (
           <div className="space-y-3">
             {unanswered.map(q => (
               <div key={q.id}>
                 <Card id={`question-card-${q.id}`} className="p-5 border-none shadow-sm bg-white rounded-3xl relative group overflow-hidden">
                 <div className="flex items-start gap-4">
                   <button 
                     id={`question-checkbox-${q.id}`}
                     onClick={() => toggleAnswered(q.id!, q.isAnswered)}
                     className="mt-0.5 w-6 h-6 rounded-lg border-2 border-theme-teal/30 flex items-center justify-center text-theme-teal bg-white hover:border-theme-teal hover:bg-theme-teal-light/25 shrink-0 transition-colors"
                   >
                     {q.isAnswered === 1 && "✓"}
                   </button>
                   
                   <div className="flex-1">
                     <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                       <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                         {q.category}
                       </span>
                     </div>
                     <p className="text-base font-bold text-theme-text leading-relaxed">{q.question}</p>
                     
                     {/* Notes for Answers */}
                     <div className="mt-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                       <div className="flex justify-between items-center mb-1">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Doctor's response / Answer notes</span>
                         {editingNotesId !== q.id ? (
                           <button 
                             id={`edit-notes-btn-${q.id}`}
                             onClick={() => {
                               setEditingNotesId(q.id!);
                               setNotesVal(q.notes || '');
                             }}
                             className="text-xs font-bold text-theme-teal hover:underline bg-transparent border-none p-0"
                           >
                             {q.notes ? 'Edit Notes' : '+ Record Answer'}
                           </button>
                         ) : null}
                       </div>
                       
                       {editingNotesId === q.id ? (
                         <div className="space-y-2 mt-2">
                           <textarea
                             id={`notes-textarea-${q.id}`}
                             className="w-full p-3 text-sm bg-white rounded-xl border border-slate-200 outline-none focus:border-theme-teal min-h-[70px]"
                             placeholder="Write down the doctor's response here..."
                             value={notesVal}
                             onChange={e => setNotesVal(e.target.value)}
                           />
                           <div className="flex gap-2">
                             <Button id={`save-notes-btn-${q.id}`} onClick={() => saveNotes(q.id!)} className="px-3 py-1.5 text-xs h-auto w-auto bg-theme-teal text-white">Save</Button>
                             <Button id={`cancel-notes-btn-${q.id}`} onClick={() => setEditingNotesId(null)} variant="secondary" className="px-3 py-1.5 text-xs h-auto w-auto border-transparent text-slate-500 hover:bg-slate-100">Cancel</Button>
                           </div>
                         </div>
                       ) : (
                         <p className="text-sm text-theme-muted italic">
                           {q.notes || 'No doctor answers written yet.'}
                         </p>
                       )}
                     </div>
                   </div>

                   <button 
                     id={`delete-question-btn-${q.id}`}
                     onClick={() => deleteQuestion(q.id!)}
                     className="text-slate-300 hover:text-theme-salmon transition-colors shrink-0 p-1 bg-transparent border-none"
                   >
                     <X size={18} />
                   </button>
                 </div>
               </Card>
             </div>
           ))}
           </div>
         )}

         {/* Answered / Completed Questions list */}
         {answered.length > 0 && (
           <div className="space-y-3 opacity-90">
             <h4 id="answered-list-header" className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1 mt-6">
                Answered & Discussed ({answered.length})
             </h4>
             {answered.map(q => (
               <div key={q.id}>
                 <Card id={`answered-card-${q.id}`} className="p-5 border-none shadow-sm bg-slate-50/55 rounded-3xl">
                   <div className="flex items-start gap-4">
                     <button 
                       id={`answered-checkbox-${q.id}`}
                       onClick={() => toggleAnswered(q.id!, q.isAnswered)}
                       className="mt-0.5 w-6 h-6 rounded-lg bg-theme-teal text-white flex items-center justify-center font-bold shrink-0 transition-colors"
                     >
                       ✓
                     </button>
                     
                     <div className="flex-1">
                       <p className="text-base font-bold text-slate-400 line-through leading-relaxed">{q.question}</p>
                       
                       {q.notes && (
                         <div className="mt-2 bg-white/60 rounded-xl p-3 border border-slate-100">
                           <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Answer Summary</span>
                           <p className="text-sm text-theme-muted leading-relaxed">{q.notes}</p>
                         </div>
                       )}
                     </div>

                     <button 
                       id={`delete-answered-btn-${q.id}`}
                       onClick={() => deleteQuestion(q.id!)}
                       className="text-slate-300 hover:text-theme-salmon transition-colors shrink-0 p-1 bg-transparent border-none"
                     >
                       <X size={18} />
                     </button>
                   </div>
                 </Card>
               </div>
             ))}
           </div>
         )}

         {questions.length === 0 && (
           <div id="empty-state-visit-questions" className="py-12 text-center bg-white rounded-3xl border border-slate-50 shadow-sm">
             <ClipboardList className="mx-auto text-slate-200 mb-3" size={36} />
             <p className="font-bold text-sm text-slate-500">No questions prepared yet.</p>
             <p className="text-xs text-theme-muted mt-1 px-8 block">Add your concerns above or choose from standard pediatric suggested questions to build your list for the next visit!</p>
           </div>
         )}
       </div>
    </div>
  );
};


// --- Journal Screen ---
const JournalScreen = ({ babyId }: { babyId: number }) => {
  const visits = useLiveQuery(() => babyId ? db.doctorVisits.where('babyId').equals(babyId).reverse().toArray() : [], [babyId]);
  const [showAdd, setShowAdd] = useState(false);
  const [subTab, setSubTab] = useState<'records' | 'prep'>('records');
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; title: string } | null>(null);

  return (
    <div className="space-y-6 pb-24 h-full">
      <div className="flex items-center justify-between px-2 pt-4">
         <div>
            <h1 className="text-3xl font-bold text-theme-heading tracking-tight">Health Journal</h1>
            <p className="text-theme-muted text-sm font-medium uppercase tracking-widest mt-1">
              {subTab === 'records' ? 'Medical records' : 'Next Visit Preparation'}
            </p>
         </div>
         {subTab === 'records' && (
           <Button id="new-visit-button" onClick={() => setShowAdd(true)} className="px-5 py-3 text-sm flex items-center gap-2 bg-theme-teal shadow-theme-teal/10">
             <PlusCircle size={18} />
             New Visit
           </Button>
         )}
      </div>

      {/* Sub Tabs Selection */}
      <div id="journal-subtabs-bar" className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-[#F0F2F1] mx-2">
         <button 
           id="sub-tab-records"
           onClick={() => setSubTab('records')} 
           className={cn("flex-1 py-3 px-1 text-[11px] font-bold rounded-xl transition-all uppercase tracking-widest", subTab === 'records' ? "bg-theme-teal text-white shadow-md" : "text-theme-muted bg-transparent")}
         >
           Medical Records
         </button>
         <button 
           id="sub-tab-prep"
           onClick={() => setSubTab('prep')} 
           className={cn("flex-1 py-3 px-1 text-[11px] font-bold rounded-xl transition-all uppercase tracking-widest", subTab === 'prep' ? "bg-theme-teal text-white shadow-md whitespace-nowrap" : "text-theme-muted bg-transparent")}
         >
           Ask Doctor Prep
         </button>
      </div>

      {subTab === 'records' ? (
        <div className="space-y-4">
          {visits?.map((visit, i) => (
            <motion.div
              key={visit.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card id={`visit-card-${visit.id}`} className="relative overflow-hidden group border-l-8 border-l-theme-blue bg-theme-blue-light/20">
                <div className="flex justify-between items-start mb-4">
                  <div>
                     <h3 className="font-bold text-xl text-theme-heading">{visit.doctorName}</h3>
                     <div className="flex items-center gap-2 text-xs font-bold text-theme-muted uppercase tracking-wider mt-1">
                       <Calendar size={14} />
                       {format(visit.date, 'PPPP')}
                     </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-theme-blue mb-2">Symptoms</h4>
                    <p className="text-sm text-theme-text bg-white p-4 rounded-2xl shadow-sm leading-relaxed">{visit.symptoms}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-theme-blue mb-2">Advice</h4>
                    <p className="text-sm text-theme-text bg-white/70 p-4 rounded-2xl border border-dashed border-theme-blue/30 leading-relaxed">{visit.advice}</p>
                  </div>
                  {visit.prescriptionImage && (
                    <div className="pt-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-theme-blue mb-2">Attached Prescription</h4>
                      <button
                        onClick={() => setSelectedPhoto({ url: visit.prescriptionImage!, title: `Prescription from ${visit.doctorName}` })}
                        className="flex items-center gap-2 text-xs text-theme-teal hover:text-teal-700 bg-white border border-[#E0E7E5] px-4 py-2.5 rounded-xl transition-all font-bold shadow-sm hover:shadow"
                      >
                        <FileText size={15} className="text-theme-teal" />
                        View Prescription Document
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
          {visits?.length === 0 && (
            <div id="records-empty-state" className="text-center py-20 text-theme-muted space-y-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                 <Stethoscope size={32} className="opacity-20" />
              </div>
              <p className="text-sm font-bold uppercase tracking-widest">No visit entries yet.</p>
            </div>
          )}
        </div>
      ) : (
        <VisitPrepSection babyId={babyId} />
      )}

      {/* Lightbox / Zoom-in Modal for Prescription */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-theme-heading/85 backdrop-blur-md">
          <div className="relative max-w-lg w-full bg-white rounded-[2.5rem] p-6 shadow-2xl overflow-hidden flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-theme-heading">{selectedPhoto.title}</h3>
              <button 
                onClick={() => setSelectedPhoto(null)} 
                className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-theme-muted hover:text-theme-heading transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="aspect-square w-full rounded-2xl overflow-hidden bg-slate-50 border border-[#E0E7E5] flex items-center justify-center relative shadow-inner">
              <img src={selectedPhoto.url} className="w-full h-full object-contain" alt={selectedPhoto.title} referrerPolicy="no-referrer" />
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <Modal title="New Doctor Visit" onClose={() => setShowAdd(false)}>
           <AddVisitForm babyId={babyId} onComplete={() => setShowAdd(false)} />
        </Modal>
      )}
    </div>
  );
};

// --- Seed Data ---

const STANDARD_VACCINES = [
  { name: 'BCG', months: 0 },
  { name: 'Hepatitis B (Dose 1)', months: 0 },
  { name: 'Polio (IPV) (Dose 1)', months: 2 },
  { name: 'DTP (Dose 1)', months: 2 },
  { name: 'Hib (Dose 1)', months: 2 },
  { name: 'Rotavirus (Dose 1)', months: 2 },
  { name: 'Measles (Dose 1)', months: 9 },
];

// --- Vaccine Screen ---
const VaccineScreen = ({ babyId, babyDob }: { babyId: number, babyDob: Date }) => {
  const vaccines = useLiveQuery(() => babyId ? db.vaccines.where('babyId').equals(babyId).toArray() : [], [babyId]);
  
  useEffect(() => {
    if (!babyId) return;
    const seed = async () => {
      const existing = await db.vaccines.where('babyId').equals(babyId).count();
      if (existing === 0) {
        const initialVaccines = STANDARD_VACCINES.map(v => ({
          babyId,
          name: v.name,
          dueDate: new Date(new Date(babyDob).setMonth(new Date(babyDob).getMonth() + v.months)),
          status: 'upcoming' as const
        }));
        await db.vaccines.bulkAdd(initialVaccines);
      }
    };
    seed();
  }, [babyId, babyDob]);

  const toggleComplete = async (id: number, currentStatus: string) => {
    if (!id) return;
    await db.vaccines.update(id, { 
      status: currentStatus === 'completed' ? 'upcoming' : 'completed',
      completedDate: currentStatus === 'completed' ? null : new Date()
    });
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="px-2 pt-4">
         <h1 className="text-3xl font-bold text-theme-heading tracking-tight">Vaccine Schedule</h1>
         <p className="text-theme-muted text-sm font-medium uppercase tracking-widest mt-1">Due & Completed History</p>
      </div>

      <div className="space-y-4">
        {vaccines?.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()).map((vax, i) => (
          <div key={vax.id}>
            <Card className={cn(
              "relative overflow-hidden py-5 border-l-8",
              vax.status === 'completed' ? "border-l-theme-teal bg-theme-teal-light/20" : "border-l-theme-blue bg-theme-blue-light/30"
            )}>
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <button 
                      onClick={() => toggleComplete(vax.id!, vax.status)}
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm",
                        vax.status === 'completed' 
                          ? "bg-theme-teal text-white" 
                          : "bg-white text-theme-blue border-2 border-theme-blue/20"
                      )}
                    >
                      <Syringe size={22} />
                    </button>
                    <div>
                      <h3 className="font-bold text-theme-text text-lg">{vax.name}</h3>
                      <p className="text-xs text-theme-muted font-bold uppercase tracking-wider mt-1">
                        {vax.status === 'completed' ? `Done on ${format(vax.completedDate!, 'PP')}` : `Due by ${format(vax.dueDate, 'PP')}`}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm",
                    vax.status === 'completed' ? "bg-theme-teal text-white" : "bg-white text-theme-blue border border-theme-blue/10"
                  )}>
                    {vax.status}
                  </div>
               </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Milestones & Memories ---
const MilestonesScreen = ({ babyId }: { babyId: number }) => {
  const baby = useLiveQuery(() => babyId ? db.babies.get(babyId) : undefined, [babyId]);
  const miles = useLiveQuery(() => babyId ? db.milestones.where('babyId').equals(babyId).reverse().toArray() : [], [babyId]);
  const memories = useLiveQuery(() => babyId ? db.memories.where('babyId').equals(babyId).reverse().toArray() : [], [babyId]);
  const growthRecords = useLiveQuery(() => babyId ? db.growthRecords.where('babyId').equals(babyId).sortBy('date') : [], [babyId]) || [];
  
  const [showAdd, setShowAdd] = useState(false);
  const [showGrowthAdd, setShowGrowthAdd] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [tab, setTab] = useState<'timeline' | 'gallery' | 'growth'>('timeline');

  // Prepare chart data
  const gender = baby?.gender || 'boy';
  const weightRef = gender === 'girl' ? WHO_WEIGHT_GIRLS : WHO_WEIGHT_BOYS;
  const lengthRef = gender === 'girl' ? WHO_LENGTH_GIRLS : WHO_LENGTH_BOYS;

  const getAgeInMonths = (date: Date) => {
    if (!baby) return 0;
    const diff = differenceInMonths(date, new Date(baby.dob));
    return Math.max(0, diff);
  };

  // Combine WHO data with actual baby measurements
  const weightChartData = weightRef.map(ref => {
    const actual = growthRecords.find(r => getAgeInMonths(r.date) === ref.age);
    return {
      ...ref,
      actualWeight: actual?.weight
    };
  });

  const lengthChartData = lengthRef.map(ref => {
    const actual = growthRecords.find(r => getAgeInMonths(r.date) === ref.age);
    return {
      ...ref,
      actualHeight: actual?.height
    };
  });

  return (
    <div className="space-y-6 pb-24 h-full">
      <div className="flex items-center justify-between px-2 pt-4">
         <h1 className="text-3xl font-bold text-theme-heading tracking-tight">Growth Journey</h1>
         <div className="flex gap-2">
           <Button onClick={() => setShowVideo(true)} variant="secondary" className="p-3 aspect-square flex items-center justify-center bg-theme-salmon-light text-theme-salmon rounded-2xl border-theme-salmon/10">
             <Play size={20} fill="currentColor" />
           </Button>
           {tab === 'growth' ? (
              <Button onClick={() => setShowGrowthAdd(true)} className="px-5 py-3 text-sm flex items-center gap-2 bg-theme-green shadow-theme-green/10">
                <PlusCircle size={18} />
                Log Size
              </Button>
           ) : (
              <Button onClick={() => setShowAdd(true)} className="px-5 py-3 text-sm flex items-center gap-2 bg-theme-teal shadow-theme-teal/10">
                <PlusCircle size={18} />
                Moment
              </Button>
           )}
         </div>
      </div>

      <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-[#F0F2F1] mx-2">
         <button onClick={() => setTab('timeline')} className={cn("flex-1 py-3 px-1 text-[11px] font-bold rounded-xl transition-all uppercase tracking-widest", tab === 'timeline' ? "bg-theme-teal text-white shadow-md shadow-theme-teal/20" : "text-theme-muted")}>Timeline</button>
         <button onClick={() => setTab('gallery')} className={cn("flex-1 py-3 px-1 text-[11px] font-bold rounded-xl transition-all uppercase tracking-widest", tab === 'gallery' ? "bg-theme-teal text-white shadow-md shadow-theme-teal/20" : "text-theme-muted")}>Gallery</button>
         <button onClick={() => setTab('growth')} className={cn("flex-1 py-3 px-1 text-[11px] font-bold rounded-xl transition-all uppercase tracking-widest", tab === 'growth' ? "bg-theme-teal text-white shadow-md shadow-theme-teal/20" : "text-theme-muted")}>Growth</button>
      </div>

      {tab === 'timeline' && (
        <div className="space-y-8 relative before:absolute before:left-8 before:top-4 before:bottom-4 before:w-1 before:bg-[#F0F2F1] pl-4 pr-2">
          {miles?.map((m, i) => (
            <div key={m.id} className="relative pl-14">
              <div className="absolute left-6 top-3 w-4 h-4 rounded-full border-4 border-white bg-theme-teal z-10 shadow-sm" />
              <Card className="hover:border-theme-teal/20 transition-all shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-theme-heading text-lg">{m.title}</h3>
                  <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded-full">{format(m.date, 'MMM yyyy')}</span>
                </div>
                <p className="text-sm text-theme-text leading-relaxed font-medium">{m.description}</p>
                {m.photo && (
                  <img src={m.photo} className="mt-5 rounded-[2rem] w-full aspect-square object-cover shadow-sm border border-slate-50" alt={m.title} />
                )}
              </Card>
            </div>
          ))}
          {miles?.length === 0 && (
            <div className="text-center py-20 text-theme-muted space-y-4">
               <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <Smile size={32} className="opacity-20" />
               </div>
               <p className="text-sm font-bold uppercase tracking-widest">Capture your baby's<br/>first smile or word!</p>
            </div>
          )}
        </div>
      )}

      {tab === 'gallery' && (
        <div className="grid grid-cols-2 gap-4 px-2">
          {memories?.map(m => (
            <div key={m.id}>
              <Card className="p-0 overflow-hidden group relative rounded-3xl border-none shadow-md">
                 <div className="aspect-square">
                   <img src={m.photo} className="w-full h-full object-cover" alt={m.caption} />
                   <div className="absolute inset-0 bg-gradient-to-t from-theme-text/90 via-transparent to-transparent flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <p className="text-white text-[11px] font-bold mb-1 tracking-tight">{m.caption}</p>
                      <span className="text-[10px] text-white/70 font-bold uppercase tracking-wider">{format(m.date, 'PP')}</span>
                   </div>
                 </div>
              </Card>
            </div>
          ))}
          <Card className="aspect-square border-dashed border-2 border-theme-sand/20 bg-theme-sand-light flex flex-col items-center justify-center gap-3 p-0 cursor-pointer hover:bg-[#F0EBE0] transition-all rounded-3xl" onClick={() => setShowAdd(true)}>
             <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-theme-sand">
                <Camera size={24} />
             </div>
             <span className="text-[10px] font-black text-theme-sand uppercase tracking-widest">Add Memory</span>
          </Card>
        </div>
      )}

      {tab === 'growth' && (
        <div className="space-y-6 px-2">
           <Card className="p-6 bg-white border-[#F0F2F1] shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-theme-green-light text-theme-green rounded-2xl">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-theme-heading">Weight for Age</h3>
                    <p className="text-[10px] text-theme-muted font-bold uppercase tracking-tight">vs WHO Standards (kg)</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 grayscale opacity-50">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span className="text-[9px] font-black text-theme-muted">3rd/97th</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-theme-green" />
                    <span className="text-[9px] font-black text-theme-green">50th</span>
                  </div>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.5} />
                    <XAxis dataKey="age" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8A919B', fontWeight: 700 }} label={{ value: 'Month', position: 'insideBottom', offset: -5, fontSize: 10, fontWeight: 700, fill: '#8A919B' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8A919B', fontWeight: 700 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                      formatter={(value: any, name: string) => [value, name === 'actualWeight' ? 'Actual' : name.toUpperCase()]}
                    />
                    <Line type="monotone" dataKey="p3" stroke="#CBD5E1" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                    <Line type="monotone" dataKey="p97" stroke="#CBD5E1" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                    <Line type="monotone" dataKey="p50" stroke="#718E71" strokeWidth={2} dot={false} opacity={0.3} />
                    <Line type="monotone" dataKey="actualWeight" stroke="#718E71" strokeWidth={5} dot={{ fill: '#718E71', r: 6, strokeWidth: 4, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
           </Card>

           <Card className="p-6 bg-white border-[#F0F2F1] shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-theme-salmon-light text-theme-salmon rounded-2xl">
                    <TrendingUp size={20} className="rotate-90" />
                  </div>
                  <div>
                    <h3 className="font-bold text-theme-heading">Length for Age</h3>
                    <p className="text-[10px] text-theme-muted font-bold uppercase tracking-tight">vs WHO Standards (cm)</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 grayscale opacity-50">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span className="text-[9px] font-black text-theme-muted">3rd/97th</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-theme-salmon" />
                    <span className="text-[9px] font-black text-theme-salmon">50th</span>
                  </div>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lengthChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.5} />
                    <XAxis dataKey="age" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8A919B', fontWeight: 700 }} label={{ value: 'Month', position: 'insideBottom', offset: -5, fontSize: 10, fontWeight: 700, fill: '#8A919B' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8A919B', fontWeight: 700 }} domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                      formatter={(value: any, name: string) => [value, name === 'actualHeight' ? 'Actual' : name.toUpperCase()]}
                    />
                    <Line type="monotone" dataKey="p3" stroke="#CBD5E1" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                    <Line type="monotone" dataKey="p97" stroke="#CBD5E1" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                    <Line type="monotone" dataKey="p50" stroke="#E67E6E" strokeWidth={2} dot={false} opacity={0.3} />
                    <Line type="monotone" dataKey="actualHeight" stroke="#E67E6E" strokeWidth={5} dot={{ fill: '#E67E6E', r: 6, strokeWidth: 4, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
           </Card>
        </div>
      )}

      {showAdd && (
        <Modal title="Capture Moment" onClose={() => setShowAdd(false)}>
           <AddMomentForm babyId={babyId} onComplete={() => setShowAdd(false)} />
        </Modal>
      )}

      {showGrowthAdd && (
        <Modal title="Log Growth" onClose={() => setShowGrowthAdd(false)}>
           <AddGrowthForm babyId={babyId} onComplete={() => setShowGrowthAdd(false)} />
        </Modal>
      )}

      {showVideo && (
        <div className="fixed inset-0 z-[200] bg-theme-heading">
          <div className="absolute top-8 right-8 z-10">
             <button onClick={() => setShowVideo(false)} className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-full text-white transition-colors">
               <X size={28} />
             </button>
          </div>
          <div className="h-full w-full flex items-center justify-center p-6">
             <VideoSlideshow memories={memories || []} />
          </div>
        </div>
      )}
    </div>
  );
};

const VideoSlideshow = ({ memories }: { memories: any[] }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (memories.length === 0) return;
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % memories.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [memories.length]);

  if (memories.length === 0) return <div className="text-white">Add photos to generate your journey!</div>;

  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
           key={index}
           initial={{ opacity: 0, scale: 1.1 }}
           animate={{ opacity: 1, scale: 1 }}
           exit={{ opacity: 0, scale: 0.95 }}
           transition={{ duration: 1.5 }}
           className="w-full h-full"
        >
          <img src={memories[index].photo} className="w-full h-full object-contain" alt="Memory" />
          <div className="absolute bottom-12 left-0 w-full text-center p-6 space-y-2">
             <motion.h4 
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: 0.5 }}
               className="text-white text-3xl font-black drop-shadow-lg"
             >
               {memories[index].caption}
             </motion.h4>
             <motion.p 
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: 0.7 }}
               className="text-white/80 font-bold"
             >
               {format(memories[index].date, 'MMMM yyyy')}
             </motion.p>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="absolute bottom-6 left-0 w-full flex justify-center gap-1.5 px-6">
         {memories.map((_, i) => (
           <div key={i} className={cn("h-1 flex-1 rounded-full transition-all duration-300", i === index ? "bg-white" : "bg-white/20")} />
         ))}
      </div>
    </div>
  );
};

const AddMomentForm = ({ babyId, onComplete }: { babyId: number, onComplete: () => void }) => {
  const [type, setType] = useState<'milestone' | 'memory'>('milestone');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [photo, setPhoto] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPhoto(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPhoto(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (type === 'milestone') {
      await db.milestones.add({
        babyId,
        title,
        description: desc,
        date: new Date(),
        photo: photo || undefined
      });
    } else {
      await db.memories.add({
        babyId,
        photo: photo || `https://picsum.photos/seed/${Math.random()}/800/800`,
        caption: title,
        date: new Date()
      });
    }
    onComplete();
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
       <div className="flex bg-slate-100 p-1 rounded-2xl">
         <button type="button" onClick={() => setType('milestone')} className={cn("flex-1 py-3 rounded-xl font-bold", type === 'milestone' ? "bg-white shadow-sm text-indigo-500" : "text-slate-400")}>Milestone</button>
         <button type="button" onClick={() => setType('memory')} className={cn("flex-1 py-3 rounded-xl font-bold", type === 'memory' ? "bg-white shadow-sm text-indigo-500" : "text-slate-400")}>Photo Only</button>
       </div>
       <Input label={type === 'milestone' ? "What milestone?" : "Caption"} placeholder={type === 'milestone' ? "First smile, first word..." : "Walking in the park"} required value={title} onChange={e => setTitle(e.target.value)} />
       {type === 'milestone' && (
         <div className="space-y-1">
           <label className="text-sm font-medium text-slate-600 ml-2">Description</label>
           <textarea 
             className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-pink-300 focus:ring-4 focus:ring-pink-100 transition-all outline-none min-h-[100px]"
             placeholder="Tell the story..."
             value={desc}
             onChange={e => setDesc(e.target.value)}
           />
         </div>
       )}
       
       <div className="space-y-3">
         <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Moment Photo</label>
         
         {photo ? (
           <div className="relative rounded-[2rem] overflow-hidden border border-[#E0E7E5] shadow-sm aspect-[4/3] bg-slate-50 flex items-center justify-center">
             <img src={photo} className="w-full h-full object-cover" alt="Preview" />
             <button
               type="button"
               onClick={() => setPhoto('')}
               className="absolute top-3 right-3 p-2.5 bg-white/95 backdrop-blur-md hover:bg-white text-theme-salmon hover:text-red-600 rounded-2xl shadow transition-colors"
             >
               <X size={18} />
             </button>
           </div>
         ) : (
           <div
             onDragOver={handleDragOver}
             onDragLeave={handleDragLeave}
             onDrop={handleDrop}
             onClick={() => document.getElementById('moment-photo-file-input')?.click()}
             className={cn(
               "border-2 border-dashed rounded-[2rem] p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 bg-slate-50 border-[#E8ECEB]",
               isDragging 
                 ? "border-indigo-500 bg-indigo-50/20 scale-[0.99]" 
                 : "hover:border-indigo-500/50 hover:bg-white"
             )}
           >
             <input
               type="file"
               id="moment-photo-file-input"
               accept="image/*"
               onChange={handleFileChange}
               className="hidden"
             />
             <div className="p-3 bg-indigo-50 text-indigo-500 rounded-2xl">
               <Camera size={22} />
             </div>
             <div>
               <p className="font-extrabold text-xs text-slate-700">Drag & drop photo here</p>
               <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Or click to browse from device</p>
             </div>
           </div>
         )}

         <div className="pt-2">
           <span className="text-[10px] text-slate-400 block text-center mb-2 font-bold">— OR PASTE A PHOTO URL —</span>
           <input 
             type="text" 
             placeholder="https://images.unsplash.com/photo-..." 
             value={photo.startsWith('data:image') ? '' : photo} 
             onChange={e => setPhoto(e.target.value)}
             className="w-full bg-slate-50 border border-[#E8ECEB] px-4 py-3 rounded-xl text-xs text-theme-text placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-400 transition-colors"
           />
         </div>
       </div>

       <Button type="submit" className="w-full bg-indigo-500 shadow-indigo-100">Save Moment</Button>
    </form>
  );
};


// --- Medicine Screen ---
const MedicineScreen = ({ babyId }: { babyId: number }) => {
  const medicines = useLiveQuery(() => babyId ? db.medicines.where('babyId').equals(babyId).toArray() : [], [babyId]);
  const takenMedicinesLog = useLiveQuery(() => db.takenMedicines.toArray()) || [];
  const [showAdd, setShowAdd] = useState(false);
  const [editingMedicineId, setEditingMedicineId] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; title: string } | null>(null);
  const [deletingMedicineId, setDeletingMedicineId] = useState<number | null>(null);
  const [historyMedicineId, setHistoryMedicineId] = useState<number | null>(null);

  return (
    <div className="space-y-6 pb-24 h-full">
      <div className="flex items-center justify-between px-2 pt-4">
         <div>
           <h1 className="text-3xl font-bold text-theme-heading tracking-tight">Medicines</h1>
           <p className="text-theme-muted text-sm font-medium uppercase tracking-widest mt-1">Dosage & Frequency</p>
         </div>
         <Button onClick={() => setShowAdd(true)} className="px-5 py-3 text-sm flex items-center gap-2 bg-theme-teal shadow-theme-teal/10">
           <PlusCircle size={18} />
           Add Med
         </Button>
      </div>

      <div className="grid gap-5">
        {medicines?.map((med, i) => {
          const dosesToday = takenMedicinesLog.filter(t => 
            t.medicineId === med.id && 
            new Date(t.takenAt).toDateString() === new Date().toDateString()
          );
          const isTakenToday = dosesToday.length > 0;

          return (
            <div key={med.id}>
              <Card className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-8 border-l-theme-salmon bg-theme-salmon-light/20 relative group p-5">
                <div className="flex items-start md:items-center gap-5">
                  <div className="relative shrink-0">
                    {med.photo ? (
                      <div 
                        onClick={() => setSelectedPhoto({ url: med.photo!, title: `${med.name} - Medicine Photo` })}
                        className="w-14 h-14 rounded-2xl bg-white shadow-sm border-2 border-white overflow-hidden cursor-zoom-in hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
                        title="Click to view full photo"
                      >
                        <img src={med.photo} className="w-full h-full object-cover" alt={med.name} referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <span className="text-[10px] font-bold bg-black/60 px-1 py-0.5 rounded-md">View</span>
                        </div>
                      </div>
                    ) : (
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm",
                        med.isActive ? "bg-theme-salmon text-white" : "bg-white text-theme-muted border-2 border-[#E0E7E5] opacity-50"
                      )}>
                        <Pill size={22} />
                      </div>
                    )}
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-lg text-theme-heading flex items-center gap-2">
                      {med.name}
                    </h3>
                    <p className="text-xs text-theme-muted font-bold uppercase tracking-wider">{med.dosage} • {med.frequency}</p>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {med.reminders?.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {med.reminders.map(t => (
                            <span key={t} className="text-[9px] bg-theme-salmon/10 text-theme-salmon px-1.5 py-0.5 rounded-md font-bold">{t}</span>
                          ))}
                        </div>
                      )}

                      {med.enablePush !== 0 && (
                        <span className="inline-flex items-center gap-1.5 text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md font-black uppercase tracking-wider border border-emerald-200">
                          <BellRing size={10} className="animate-pulse" /> Push Alerts Enabled
                        </span>
                      )}
                      
                      {med.prescriptionPhoto && (
                        <button
                          onClick={() => setSelectedPhoto({ url: med.prescriptionPhoto!, title: `${med.name} - Prescription Photo` })}
                          className="flex items-center gap-1.5 text-[9px] text-theme-teal hover:text-teal-700 bg-theme-teal/5 border border-theme-teal/15 px-2 py-0.5 rounded-md transition-all font-bold"
                          title="Click to view prescription document"
                        >
                          <FileText size={10} />
                          Rx Prescription
                        </button>
                      )}
                    </div>

                    {/* Given today tracker status */}
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {isTakenToday ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl uppercase tracking-wider">
                          <Check size={12} className="stroke-[3]" />
                          Given Today ({dosesToday.length}x)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 rounded-xl uppercase tracking-wider">
                          Not Given Today
                        </span>
                      )}
                      {dosesToday.length > 0 && (
                        <span className="text-[10px] text-theme-muted font-medium bg-white px-2 py-1 rounded-lg border border-[#E0E7E5]">
                          Logged at: {dosesToday.map(d => format(new Date(d.takenAt), 'h:mm a')).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-auto md:ml-0 shrink-0">
                  {med.id && med.isActive === 1 && (
                    <button
                      onClick={async () => {
                        try {
                          await db.takenMedicines.add({
                            medicineId: med.id!,
                            takenAt: new Date()
                          });
                          toast.success(`${med.name} intake registered successfully!`, {
                            icon: <Check className="text-emerald-600" size={16} />
                          });
                        } catch (err) {
                          console.error(err);
                          toast.error("Failed to log dose.");
                        }
                      }}
                      className="text-[10px] font-black px-3.5 py-2 bg-theme-teal hover:bg-teal-600 text-white rounded-full uppercase tracking-widest shadow-sm transition-all"
                      title="Log dose as given right now"
                    >
                      Log Dose
                    </button>
                  )}

                  <button 
                    onClick={() => {
                      if (med.id) {
                        db.medicines.update(med.id, { isActive: med.isActive ? 0 : 1 });
                      }
                    }}
                    className={cn(
                      "text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm transition-all",
                      med.isActive ? "bg-theme-salmon text-white" : "bg-white text-theme-muted border border-[#E0E7E5] opacity-50"
                    )}>
                     {med.isActive ? 'Active' : 'Inactive'}
                  </button>
                
                {med.id && (
                  <>
                    <button
                      onClick={() => setHistoryMedicineId(med.id!)}
                      className="p-2 text-slate-300 hover:text-indigo-500 transition-colors rounded-xl hover:bg-slate-50 duration-150"
                      title="View chronological dose history"
                    >
                      <History size={18} />
                    </button>
                    <button
                      onClick={async () => {
                        const isCurrentlyEnabled = med.enablePush !== 0;
                        const nextVal = isCurrentlyEnabled ? 0 : 1;
                        if (nextVal === 1 && typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted') {
                          try {
                            const perm = await Notification.requestPermission();
                            if (perm !== 'granted') {
                              toast.warning("Please allow browser notification permissions.");
                            }
                          } catch (err) {
                            console.error(err);
                          }
                        }
                        await db.medicines.update(med.id!, { enablePush: nextVal });
                        if (nextVal === 1) {
                          toast.success(`Daily browser alerts enabled for ${med.name}!`, {
                            icon: <BellRing className="text-theme-teal" size={16} />
                          });
                        } else {
                          toast.info(`Daily browser alerts disabled for ${med.name}.`);
                        }
                      }}
                      className={cn(
                        "p-2 rounded-xl transition-all duration-150 shrink-0",
                        med.enablePush !== 0 
                          ? "text-theme-teal bg-theme-teal-light/20 hover:bg-theme-teal-light hover:scale-105" 
                          : "text-slate-300 hover:text-theme-teal hover:bg-slate-50 hover:scale-105"
                      )}
                      title={med.enablePush !== 0 ? "Web notify active. Click to disable." : "Web notify inactive. Click to enable."}
                    >
                      {med.enablePush !== 0 ? <BellRing size={18} /> : <Bell size={18} />}
                    </button>
                    <button
                      onClick={() => setEditingMedicineId(med.id!)}
                      className="p-2 text-slate-300 hover:text-theme-teal transition-colors rounded-xl hover:bg-slate-50 duration-150"
                      title="Edit medicine record"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => setDeletingMedicineId(med.id!)}
                      className="p-2 text-slate-300 hover:text-theme-salmon transition-colors rounded-xl hover:bg-slate-50 duration-150"
                      title="Delete medicine record"
                    >
                      <X size={18} />
                    </button>
                  </>
                )}
              </div>
            </Card>
          </div>
        );
      })}
        {medicines?.length === 0 && (
          <div className="text-center py-20 text-theme-muted space-y-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
               <Pill size={32} className="opacity-20" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest">No medicines listed.</p>
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal for Deleting Medicine */}
      {deletingMedicineId !== null && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-theme-heading/85 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl relative border border-[#E0E7E5] text-center"
          >
            <div className="w-16 h-16 bg-theme-salmon-light/20 text-theme-salmon rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Pill size={32} />
            </div>
            <h3 className="text-2xl font-black text-theme-heading tracking-tight mb-2">Delete Medicine?</h3>
            <p className="text-theme-muted text-sm font-medium leading-relaxed mb-8">
              Are you sure you want to delete this medicine record? This action will remove all reminders and details.
            </p>
            <div className="flex gap-4">
              <Button 
                variant="secondary" 
                onClick={() => setDeletingMedicineId(null)}
                className="flex-1 py-4 h-14 text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border-none rounded-2xl"
              >
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  try {
                    await db.medicines.delete(deletingMedicineId);
                    toast.success("Medicine deleted successfully!");
                    setDeletingMedicineId(null);
                  } catch (err) {
                    console.error(err);
                    toast.error("Failed to delete medicine.");
                  }
                }}
                className="flex-1 py-4 h-14 text-sm font-bold bg-theme-salmon hover:bg-red-600 text-white rounded-2xl"
              >
                Yes, Delete
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Lightbox / Zoom-in Modal for Medicine Photo */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-theme-heading/85 backdrop-blur-md">
          <div className="relative max-w-lg w-full bg-white rounded-[2.5rem] p-6 shadow-2xl overflow-hidden flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-theme-heading">{selectedPhoto.title}</h3>
              <button 
                onClick={() => setSelectedPhoto(null)} 
                className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-theme-muted hover:text-theme-heading transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="aspect-square w-full rounded-2xl overflow-hidden bg-slate-50 border border-[#E0E7E5] flex items-center justify-center relative shadow-inner">
              <img src={selectedPhoto.url} className="w-full h-full object-contain" alt={selectedPhoto.title} referrerPolicy="no-referrer" />
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <Modal title="Add Medicine" onClose={() => setShowAdd(false)}>
           <AddMedicineForm babyId={babyId} onComplete={() => setShowAdd(false)} />
        </Modal>
      )}

      {editingMedicineId !== null && (
        <Modal title="Edit Medicine" onClose={() => setEditingMedicineId(null)}>
           <AddMedicineForm babyId={babyId} medicineId={editingMedicineId} onComplete={() => setEditingMedicineId(null)} />
        </Modal>
      )}

      {historyMedicineId !== null && (() => {
        const selectedMedicine = medicines?.find(m => m.id === historyMedicineId);
        if (!selectedMedicine) return null;
        
        const doses = takenMedicinesLog
          .filter(t => t.medicineId === historyMedicineId)
          .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime());
        
        return (
          <Modal title="Dose History" onClose={() => setHistoryMedicineId(null)}>
            <div className="space-y-6 text-left">
              <div className="bg-slate-50 border border-[#E0E7E5] p-5 rounded-[2rem] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-theme-salmon-light/30 text-theme-salmon rounded-2xl flex items-center justify-center shrink-0">
                    <Pill size={22} />
                  </div>
                  <div className="text-left">
                    <h4 className="font-extrabold text-base text-theme-heading">{selectedMedicine.name}</h4>
                    <p className="text-xs text-theme-muted font-bold uppercase tracking-wider">{selectedMedicine.dosage} · {selectedMedicine.frequency}</p>
                  </div>
                </div>
                {selectedMedicine.isActive === 1 && (
                  <Button
                    onClick={async () => {
                      try {
                        await db.takenMedicines.add({
                          medicineId: selectedMedicine.id!,
                          takenAt: new Date()
                        });
                        toast.success(`Dose logged successfully!`);
                      } catch (err) {
                        console.error(err);
                        toast.error("Failed to log dose.");
                      }
                    }}
                    className="py-2.5 px-4 h-11 text-xs font-black bg-theme-teal text-white rounded-xl shadow-none shrink-0"
                  >
                    Log Dose Now
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <h5 className="text-xs font-black uppercase tracking-widest text-theme-heading flex items-center gap-2">
                  <History size={14} className="text-theme-salmon" />
                  Chronological Record ({doses.length})
                </h5>

                {doses.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-[#E0E7E5] rounded-[2rem] bg-slate-50">
                    <History size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-theme-muted uppercase tracking-wider">No doses logged yet</p>
                    <p className="text-xs text-theme-muted mt-1 font-medium">Record a dose to track intake chronological history.</p>
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                    {doses.map((dose) => {
                      const dateObj = new Date(dose.takenAt);
                      return (
                        <div key={dose.id} className="relative flex items-center justify-between gap-4 group">
                          {/* Timeline dot */}
                          <div className="absolute -left-[21px] w-[11px] h-[11px] bg-white border-[3px] border-theme-salmon rounded-full group-hover:bg-theme-salmon transition-colors" />
                          
                          <div className="text-left flex-1 min-w-0">
                            <p className="font-bold text-sm text-theme-text">
                              {format(dateObj, 'EEEE, MMMM do, yyyy')}
                            </p>
                            <p className="text-xs text-theme-muted font-bold tracking-wide mt-0.5 uppercase">
                              {format(dateObj, 'hh:mm a')}
                            </p>
                          </div>

                          <button
                            onClick={async () => {
                              if (confirm("Are you sure you want to delete this specific dose record?")) {
                                try {
                                  await db.takenMedicines.delete(dose.id!);
                                  toast.success("Dose record deleted successfully.");
                                } catch (err) {
                                  console.error(err);
                                  toast.error("Failed to delete dose record.");
                                }
                              }
                            }}
                            className="p-2 text-slate-300 hover:text-theme-salmon hover:bg-slate-50 rounded-xl transition-all shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Delete dose record"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

// --- Shared Backup Import Helper ---
const importBackupData = async (file: File, skipConfirm: boolean = false): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.app !== "BabyJournal" || !parsed.data) {
          toast.error("Invalid backup file format!");
          resolve(false);
          return;
        }

        const payload = parsed.data;

        // Clear all tables
        await Promise.all([
          db.babies.clear(),
          db.doctorVisits.clear(),
          db.medicines.clear(),
          db.takenMedicines.clear(),
          db.vaccines.clear(),
          db.milestones.clear(),
          db.memories.clear(),
          db.growthRecords.clear(),
          db.teethBrushingLogs.clear(),
          db.visitQuestions.clear()
        ]);

        // Restore tables
        if (payload.babies?.length) {
          await db.babies.bulkAdd(payload.babies.map((b: any) => ({
            ...b,
            dob: new Date(b.dob)
          })));
        }
        if (payload.doctorVisits?.length) {
          await db.doctorVisits.bulkAdd(payload.doctorVisits.map((v: any) => ({
            ...v,
            date: new Date(v.date),
            followUpDate: v.followUpDate ? new Date(v.followUpDate) : undefined
          })));
        }
        if (payload.medicines?.length) {
          await db.medicines.bulkAdd(payload.medicines.map((m: any) => ({
            ...m,
            startDate: new Date(m.startDate),
            endDate: m.endDate ? new Date(m.endDate) : undefined
          })));
        }
        if (payload.takenMedicines?.length) {
          await db.takenMedicines.bulkAdd(payload.takenMedicines.map((t: any) => ({
            ...t,
            takenAt: new Date(t.takenAt)
          })));
        }
        if (payload.vaccines?.length) {
          await db.vaccines.bulkAdd(payload.vaccines.map((v: any) => ({
            ...v,
            dueDate: new Date(v.dueDate),
            completedDate: v.completedDate ? new Date(v.completedDate) : undefined
          })));
        }
        if (payload.milestones?.length) {
          await db.milestones.bulkAdd(payload.milestones.map((m: any) => ({
            ...m,
            date: new Date(m.date)
          })));
        }
        if (payload.memories?.length) {
          await db.memories.bulkAdd(payload.memories.map((m: any) => ({
            ...m,
            date: new Date(m.date)
          })));
        }
        if (payload.growthRecords?.length) {
          await db.growthRecords.bulkAdd(payload.growthRecords.map((g: any) => ({
            ...g,
            date: new Date(g.date)
          })));
        }
        if (payload.teethBrushingLogs?.length) {
          await db.teethBrushingLogs.bulkAdd(payload.teethBrushingLogs.map((t: any) => ({
            ...t,
            timestamp: new Date(t.timestamp)
          })));
        }
        if (payload.visitQuestions?.length) {
          await db.visitQuestions.bulkAdd(payload.visitQuestions.map((q: any) => ({
            ...q,
            createdAt: q.createdAt ? new Date(q.createdAt) : new Date()
          })));
        }

        toast.success("Restore complete! Refreshing application...", {
          duration: 3000
        });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
        resolve(true);

      } catch (err) {
        console.error(err);
        toast.error("Failed to parse the backup file.");
        resolve(false);
      }
    };
    reader.readAsText(file);
  });
};

// --- Export Backup JSON Helper ---
export const exportBackupData = async (baby: Baby) => {
  try {
    const data = {
      version: 2,
      app: "BabyJournal",
      exportedAt: new Date().toISOString(),
      data: {
        babies: await db.babies.toArray(),
        doctorVisits: await db.doctorVisits.toArray(),
        medicines: await db.medicines.toArray(),
        takenMedicines: await db.takenMedicines.toArray(),
        vaccines: await db.vaccines.toArray(),
        milestones: await db.milestones.toArray(),
        memories: await db.memories.toArray(),
        growthRecords: await db.growthRecords.toArray(),
        teethBrushingLogs: await db.teethBrushingLogs.toArray(),
        visitQuestions: await db.visitQuestions.toArray()
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.id = "download-backup-link";
    link.href = url;
    link.download = `${baby.name.toLowerCase().replace(/\s+/g, '_')}_journal_backup.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Save backup download timestamp
    const now = new Date();
    const formattedTime = now.toLocaleString();
    localStorage.setItem(`last_automated_backup_time_${baby.id}`, formattedTime);

    return true;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// --- Profile Screen ---
const ProfileScreen = ({ baby, onLogout }: { baby: Baby, onLogout: () => void }) => {
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);

  useEffect(() => {
    setLastBackupTime(localStorage.getItem(`last_automated_backup_time_${baby.id}`));
  }, [baby.id]);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        try {
          await db.babies.update(baby.id!, { photo: e.target.result as string });
          toast.success("Profile photo updated!");
        } catch (err) {
          console.error(err);
          toast.error("Failed to update profile photo.");
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExport = async () => {
    try {
      await exportBackupData(baby);
      toast.success("Successfully downloaded data backup!");
      setLastBackupTime(localStorage.getItem(`last_automated_backup_time_${baby.id}`));
    } catch (error) {
      toast.error("Failed to export data.");
    }
  };

  const handlePDFExport = async () => {
    try {
      toast.info("Generating your PDF health report, please wait...");
      
      const doctorVisits = await db.doctorVisits.where('babyId').equals(baby.id!).toArray();
      const medicines = await db.medicines.where('babyId').equals(baby.id!).toArray();
      const vaccines = await db.vaccines.where('babyId').equals(baby.id!).toArray();
      const milestones = await db.milestones.where('babyId').equals(baby.id!).toArray();
      const growthRecords = await db.growthRecords.where('babyId').equals(baby.id!).toArray();
      const visitQuestions = await db.visitQuestions.where('babyId').equals(baby.id!).toArray();
      const teethBrushingLogs = await db.teethBrushingLogs.where('babyId').equals(baby.id!).toArray();

      // Sort chronological records
      doctorVisits.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      growthRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      milestones.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      vaccines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      visitQuestions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const { exportBabyJournalToPDF } = await import('./lib/pdfExport');
      await exportBabyJournalToPDF(baby, {
        doctorVisits,
        medicines,
        vaccines,
        milestones,
        growthRecords,
        visitQuestions,
        teethBrushingLogs
      });
      
      toast.success("PDF health export downloaded successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF report.");
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await importBackupData(file, false);
  };

  return (
    <div className="space-y-8 pb-24 h-full">
      <div className="text-center space-y-6 pt-8">
        <div className="relative inline-block">
          <div className="w-40 h-40 rounded-[3rem] bg-white border-4 border-white shadow-2xl mx-auto flex items-center justify-center overflow-hidden">
             {baby.photo ? (
               <img src={baby.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
             ) : <span className="text-6xl">👶</span>}
          </div>
          <button 
            type="button" 
            onClick={() => document.getElementById('baby-photo-upload-input')?.click()}
            className="absolute -bottom-2 -right-2 p-4 bg-theme-teal text-white rounded-3xl shadow-xl border-4 border-white hover:scale-105 transition-transform" 
            id="btn-camera-change-photo"
          >
            <Camera size={20} />
          </button>
          <input 
            type="file" 
            id="baby-photo-upload-input" 
            accept="image/*" 
            onChange={handlePhotoUpload} 
            className="hidden" 
          />
        </div>
        <div>
          <h1 className="text-3xl font-black text-theme-heading tracking-tight">{baby.name}</h1>
          <p className="text-theme-muted font-bold uppercase tracking-widest mt-1">Born {format(baby.dob, 'MMMM do, yyyy')}</p>
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <div className="px-1">
          <h2 className="text-xs font-black text-theme-muted uppercase tracking-widest mb-2">My Baby</h2>
        </div>
        <Card className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 transition-colors border-none shadow-sm" id="card-baby-profile">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-theme-teal-light text-theme-teal rounded-2xl">
              <Heart size={22} fill="currentColor" />
            </div>
            <div>
              <span className="font-bold text-theme-text text-lg block">Baby Profile</span>
              <span className="text-xs text-theme-muted font-medium">Manage baby details</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-theme-muted" />
        </Card>

        <div className="px-1 pt-4">
          <h2 className="text-xs font-black text-theme-muted uppercase tracking-widest mb-2">Backups & Data Portability</h2>
        </div>

        <Card 
          onClick={handleExport}
          className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 transition-colors border-none shadow-sm"
          id="card-export-backup"
        >
          <div className="flex items-center gap-5">
            <div className="p-3 bg-theme-teal-light text-theme-teal rounded-2xl">
              <Download size={22} />
            </div>
            <div className="text-left">
              <span className="font-bold text-theme-text text-lg block animate-pulse">Download Data</span>
              <span className="text-xs text-theme-muted font-medium">Export all entries to a local JSON file</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-theme-muted" />
        </Card>

        {/* Daily Backup Info Panel */}
        <div className="bg-emerald-50/65 border border-emerald-100 rounded-[2rem] p-5 flex items-start gap-4 shadow-sm">
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-2xl mt-0.5 shrink-0">
            <Clock size={18} className="animate-spin-slow" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <span className="font-bold text-emerald-900 text-sm block">Automated Daily Backup Active</span>
            <span className="text-xs text-emerald-700/90 font-semibold block mt-1 leading-relaxed">
              Your journal is backed up and downloaded automatically every day. If the app is closed or locked during our standard 11:00 PM - 11:59 PM block, the backup downloads immediately on next app load!
            </span>
            <div className="mt-2.5 bg-emerald-100/60 rounded-xl px-3 py-2 border border-emerald-200/40 flex items-center justify-between">
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Status:</span>
              <span className="text-xs font-bold text-emerald-950">
                {lastBackupTime ? `Saved & Downloaded (${lastBackupTime})` : "Pending first download"}
              </span>
            </div>
          </div>
        </div>

        <Card 
          onClick={handlePDFExport}
          className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 transition-colors border-none shadow-sm"
          id="card-export-pdf"
        >
          <div className="flex items-center gap-5">
            <div className="p-3 bg-theme-blue-light text-theme-blue rounded-2xl">
              <FileText size={22} />
            </div>
            <div className="text-left">
              <span className="font-bold text-theme-text text-lg block">Export Health PDF</span>
              <span className="text-xs text-theme-muted font-medium">Generate a beautifully formatted health & milestone PDF report</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-theme-muted" />
        </Card>

        <label 
          htmlFor="restore-backup-upload"
          className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 bg-white border border-transparent rounded-[2rem] shadow-sm transition-colors duration-200"
          id="label-restore-backup"
        >
          <div className="flex items-center gap-5">
            <div className="p-3 bg-theme-salmon-light text-theme-salmon rounded-2xl">
              <Upload size={22} />
            </div>
            <div className="text-left">
              <span className="font-bold text-theme-text text-lg block">Restore Backup</span>
              <span className="text-xs text-theme-muted font-medium">Upload JSON file to restore records</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-theme-muted" />
          <input 
            type="file" 
            accept=".json" 
            onChange={handleImport} 
            className="hidden" 
            id="restore-backup-upload" 
          />
        </label>

        <Button 
          variant="secondary"
          onClick={onLogout}
          className="w-full mt-12 border-theme-salmon/20 text-theme-salmon hover:bg-theme-salmon-light/30 h-16 text-lg"
          id="btn-reset-app"
        >
          Reset Application
        </Button>
      </div>

      <div className="text-center pt-12 pb-8">
        <p className="text-[10px] text-theme-muted font-black uppercase tracking-[0.2em]">Baby Journal • v1.1.0 (Local IndexedDB)</p>
      </div>
    </div>
  );
};

// --- Helper Components ---

const Modal = ({ title, children, onClose }: { title: string, children: ReactNode, onClose: () => void }) => (
  <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="absolute inset-0 bg-theme-heading/60 backdrop-blur-md" 
    />
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      className="relative w-full max-w-lg bg-white rounded-t-[3rem] sm:rounded-[3rem] p-10 overflow-hidden shadow-2xl"
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black text-theme-heading tracking-tight">{title}</h2>
        <button onClick={onClose} className="p-3 bg-slate-50 rounded-2xl text-theme-muted hover:bg-slate-100 transition-colors">
          <X size={24} />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
        {children}
      </div>
    </motion.div>
  </div>
);

const AddVisitForm = ({ babyId, onComplete }: { babyId: number, onComplete: () => void }) => {
  const [formData, setFormData] = useState({
    doctorName: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    symptoms: '',
    advice: '',
    followUpDate: ''
  });

  const [prescriptionImage, setPrescriptionImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setPrescriptionImage(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await db.doctorVisits.add({
        babyId,
        doctorName: formData.doctorName,
        date: new Date(formData.date),
        symptoms: formData.symptoms,
        advice: formData.advice,
        followUpDate: formData.followUpDate ? new Date(formData.followUpDate) : undefined,
        prescriptionImage: prescriptionImage || undefined
      });
      toast.success("Doctor visit record saved!");
      onComplete();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save entry.");
    }
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Input label="Doctor Name" placeholder="Dr. Smith" required value={formData.doctorName} onChange={e => setFormData({...formData, doctorName: e.target.value})} />
      <Input label="Visit Date" type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
      <div className="space-y-3">
        <label className="text-xs font-bold text-theme-muted uppercase tracking-widest ml-1">Symptoms</label>
        <textarea 
          className="w-full px-5 py-4 rounded-2xl bg-white border border-[#E0E7E5] shadow-sm focus:border-theme-teal focus:ring-4 focus:ring-theme-teal/10 transition-all outline-none min-h-[120px]"
          placeholder="What happened?"
          value={formData.symptoms}
          onChange={e => setFormData({...formData, symptoms: e.target.value})}
        />
      </div>
      <div className="space-y-3">
        <label className="text-xs font-bold text-theme-muted uppercase tracking-widest ml-1">Doctor's Advice</label>
        <textarea 
          className="w-full px-5 py-4 rounded-2xl bg-white border border-[#E0E7E5] shadow-sm focus:border-theme-teal focus:ring-4 focus:ring-theme-teal/10 transition-all outline-none min-h-[120px]"
          placeholder="What should we do?"
          value={formData.advice}
          onChange={e => setFormData({...formData, advice: e.target.value})}
        />
      </div>

      {/* Prescription Attachment dropzone */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-theme-muted uppercase tracking-widest ml-1">Prescription Photo (Optional)</label>
        
        {prescriptionImage ? (
          <div className="relative rounded-[2rem] overflow-hidden border border-[#E0E7E5] shadow-sm aspect-[4/3] bg-slate-50 flex items-center justify-center">
            <img src={prescriptionImage} className="w-full h-full object-cover" alt="Prescription preview" />
            <button
              type="button"
              onClick={() => setPrescriptionImage(null)}
              className="absolute top-3 right-3 p-2.5 bg-white/95 backdrop-blur-md hover:bg-white text-theme-salmon hover:text-red-600 rounded-2xl shadow transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('visit-prescription-input')?.click()}
            className={cn(
              "border-2 border-dashed rounded-[2rem] p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 bg-white",
              isDragging 
                ? "border-theme-teal bg-theme-teal-light/20 scale-[0.99]" 
                : "border-[#E0E7E5] hover:border-theme-teal/50 hover:bg-slate-50/50"
            )}
          >
            <input
              type="file"
              id="visit-prescription-input"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="p-4 bg-theme-teal-light text-theme-teal rounded-3xl">
              <FileText size={26} />
            </div>
            <div>
              <p className="font-bold text-sm text-theme-text">Drag & drop prescription photo here</p>
              <p className="text-xs text-theme-muted mt-1 font-medium">Or click to browse from device</p>
            </div>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full h-16 text-lg">Save Entry</Button>
    </form>
  );
};

const AddGrowthForm = ({ babyId, onComplete }: { babyId: number, onComplete: () => void }) => {
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    weight: '',
    height: ''
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await db.growthRecords.add({
      babyId,
      date: new Date(formData.date),
      weight: parseFloat(formData.weight),
      height: parseFloat(formData.height)
    });
    onComplete();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Input label="Measurement Date" type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Weight (kg)" type="number" step="0.01" required value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
        <Input label="Height (cm)" type="number" step="0.1" required value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} />
      </div>
      <Button type="submit" className="w-full h-16 text-lg bg-theme-green">Add Record</Button>
    </form>
  );
};

const AddMedicineForm = ({ babyId, onComplete, medicineId }: { babyId: number, onComplete: () => void, medicineId?: number }) => {
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
  });
  const [reminderTimes, setReminderTimes] = useState<string[]>([]);
  const [newTime, setNewTime] = useState('08:00');
  
  // Photo states for drag & drop or file selection
  const [photo, setPhoto] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Push notification state for Medicine reminder
  const [enablePush, setEnablePush] = useState<boolean>(true);

  // Prescription states for drag & drop or file selection
  const [prescriptionPhoto, setPrescriptionPhoto] = useState<string | null>(null);
  const [isDraggingPrescription, setIsDraggingPrescription] = useState(false);

  useEffect(() => {
    if (medicineId) {
      db.medicines.get(medicineId).then(med => {
        if (med) {
          setFormData({
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            startDate: med.startDate ? format(new Date(med.startDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
          });
          setReminderTimes(med.reminders || []);
          setPhoto(med.photo || null);
          setPrescriptionPhoto(med.prescriptionPhoto || null);
          setEnablePush(med.enablePush !== 0);
        }
      });
    }
  }, [medicineId]);

  const addReminderTime = () => {
    if (newTime && !reminderTimes.includes(newTime)) {
      setReminderTimes(prev => [...prev, newTime].sort());
    }
  };

  const removeReminderTime = (time: string) => {
    setReminderTimes(reminderTimes.filter(t => t !== time));
  };

  // Process file to base64
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setPhoto(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  // Process prescription file to base64
  const handlePrescriptionFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setPrescriptionPhoto(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePrescriptionDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPrescription(true);
  };

  const handlePrescriptionDragLeave = () => {
    setIsDraggingPrescription(false);
  };

  const handlePrescriptionDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPrescription(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handlePrescriptionFile(file);
    }
  };

  const handlePrescriptionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePrescriptionFile(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (medicineId) {
        await db.medicines.update(medicineId, {
          name: formData.name,
          dosage: formData.dosage,
          frequency: formData.frequency,
          startDate: new Date(formData.startDate),
          reminders: reminderTimes,
          photo: photo || undefined,
          prescriptionPhoto: prescriptionPhoto || undefined,
          enablePush: enablePush ? 1 : 0
        });
        toast.success(`${formData.name} updated successfully!`);
      } else {
        await db.medicines.add({
          babyId,
          name: formData.name,
          dosage: formData.dosage,
          frequency: formData.frequency,
          startDate: new Date(formData.startDate),
          reminders: reminderTimes,
          isActive: 1,
          photo: photo || undefined, // Store inside IndexedDB
          prescriptionPhoto: prescriptionPhoto || undefined,
          enablePush: enablePush ? 1 : 0
        });
        toast.success(`${formData.name} added successfully!`);
      }
      onComplete();
    } catch (err) {
      console.error(err);
      toast.error(medicineId ? "Failed to update medicine." : "Failed to add medicine.");
    }
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Input label="Medicine Name" placeholder="Paracetamol" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
      <Input label="Dosage" placeholder="5ml or 1 tablet" required value={formData.dosage} onChange={e => setFormData({...formData, dosage: e.target.value})} />
      <Input label="Frequency" placeholder="Twice a day" required value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value})} />
      
      {/* Medicine Photo Field with Drag & Drop */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-theme-muted uppercase tracking-widest ml-1">Medicine Photo</label>
        
        {photo ? (
          <div className="relative rounded-[2rem] overflow-hidden border border-[#E0E7E5] shadow-sm aspect-[4/3] bg-slate-50 flex items-center justify-center">
            <img src={photo} className="w-full h-full object-cover" alt="Medicine preview" />
            <button
              type="button"
              onClick={() => setPhoto(null)}
              className="absolute top-3 right-3 p-2.5 bg-white/95 backdrop-blur-md hover:bg-white text-theme-salmon hover:text-red-600 rounded-2xl shadow transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('med-photo-input')?.click()}
            className={cn(
              "border-2 border-dashed rounded-[2rem] p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 bg-white",
              isDragging 
                ? "border-theme-teal bg-theme-teal-light/20 scale-[0.99]" 
                : "border-[#E0E7E5] hover:border-theme-teal/50 hover:bg-slate-50/50"
            )}
          >
            <input
              type="file"
              id="med-photo-input"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="p-4 bg-theme-salmon-light text-theme-salmon rounded-3xl">
              <Camera size={26} />
            </div>
            <div>
              <p className="font-bold text-sm text-theme-text">Drag & drop medicine photo here</p>
              <p className="text-xs text-theme-muted mt-1 font-medium">Or click to browse from device</p>
            </div>
          </div>
        )}
      </div>

      {/* Doctor's Prescription Field with Drag & Drop */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-theme-muted uppercase tracking-widest ml-1">Doctor's Prescription (Optional)</label>
        
        {prescriptionPhoto ? (
          <div className="relative rounded-[2rem] overflow-hidden border border-[#E0E7E5] shadow-sm aspect-[4/3] bg-slate-50 flex items-center justify-center">
            <img src={prescriptionPhoto} className="w-full h-full object-cover" alt="Prescription preview" />
            <button
              type="button"
              onClick={() => setPrescriptionPhoto(null)}
              className="absolute top-3 right-3 p-2.5 bg-white/95 backdrop-blur-md hover:bg-white text-theme-salmon hover:text-red-600 rounded-2xl shadow transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <div
            onDragOver={handlePrescriptionDragOver}
            onDragLeave={handlePrescriptionDragLeave}
            onDrop={handlePrescriptionDrop}
            onClick={() => document.getElementById('prescription-photo-input')?.click()}
            className={cn(
              "border-2 border-dashed rounded-[2rem] p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 bg-white",
              isDraggingPrescription 
                ? "border-theme-teal bg-theme-teal-light/20 scale-[0.99]" 
                : "border-[#E0E7E5] hover:border-theme-teal/50 hover:bg-slate-50/50"
            )}
          >
            <input
              type="file"
              id="prescription-photo-input"
              accept="image/*"
              onChange={handlePrescriptionFileChange}
              className="hidden"
            />
            <div className="p-4 bg-theme-teal-light text-theme-teal rounded-3xl">
              <FileText size={26} />
            </div>
            <div>
              <p className="font-bold text-sm text-theme-text">Drag & drop doctor prescription here</p>
              <p className="text-xs text-theme-muted mt-1 font-medium">Or click to browse from device</p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <label className="text-xs font-bold text-theme-muted uppercase tracking-widest ml-1">Daily Reminders</label>
        <div className="flex gap-2">
          <Input 
            label="" 
            type="time" 
            value={newTime} 
            onChange={e => setNewTime(e.target.value)} 
            className="flex-1"
          />
          <Button 
            type="button" 
            onClick={addReminderTime} 
            className="mt-0 h-14 w-14 p-0 aspect-square flex items-center justify-center bg-theme-teal text-white rounded-2xl"
          >
            <PlusCircle size={24} />
          </Button>
        </div>
        
        {reminderTimes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {reminderTimes.map(time => (
              <div key={time} className="bg-theme-teal-light text-theme-teal px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold shadow-sm">
                {time}
                <button type="button" onClick={() => removeReminderTime(time)} className="hover:text-theme-salmon transition-colors">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Daily push notifications option using Browser Notification API */}
      <div className="bg-slate-50 border border-[#E0E7E5] p-5 rounded-[2rem] space-y-3 text-left">
        <div className="flex items-center justify-between">
          <div className="space-y-1 pr-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-theme-heading flex items-center gap-1.5">
              <BellRing className="text-theme-teal" size={14} />
              Daily Push Notifications
            </h4>
            <p className="text-xs text-theme-muted font-medium leading-relaxed">
              Receive standard desktop web notifications for scheduled reminders.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const nextVal = !enablePush;
              setEnablePush(nextVal);
              if (nextVal && typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted') {
                try {
                  const perm = await Notification.requestPermission();
                  if (perm === 'granted') {
                    toast.success("Desktop reminders configured successfully!", {
                      icon: <BellRing className="text-theme-teal" size={18} />
                    });
                  } else {
                    toast.warning("Enable browser notifications to receive desktop-level alerts.");
                  }
                } catch (err) {
                  console.error(err);
                }
              }
            }}
            className={cn(
              "w-12 h-6 rounded-full p-1 transition-all duration-200 outline-none flex items-center shrink-0",
              enablePush ? "bg-theme-teal justify-end" : "bg-slate-200 justify-start"
            )}
          >
            <motion.div 
              layout 
              className="w-4 h-4 bg-white rounded-full shadow-sm" 
            />
          </button>
        </div>
      </div>

      <Input label="Start Date" type="date" required value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
      <Button type="submit" className="w-full h-16 text-lg bg-theme-teal">Save Medicine</Button>
    </form>
  );
};

// --- Onboarding Screen ---
const Onboarding = ({ onComplete }: { onComplete: (baby: Baby) => void }) => {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'boy' | 'girl' | 'other'>('boy');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPhoto(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPhoto(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const babyDate = new Date(dob);
    if (!isValid(babyDate)) return;
    
    const baby: Baby = { name, dob: babyDate, gender, photo: photo || undefined };
    const id = await db.babies.add(baby);
    onComplete({ ...baby, id });
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await importBackupData(file, true);
  };


  return (
    <div className="min-h-screen bg-theme-bg p-8 flex flex-col items-center justify-center gap-12 max-w-lg mx-auto">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center space-y-6"
      >
        <div className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-theme-teal/10 relative">
          <div className="absolute inset-0 bg-theme-teal opacity-5 rounded-[2.5rem]" />
          <BabyIcon size={64} className="text-theme-teal" />
        </div>
        <h1 className="text-4xl font-black text-theme-heading tracking-tight leading-tight">Welcome <span className="text-theme-teal">Parents!</span></h1>
        <p className="text-theme-muted text-lg font-bold uppercase tracking-widest">Setup Baby Journal</p>
      </motion.div>

      <form onSubmit={handleSubmit} className="w-full space-y-8">
        <Input label="Baby's name" placeholder="Enter baby name" required value={name} onChange={e => setName(e.target.value)} />
        <Input label="Birth date" type="date" required value={dob} onChange={e => setDob(e.target.value)} />
        
        {/* Baby Photo Upload Slot */}
        <div className="space-y-4">
          <label className="text-xs font-bold text-theme-muted uppercase tracking-widest ml-1">Baby Photo (Optional)</label>
          
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white hover:scale-105 transition-transform flex items-center justify-center shrink-0">
              {photo ? (
                <img src={photo} className="w-full h-full object-cover" alt="Baby preview" />
              ) : (
                <span className="text-4xl text-slate-300">👶</span>
              )}
            </div>

            <div className="flex-1">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('onboarding-baby-photo')?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all bg-white border-[#E0E7E5]",
                  isDragging 
                    ? "border-theme-teal bg-theme-teal-light/20 scale-[0.99]" 
                    : "hover:border-theme-teal/50 hover:bg-slate-50/50"
                )}
              >
                <input
                  type="file"
                  id="onboarding-baby-photo"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span className="text-xs font-bold text-theme-text block">Upload baby photo</span>
                <span className="text-[10px] text-theme-muted mt-0.5 block font-medium">Click to browse or drop file here</span>
              </div>
              {photo && (
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="text-xs font-bold text-theme-salmon hover:underline mt-2 inline-block ml-1"
                >
                  Remove picture
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-bold text-theme-muted uppercase tracking-widest ml-1">Gender</label>
          <div className="flex gap-4">
            {(['boy', 'girl', 'other'] as const).map(g => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={cn(
                  "flex-1 py-4 rounded-2xl font-black transition-all border-2 uppercase text-xs tracking-widest",
                  gender === g 
                    ? "bg-theme-teal border-theme-teal text-white shadow-xl shadow-theme-teal/20" 
                    : "bg-white border-[#E0E7E5] text-theme-muted"
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full py-6 text-xl font-black mt-4 h-20 shadow-xl shadow-theme-teal/20" disabled={!name || !dob}>
          Let's Start!
        </Button>
      </form>

      <div className="w-full pt-8 border-t border-[#E0E7E5]/80 text-center space-y-4">
        <div className="text-left max-w-xs mx-auto">
          <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted text-center mb-1">Already have data?</p>
          <p className="text-xs text-theme-muted font-medium text-center">Restore all your records instantly from a previous JSON backup file.</p>
        </div>
        <label 
          htmlFor="onboarding-restore-upload"
          className="inline-flex items-center gap-3 px-6 py-4 bg-white hover:bg-slate-50 border border-[#E0E7E5] hover:border-theme-teal/50 rounded-2xl shadow-sm hover:shadow cursor-pointer transition-all text-sm font-bold text-theme-text"
          id="label-onboarding-restore"
        >
          <Upload size={18} className="text-theme-teal" />
          <span>Restore from Backup</span>
          <input 
            type="file" 
            accept=".json" 
            onChange={handleImport} 
            className="hidden" 
            id="onboarding-restore-upload" 
          />
        </label>
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');
  const babies = useLiveQuery(() => db.babies.toArray());
  const [currentBaby, setCurrentBaby] = useState<Baby | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (babies && babies.length > 0) {
      setCurrentBaby(babies[0]);
    }
  }, [babies]);

  useEffect(() => {
    if (!currentBaby) return;

    const checkAndTriggerBackup = async (isOnLoad = false) => {
      const now = new Date();
      const hours = now.getHours();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const lastBackupStr = localStorage.getItem(`last_automated_backup_date_${currentBaby.id}`);
      
      // Trigger if it's the 11 PM hour block (23) OR if it is loading and we haven't successfully downloaded today's backup yet
      const shouldBackup = (hours === 23) || (isOnLoad && lastBackupStr !== todayStr);

      if (shouldBackup && lastBackupStr !== todayStr) {
        try {
          // Set first to prevent double-firing in the same hour or rapid consecutive loads
          localStorage.setItem(`last_automated_backup_date_${currentBaby.id}`, todayStr);
          
          await exportBackupData(currentBaby);
          const feedbackMsg = isOnLoad 
            ? `Backup completed on startup! Your local daily backup for ${currentBaby.name} is saved and downloaded.`
            : `Daily Auto-Backup for ${currentBaby.name} completed and downloaded successfully!`;
            
          toast.success(feedbackMsg, {
            duration: 8000
          });
        } catch (err) {
          console.error("Auto-backup failed:", err);
          // Clear on failure so it can retry
          localStorage.removeItem(`last_automated_backup_date_${currentBaby.id}`);
        }
      }
    };

    // Run custom check immediately on startup (isOnLoad = true), then check every hour (3600000 ms)
    checkAndTriggerBackup(true);
    const intervalId = setInterval(() => checkAndTriggerBackup(false), 3600000);

    return () => clearInterval(intervalId);
  }, [currentBaby]);

  const handleLogout = async () => {
    setShowResetConfirm(true);
  };

  if (!babies) return <div className="min-h-screen grid place-items-center"><BabyIcon className="animate-bounce text-pink-300" size={48} /></div>;

  if (babies.length === 0) {
    return <Onboarding onComplete={setCurrentBaby} />;
  }

  if (!currentBaby) return null;

  return (
    <div className="min-h-screen bg-theme-bg max-w-xl mx-auto shadow-[0_0_100px_rgba(0,0,0,0.1)] relative overflow-hidden flex flex-col">
      <ReminderSystem />
      {/* Top Background Element */}
      <div className="absolute top-0 left-0 w-full h-80 bg-theme-teal-light opacity-30 blur-3xl rounded-full -translate-y-1/2 pointer-events-none" />

      {/* Screen Content */}
      <main className="flex-1 overflow-y-auto px-6 pt-12 relative z-10 scroll-smooth">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {activeScreen === 'dashboard' && <Dashboard baby={currentBaby} onNavigate={setActiveScreen} />}
            {activeScreen === 'journal' && <JournalScreen babyId={currentBaby.id!} />}
            {activeScreen === 'medicines' && <MedicineScreen babyId={currentBaby.id!} />}
            {activeScreen === 'vaccines' && <VaccineScreen babyId={currentBaby.id!} babyDob={currentBaby.dob} />}
            {activeScreen === 'milestones' && <MilestonesScreen babyId={currentBaby.id!} />}
            {activeScreen === 'profile' && <ProfileScreen baby={currentBaby} onLogout={handleLogout} />}
            {activeScreen === 'travel' && <TravelAssistant baby={currentBaby} onBack={() => setActiveScreen('dashboard')} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white/95 backdrop-blur-2xl border-t border-[#F0F2F1] mx-4 mb-4 mt-2 px-3 py-2.5 flex items-center justify-around shadow-2xl rounded-[2.5rem] relative z-20">
        <NavButton active={activeScreen === 'dashboard'} onClick={() => setActiveScreen('dashboard')} icon={Home} label="Home" />
        <NavButton active={activeScreen === 'journal'} onClick={() => setActiveScreen('journal')} icon={BookHeart} label="Logs" />
        <NavButton active={activeScreen === 'vaccines'} onClick={() => setActiveScreen('vaccines')} icon={Syringe} label="Vax" />
        <NavButton active={activeScreen === 'milestones'} onClick={() => setActiveScreen('milestones')} icon={LogOut} label="Life" navIcon className="rotate-90" />
        <NavButton active={activeScreen === 'medicines'} onClick={() => setActiveScreen('medicines')} icon={Pill} label="Meds" />
        <NavButton active={activeScreen === 'profile'} onClick={() => setActiveScreen('profile')} icon={UserCircle} label="Me" />
      </nav>

      {/* Custom Confirmation Modal for resetting the application database */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-theme-heading/85 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl relative border border-[#E0E7E5] text-center"
          >
            <div className="w-16 h-16 bg-theme-salmon-light/20 text-theme-salmon rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Upload size={32} className="rotate-180" />
            </div>
            <h3 className="text-2xl font-black text-theme-heading tracking-tight mb-2">Reset Application?</h3>
            <p className="text-theme-muted text-sm font-medium leading-relaxed mb-8">
              Are you sure? This will permanently delete all local entries, medical records, files and photos from your device.
            </p>
            <div className="flex gap-4">
              <Button 
                variant="secondary" 
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-4 h-14 text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border-none rounded-2xl"
              >
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  try {
                    await Promise.all([
                      db.babies.clear(),
                      db.doctorVisits.clear(),
                      db.medicines.clear(),
                      db.takenMedicines.clear(),
                      db.vaccines.clear(),
                      db.milestones.clear(),
                      db.memories.clear(),
                      db.growthRecords.clear(),
                      db.visitQuestions.clear(),
                      db.teethBrushingLogs.clear()
                    ]);
                    toast.success("All data cleared successfully.");
                    setShowResetConfirm(false);
                    setTimeout(() => {
                      window.location.reload();
                    }, 1000);
                  } catch (err) {
                    console.error(err);
                    toast.error("Failed to clear local database.");
                  }
                }}
                className="flex-1 py-4 h-14 text-sm font-bold bg-theme-salmon hover:bg-red-600 text-white rounded-2xl"
              >
                Yes, Reset
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

const NavButton = ({ active, onClick, icon: Icon, label, className }: { active: boolean, onClick: () => void, icon: any, label: string, className?: string, navIcon?: boolean }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-1.5 transition-all py-2 px-4 rounded-2xl group",
      active ? "bg-theme-teal text-white shadow-xl shadow-theme-teal/20" : "text-theme-muted hover:text-theme-text"
    )}
  >
    <Icon size={20} strokeWidth={active ? 3 : 2} className={cn("transition-transform group-active:scale-95", className)} />
    <span className={cn("text-[9px] font-black uppercase tracking-widest leading-none", active ? "block" : "hidden")}>
      {label}
    </span>
  </button>
);
