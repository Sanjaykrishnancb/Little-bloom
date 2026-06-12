import React, { useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { toast, Toaster } from 'sonner';
import { format, isToday, isTomorrow, addDays, startOfDay } from 'date-fns';
import { Syringe, Pill, CheckCircle2, Smile } from 'lucide-react';

export const ReminderSystem = () => {
  const medicines = useLiveQuery(() => db.medicines.where('isActive').equals(1).toArray()) || [];
  const vaccines = useLiveQuery(() => db.vaccines.where('status').equals('upcoming').toArray()) || [];
  
  const lastNotifiedMeds = useRef<Record<string, string>>({}); // { medId_time: dateString }
  const hasCheckedVaccines = useRef(false);

  // Check teeth brushing reminders (Morning/Evening)
  useEffect(() => {
    const checkBrushing = async () => {
      const now = new Date();
      const currentTime = format(now, 'HH:mm');
      const todayStr = format(now, 'yyyy-MM-dd');

      try {
        const babiesList = await db.babies.toArray();
        if (!babiesList || babiesList.length === 0) return;

        for (const baby of babiesList) {
          const active = localStorage.getItem(`brushing_active_${baby.id}`) !== 'false';
          if (!active) continue;

          const mTime = localStorage.getItem(`brushing_morning_${baby.id}`) || '08:00';
          const eTime = localStorage.getItem(`brushing_evening_${baby.id}`) || '20:00';

          // Check Morning Reminder
          if (currentTime === mTime) {
            const key = `brushing_${baby.id}_morning_${mTime}`;
            if (lastNotifiedMeds.current[key] !== todayStr) {
              // Query if they brushed today morning
              const todayMorningLogs = await db.teethBrushingLogs
                .where('babyId')
                .equals(baby.id!)
                .toArray();
              
              const didBrush = todayMorningLogs.some(log => 
                log.timeOfDay === 'morning' && 
                format(new Date(log.timestamp), 'yyyy-MM-dd') === todayStr
              );

              if (!didBrush) {
                lastNotifiedMeds.current[key] = todayStr;

                toast(`Time to brush morning teeth! 🪥`, {
                  description: `Please log morning teeth brushing for ${baby.name}.`,
                  icon: <Smile className="text-sky-500" size={18} />,
                  action: {
                    label: 'Mark Done',
                    onClick: async () => {
                      try {
                        await db.teethBrushingLogs.add({
                          babyId: baby.id!,
                          timeOfDay: 'morning',
                          timestamp: new Date()
                        });
                        toast.success(`Morning brush logged successfully for ${baby.name}!`);
                      } catch (err) {
                        console.error(err);
                      }
                    }
                  },
                  duration: 15000,
                });

                // Standard Web Notification API
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  try {
                    new Notification(`🪥 Morning teeth brushing schedule!`, {
                      body: `Time to brush ${baby.name}'s teeth for a radiant, healthy smile.`,
                      tag: 'teeth-brushing-morning'
                    });
                  } catch (err) {
                    console.error(err);
                  }
                }
              }
            }
          }

          // Check Evening Reminder
          if (currentTime === eTime) {
            const key = `brushing_${baby.id}_evening_${eTime}`;
            if (lastNotifiedMeds.current[key] !== todayStr) {
              // Query if they brushed today evening
              const todayEveningLogs = await db.teethBrushingLogs
                .where('babyId')
                .equals(baby.id!)
                .toArray();
              
              const didBrush = todayEveningLogs.some(log => 
                log.timeOfDay === 'evening' && 
                format(new Date(log.timestamp), 'yyyy-MM-dd') === todayStr
              );

              if (!didBrush) {
                lastNotifiedMeds.current[key] = todayStr;

                toast(`Time to brush evening teeth! 🪥`, {
                  description: `Please log evening teeth brushing for ${baby.name} before bed.`,
                  icon: <Smile className="text-indigo-500" size={18} />,
                  action: {
                    label: 'Mark Done',
                    onClick: async () => {
                      try {
                        await db.teethBrushingLogs.add({
                          babyId: baby.id!,
                          timeOfDay: 'evening',
                          timestamp: new Date()
                        });
                        toast.success(`Evening brush logged successfully for ${baby.name}!`);
                      } catch (err) {
                        console.error(err);
                      }
                    }
                  },
                  duration: 15000,
                });

                // Standard Web Notification API
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  try {
                    new Notification(`🪥 Evening teeth brushing schedule!`, {
                      body: `Evening routine time: brush ${baby.name}'s teeth to sweep away today's sugars.`,
                      tag: 'teeth-brushing-evening'
                    });
                  } catch (err) {
                    console.error(err);
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed checking brushing reminders", err);
      }
    };

    const interval = setInterval(checkBrushing, 30000);
    checkBrushing();

    return () => clearInterval(interval);
  }, []);

  // Check Medicine Reminders
  useEffect(() => {
    const checkMeds = () => {
      const now = new Date();
      const currentTime = format(now, 'HH:mm');
      const todayStr = format(now, 'yyyy-MM-dd');

      medicines.forEach((med) => {
        if (!med.reminders || !med.id) return;

        med.reminders.forEach((time) => {
          const key = `${med.id}_${time}`;
          const lastNotified = lastNotifiedMeds.current[key];

          // If current time matches reminder time AND we haven't notified for this specific time today
          if (time === currentTime && lastNotified !== todayStr) {
            lastNotifiedMeds.current[key] = todayStr;
            
            toast(`Time for ${med.name}`, {
              description: `${med.dosage} scheduled at ${time}`,
              icon: <Pill className="text-theme-salmon" size={18} />,
              action: {
                label: 'Mark Taken',
                onClick: async () => {
                  try {
                    if (med.id) {
                      await db.takenMedicines.add({
                        medicineId: med.id,
                        takenAt: new Date()
                      });
                      toast.success(`${med.name} marked as taken`, {
                        icon: <CheckCircle2 className="text-theme-teal" size={18} />
                      });
                    }
                  } catch (e) {
                    console.error('Failed to mark med as taken', e);
                  }
                },
              },
              duration: 10000,
            });

            // Trigger browser-level physical Notification API if enablePush is active
            if (med.enablePush === 1 && typeof window !== 'undefined' && 'Notification' in window) {
              if (Notification.permission === 'granted') {
                try {
                  const notification = new Notification(`⏰ Medicine: Time for ${med.name}`, {
                    body: `Dose: ${med.dosage} · scheduled for ${time}. Please click or slide to administer.`,
                    icon: med.photo || undefined,
                    requireInteraction: true,
                    silent: false
                  });
                  notification.onclick = () => {
                    window.focus();
                  };
                } catch (err) {
                  console.error('Failed to show native browser notification', err);
                }
              }
            }
          }
        });
      });
    };

    const interval = setInterval(checkMeds, 30000); // Check every 30 seconds
    checkMeds(); // Initial check

    return () => clearInterval(interval);
  }, [medicines]);

  // Check Vaccine Appointments
  useEffect(() => {
    if (vaccines.length > 0 && !hasCheckedVaccines.current) {
      hasCheckedVaccines.current = true;
      
      vaccines.forEach((vax) => {
        const dueDateStr = format(vax.dueDate, 'PPPP');
        
        if (isToday(vax.dueDate)) {
          toast.warning(`Vaccination Day!`, {
            description: `${vax.name} is due TODAY.`,
            icon: <Syringe className="text-theme-blue" size={18} />,
            duration: 15000,
          });
        } else if (isTomorrow(vax.dueDate)) {
          toast.info(`Upcoming Vaccination`, {
            description: `${vax.name} is due tomorrow (${dueDateStr})`,
            icon: <Syringe className="text-theme-blue" size={18} />,
            duration: 10000,
          });
        }
      });
    }
  }, [vaccines]);

  return <Toaster position="top-center" expand={true} richColors />;
};
