import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Briefcase, 
  Plane, 
  Car, 
  Compass, 
  Plus, 
  Trash2, 
  CheckSquare, 
  Square, 
  Download, 
  Check, 
  Sparkles, 
  Sun, 
  CloudSnow, 
  Leaf,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Baby } from '../db';
import { Button, Card, Input } from './UI';
import { toast } from 'sonner';
import { format, differenceInMonths } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TravelAssistantProps {
  baby: Baby;
  onBack: () => void;
}

export interface PackingItem {
  id: string;
  name: string;
  category: string;
  quantityStr?: string;
  isCustom?: boolean;
  packed: boolean;
  notes?: string;
}

type TripWeather = 'warm' | 'cold' | 'moderate';
type TransportMode = 'fly' | 'drive' | 'general';
type DurationPreset = 'short' | 'medium' | 'long';

export default function TravelAssistant({ baby, onBack }: TravelAssistantProps) {
  const ageInMonths = differenceInMonths(new Date(), new Date(baby.dob));
  
  // Trip configurations
  const [destination, setDestination] = useState<string>('Grandma\'s House');
  const [weather, setWeather] = useState<TripWeather>('moderate');
  const [transport, setTransport] = useState<TransportMode>('general');
  const [durationDays, setDurationDays] = useState<number>(3);
  
  // Custom states
  const [items, setItems] = useState<PackingItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemCategory, setNewItemCategory] = useState<string>('Essentials');
  const [hasGenerated, setHasGenerated] = useState<boolean>(false);

  // Generate unique packing items list matching selections
  const generatePackingList = () => {
    // 1. Initial essential lists based on duration and weather and age
    const list: PackingItem[] = [];
    const durMultiplier = durationDays;

    // Helper to add checklist item
    const addItem = (name: string, category: string, quantityStr?: string) => {
      list.push({
        id: `${category.toLowerCase().replace(/\s+/g, '_')}_${name.toLowerCase().replace(/\s+/g, '_')}`,
        name,
        category,
        quantityStr,
        packed: false
      });
    };

    // ----- A. ESSENTIALS & DOCUMENTS -----
    addItem('Baby Passport / Child ID', 'Essentials');
    addItem('Health Insurance Cards', 'Essentials');
    addItem('Birth Certificate Copy', 'Essentials');
    addItem('Pediatrician Emergency Contact List', 'Essentials');
    addItem('Immunization Record / Digital Health Log', 'Essentials');
    addItem('Baby Monitoring App (On second phone/tab)', 'Essentials');

    // ----- B. DIAPERING & HYGIENE -----
    const diapersCount = Math.max(8, durMultiplier * 7 + 4); // 7 per day + 4 spare
    addItem('Diapers', 'Diapering', `${diapersCount} pieces`);
    
    const wipesPacks = Math.ceil(durMultiplier / 3);
    addItem('Baby Wipes', 'Diapering', `${wipesPacks} full pack(s)`);
    
    addItem('Diaper Rash Balm (Zink/Barrier)', 'Diapering', '1 tube');
    addItem('Portable Folding Changing Mat', 'Diapering', '1 piece');
    addItem('Disposable Diaper Disposal Bags / Sacks', 'Diapering', `${Math.max(10, durMultiplier * 4)} sacks`);
    addItem('Baby-safe Body Wash & Shampoo (Travel Size)', 'Diapering', '1 travel bottle');
    addItem('Baby Nail Clippers & Soft Brush', 'Diapering');
    addItem('Gentle Baby Laundry Detergent (Travel pack)', 'Diapering', 'Sufficient for quick sinks/washes');

    // ----- C. FEEDING & NUTRITION -----
    if (ageInMonths < 6) {
      addItem('Breastfeeding Cover Shield', 'Feeding');
      addItem('Sterilizer Bags (Microwave type)', 'Feeding', '3 bags');
      addItem('Formula Powder Dispenser', 'Feeding');
      addItem('Baby Bottles with proper teats', 'Feeding', '3-4 bottles');
      addItem('Bottle Cleaning Brush & Liquid Soap', 'Feeding', 'Travel size');
    } else if (ageInMonths >= 6 && ageInMonths < 12) {
      addItem('Baby Food Puree Pouches / Jars', 'Feeding', `${durMultiplier * 2} pouches`);
      addItem('Sippy Cups / Straw Bottle', 'Feeding', '2 cups');
      addItem('Silicone Travel Bibs (Easy clean)', 'Feeding', '2 bibs');
      addItem('Soft Baby Feeding Spoons', 'Feeding', '2 pieces');
      addItem('Baby Snack Cup (Spill-proof)', 'Feeding', '1 cup');
      addItem('Feeding Chair Travel Harness', 'Feeding');
      addItem('Formula Powder / Cereal packs', 'Feeding', 'Sufficient supply');
    } else {
      // 12 months+
      addItem('Toddler Snack Containers & Pouches', 'Feeding', `${durMultiplier * 3} jars/packs`);
      addItem('Spill-proof Toddler Water Flask', 'Feeding', '1 piece');
      addItem('Compact Booster Seat or Strapping Harness', 'Feeding');
      addItem('Toddler Utensils & Food Scissors', 'Feeding', '1 set');
      addItem('Silicone Roll-up Feeding Mat', 'Feeding');
    }

    // ----- D. CLOTHING & SLEEP -----
    const outfitCount = Math.max(4, durMultiplier * 2 + 1); // 2 outfits per day + spare
    addItem('Onesies / Main Outfits', 'Clothing', `${outfitCount} sets`);
    
    const pajamaCount = Math.max(2, durMultiplier + 1);
    addItem('Warm Sleeper Pajamas', 'Clothing', `${pajamaCount} sets`);
    
    addItem('Socks & Booties', 'Clothing', `${Math.max(3, durMultiplier + 1)} pairs`);
    addItem('Soft Swaddling Blanket / Sleep Sack', 'Clothing', '2 pieces');
    
    if (weather === 'warm') {
      addItem('Sun Protection Hat with neck flap', 'Clothing', '1-2 hats');
      addItem('Lightweight UV Swimwear & Swim Diapers', 'Clothing', '2 sets');
      addItem('Sunglasses with baby head strap', 'Clothing', '1 pair');
      addItem('Light breathable muslin sheets', 'Clothing', '2-3 sheets');
    } else if (weather === 'cold') {
      addItem('Thick Fleece Snowsuit / Pram Suit', 'Clothing', '1 piece');
      addItem('Knit Beanie Hats', 'Clothing', '2 hats');
      addItem('Soft Mittens & Woolen Booties', 'Clothing', '2 pairs');
      addItem('Heavy-duty Fleece Stroller Footmuff / Blanket', 'Clothing', '1 blanket');
      addItem('Thermal Base-layers', 'Clothing', '3 sets');
    } else {
      // Moderate
      addItem('Lightweight cardigan/hoodie layers', 'Clothing', '2 jackets');
      addItem('Brimmed sun hat', 'Clothing', '1 hat');
    }

    // ----- E. HEALTH & FIRST AID -----
    addItem('Infant Acetaminophen / Ibuprofen', 'Health');
    addItem('Digital Thermometer (Ear/Forehead)', 'Health');
    addItem('Nasal Aspirator (Bulb or NoseFrida)', 'Health');
    addItem('Saline Nasal Drops', 'Health');
    addItem('Baby Band-aids & Antiseptic Wipes', 'Health');
    addItem('Teething Gel / Teething Ring toys', 'Health');
    addItem('Medicine dropper bottles / syringe', 'Health');
    
    if (weather === 'warm') {
      addItem('Baby-safe Mineral Sunscreen (SPF 50+)', 'Health', '1 bottle');
      addItem('Baby-safe Mosquito Repellent (DEET-free)', 'Health', '1 spray');
    }

    // ----- F. TRAVEL GEAR & ENTERTAINMENT -----
    addItem('Uptown Stroller (Gate check tags)', 'Gear');
    addItem('Baby Carrier / Sling Wrap', 'Gear');
    
    if (transport === 'drive') {
      addItem('Car Window Sun Shades / Blinds', 'Gear', '2 shades');
      addItem('Rear Facing Seat Baby Mirror', 'Gear');
      addItem('Infant Car Seat (Properly installed)', 'Gear');
    } else if (transport === 'fly') {
      addItem('Car Seat Travel bag / protector', 'Gear');
      addItem('In-flight baby earmuffs (Pressure control)', 'Gear');
      addItem('Travel diaper bag organizer', 'Gear');
    } else {
      addItem('Infant Safety Car Seat or Travel Crib', 'Gear');
    }

    addItem('White Noise Sound Machine (Portable)', 'Gear');
    addItem('High-contrast / Sensory travel toys', 'Gear', '3 favorites');
    addItem('Pacifiers with clip attachment', 'Gear', '3-4 units');
    addItem('Extra Soft Comfort security blanket', 'Gear');

    // Load custom items previously stored for this baby
    const key = `custom_travel_items_${baby.id}`;
    const savedCustom = localStorage.getItem(key);
    if (savedCustom) {
      try {
        const parsed: PackingItem[] = JSON.parse(savedCustom);
        list.push(...parsed);
      } catch (e) {
        console.error(e);
      }
    }

    // Load packed statuses if they exist from a temporary preview save
    const statusKey = `packed_status_${baby.id}`;
    const savedStatus = localStorage.getItem(statusKey);
    if (savedStatus) {
      try {
        const statusMap: Record<string, boolean> = JSON.parse(savedStatus);
        list.forEach(item => {
          if (statusMap[item.id] !== undefined) {
            item.packed = statusMap[item.id];
          }
        });
      } catch (e) {
        console.error(e);
      }
    }

    setItems(list);
    setHasGenerated(true);
    toast.success('Successfully customized travel checklist based on profile!');
  };

  // Run initial list generation on start if not initialized
  useEffect(() => {
    generatePackingList();
  }, [durationDays, weather, transport]);

  // Persist packed status changes to localStorage
  const handleTogglePacked = (itemId: string) => {
    const updated = items.map(item => {
      if (item.id === itemId) {
        return { ...item, packed: !item.packed };
      }
      return item;
    });
    setItems(updated);

    // Save packed status map
    const statusKey = `packed_status_${baby.id}`;
    const statusMap: Record<string, boolean> = {};
    updated.forEach(item => {
      statusMap[item.id] = item.packed;
    });
    localStorage.setItem(statusKey, JSON.stringify(statusMap));
  };

  // Add custom item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      toast.error('Please enter an item name');
      return;
    }

    const newItemId = `custom_item_${Date.now()}`;
    const newItem: PackingItem = {
      id: newItemId,
      name: newItemName.trim(),
      category: newItemCategory,
      packed: false,
      isCustom: true
    };

    const updated = [...items, newItem];
    setItems(updated);

    // Save custom items separately in baby key
    const customKey = `custom_travel_items_${baby.id}`;
    const onlyCustoms = updated.filter(i => i.isCustom);
    localStorage.setItem(customKey, JSON.stringify(onlyCustoms));

    // Also update current packed status maps
    const statusKey = `packed_status_${baby.id}`;
    const statusMap: Record<string, boolean> = {};
    updated.forEach(item => {
      statusMap[item.id] = item.packed;
    });
    localStorage.setItem(statusKey, JSON.stringify(statusMap));

    setNewItemName('');
    toast.success(`"${newItem.name}" added to ${newItem.category}!`);
  };

  // Delete custom item
  const handleDeleteCustomItem = (itemId: string) => {
    const updated = items.filter(i => i.id !== itemId);
    setItems(updated);

    // Save custom items separately in baby key
    const customKey = `custom_travel_items_${baby.id}`;
    const onlyCustoms = updated.filter(i => i.isCustom);
    localStorage.setItem(customKey, JSON.stringify(onlyCustoms));

    toast.info('Item removed.');
  };

  // Reset checklist packed states
  const handleResetChecklist = () => {
    const updated = items.map(item => ({ ...item, packed: false }));
    setItems(updated);
    
    const statusKey = `packed_status_${baby.id}`;
    localStorage.removeItem(statusKey);
    toast.info('All checklist packed states have been reset.');
  };

  // Clean custom items
  const handleClearCustoms = () => {
    const updated = items.filter(i => !i.isCustom);
    setItems(updated);
    
    const customKey = `custom_travel_items_${baby.id}`;
    localStorage.removeItem(customKey);
    toast.info('All custom items removed.');
  };

  // Statistics
  const filteredItems = items.filter(item => activeCategory === 'All' || item.category === activeCategory);
  const totalCount = items.length;
  const packedCount = items.filter(i => i.packed).length;
  const packedPercentage = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

  // PDF Export of packing list
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const primaryColor: [number, number, number] = [127, 181, 173]; // #7FB5AD - theme-teal
      const secondaryColor: [number, number, number] = [230, 126, 110]; // #E67E6E - theme-salmon
      const darkTextColor: [number, number, number] = [44, 49, 56]; // #2C3138 - theme-heading
      const mutedTextColor: [number, number, number] = [138, 145, 155]; // #8A919B - theme-muted
      const lightBgColor: [number, number, number] = [244, 247, 246]; // #F4F7F6 - theme-bg

      let y = 30;

      // Title Card
      doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
      doc.roundedRect(15, y, 180, 50, 4, 4, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('TRAVEL PACKING CHECKLIST', 105, y + 15, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
      doc.text(`Smart Checklist for ${baby.name}`, 105, y + 25, { align: 'center' });
      
      const vText = `Destination: ${destination}  |  Transit: ${transport === 'fly' ? 'Plane' : transport === 'drive' ? 'Car' : 'General'}  |  Duration: ${durationDays} days`;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
      doc.text(vText, 105, y + 33, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`Overall Progress: ${packedCount} of ${totalCount} items completed (${packedPercentage}%)`, 105, y + 42, { align: 'center' });

      y += 62;

      // Group items by category for structured printing
      const categories = ['Essentials', 'Diapering', 'Feeding', 'Clothing', 'Health', 'Gear'];
      
      categories.forEach(cat => {
        const catItems = items.filter(i => i.category === cat);
        if (catItems.length === 0) return;

        // Header for Category
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
        doc.text(cat.toUpperCase(), 15, y);
        y += 4;

        // Custom auto table for items under category
        const tableBody = catItems.map(item => [
          item.packed ? '[ X ]' : '[   ]',
          item.name,
          item.quantityStr || '-'
        ]);

        autoTable(doc, {
          startY: y,
          head: [['Status', 'Packing Item Name', 'Quantity / Note']],
          body: tableBody,
          theme: 'striped',
          headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 100 },
            2: { cellWidth: 60 }
          },
          margin: { left: 15, right: 15 },
          didDrawPage: (data) => {
            // Footers
            const pageCount = doc.getNumberOfPages();
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
            doc.text(`${baby.name}'s Travel Packing Assistant - Report`, 15, 287);
            doc.text(`Page ${pageCount}`, 195, 287, { align: 'right' });
          }
        });

        y = (doc as any).lastAutoTable.finalY + 10;

        // Check if we need to add a page to avoid overflow
        if (y > 240) {
          doc.addPage();
          y = 30;
        }
      });

      const fileName = `${baby.name.toLowerCase().replace(/\s+/g, '_')}_travel_packing_list.pdf`;
      doc.save(fileName);
      toast.success('Downloaded packing list PDF successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export checklist to PDF.');
    }
  };

  const categoriesList = ['All', 'Essentials', 'Diapering', 'Feeding', 'Clothing', 'Health', 'Gear'];

  return (
    <div className="space-y-8 pb-24 text-left">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#F0F2F1] pb-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-white hover:bg-slate-50 text-theme-teal border border-[#E0E7E5] rounded-2xl transition-all"
            title="Go back to Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-theme-heading tracking-tight">Travel Packing</h1>
            <p className="text-xs text-theme-muted font-bold uppercase tracking-wider mt-0.5">Smart planning guide for packing</p>
          </div>
        </div>
        <div className="w-12 h-12 bg-theme-teal-light rounded-2xl flex items-center justify-center text-theme-teal">
          <Briefcase size={22} className="animate-pulse" />
        </div>
      </div>

      {/* Profile summary banner */}
      <div className="bg-gradient-to-br from-theme-teal-light/20 to-theme-blue-light/20 p-5 rounded-[2rem] border border-theme-teal/10 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-white flex items-center justify-center shadow-inner">
          {baby.photo ? (
            <img src={baby.photo} alt={baby.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">👶</span>
          )}
        </div>
        <div className="text-left flex-1">
          <p className="text-xs text-theme-muted font-bold uppercase tracking-wider">Baby Profile</p>
          <p className="font-extrabold text-theme-text text-sm">
            {baby.name} (Age: {ageInMonths} months)
          </p>
          <span className="inline-block bg-white text-theme-teal font-black text-[9px] uppercase px-2.5 py-0.5 rounded-full mt-1 shrink-0 border border-theme-teal/10">
            {ageInMonths < 6 ? '0-6m gear recommendation' : ageInMonths < 12 ? '6-12m solid feeders list' : '12m+ active toddler list'}
          </span>
        </div>
      </div>

      {/* Dynamic Packing Settings Controls */}
      <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-[#E8ECEB] space-y-6">
        <h3 className="font-extrabold text-base text-theme-heading flex items-center gap-2">
          <span>✈️</span> Trip Settings & Dynamic Calculation
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 text-left space-y-2">
            <span className="text-xs font-bold text-theme-muted uppercase tracking-widest ml-1">Trip Destination</span>
            <Input 
              placeholder="e.g. Grandma's House, Beach Resort, Paris"
              value={destination}
              onChange={(e: any) => setDestination(e.target.value)}
              className="py-3"
            />
          </div>

          <div className="text-left space-y-2">
            <span className="text-xs font-bold text-theme-muted uppercase tracking-widest ml-1">Weather Climate</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setWeather('warm')}
                className={cn(
                  "p-2.5 rounded-xl border flex flex-col items-center justify-center text-[10px] uppercase font-black transition-all",
                  weather === 'warm' 
                    ? "bg-amber-50 text-amber-600 border-amber-300" 
                    : "bg-slate-50 text-theme-muted border-[#E0E7E5]"
                )}
              >
                <Sun size={16} className="mb-1" />
                Warm
              </button>
              <button
                type="button"
                onClick={() => setWeather('moderate')}
                className={cn(
                  "p-2.5 rounded-xl border flex flex-col items-center justify-center text-[10px] uppercase font-black transition-all",
                  weather === 'moderate' 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-300" 
                    : "bg-slate-50 text-theme-muted border-[#E0E7E5]"
                )}
              >
                <Leaf size={16} className="mb-1" />
                Moderate
              </button>
              <button
                type="button"
                onClick={() => setWeather('cold')}
                className={cn(
                  "p-2.5 rounded-xl border flex flex-col items-center justify-center text-[10px] uppercase font-black transition-all",
                  weather === 'cold' 
                    ? "bg-[#EEF6F8] text-cyan-600 border-cyan-200" 
                    : "bg-slate-50 text-theme-muted border-[#E0E7E5]"
                )}
              >
                <CloudSnow size={16} className="mb-1" />
                Cold
              </button>
            </div>
          </div>

          <div className="text-left space-y-2">
            <span className="text-xs font-bold text-theme-muted uppercase tracking-widest ml-1">Transit Mode</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTransport('fly')}
                className={cn(
                  "p-2.5 rounded-xl border flex flex-col items-center justify-center text-[10px] uppercase font-black transition-all",
                  transport === 'fly' 
                    ? "bg-blue-50 text-blue-600 border-blue-300" 
                    : "bg-slate-50 text-theme-muted border-[#E0E7E5]"
                )}
              >
                <Plane size={16} className="mb-1" />
                Flight
              </button>
              <button
                type="button"
                onClick={() => transport !== 'drive' && setTransport('drive')}
                className={cn(
                  "p-2.5 rounded-xl border flex flex-col items-center justify-center text-[10px] uppercase font-black transition-all",
                  transport === 'drive' 
                    ? "bg-indigo-50 text-indigo-600 border-indigo-300" 
                    : "bg-slate-50 text-theme-muted border-[#E0E7E5]"
                )}
              >
                <Car size={16} className="mb-1" />
                Car Drive
              </button>
              <button
                type="button"
                onClick={() => setTransport('general')}
                className={cn(
                  "p-2.5 rounded-xl border flex flex-col items-center justify-center text-[10px] uppercase font-black transition-all",
                  transport === 'general' 
                    ? "bg-purple-50 text-purple-600 border-purple-300" 
                    : "bg-slate-50 text-theme-muted border-[#E0E7E5]"
                )}
              >
                <Compass size={16} className="mb-1" />
                Other
              </button>
            </div>
          </div>

          <div className="col-span-2 text-left space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-theme-muted uppercase tracking-widest ml-1">Trip Duration</span>
              <span className="text-xs font-extrabold text-theme-teal">
                {durationDays} Day{durationDays > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setDurationDays(1)}
                className={cn(
                  "flex-1 p-2 rounded-xl border text-xs font-bold tracking-wider",
                  durationDays === 1 ? "bg-theme-teal text-white border-transparent" : "bg-slate-50 text-theme-muted border-[#E0E7E5]"
                )}
              >
                Single Night (1d)
              </button>
              <button 
                type="button"
                onClick={() => setDurationDays(3)}
                className={cn(
                  "flex-1 p-2 rounded-xl border text-xs font-bold tracking-wider",
                  durationDays === 3 ? "bg-theme-teal text-white border-transparent" : "bg-slate-50 text-theme-muted border-[#E0E7E5]"
                )}
              >
                Weekend (3d)
              </button>
              <button 
                type="button"
                onClick={() => setDurationDays(7)}
                className={cn(
                  "flex-1 p-2 rounded-xl border text-xs font-bold tracking-wider",
                  durationDays === 7 ? "bg-theme-teal text-white border-transparent" : "bg-slate-50 text-theme-muted border-[#E0E7E5]"
                )}
              >
                Full Week (7d)
              </button>
              <button 
                type="button"
                onClick={() => setDurationDays(14)}
                className={cn(
                  "flex-1 p-2 rounded-xl border text-xs font-bold tracking-wider",
                  durationDays === 14 ? "bg-theme-teal text-white border-transparent" : "bg-slate-50 text-theme-muted border-[#E0E7E5]"
                )}
              >
                Extended (14d)
              </button>
            </div>

            <div className="flex items-center gap-4 mt-3">
              <span className="text-[10px] text-theme-muted font-bold uppercase shrink-0">Custom Days:</span>
              <input 
                type="range"
                min="1"
                max="30"
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value, 10))}
                className="flex-1 accent-theme-teal cursor-pointer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Progress Card Section */}
      <Card className="bg-white border-none shadow-sm flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-extrabold text-base text-theme-heading flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500 animate-spin" /> Packing Progress
            </h4>
            <span className="text-xl font-bold text-theme-text mt-1 block">
              {packedCount} / {totalCount} items packed
            </span>
          </div>
          <div className="relative w-16 h-16 flex items-center justify-center rounded-full bg-slate-50 border border-[#E0E7E5] shrink-0">
            <span className="text-sm font-black text-theme-teal">{packedPercentage}%</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#EEF2F1] rounded-full h-3 overflow-hidden">
          <motion.div 
            className="bg-theme-teal h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${packedPercentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-3 gap-2 border-t border-[#F0F2F1] pt-4 mt-1">
          <Button 
            variant="secondary"
            onClick={handleExportPDF}
            className="py-2.5 h-11 text-xs shrink-0 flex items-center gap-1.5"
            title="Download formatted checklist as PDF"
            id="btn-packing-export-pdf"
          >
            <Download size={14} /> PDF List
          </Button>
          <Button 
            variant="secondary"
            onClick={handleResetChecklist}
            className="py-2.5 h-11 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 shrink-0 flex items-center gap-1"
            title="Undo packed statuses on items"
            id="btn-packing-reset"
          >
            Reset Packed
          </Button>
          <Button 
            variant="secondary"
            onClick={handleClearCustoms}
            className="py-2.5 h-11 text-xs text-[#E67E6E] hover:bg-[#FDF2F0] shrink-0 flex items-center gap-1"
            title="Remove all custom items from list"
            id="btn-packing-clear-customs"
          >
            Clear Custom
          </Button>
        </div>
      </Card>

      {/* Add Custom packing list items */}
      <Card className="bg-[#F8FAF9] border-dashed border-2 border-[#E0E7E5] p-5">
        <form onSubmit={handleAddCustomItem} className="space-y-4">
          <h4 className="font-extrabold text-sm text-theme-heading flex items-center gap-1.5">
            <span>➕</span> Add Custom Item to Packing List
          </h4>
          
          <div className="flex gap-3">
            <div className="flex-1">
              <input 
                type="text" 
                placeholder="e.g., Favorite teddy bear, Extra pacifier clip" 
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-[#E0E7E5] rounded-xl text-sm font-semibold text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-teal/20"
              />
            </div>
            
            <div className="w-32 shrink-0">
              <select 
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                className="w-full px-3 py-3 bg-white border border-[#E0E7E5] rounded-xl text-sm font-bold text-theme-muted focus:outline-none cursor-pointer"
              >
                <option value="Essentials">Essentials</option>
                <option value="Diapering">Diapering</option>
                <option value="Feeding">Feeding</option>
                <option value="Clothing">Clothing</option>
                <option value="Health">Health</option>
                <option value="Gear">Gear</option>
              </select>
            </div>

            <Button 
              type="submit" 
              className="px-4 py-3 h-11 shrink-0 rounded-xl"
              id="btn-add-custom-travel-item"
            >
              Add
            </Button>
          </div>
        </form>
      </Card>

      {/* Active Pack Category Filter Layout */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {categoriesList.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shrink-0 transition-all border",
              activeCategory === cat 
                ? "bg-theme-teal text-white border-transparent shadow" 
                : "bg-white text-theme-muted border-[#E0E7E5] hover:bg-slate-50"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Dynamic Checklist Render Items list UI */}
      <section className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item) => (
            <motion.div
              layout
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => handleTogglePacked(item.id)}
              className={cn(
                "p-4 rounded-3xl border shadow-sm transition-all flex items-center justify-between cursor-pointer select-none",
                item.packed 
                  ? "bg-slate-50/70 border-[#E8ECEB] opacity-65" 
                  : "bg-white hover:bg-slate-50/50 border-[#E8ECEB]"
              )}
            >
              <div className="flex items-center gap-4 text-left flex-1 min-w-0 pr-3">
                <div className="shrink-0">
                  {item.packed ? (
                    <div className="w-6 h-6 rounded-lg bg-theme-teal text-white flex items-center justify-center">
                      <Check size={14} className="stroke-[4]" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-lg border-2 border-slate-300 flex items-center justify-center" />
                  )}
                </div>

                <div className="min-w-0">
                  <span className={cn(
                    "font-bold text-sm text-theme-text block truncate",
                    item.packed && "line-through text-theme-muted"
                  )}>
                    {item.name}
                  </span>
                  
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-slate-100 rounded text-slate-500">
                      {item.category}
                    </span>
                    {item.quantityStr && (
                      <span className="text-[10px] font-medium text-theme-muted">
                        • {item.quantityStr}
                      </span>
                    )}
                    {item.isCustom && (
                      <span className="text-[9px] font-bold text-theme-teal uppercase tracking-widest">
                        User Added
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {item.isCustom && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCustomItem(item.id);
                  }}
                  className="p-2 text-slate-300 hover:text-theme-salmon hover:bg-slate-100 rounded-xl transition-all"
                  title="Delete item"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredItems.length === 0 && (
          <div className="text-center py-12 bg-white rounded-[2.5rem] p-8 border border-[#E8ECEB] space-y-2">
            <span className="text-4xl">🎒</span>
            <h4 className="font-bold text-theme-heading text-base">Perfect Packing List!</h4>
            <p className="text-xs text-theme-muted max-w-xs mx-auto">
              There are no current packing list items configured under this category. Add a custom entry using the form above!
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

// Simple layout utility class merger helper inside the file
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
