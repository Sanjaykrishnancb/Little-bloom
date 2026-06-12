import Dexie, { type Table } from 'dexie';

export interface Baby {
  id?: number;
  name: string;
  dob: Date;
  gender: 'boy' | 'girl' | 'other';
  photo?: string;
}

export interface DoctorVisit {
  id?: number;
  babyId: number;
  doctorName: string;
  date: Date;
  symptoms: string;
  advice: string;
  prescriptionImage?: string;
  followUpDate?: Date;
}

export interface Medicine {
  id?: number;
  babyId: number;
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  reminders: string[]; // e.g., ["08:00", "20:00"]
  isActive: number; // 1 for true, 0 for false
  photo?: string; // Base64 encoded or URL string for medicine photo
  prescriptionPhoto?: string; // Base64 encoded or URL string for doctor's prescription photo
  enablePush?: number; // 1 to enable daily push notifications, 0 to disable
}

export interface TakenMedicine {
  id?: number;
  medicineId: number;
  takenAt: Date;
}

export interface Vaccine {
  id?: number;
  babyId: number;
  name: string;
  dueDate: Date;
  completedDate?: Date;
  status: 'completed' | 'upcoming' | 'missed';
}

export interface Milestone {
  id?: number;
  babyId: number;
  title: string;
  date: Date;
  description: string;
  photo?: string;
}

export interface Memory {
  id?: number;
  babyId: number;
  photo: string;
  caption: string;
  date: Date;
}

export interface GrowthRecord {
  id?: number;
  babyId: number;
  date: Date;
  weight: number; // kg
  height: number; // cm
}

export interface VisitQuestion {
  id?: number;
  babyId: number;
  question: string;
  category: string; // 'Feeding' | 'Sleep' | 'Development' | 'Vaccines' | 'Other'
  isAnswered: number; // 1 for yes, 0 for no
  notes?: string;
  createdAt: Date;
}

export interface TeethBrushingLog {
  id?: number;
  babyId: number;
  timeOfDay: 'morning' | 'evening';
  timestamp: Date;
}

export class BabyJournalDatabase extends Dexie {
  babies!: Table<Baby>;
  doctorVisits!: Table<DoctorVisit>;
  medicines!: Table<Medicine>;
  takenMedicines!: Table<TakenMedicine>;
  vaccines!: Table<Vaccine>;
  milestones!: Table<Milestone>;
  memories!: Table<Memory>;
  growthRecords!: Table<GrowthRecord>;
  visitQuestions!: Table<VisitQuestion>;
  teethBrushingLogs!: Table<TeethBrushingLog>;

  constructor() {
    super('BabyJournalDB');
    this.version(4).stores({
      babies: '++id, name',
      doctorVisits: '++id, babyId, date',
      medicines: '++id, babyId, name, isActive',
      takenMedicines: '++id, medicineId, takenAt',
      vaccines: '++id, babyId, status, dueDate',
      milestones: '++id, babyId, date',
      memories: '++id, babyId, date',
      growthRecords: '++id, babyId, date',
      visitQuestions: '++id, babyId, isAnswered',
      teethBrushingLogs: '++id, babyId, timestamp'
    });
  }
}

export const db = new BabyJournalDatabase();
