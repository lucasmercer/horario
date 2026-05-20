import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  Plus, 
  Trash2, 
  Download, 
  Save,
  CheckCircle2,
  Calendar,
  MoreVertical,
  Printer,
  FileText,
  Loader2,
  Upload,
  AlertCircle,
  Pencil,
  Image as ImageIcon,
  X,
  DoorClosed,
  ChevronDown,
  School,
  Sparkles,
  Wand2,
  AlertTriangle,
  HelpCircle,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Teacher {
  id: string;
  name: string;
  subjectIds: string[]; // Alterado para suportar múltiplas disciplinas
  availability?: string[]; // Array de slotIds selecionados como DISPONÍVEIS ("seg-1", "ter-6", etc)
  preferDoubleClasses?: boolean; // Preferência de aulas geminadas
  turmaIds?: string[]; // Turmas que o professor é docente (opcional, vazio = todas)
}

interface Subject {
  id: string;
  name: string;
  workload: number;
  useLabComp?: boolean;
  useLabTab?: boolean;
  useSalaMat?: boolean;
  labWorkload?: number;
  classWorkload?: number;
  roomIds?: string[];
  customWorkloads?: Record<string, { workload: number; classWorkload: number; labWorkload: number }>;
  levelConstraint?: 'ambos' | 'fundamental' | 'medio';
  gradeConstraint?: string;
  suffixConstraint?: string;
  allowedTurmaIds?: string[];
}

interface Turma {
  id: string;
  name: string;
  shift?: 'manha' | 'tarde' | 'noite' | 'ambos';
  isRoom?: boolean;
  color?: string;
}

interface ScheduleSlot {
  teacherId: string;
  subjectId: string;
  associatedTurmaId?: string;
}

type Schedule = Record<string, ScheduleSlot>; // Key format: "day-period" e.g. "seg-1"
type AllSchedules = Record<string, Schedule>; // Key format: classId -> Schedule

const DAYS = [
  { id: 'seg', label: 'Segunda' },
  { id: 'ter', label: 'Terça' },
  { id: 'qua', label: 'Quarta' },
  { id: 'qui', label: 'Quinta' },
  { id: 'sex', label: 'Sexta' },
];

const PERIODS_MANHA = [1, 2, 3, 4, 5, 6];
const PERIODS_TARDE = [7, 8, 9, 10, 11, 12];

const ID_LAB_INFO_COMP = 'lab-info-comp-id';
const ID_LAB_INFO_TAB = 'lab-info-tab-id';
const ID_SALA_MAT = 'sala-mat-id';

const getDisplayPeriod = (p: number) => p > 6 ? p - 6 : p;
const getShift = (p: number) => p > 6 ? 'tarde' : 'manha';

const normalizeTurmaName = (name: string) => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[º°]/g, 'o')           // replace masculine ordinal indicator with o
    .replace(/ª/g, 'a')             // replace feminine ordinal indicator with a
    .replace(/[^a-z0-9]/g, '');     // remove everything else (spaces, dashes, dots, etc.)
};

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.456h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function ScheduleGenerator() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [schedules, setSchedules] = useState<AllSchedules>({});
  const [version, setVersion] = useState<number>(73);
  const [logoUrl, setLogoUrl] = useState<string>('http://lucasleniar.com.br/mint/civico.png');
  const [showLogoInput, setShowLogoInput] = useState(false);
  const [tempLogoUrl, setTempLogoUrl] = useState('');
  const [schoolName, setSchoolName] = useState<string>('CECM GREGÓRIO SZEREMETA');
  const [showSchoolInput, setShowSchoolInput] = useState(false);
  const [tempSchoolName, setTempSchoolName] = useState('');
  
  const [waPhone, setWaPhone] = useState<string>('');
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isEditingWaPhone, setIsEditingWaPhone] = useState(false);
  const [tempWaPhone, setTempWaPhone] = useState('');
  
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'turmas' | 'rooms'>('turmas');
  const [importShift, setImportShift] = useState<'manha' | 'tarde'>('manha');
  
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherSubjectIds, setNewTeacherSubjectIds] = useState<string[]>([]);
  const [newTeacherAvailability, setNewTeacherAvailability] = useState<string[]>([]);
  const [newTeacherPreferDouble, setNewTeacherPreferDouble] = useState(false);
  const [newTeacherTurmaIds, setNewTeacherTurmaIds] = useState<string[]>([]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectWorkload, setNewSubjectWorkload] = useState<number>(5);
  const [newSubjectUseLabComp, setNewSubjectUseLabComp] = useState(false);
  const [newSubjectUseLabTab, setNewSubjectUseLabTab] = useState(false);
  const [newSubjectUseSalaMat, setNewSubjectUseSalaMat] = useState(false);
  const [newSubjectRoomIds, setNewSubjectRoomIds] = useState<string[]>([]);
  const [newSubjectLabWorkload, setNewSubjectLabWorkload] = useState<number>(0);
  const [newSubjectCustomWorkloads, setNewSubjectCustomWorkloads] = useState<Record<string, { workload: number; classWorkload: number; labWorkload: number }>>({});
  const [showCustomWorkloads, setShowCustomWorkloads] = useState(false);
  const [newSubjectClassWorkload, setNewSubjectClassWorkload] = useState<number>(0);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [newSubjectLevelConstraint, setNewSubjectLevelConstraint] = useState<'ambos' | 'fundamental' | 'medio'>('ambos');
  const [newSubjectGradeConstraint, setNewSubjectGradeConstraint] = useState('');
  const [newSubjectSuffixConstraint, setNewSubjectSuffixConstraint] = useState('');
  const [newSubjectAllowedTurmaIds, setNewSubjectAllowedTurmaIds] = useState<string[]>([]);
  
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [tempTeacher, setTempTeacher] = useState('');
  const [tempSubject, setTempSubject] = useState('');
  const [tempAssociatedTurmaId, setTempAssociatedTurmaId] = useState('');
  const [allocateConsecutive, setAllocateConsecutive] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);

  const [isSaved, setIsSaved] = useState(false);

  const [isAutoGenerateModalOpen, setIsAutoGenerateModalOpen] = useState(false);
  const [autoGenMode, setAutoGenMode] = useState<'all' | 'empty'>('all');
  const [autoGenShift, setAutoGenShift] = useState<'both' | 'manha' | 'tarde' | 'labs'>('both');
  const [isAutoGenerateResultsModalOpen, setIsAutoGenerateResultsModalOpen] = useState(false);
  const [autoGenResults, setAutoGenResults] = useState<{
    solved: boolean;
    scannedCount: number;
    placedCount: number;
    pending: { turmaName: string; subjectName: string; teacherName: string; reason: string }[];
    errors: string[];
  } | null>(null);

  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [isAddingTurma, setIsAddingTurma] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomColor, setNewRoomColor] = useState('#6366f1');
  const [isPrintingTurmaSelection, setIsPrintingTurmaSelection] = useState(false);
  const [isClearingSelection, setIsClearingSelection] = useState(false);
  const [isShowingMissingClasses, setIsShowingMissingClasses] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [helpActiveTab, setHelpActiveTab] = useState('geral');
  const [missingClassesSearch, setMissingClassesSearch] = useState('');
  const [missingClassesShift, setMissingClassesShift] = useState<'todos' | 'manha' | 'tarde'>('todos');
  const [missingClassesOnlyPending, setMissingClassesOnlyPending] = useState(true);
  const [newTurmaName, setNewTurmaName] = useState('');
  const [newTurmaShift, setNewTurmaShift] = useState<'manha' | 'tarde' | 'todas'>('todas');
  const [editingTurmaId, setEditingTurmaId] = useState<string | null>(null);

  // Filter turmas for the interactive grid - let's show all by default unless we really need filtering
  // The user complained about missing "middle" classes, so showing all might be safer
  // or at least ensure the ones without shift show up correctly.
  
  const getTurmaSortWeight = (name: string) => {
    const n = name.toUpperCase();
    const match = n.match(/(\d+)/);
    if (!match) return 9999;
    
    const num = parseInt(match[1]);
    let base = num * 100;
    
    // Prioridade: 6, 7, 8, 9, depois 1, 2, 3
    if (num >= 6 && num <= 9) {
      base = num * 100; // 600 - 900
    } else if (num >= 1 && num <= 3) {
      base = (num + 9) * 100; // 1000 - 1200
    }
    
    const suffix = n.split(match[1])[1] || "";
    const firstLetterMatch = suffix.match(/[A-Z]/);
    const letterWeight = firstLetterMatch ? firstLetterMatch[0].charCodeAt(0) : 0;
    
    return base + letterWeight;
  };

  const sortTurmasList = (list: Turma[]) => {
    return [...list].sort((a, b) => {
      const wa = getTurmaSortWeight(a.name);
      const wb = getTurmaSortWeight(b.name);
      if (wa !== wb) return wa - wb;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
  };

  const displayedTurmas = sortTurmasList(
    turmas.filter(t => {
      // Excluir as turmas virtuais das salas das listagens normais
      if (t.isRoom) return false;
      
      if (t.shift) return t.shift === importShift;
      // Fallback for older data or implicitly named turmas
      const isNamedTarde = t.name.toLowerCase().includes('tarde') || t.id.toLowerCase().includes('tarde');
      return importShift === 'manha' ? !isNamedTarde : isNamedTarde;
    })
  );

  // Initialize version, logo and school name on mount
  useEffect(() => {
    const savedLogo = localStorage.getItem('cecm_logo_url');
    if (savedLogo) setLogoUrl(savedLogo);
    
    const savedSchoolName = localStorage.getItem('cecm_school_name');
    if (savedSchoolName) setSchoolName(savedSchoolName);
    
    const savedWaPhone = localStorage.getItem('cecm_whatsapp_phone');
    if (savedWaPhone) {
      setWaPhone(savedWaPhone);
      setTempWaPhone(savedWaPhone);
    }
    
    const savedVersion = localStorage.getItem('cecm_version');
    if (savedVersion) {
      const v = parseInt(savedVersion);
      // Elevate minimum version to 73 and auto-increase if it's currently at 72 or below
      setVersion(v <= 72 ? 73 : v);
    } else {
      setVersion(73);
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddingTeacher(false);
        setIsAddingRoom(false);
        setIsAddingSubject(false);
        setIsAddingTurma(false);
        setIsPrintingTurmaSelection(false);
        setIsClearingSelection(false);
        setIsShowingMissingClasses(false);
        setIsWhatsAppModalOpen(false);
        setSelectedSlot(null);
        setEditingTeacherId(null);
        setEditingSubjectId(null);
        setEditingTurmaId(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Synchronize selected turma when shift changes or list changes
  useEffect(() => {
    if (displayedTurmas.length > 0) {
      const isSelectedStillVisible = displayedTurmas.some(t => t.id === selectedTurmaId);
      if (!isSelectedStillVisible) {
        setSelectedTurmaId(displayedTurmas[0].id);
      }
    } else {
      setSelectedTurmaId('');
    }
  }, [importShift, turmas.length]);

  // Safe UUID generator
  const generateId = () => {
    try {
      return crypto.randomUUID();
    } catch (e) {
      return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    }
  };

  // Load data
  useEffect(() => {
    try {
      const savedTeachers = localStorage.getItem('cecm_teachers');
      const savedSubjects = localStorage.getItem('cecm_subjects');
      const savedTurmas = localStorage.getItem('cecm_turmas');
      const savedSchedules = localStorage.getItem('cecm_schedules');

      if (savedTeachers) {
        let parsed = JSON.parse(savedTeachers);
        // Migration: convert subjectId string to subjectIds array
        parsed = parsed.map((t: any) => ({
          ...t,
          subjectIds: t.subjectIds || (t.subjectId ? [t.subjectId] : [])
        }));
        setTeachers(parsed);
      }
      if (savedSubjects) {
        let parsedSubjects = JSON.parse(savedSubjects);
        // Migração: Se não houver roomIds, criar a partir dos booleanos antigos
        parsedSubjects = parsedSubjects.map((s: any) => {
          if (!s.roomIds) {
            const roomIds = [];
            if (s.useLabComp) roomIds.push(ID_LAB_INFO_COMP);
            if (s.useLabTab) roomIds.push(ID_LAB_INFO_TAB);
            if (s.useSalaMat) roomIds.push(ID_SALA_MAT);
            return { ...s, roomIds };
          }
          return s;
        });
        setSubjects(parsedSubjects);
      }
      
      const savedLogo = localStorage.getItem('cecm_logo_url');
      if (savedLogo) setLogoUrl(savedLogo);
      
      const savedSchoolName = localStorage.getItem('cecm_school_name');
      if (savedSchoolName) setSchoolName(savedSchoolName);
      
      const savedVersion = localStorage.getItem('cecm_version');
      if (savedVersion) {
        const v = parseInt(savedVersion);
        setVersion(v <= 71 ? 72 : v);
      } else {
        setVersion(72);
      }

      if (savedTurmas) {
        let parsedTurmas = JSON.parse(savedTurmas);
        const specialRooms = [
          { id: ID_LAB_INFO_COMP, name: 'LABORATÓRIO 1', shift: 'ambos', isRoom: true, color: '#9333ea' },
          { id: ID_LAB_INFO_TAB, name: 'LABORATÓRIO 2', shift: 'ambos', isRoom: true, color: '#2563eb' },
          { id: ID_SALA_MAT, name: 'SALA DE MATEMÁTICA', shift: 'ambos', isRoom: true, color: '#f97316' }
        ];

        let updated = false;
        specialRooms.forEach(room => {
          const existing = parsedTurmas.find((t: any) => t.id === room.id);
          if (!existing) {
            parsedTurmas.push(room);
            updated = true;
          } else if (!existing.isRoom) {
            existing.isRoom = true;
            if (!existing.color) existing.color = room.color;
            updated = true;
          }
        });

        // Migrate normal turmas that have no shift
        parsedTurmas = parsedTurmas.map((t: any) => {
          if (!t.isRoom && !t.shift) {
            const isNamedTarde = t.name.toLowerCase().includes('tarde') || t.id.toLowerCase().includes('tarde');
            t.shift = isNamedTarde ? 'tarde' : 'manha';
            updated = true;
          }
          // Healing: If an afternoon user got corrupted and stored with 'manha' shift, restore it to 'tarde'
          if (!t.isRoom && t.shift === 'manha' && (t.id.toLowerCase().includes('tarde') || t.name.toLowerCase().includes('tarde'))) {
            t.shift = 'tarde';
            updated = true;
          }
          return t;
        });

        setTurmas(parsedTurmas);

        let loadedSchedules = {};
        if (savedSchedules) {
          try {
            loadedSchedules = JSON.parse(savedSchedules);
          } catch (e) {
            console.error("Error parsing saved schedules", e);
          }
        }

        // Remap schedules if we migrated any turma shift
        const migratedSchedules: AllSchedules = {};
        Object.keys(loadedSchedules).forEach(tid => {
          const turma = parsedTurmas.find((t: any) => t.id === tid);
          if (turma) {
            migratedSchedules[tid] = remapScheduleIfNecessary(turma, loadedSchedules[tid]);
          } else {
            migratedSchedules[tid] = loadedSchedules[tid];
          }
        });

        setSchedules(migratedSchedules);

        if (updated) {
          localStorage.setItem('cecm_turmas', JSON.stringify(parsedTurmas));
          localStorage.setItem('cecm_schedules', JSON.stringify(migratedSchedules));
        }

        if (parsedTurmas.length > 0) setSelectedTurmaId(parsedTurmas[0].id);
      } else {
        const specialRooms = [
          { id: ID_LAB_INFO_COMP, name: 'LABORATÓRIO 1', shift: 'ambos', isRoom: true, color: '#9333ea' },
          { id: ID_LAB_INFO_TAB, name: 'LABORATÓRIO 2', shift: 'ambos', isRoom: true, color: '#2563eb' },
          { id: ID_SALA_MAT, name: 'SALA DE MATEMÁTICA', shift: 'ambos', isRoom: true, color: '#f97316' }
        ];
        const defaultTurmas = Array.from({ length: 12 }, (_, i) => ({
          id: generateId(),
          name: `${Math.floor(i/3) + 6}º Ano ${String.fromCharCode(65 + (i % 3))}`,
          shift: 'manha' as const
        }));
        const initialTurmas = [...specialRooms, ...defaultTurmas];
        setTurmas(initialTurmas);
        localStorage.setItem('cecm_turmas', JSON.stringify(initialTurmas));
        if (initialTurmas.length > 0) setSelectedTurmaId(initialTurmas[0].id);

        if (savedSchedules) setSchedules(JSON.parse(savedSchedules));
      }
    } catch (err) {
      console.error("Error loading data from localStorage:", err);
      // Reset corrupted data
      localStorage.clear();
    }
  }, []);

  // Conflict Detection
  const getConflicts = (dayId: string, period: number, teacherId: string, excludeTurmaId: string) => {
    if (!teacherId) return [];
    const slotId = `${dayId}-${period}`;
    const conflicts: string[] = [];

    // Verificação de Disponibilidade
    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher && teacher.availability && teacher.availability.length > 0) {
      if (!teacher.availability.includes(slotId)) {
        conflicts.push('INDISPONÍVEL');
      }
    }

    Object.entries(schedules).forEach(([turmaId, schedule]) => {
      if (turmaId !== excludeTurmaId && schedule[slotId]?.teacherId === teacherId) {
        const turmaName = turmas.find(t => t.id === turmaId)?.name || 'Outra Turma';
        conflicts.push(turmaName);
      }
    });

    return conflicts;
  };

  // Save data
  const handlePrint = () => {
    window.print();
  };

  // Auto-save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('cecm_teachers', JSON.stringify(teachers));
    localStorage.setItem('cecm_subjects', JSON.stringify(subjects));
    localStorage.setItem('cecm_turmas', JSON.stringify(turmas));
    localStorage.setItem('cecm_schedules', JSON.stringify(schedules));
    localStorage.setItem('cecm_version', version.toString());
    localStorage.setItem('cecm_logo_url', logoUrl);
    localStorage.setItem('cecm_school_name', schoolName);
  }, [teachers, subjects, turmas, schedules, version, logoUrl, schoolName]);

  // Backup functions
  const handleExportData = () => {
    const data = {
      teachers,
      subjects,
      turmas,
      schedules,
      version,
      logoUrl,
      schoolName,
      exportDate: new Date().toISOString(),
      appName: "CECM-Scheduler"
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    link.download = `backup_horarios_${dateStr}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleWhatsAppExport = () => {
    // 1. Export standard text file (Download format) so it's ready in browser downloads
    handleExportData();

    // 2. Format phone number to numbers only
    const cleanPhone = tempWaPhone.replace(/\D/g, '');
    if (!cleanPhone) {
      alert("Por favor, insira um número de telefone válido com DDD.");
      return;
    }

    // Save number to localStorage and state
    setWaPhone(cleanPhone);
    localStorage.setItem('cecm_whatsapp_phone', cleanPhone);

    // 3. Build WhatsApp message text (simple and compact referring to the downloaded .txt file)
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const messageText = `Olá! Segue o arquivo de backup do Gerador de Horários - ${schoolName}.\n\n` +
      `📅 Gerado em: ${dateStr} às ${timeStr}\n\n` +
      `📝 TUTORIAL PARA RESTAURAR ESTE BACKUP:\n` +
      `1. Baixe o arquivo de backup (.txt) que foi baixado automaticamente no seu dispositivo ou computador.\n` +
      `2. No sistema, clique na opção de "Restaurar Backup" (ícone com folha de papel com seta apontando para cima no menu superior).\n` +
      `3. Selecione o arquivo .txt baixado.\n\n` +
      `Pronto! Todos os professores, matérias e grades serão atualizados e restaurados instantaneamente.\n\n` +
      `Gerador de Horários - ${schoolName}`;

    // 4. Open WhatsApp via universal deep link api.whatsapp.com
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
    
    // Close modal
    setIsWhatsAppModalOpen(false);
  };

  // Helper to remap schedule if shift changes
  const remapScheduleIfNecessary = (turma: Turma, schedule: Schedule): Schedule => {
    if (!turma.shift || turma.shift === 'ambos') return schedule;
    
    const newSchedule: Schedule = {};
    let changed = false;
    
    Object.entries(schedule).forEach(([slotId, slot]) => {
      const [day, periodStr] = slotId.split('-');
      const period = parseInt(periodStr);
      
      let targetPeriod = period;
      if (turma.shift === 'manha' && period > 6) {
        targetPeriod = period - 6;
        changed = true;
      } else if (turma.shift === 'tarde' && period <= 6) {
        targetPeriod = period + 6;
        changed = true;
      }
      
      newSchedule[`${day}-${targetPeriod}`] = slot;
    });
    
    return changed ? newSchedule : schedule;
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Basic validation: check if it's a JSON with at least one expected key
        const hasSomeData = data.teachers || data.subjects || data.turmas || data.schedules;
        
        if (hasSomeData) {
          const isCurrentAppEmpty = teachers.length === 0 && subjects.length === 0;
          const userConfirmed = isCurrentAppEmpty || confirm('ATENÇÃO: A importação de backup irá substituir TODOS os dados atuais (professores, matérias e horários). Deseja continuar?');
          
          if (userConfirmed) {
            // Ensure all data is set, providing defaults for older backups
            setTeachers(data.teachers || []);
            
            // Migração de subjects no import
            let importedSubjects = (data.subjects || []).map((s: any) => {
              if (!s.roomIds) {
                const roomIds = [];
                if (s.useLabComp) roomIds.push(ID_LAB_INFO_COMP);
                if (s.useLabTab) roomIds.push(ID_LAB_INFO_TAB);
                if (s.useSalaMat) roomIds.push(ID_SALA_MAT);
                return { ...s, roomIds };
              }
              return s;
            });
            setSubjects(importedSubjects);
            
            let importedTurmas = (data.turmas || []).map((t: any) => {
              // Migração: Se for um dos IDs antigos, garantir que isRoom: true
              if ([ID_LAB_INFO_COMP, ID_LAB_INFO_TAB, ID_SALA_MAT].includes(t.id)) {
                return { 
                  ...t, 
                  isRoom: true, 
                  shift: 'ambos',
                  color: t.color || (t.id === ID_LAB_INFO_COMP ? '#9333ea' : t.id === ID_LAB_INFO_TAB ? '#2563eb' : '#f97316') 
                };
              }
              // Normal turmas shift migration
              if (!t.isRoom) {
                if (!t.shift) {
                  const isNamedTarde = t.name?.toLowerCase().includes('tarde') || t.id?.toLowerCase().includes('tarde');
                  t.shift = isNamedTarde ? 'tarde' : 'manha';
                } else if (t.shift === 'manha' && (t.id?.toLowerCase().includes('tarde') || t.name?.toLowerCase().includes('tarde'))) {
                  // Heal shift if it is incorrectly stored in the raw backup as 'manha'
                  t.shift = 'tarde';
                }
              }
              return t;
            });

            const specialRooms = [
              { id: ID_LAB_INFO_COMP, name: 'LABORATÓRIO 1', shift: 'ambos', isRoom: true, color: '#9333ea' },
              { id: ID_LAB_INFO_TAB, name: 'LABORATÓRIO 2', shift: 'ambos', isRoom: true, color: '#2563eb' },
              { id: ID_SALA_MAT, name: 'SALA DE MATEMÁTICA', shift: 'ambos', isRoom: true, color: '#f97316' }
            ];
            
            specialRooms.forEach(room => {
              const existing = importedTurmas.find((t: any) => t.id === room.id);
              if (!existing) {
                importedTurmas.push(room);
              } else {
                if (!existing.isRoom) existing.isRoom = true;
                if (!existing.shift) existing.shift = 'ambos';
                if (!existing.color) existing.color = room.color;
              }
            });
            
            setTurmas(importedTurmas);

            // Normalização de schedules no import
            const rawSchedules = data.schedules || {};
            const normalizedSchedules: AllSchedules = {};
            
            Object.keys(rawSchedules).forEach(tid => {
              const turma = importedTurmas.find((t: any) => t.id === tid);
              if (turma) {
                normalizedSchedules[tid] = remapScheduleIfNecessary(turma, rawSchedules[tid]);
              } else {
                normalizedSchedules[tid] = rawSchedules[tid];
              }
            });

            setSchedules(normalizedSchedules);
            setLogoUrl(data.logoUrl || '');
            setSchoolName(data.schoolName || 'CECM GREGÓRIO SZEREMETA');
            setVersion(prev => (data.version || prev) + 1);
            
            if (importedTurmas.length > 0) {
              setSelectedTurmaId(importedTurmas[0].id);
              const firstTurma = importedTurmas[0];
              if (firstTurma.shift) {
                setImportShift(firstTurma.shift);
              } else if (firstTurma.name?.toLowerCase().includes('tarde') || firstTurma.id?.toLowerCase().includes('tarde')) {
                setImportShift('tarde');
              } else {
                setImportShift('manha');
              }
            }
            
            alert('Backup restaurado com sucesso! Todos os dados foram atualizados.');
          }
        } else {
          alert('Arquivo de backup de formato desconhecido. Certifique-se de usar um arquivo .txt gerado por este sistema.');
        }
      } catch (err) {
        alert('Erro crítico ao processar o backup. O arquivo pode estar corrompido.');
        console.error("Import error:", err);
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  interface LessonGroup {
    id: string;
    turmaId: string;
    subjectId: string;
    teacherId: string;
    isLab: boolean;
    allowedRooms: string[];
    shift: 'manha' | 'tarde';
    size: number;
  }

  const getSubjectWorkloadsForTurma = (S: Subject, TId: string) => {
    const T = turmas.find(t => t.id === TId);
    if (!T || T.isRoom) return { workload: 0, classWorkload: 0, labWorkload: 0 };

    const subjectNameLower = S.name.toLowerCase().trim();
    const turmaNameUpper = T.name.toUpperCase().replace(/\s+/g, '');

    // Level detection: Ensino Fundamental vs. Ensino Médio
    // Standard Brazilian Fundamental II classes: 6º, 7º, 8º, 9º
    const isFundamental = /\b(6|7|8|9)\b|\b(6|7|8|9)º/i.test(T.name) || 
                          T.name.toLowerCase().includes('fundamental') || 
                          T.name.toLowerCase().includes('6º') || 
                          T.name.toLowerCase().includes('7º') || 
                          T.name.toLowerCase().includes('8º') || 
                          T.name.toLowerCase().includes('9º');
                          
    // High School (Ensino Médio) groups standardly: 1º, 2º, 3º of secondary education
    const isMedio = (/\b(1|2|3)\b|\b(1|2|3)º|\b(1|2|3)ª/i.test(T.name) || 
                    T.name.toLowerCase().includes('médio') || 
                    T.name.toLowerCase().includes('medio') || 
                    T.name.toLowerCase().includes('e.m.') || 
                    T.name.toLowerCase().includes('em')) && !isFundamental;

    // --- DYNAMIC/CONFIGURABLE CONSTRAINTS ---

    // 1. Direct whitelist of specific Turmas (if populated)
    if (S.allowedTurmaIds && S.allowedTurmaIds.length > 0) {
      if (!S.allowedTurmaIds.includes(TId)) {
        return { workload: 0, classWorkload: 0, labWorkload: 0 };
      }
    }

    // 2. School Level Constraint (Fundamental vs. Médio)
    if (S.levelConstraint && S.levelConstraint !== 'ambos') {
      if (S.levelConstraint === 'fundamental' && !isFundamental) {
        return { workload: 0, classWorkload: 0, labWorkload: 0 };
      }
      if (S.levelConstraint === 'medio' && !isMedio) {
        return { workload: 0, classWorkload: 0, labWorkload: 0 };
      }
    } else {
      // Fallback rule for standard unconfigured legacy courses: Filosofia and Sociologia are ONLY for Ensino Médio
      if (subjectNameLower.includes('filosofia') || subjectNameLower.includes('sociologia')) {
        if (isFundamental || (!isMedio && T.name.startsWith('6') || T.name.startsWith('7') || T.name.startsWith('8') || T.name.startsWith('9'))) {
          return { workload: 0, classWorkload: 0, labWorkload: 0 };
        }
      }
    }

    // 3. Series / Grade Constraint (e.g. "6", "6º", "1º")
    if (S.gradeConstraint && S.gradeConstraint.trim()) {
      const terms = S.gradeConstraint.split(',').map(term => term.trim().toLowerCase()).filter(Boolean);
      if (terms.length > 0) {
        const normTName = normalizeTurmaName(T.name);
        const hasMatch = terms.some(term => {
          const normTerm = normalizeTurmaName(term);
          return normTName.includes(normTerm);
        });
        if (!hasMatch) {
          return { workload: 0, classWorkload: 0, labWorkload: 0 };
        }
      }
    } else {
      // Fallback rule for standard unconfigured legacy courses: Ensino Religioso / Religião is strictly for 6º Ano only
      if (subjectNameLower.includes('ensino religioso') || subjectNameLower.includes('religioso') || subjectNameLower.includes('religião') || subjectNameLower.includes('religiao')) {
        const is6th = T.name.includes('6') || T.name.includes('6º');
        if (!is6th) {
          return { workload: 0, classWorkload: 0, labWorkload: 0 };
        }
      }
    }

    // 4. Class Suffix Constraint (e.g. "B", "A", "Integral")
    if (S.suffixConstraint && S.suffixConstraint.trim()) {
      const terms = S.suffixConstraint.split(',').map(term => term.trim().toUpperCase()).filter(Boolean);
      if (terms.length > 0) {
        const upperTName = T.name.toUpperCase();
        const hasMatch = terms.some(term => {
          if (upperTName.endsWith(term)) return true;
          if (upperTName.replace(/\s+/g, '').endsWith(term.replace(/\s+/g, ''))) return true;
          return upperTName.includes(term);
        });
        if (!hasMatch) {
          return { workload: 0, classWorkload: 0, labWorkload: 0 };
        }
      }
    } else {
      // Fallback rule for standard unconfigured legacy courses: Marketing is strictly for specialized classes: 1ºB, 2ºB, 3ºB
      if (subjectNameLower.includes('marketing')) {
        const hasExplicitConfig = S.customWorkloads?.[TId] !== undefined && S.customWorkloads[TId].workload > 0;
        const isAllowedMarketingTurma = /1.*B/i.test(turmaNameUpper) || 
                                       /2.*B/i.test(turmaNameUpper) || 
                                       /3.*B/i.test(turmaNameUpper) || 
                                       turmaNameUpper.includes('1B') || 
                                       turmaNameUpper.includes('2B') || 
                                       turmaNameUpper.includes('3B');
        
        if (!hasExplicitConfig && !isAllowedMarketingTurma) {
          return { workload: 0, classWorkload: 0, labWorkload: 0 };
        }
      }
    }

    // Universal subjects that bypass standard automatic custom exclusion checks
    const universalSubjects = [
      'matemática', 'matematica',
      'português', 'portugues', 'língua portuguesa', 'lingua portuguesa', 'portugués',
      'história', 'historia',
      'geografia',
      'ciências', 'ciencias',
      'biologia',
      'física', 'fisica',
      'química', 'quimica',
      'educação física', 'educacao fisica',
      'arte', 'artes',
      'inglês', 'ingles', 'língua inglesa', 'lingua inglesa',
      'espanhol'
    ];
    
    const isUniversal = universalSubjects.some(u => subjectNameLower.includes(u));
    const custom = S.customWorkloads?.[TId];
    
    // If the subject has any custom workloads configured, treat it as restricted to those specified unless it is labeled universal
    const hasAnyCustomWorkloads = S.customWorkloads && Object.keys(S.customWorkloads).length > 0;
    if (hasAnyCustomWorkloads && !custom && !isUniversal) {
      return { workload: 0, classWorkload: 0, labWorkload: 0 };
    }

    const workload = custom ? custom.workload : S.workload;
    let classWorkload = custom ? custom.classWorkload : (S.classWorkload ?? 0);
    let labWorkload = custom ? custom.labWorkload : (S.labWorkload ?? 0);
    
    if (classWorkload === 0 && labWorkload === 0 && workload > 0) {
      classWorkload = workload;
    }
    return { workload, classWorkload, labWorkload };
  };

  const getCompatibleSpecialRooms = (S: Subject, allRooms: Turma[]) => {
    const roomIds = new Set<string>();
    if (S.roomIds) {
      S.roomIds.forEach(id => roomIds.add(id));
    }
    if (S.useLabComp) roomIds.add(ID_LAB_INFO_COMP);
    if (S.useLabTab) roomIds.add(ID_LAB_INFO_TAB);
    if (S.useSalaMat) roomIds.add(ID_SALA_MAT);
    
    return allRooms.filter(r => r.isRoom && roomIds.has(r.id)).map(r => r.id);
  };

  const getEligibleTeachers = (SId: string, TId: string, allTeachers: Teacher[]) => {
    return allTeachers.filter(t => {
      const teachesSubject = t.subjectIds && t.subjectIds.includes(SId);
      const teachesTurma = !t.turmaIds || t.turmaIds.length === 0 || t.turmaIds.includes(TId);
      return teachesSubject && teachesTurma;
    });
  };

  const runAutoScheduling = () => {
    setIsSaved(false);
    const errors: string[] = [];
    const pendingLessons: { turmaName: string; subjectName: string; teacherName: string; reason: string }[] = [];

    const activeTurmas = turmas.filter(t => {
      if (t.isRoom) return false;
      const detectedShift = t.shift || (t.id.toLowerCase().includes('tarde') || t.name.toLowerCase().includes('tarde') ? 'tarde' : 'manha');
      if (autoGenShift === 'manha') {
        return detectedShift === 'manha' || detectedShift === 'ambos';
      }
      if (autoGenShift === 'tarde') {
        return detectedShift === 'tarde' || detectedShift === 'ambos';
      }
      return true; // For 'both' or 'labs'
    });

    const specialRooms = turmas.filter(t => t.isRoom);
    const newSchedules: AllSchedules = {};
    Object.keys(schedules).forEach(tid => {
      newSchedules[tid] = { ...(schedules[tid] || {}) };
    });

    const targetPeriods = new Set<number>();
    if (autoGenShift === 'both' || autoGenShift === 'labs' || autoGenShift === 'manha') {
      [1, 2, 3, 4, 5, 6].forEach(p => targetPeriods.add(p));
    }
    if (autoGenShift === 'both' || autoGenShift === 'labs' || autoGenShift === 'tarde') {
      [7, 8, 9, 10, 11, 12].forEach(p => targetPeriods.add(p));
    }

    if (autoGenMode === 'all') {
      Object.keys(newSchedules).forEach(tid => {
        const isRoom = turmas.find(t => t.id === tid)?.isRoom;
        Object.keys(newSchedules[tid]).forEach(slotId => {
          const [_, pStr] = slotId.split('-');
          const p = parseInt(pStr);
          if (autoGenShift === 'labs') {
            if (isRoom) {
              delete newSchedules[tid][slotId];
            }
          } else {
            if (targetPeriods.has(p)) {
              delete newSchedules[tid][slotId];
            }
          }
        });
      });
    }

    const requirements: {
      id: string;
      turmaId: string;
      subjectId: string;
      teacherId: string;
      isLab: boolean;
      allowedRooms: string[];
      shift: 'manha' | 'tarde';
    }[] = [];

    activeTurmas.forEach(T => {
      const isAfternoon = T.shift === 'tarde' || T.id.toLowerCase().includes('tarde') || T.name.toLowerCase().includes('tarde');
      const classShift: 'manha' | 'tarde' = isAfternoon ? 'tarde' : 'manha';

      subjects.forEach(S => {
        const { classWorkload, labWorkload } = getSubjectWorkloadsForTurma(S, T.id);
        if (classWorkload === 0 && labWorkload === 0) return;

        const eligible = getEligibleTeachers(S.id, T.id, teachers);
        if (eligible.length === 0) {
          errors.push(`Nenhum professor cadastrado leciona a matéria "${S.name}" para a turma "${T.name}"`);
          return;
        }

        let assignedTeacher = eligible[0];
        const originalScheduleOfTurma = schedules[T.id] || {};
        const existingSlot = (Object.values(originalScheduleOfTurma) as ScheduleSlot[]).find(slot => slot?.subjectId === S.id);
        if (existingSlot) {
          assignedTeacher = eligible.find(t => t.id === existingSlot.teacherId) || eligible[0];
        } else {
          let bestTeacher = eligible[0];
          let minWorkload = Infinity;
          eligible.forEach(tea => {
            let count = 0;
            activeTurmas.forEach(otherTurma => {
              (Object.values(schedules[otherTurma.id] || {}) as ScheduleSlot[]).forEach(slot => {
                if (slot?.teacherId === tea.id) count++;
              });
            });
            if (count < minWorkload) {
              minWorkload = count;
              bestTeacher = tea;
            }
          });
          assignedTeacher = bestTeacher;
        }

        let cWorkloadToAlloc = autoGenShift === 'labs' ? 0 : classWorkload;
        let lWorkloadToAlloc = labWorkload;

        if (autoGenMode === 'empty') {
          const classUsage = Object.values(newSchedules[T.id] || {}).filter(slot => 
            slot.subjectId === S.id
          ).length;
          cWorkloadToAlloc = Math.max(0, cWorkloadToAlloc - classUsage);

          let labUsage = 0;
          specialRooms.forEach(room => {
            labUsage += Object.values(newSchedules[room.id] || {}).filter(slot => 
              slot.subjectId === S.id && slot.associatedTurmaId === T.id
            ).length;
          });
          lWorkloadToAlloc = Math.max(0, labWorkload - labUsage);
        }

        for (let u = 0; u < cWorkloadToAlloc; u++) {
          requirements.push({
            id: `${T.id}-${S.id}-${assignedTeacher.id}-class-${u}`,
            turmaId: T.id,
            subjectId: S.id,
            teacherId: assignedTeacher.id,
            isLab: false,
            allowedRooms: [],
            shift: classShift
          });
        }

        if (lWorkloadToAlloc > 0) {
          const allowedRooms = getCompatibleSpecialRooms(S, specialRooms);
          if (allowedRooms.length === 0) {
            errors.push(`A matéria "${S.name}" exige laboratório para a turma "${T.name}", mas nenhuma das salas especiais possui essa matéria associada.`);
            return;
          }
          for (let u = 0; u < lWorkloadToAlloc; u++) {
            requirements.push({
              id: `${T.id}-${S.id}-${assignedTeacher.id}-lab-${u}`,
              turmaId: T.id,
              subjectId: S.id,
              teacherId: assignedTeacher.id,
              isLab: true,
              allowedRooms,
              shift: classShift
            });
          }
        }
      });
    });

    const groups: LessonGroup[] = [];
    const keyMap = new Map<string, typeof requirements>();
    requirements.forEach(req => {
      const key = `${req.turmaId}_${req.subjectId}_${req.teacherId}_${req.isLab}`;
      if (!keyMap.has(key)) keyMap.set(key, []);
      keyMap.get(key)!.push(req);
    });

    keyMap.forEach((reqs, key) => {
      const first = reqs[0];
      const teacherObj = teachers.find(t => t.id === first.teacherId);
      const wantsDouble = teacherObj?.preferDoubleClasses ?? true;
      
      let count = reqs.length;
      let idx = 0;
      
      if (wantsDouble) {
        while (count >= 2) {
          groups.push({
            id: `${key}-group2-${idx}`,
            turmaId: first.turmaId,
            subjectId: first.subjectId,
            teacherId: first.teacherId,
            isLab: first.isLab,
            allowedRooms: first.allowedRooms,
            shift: first.shift,
            size: 2
          });
          count -= 2;
          idx++;
        }
      }
      
      while (count >= 1) {
        groups.push({
          id: `${key}-group1-${idx}`,
          turmaId: first.turmaId,
          subjectId: first.subjectId,
          teacherId: first.teacherId,
          isLab: first.isLab,
          allowedRooms: first.allowedRooms,
          shift: first.shift,
          size: 1
        });
        count -= 1;
        idx++;
      }
    });

    const getGroupPriority = (g: LessonGroup) => {
      const teacher = teachers.find(t => t.id === g.teacherId);
      const shiftPeriods = g.shift === 'tarde' ? [7,8,9,10,11,12] : [1,2,3,4,5,6];
      
      let availableSlots = 0;
      DAYS.forEach(day => {
        shiftPeriods.forEach(p => {
          const slotId = `${day.id}-${p}`;
          if (!teacher?.availability || teacher.availability.length === 0 || teacher.availability.includes(slotId)) {
            availableSlots++;
          }
        });
      });
      
      let score = 100 - availableSlots;
      if (g.isLab) {
        score += (20 - g.allowedRooms.length * 5);
      }
      if (g.size === 2) {
        score += 50;
      }
      return score;
    };

    const sortedGroups = [...groups].sort((a, b) => getGroupPriority(b) - getGroupPriority(a));

    const canPlacePeriod = (
      g: LessonGroup,
      day: string,
      p: number,
      roomId: string,
      currentSchedules: AllSchedules
    ) => {
      const slotId = `${day}-${p}`;
      
      const teacher = teachers.find(t => t.id === g.teacherId);
      if (teacher?.availability && teacher.availability.length > 0) {
        if (!teacher.availability.includes(slotId)) return false;
      }
      
      // Se o professor não quiser aulas geminadas, não permite que essa aula seja consecutiva (vizinha) a outra dele na mesma turma
      if (teacher && teacher.preferDoubleClasses === false) {
        const prevSlotId = `${day}-${p - 1}`;
        const nextSlotId = `${day}-${p + 1}`;
        
        // Verificação na própria grade da turma (auxiliar)
        const prevSlot = currentSchedules[g.turmaId]?.[prevSlotId];
        const nextSlot = currentSchedules[g.turmaId]?.[nextSlotId];
        if (prevSlot && prevSlot.teacherId === g.teacherId && prevSlot.subjectId === g.subjectId) {
          return false;
        }
        if (nextSlot && nextSlot.teacherId === g.teacherId && nextSlot.subjectId === g.subjectId) {
          return false;
        }
        
        // Verificação em laboratórios que atendem a essa turma no slot anterior ou seguinte
        for (const tid in currentSchedules) {
          const room = turmas.find(t => t.id === tid);
          if (room?.isRoom) {
            const pRoomSlot = currentSchedules[tid]?.[prevSlotId];
            if (pRoomSlot && pRoomSlot.associatedTurmaId === g.turmaId && pRoomSlot.teacherId === g.teacherId && pRoomSlot.subjectId === g.subjectId) {
              return false;
            }
            const nRoomSlot = currentSchedules[tid]?.[nextSlotId];
            if (nRoomSlot && nRoomSlot.associatedTurmaId === g.turmaId && nRoomSlot.teacherId === g.teacherId && nRoomSlot.subjectId === g.subjectId) {
              return false;
            }
          }
        }
      }
      
      for (const tid in currentSchedules) {
        const slot = currentSchedules[tid]?.[slotId];
        if (slot && slot.teacherId === g.teacherId) {
          return false;
        }
      }
      
      if (currentSchedules[g.turmaId]?.[slotId]) {
        return false;
      }
      for (const tid in currentSchedules) {
        const room = turmas.find(t => t.id === tid);
        if (room?.isRoom) {
          if (currentSchedules[tid]?.[slotId]?.associatedTurmaId === g.turmaId) {
            return false;
          }
        }
      }
      
      if (g.isLab) {
        if (currentSchedules[roomId]?.[slotId]) {
          return false;
        }
      }
      
      return true;
    };

    const getPossiblePlacementsForGroup = (g: LessonGroup) => {
      const list: { day: string; periods: number[] }[] = [];
      const pList = g.shift === 'tarde' ? [7,8,9,10,11,12] : [1,2,3,4,5,6];
      const teacher = teachers.find(t => t.id === g.teacherId);
      const hasAvailability = teacher?.availability && teacher.availability.length > 0;
      
      DAYS.forEach(day => {
        if (g.size === 1) {
          pList.forEach(p => {
            const slotId = `${day.id}-${p}`;
            // Só adiciona se o professor não tiver restrição de disponibilidade, ou se este slot estiver explicitamente no seu array de disponíveis
            if (!hasAvailability || (teacher?.availability && teacher.availability.includes(slotId))) {
              list.push({ day: day.id, periods: [p] });
            }
          });
        } else if (g.size === 2) {
          let pairs: number[][] = [];
          if (g.shift === 'manha') {
            pairs = [[1, 2], [2, 3], [4, 5], [5, 6]];
          } else {
            pairs = [[7, 8], [8, 9], [10, 11], [11, 12]];
          }
          
          pairs.forEach(pair => {
            const slot1 = `${day.id}-${pair[0]}`;
            const slot2 = `${day.id}-${pair[1]}`;
            // Só adiciona se o professor estiver plenamente disponível nos dois horários geminados
            if (!hasAvailability || (teacher?.availability && teacher.availability.includes(slot1) && teacher.availability.includes(slot2))) {
              list.push({ day: day.id, periods: pair });
            }
          });
        }
      });
      return list;
    };

    let steps = 0;
    const maxSteps = 4000;

    const solve = (groupIndex: number): boolean => {
      steps++;
      if (steps > maxSteps) return false;
      if (groupIndex >= sortedGroups.length) return true;
      
      const g = sortedGroups[groupIndex];
      const placements = getPossiblePlacementsForGroup(g);
      
      for (let i = placements.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [placements[i], placements[j]] = [placements[j], placements[i]];
      }
      
      const roomsToTry = g.isLab ? g.allowedRooms : [g.turmaId];
      
      for (const placement of placements) {
        for (const rid of roomsToTry) {
          let ok = true;
          for (const p of placement.periods) {
            if (!canPlacePeriod(g, placement.day, p, rid, newSchedules)) {
              ok = false;
              break;
            }
          }
          
          if (ok) {
            placement.periods.forEach(p => {
              const slotId = `${placement.day}-${p}`;
              if (!newSchedules[rid]) newSchedules[rid] = {};
              newSchedules[rid][slotId] = {
                teacherId: g.teacherId,
                subjectId: g.subjectId,
                associatedTurmaId: g.isLab ? g.turmaId : undefined
              };
            });
            
            if (solve(groupIndex + 1)) {
              return true;
            }
            
            placement.periods.forEach(p => {
              const slotId = `${placement.day}-${p}`;
              delete newSchedules[rid][slotId];
            });
          }
        }
      }
      
      return false;
    };

    let solved = false;
    let attempt = 0;
    while (!solved && attempt < 3) {
      attempt++;
      Object.keys(newSchedules).forEach(tid => {
        newSchedules[tid] = { ...(schedules[tid] || {}) };
      });
      if (autoGenMode === 'all') {
        Object.keys(newSchedules).forEach(tid => {
          const isRoom = turmas.find(t => t.id === tid)?.isRoom;
          Object.keys(newSchedules[tid]).forEach(slotId => {
            const [_, pStr] = slotId.split('-');
            const p = parseInt(pStr);
            if (autoGenShift === 'labs') {
              if (isRoom) delete newSchedules[tid][slotId];
            } else {
              if (targetPeriods.has(p)) delete newSchedules[tid][slotId];
            }
          });
        });
      }
      steps = 0;
      solved = solve(0);
      if (solved) break;
    }

    let failedLessonsCount = 0;

    if (!solved) {
      Object.keys(newSchedules).forEach(tid => {
        newSchedules[tid] = { ...(schedules[tid] || {}) };
      });
      if (autoGenMode === 'all') {
        Object.keys(newSchedules).forEach(tid => {
          const isRoom = turmas.find(t => t.id === tid)?.isRoom;
          Object.keys(newSchedules[tid]).forEach(slotId => {
            const [_, pStr] = slotId.split('-');
            const p = parseInt(pStr);
            if (autoGenShift === 'labs') {
              if (isRoom) delete newSchedules[tid][slotId];
            } else {
              if (targetPeriods.has(p)) delete newSchedules[tid][slotId];
            }
          });
        });
      }

      sortedGroups.forEach(g => {
        const placements = getPossiblePlacementsForGroup(g);
        const roomsToTry = g.isLab ? g.allowedRooms : [g.turmaId];
        
        let placed = false;
        for (const placement of placements) {
          for (const rid of roomsToTry) {
            let ok = true;
            for (const p of placement.periods) {
              if (!canPlacePeriod(g, placement.day, p, rid, newSchedules)) {
                ok = false;
                break;
              }
            }
            
            if (ok) {
              placement.periods.forEach(p => {
                const slotId = `${placement.day}-${p}`;
                if (!newSchedules[rid]) newSchedules[rid] = {};
                newSchedules[rid][slotId] = {
                  teacherId: g.teacherId,
                  subjectId: g.subjectId,
                  associatedTurmaId: g.isLab ? g.turmaId : undefined
                };
              });
              placed = true;
              break;
            }
          }
          if (placed) break;
        }

        if (!placed) {
          failedLessonsCount += g.size;
          const tObj = turmas.find(t => t.id === g.turmaId);
          const sObj = subjects.find(s => s.id === g.subjectId);
          const teaObj = teachers.find(t => t.id === g.teacherId);
          pendingLessons.push({
            turmaName: tObj?.name || 'Vazia',
            subjectName: sObj?.name || 'Desconhecida',
            teacherName: teaObj?.name || 'Desconhecido',
            reason: `${g.size} aula(s): ` + (g.isLab 
              ? 'Espaço indisponível em salas especiais ou conflito de professor.' 
              : 'Professor ocupado ou choque de horário na turma.')
          });
        }
      });
    }

    setSchedules(newSchedules);
    incrementVersion();

    setAutoGenResults({
      solved,
      scannedCount: requirements.length,
      placedCount: requirements.length - failedLessonsCount,
      pending: pendingLessons,
      errors
    });
    
    setIsAutoGenerateModalOpen(false);
    setIsAutoGenerateResultsModalOpen(true);
  };

  const incrementVersion = () => setVersion(v => v + 1);

  const handleSave = async () => {
    incrementVersion();
    localStorage.setItem('cecm_teachers', JSON.stringify(teachers));
    localStorage.setItem('cecm_subjects', JSON.stringify(subjects));
    localStorage.setItem('cecm_turmas', JSON.stringify(turmas));
    localStorage.setItem('cecm_schedules', JSON.stringify(schedules));
    localStorage.setItem('cecm_logo_url', logoUrl);
    localStorage.setItem('cecm_school_name', schoolName);
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const addTeacher = () => {
    if (!newTeacherName.trim()) {
      alert('Por favor, insira o nome do professor');
      return;
    }

    // Validação de duplicidade de nome
    const nameExists = teachers.some(t => 
      t.name.trim().toLowerCase() === newTeacherName.trim().toLowerCase() && 
      t.id !== editingTeacherId
    );

    if (nameExists) {
      alert(`Erro: Já existe um professor cadastrado com o nome "${newTeacherName}". Use um nome diferente para evitar confusão.`);
      return;
    }
    
    if (editingTeacherId) {
      setTeachers(prev => prev.map(t => t.id === editingTeacherId 
        ? { ...t, name: newTeacherName, subjectIds: newTeacherSubjectIds, availability: newTeacherAvailability, preferDoubleClasses: newTeacherPreferDouble, turmaIds: newTeacherTurmaIds } 
        : t
      ));
      setEditingTeacherId(null);
    } else {
      const newTeacher: Teacher = { 
        id: generateId(), 
        name: newTeacherName,
        subjectIds: newTeacherSubjectIds,
        availability: newTeacherAvailability,
        preferDoubleClasses: newTeacherPreferDouble,
        turmaIds: newTeacherTurmaIds
      };
      setTeachers([...teachers, newTeacher]);
    }
    
    incrementVersion();
    setNewTeacherName('');
    setNewTeacherSubjectIds([]);
    setNewTeacherAvailability([]);
    setNewTeacherPreferDouble(false);
    setNewTeacherTurmaIds([]);
  };

  const startEditTeacher = (teacher: Teacher) => {
    setEditingTeacherId(teacher.id);
    setNewTeacherName(teacher.name);
    setNewTeacherSubjectIds(teacher.subjectIds || []);
    setNewTeacherAvailability(teacher.availability || []);
    setNewTeacherPreferDouble(teacher.preferDoubleClasses || false);
    setNewTeacherTurmaIds(teacher.turmaIds || []);
  };

  const addSubject = () => {
    if (!newSubjectName.trim()) return;
    
    // Validação de duplicidade de nome
    const nameExists = subjects.some(s => 
      s.name.trim().toLowerCase() === newSubjectName.trim().toLowerCase() && 
      s.id !== editingSubjectId
    );

    if (nameExists) {
      alert(`Erro: Já existe uma disciplina cadastrada com o nome "${newSubjectName}".`);
      return;
    }

    // Validação: Carga em sala + Carga em Lab/Especial não pode ser maior que Carga Total
    if ((newSubjectClassWorkload + newSubjectLabWorkload) > newSubjectWorkload) {
      alert(`Erro: A soma das aulas em sala (${newSubjectClassWorkload}) e aulas em laboratório/especial (${newSubjectLabWorkload}) não pode ser maior que a carga horária total da disciplina (${newSubjectWorkload}).`);
      return;
    }

    // Validar custom workloads se existirem
    for (const tid in newSubjectCustomWorkloads) {
      const cw = newSubjectCustomWorkloads[tid];
      if ((cw.classWorkload + cw.labWorkload) > cw.workload) {
        const turma = turmas.find(t => t.id === tid);
        alert(`Erro na Turma ${turma?.name || tid}: A soma das aulas em sala (${cw.classWorkload}) e aulas em laboratório/especial (${cw.labWorkload}) não pode ser maior que a carga horária total (${cw.workload}).`);
        return;
      }
    }
    
    const subjectData = {
      name: newSubjectName,
      workload: newSubjectWorkload || 1,
      useLabComp: newSubjectUseLabComp,
      useLabTab: newSubjectUseLabTab,
      useSalaMat: newSubjectUseSalaMat,
      roomIds: newSubjectRoomIds,
      labWorkload: newSubjectLabWorkload,
      classWorkload: newSubjectClassWorkload,
      customWorkloads: newSubjectCustomWorkloads,
      levelConstraint: newSubjectLevelConstraint,
      gradeConstraint: newSubjectGradeConstraint,
      suffixConstraint: newSubjectSuffixConstraint,
      allowedTurmaIds: newSubjectAllowedTurmaIds
    };

    if (editingSubjectId) {
      setSubjects(prev => prev.map(s => s.id === editingSubjectId 
        ? { ...s, ...subjectData } 
        : s
      ));
      setEditingSubjectId(null);
    } else {
      const newSubject = { 
        id: generateId(), 
        ...subjectData
      };
      setSubjects([...subjects, newSubject]);
    }
    
    incrementVersion();
    setNewSubjectName('');
    setNewSubjectWorkload(2);
    setNewSubjectUseLabComp(false);
    setNewSubjectUseLabTab(false);
    setNewSubjectUseSalaMat(false);
    setNewSubjectRoomIds([]);
    setNewSubjectLabWorkload(0);
    setNewSubjectClassWorkload(0);
    setNewSubjectLevelConstraint('ambos');
    setNewSubjectGradeConstraint('');
    setNewSubjectSuffixConstraint('');
    setNewSubjectAllowedTurmaIds([]);
  };

  const startEditSubject = (subject: Subject) => {
    setEditingSubjectId(subject.id);
    setNewSubjectName(subject.name);
    setNewSubjectWorkload(subject.workload);
    setNewSubjectUseLabComp(subject.useLabComp || false);
    setNewSubjectUseLabTab(subject.useLabTab || false);
    setNewSubjectUseSalaMat(subject.useSalaMat || false);
    setNewSubjectRoomIds(subject.roomIds || []);
    setNewSubjectLabWorkload(subject.labWorkload || 0);
    setNewSubjectClassWorkload(subject.classWorkload || 0);
    setNewSubjectCustomWorkloads(subject.customWorkloads || {});
    setNewSubjectLevelConstraint(subject.levelConstraint || 'ambos');
    setNewSubjectGradeConstraint(subject.gradeConstraint || '');
    setNewSubjectSuffixConstraint(subject.suffixConstraint || '');
    setNewSubjectAllowedTurmaIds(subject.allowedTurmaIds || []);
  };

  const removeTeacher = (id: string) => {
    setTeachers(teachers.filter(t => t.id !== id));
    incrementVersion();
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
    incrementVersion();
  };

  const addRoom = () => {
    if (!newRoomName.trim()) return;
    const newRoom: Turma = {
      id: generateId(),
      name: newRoomName.trim().toUpperCase(),
      shift: 'ambos',
      isRoom: true,
      color: newRoomColor
    };
    setTurmas([...turmas, newRoom]);
    setNewRoomName('');
    incrementVersion();
  };

  const removeTurma = (id: string) => {
    setTurmas(prev => prev.filter(t => t.id !== id));
    setSchedules(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    incrementVersion();
    if (selectedTurmaId === id) setSelectedTurmaId('');
  };

  const addTurma = () => {
    if (!newTurmaName.trim()) return;
    
    // Validação de duplicidade de nome (normalizado para evitar variações ordinárias e espaços)
    const nameExists = turmas.some(t => 
      !t.isRoom &&
      normalizeTurmaName(t.name) === normalizeTurmaName(newTurmaName) && 
      t.id !== editingTurmaId
    );

    if (nameExists) {
      alert(`Erro: Já existe uma turma cadastrada com o nome "${newTurmaName}".`);
      return;
    }

    if (editingTurmaId) {
      const oldTurma = turmas.find(t => t.id === editingTurmaId);
      const concreteShift = newTurmaShift === 'todas' ? (oldTurma?.shift || importShift) : newTurmaShift;
      const shiftChanged = oldTurma && oldTurma.shift !== concreteShift;
      
      setTurmas(prev => prev.map(t => t.id === editingTurmaId 
        ? { ...t, name: newTurmaName, shift: concreteShift } 
        : t
      ));

      if (shiftChanged) {
        setSchedules(prev => {
          const next = { ...prev };
          if (next[editingTurmaId]) {
            next[editingTurmaId] = remapScheduleIfNecessary({ id: editingTurmaId, shift: concreteShift } as Turma, next[editingTurmaId]);
          }
          return next;
        });
      }
      setEditingTurmaId(null);
    } else {
      const concreteShift = newTurmaShift === 'todas' ? importShift : newTurmaShift;
      const newTurma = { 
        id: generateId(), 
        name: newTurmaName,
        shift: concreteShift
      };
      setTurmas([...turmas, newTurma]);
      if (!selectedTurmaId) setSelectedTurmaId(newTurma.id);
    }
    
    incrementVersion();
    setNewTurmaName('');
  };

  const startEditTurma = (turma: Turma) => {
    setEditingTurmaId(turma.id);
    setNewTurmaName(turma.name);
    setNewTurmaShift(turma.shift || importShift); // Use active shift as default
  };

  const [showAllSubjectsInRoom, setShowAllSubjectsInRoom] = useState(false);

  const getConsecutiveSlotLabel = (slot: string) => {
    const [day, periodStr] = slot.split('-');
    const period = parseInt(periodStr);
    const dayLabel = DAYS.find(d => d.id === day)?.label || day;
    
    let consecPeriod: number | null = null;
    let type: 'next' | 'prev' = 'next';
    if (period >= 1 && period <= 6) {
      if (period < 6) {
        consecPeriod = period + 1;
        type = 'next';
      } else {
        consecPeriod = 5;
        type = 'prev';
      }
    } else if (period >= 7 && period <= 12) {
      if (period < 12) {
        consecPeriod = period + 1;
        type = 'next';
      } else {
        consecPeriod = 11;
        type = 'prev';
      }
    }
    
    if (!consecPeriod) return null;
    const actualConsecPeriod = consecPeriod > 6 ? consecPeriod - 6 : consecPeriod;
    return {
      label: `${dayLabel}, ${actualConsecPeriod}º horário`,
      type,
      period: consecPeriod
    };
  };

  const handleSlotClick = (dayId: string, periodId: number, turmaId: string) => {
    setSelectedTurmaId(turmaId);
    const slotId = `${dayId}-${periodId}`;
    const currentSchedule = schedules[turmaId] || {};
    setSelectedSlot(slotId);
    const activeTeacherId = currentSchedule[slotId]?.teacherId || '';
    setTempTeacher(activeTeacherId);
    setTempSubject(currentSchedule[slotId]?.subjectId || '');
    setTempAssociatedTurmaId(currentSchedule[slotId]?.associatedTurmaId || '');
    setSlotError(null);
    setShowAllSubjectsInRoom(false); // Reset when opening modal
    
    // Auto-detect if selected teacher has preferDoubleClasses
    const teacher = teachers.find(t => t.id === activeTeacherId);
    setAllocateConsecutive(teacher?.preferDoubleClasses || false);
  };

  const saveSlot = () => {
    if (!selectedSlot || !selectedTurmaId) return;
    
    // Safety check if no subjects or teachers exist
    if (subjects.length === 0 || teachers.length === 0) {
      setSlotError("É necessário cadastrar pelo menos uma disciplina e um professor primeiro.");
      return;
    }

    const currentSchedule = { ...(schedules[selectedTurmaId] || {}) };
    
    if (!tempSubject) {
      if (selectedSlot && currentSchedule[selectedSlot]) {
        delete currentSchedule[selectedSlot];
      } else {
        setSlotError("Por favor, selecione uma disciplina.");
        return;
      }
    } else if (viewMode === 'rooms' && !tempAssociatedTurmaId) {
      setSlotError("Por favor, selecione a turma que utilizará a sala.");
      return;
    } else if (!tempTeacher) {
      setSlotError("Por favor, selecione um professor.");
      return;
    } else {
      // Extract days and periods for both slots if allocating consecutive
      const [day, periodStr] = selectedSlot.split('-');
      const period = parseInt(periodStr);
      let consecPeriod: number | null = null;
      if (period >= 1 && period <= 6) {
        consecPeriod = (period < 6) ? period + 1 : 5;
      } else if (period >= 7 && period <= 12) {
        consecPeriod = (period < 12) ? period + 1 : 11;
      }
      const consecSlot = consecPeriod ? `${day}-${consecPeriod}` : null;

      // Realtime teacher availability / conflict checks
      if (tempTeacher) {
        const teacher = teachers.find(t => t.id === tempTeacher);
        if (teacher && teacher.turmaIds && teacher.turmaIds.length > 0) {
          const targetTurmaId = viewMode === 'rooms' ? tempAssociatedTurmaId : selectedTurmaId;
          if (!teacher.turmaIds.includes(targetTurmaId)) {
            const targetTurmaObj = turmas.find(t => t.id === targetTurmaId);
            const turmaName = targetTurmaObj ? targetTurmaObj.name : targetTurmaId;
            setSlotError(`Erro: O professor ${teacher.name} não leciona para a turma ${turmaName}.`);
            return;
          }
        }

        // Clicado
        const selectedConflicts = getConflicts(day, period, tempTeacher, selectedTurmaId);
        if (selectedConflicts.length > 0) {
          setSlotError(selectedConflicts.includes('INDISPONÍVEL')
            ? `Erro: O professor não está disponível no horário ${day}-${period}.`
            : `Erro: O professor já está ocupado em outra turma no horário ${day}-${period} (${selectedConflicts.join(', ')}).`);
          return;
        }

        // Consecutivo/Geminado
        if (allocateConsecutive && consecSlot && consecPeriod) {
          const consecConflicts = getConflicts(day, consecPeriod, tempTeacher, selectedTurmaId);
          if (consecConflicts.length > 0) {
            const labelHelper = getConsecutiveSlotLabel(selectedSlot)?.label || `${day}-${consecPeriod}`;
            setSlotError(consecConflicts.includes('INDISPONÍVEL')
              ? `Erro: O professor não está disponível no horário geminado ${labelHelper}.`
              : `Erro: O professor já está ocupado em outra turma no horário geminado ${labelHelper} (${consecConflicts.join(', ')}).`);
            return;
          }
        }
      }

      // Workload Validation
      const subject = subjects.find(s => s.id === tempSubject);
      if (subject) {
        // Curriculum mapping validation
        const targetTurmaIdForValidation = viewMode === 'rooms' ? tempAssociatedTurmaId : selectedTurmaId;
        const workloads = getSubjectWorkloadsForTurma(subject, targetTurmaIdForValidation);
        if (workloads.workload === 0) {
          const targetTurmaObj = turmas.find(t => t.id === targetTurmaIdForValidation);
          const turmaName = targetTurmaObj ? targetTurmaObj.name : targetTurmaIdForValidation;
          setSlotError(`Erro: A disciplina "${subject.name}" não faz parte da grade curricular da turma "${turmaName}".`);
          return;
        }

        const usage = getWorkloadUsage(tempSubject);
        const currentSlotData = currentSchedule[selectedSlot] as ScheduleSlot;
        const consecSlotData = (allocateConsecutive && consecSlot) ? (currentSchedule[consecSlot] as ScheduleSlot) : null;
        
        const isEditingSameSelected = currentSlotData?.subjectId === tempSubject && 
                              (viewMode === 'rooms' ? currentSlotData?.associatedTurmaId === tempAssociatedTurmaId : true);
        
        const isEditingSameConsec = consecSlotData?.subjectId === tempSubject && 
                              (viewMode === 'rooms' ? consecSlotData?.associatedTurmaId === tempAssociatedTurmaId : true);

        let extraNeeded = 0;
        if (!isEditingSameSelected) extraNeeded += 1;
        if (allocateConsecutive && consecSlot && !isEditingSameConsec) extraNeeded += 1;

        if (viewMode === 'turmas') {
          // Classroom assignment
          if (usage.classroomUsage + extraNeeded > usage.classroomTotal) {
            setSlotError(`Limite de aulas em SALA atingido para ${subject.name} (Máximo ${usage.classroomTotal} aulas). Alocar esta aula ${allocateConsecutive ? 'como geminada ' : ''}ultrapassa o limite.`);
            return;
          }
        } else {
          // Lab assignment
          if (usage.labUsage + extraNeeded > usage.labTotal) {
            setSlotError(`Limite de aulas em LABORATÓRIO/ESPECIAL atingido para ${subject.name} (Máximo ${usage.labTotal} aulas). Alocar esta aula ${allocateConsecutive ? 'como geminada ' : ''}ultrapassa o limite.`);
            return;
          }
        }

        if (usage.usage + extraNeeded > usage.total) {
          setSlotError(`Limite TOTAL de carga horária atingido para ${subject.name} (Máximo ${usage.total} aulas semanais). Alocar esta aula ${allocateConsecutive ? 'como geminada ' : ''}ultrapassa o limite.`);
          return;
        }
      }

      // Apply assignments
      currentSchedule[selectedSlot] = { 
        teacherId: tempTeacher, 
        subjectId: tempSubject,
        associatedTurmaId: viewMode === 'rooms' ? tempAssociatedTurmaId : undefined
      };

      if (allocateConsecutive && consecSlot) {
        currentSchedule[consecSlot] = {
          teacherId: tempTeacher,
          subjectId: tempSubject,
          associatedTurmaId: viewMode === 'rooms' ? tempAssociatedTurmaId : undefined
        };
      }
    }

    setSchedules({
      ...schedules,
      [selectedTurmaId]: currentSchedule
    });
    
    incrementVersion();
    setSelectedSlot(null);
  };

  const getWorkloadUsage = (subjectId: string) => {
    if (!selectedTurmaId) return { usage: 0, total: 0, classroomUsage: 0, labUsage: 0, classroomTotal: 0, labTotal: 0 };
    
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return { usage: 0, total: 0, classroomUsage: 0, labUsage: 0, classroomTotal: 0, labTotal: 0 };

    // Identificar a turma "real" que consome a carga
    const targetTurma = turmas.find(t => t.id === selectedTurmaId);
    const actualTurmaId = targetTurma?.isRoom ? tempAssociatedTurmaId : selectedTurmaId;
    
    if (!actualTurmaId) return { usage: 0, total: 0, classroomUsage: 0, labUsage: 0, classroomTotal: 0, labTotal: 0 };

    // 1. Uso em sala de aula (no horário da própria turma)
    const classroomSchedule = schedules[actualTurmaId] || {};
    const classroomUsage = Object.values(classroomSchedule).filter((slot: ScheduleSlot) => slot.subjectId === subjectId).length;

    // 2. Uso em laboratórios/salas especiais (em outros horários onde esta turma é associada)
    let labUsage = 0;
    Object.keys(schedules).forEach(rid => {
      const room = turmas.find(t => t.id === rid);
      if (room && room.isRoom) {
        labUsage += Object.values(schedules[rid]).filter((slot: ScheduleSlot) => 
          slot.subjectId === subjectId && slot.associatedTurmaId === actualTurmaId
        ).length;
      }
    });

    const { workload: total, classWorkload: cTotal, labWorkload: lTotal } = getSubjectWorkloadsForTurma(subject, actualTurmaId);

    return { 
      usage: classroomUsage + labUsage, 
      total,
      classroomUsage,
      classroomTotal: cTotal,
      labUsage,
      labTotal: lTotal
    };
  };

  const getClassSubjectWorkload = (turmaId: string, subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return { usage: 0, total: 0, classroomUsage: 0, labUsage: 0, classroomTotal: 0, labTotal: 0 };

    const classroomSchedule = schedules[turmaId] || {};
    const classroomUsage = Object.values(classroomSchedule).filter((slot: ScheduleSlot) => slot.subjectId === subjectId).length;

    let labUsage = 0;
    Object.keys(schedules).forEach(rid => {
      const room = turmas.find(t => t.id === rid);
      if (room && room.isRoom) {
        labUsage += Object.values(schedules[rid] || {}).filter((slot: ScheduleSlot) => 
          slot.subjectId === subjectId && slot.associatedTurmaId === turmaId
        ).length;
      }
    });

    const { workload: total, classWorkload: cTotal, labWorkload: lTotal } = getSubjectWorkloadsForTurma(subject, turmaId);

    return { 
      usage: classroomUsage + labUsage, 
      total,
      classroomUsage,
      classroomTotal: cTotal,
      labUsage,
      labTotal: lTotal
    };
  };

  const handlePrintSingleTurma = (turma: Turma) => {
    const shift = turma.shift || (turma.id.toLowerCase().includes('tarde') || turma.name.toLowerCase().includes('tarde') ? 'tarde' : 'manha');
    const currentPeriods = shift === 'manha' ? PERIODS_MANHA : PERIODS_TARDE;
    const timeRangesManha = ["7h30 às 8h20", "8h20 às 9h10", "9h10 às 10h", "10h20 às 11h10", "11h10 às 12h", "12h às 12h50"];
    const timeRangesTarde = ["13h às 13h50", "13h50 às 14h40", "14h40 às 15h30", "15h50 às 16h40", "16h40 às 17h30", "17h30 às 18h20"];
    const currentTimeRanges = shift === 'manha' ? timeRangesManha : timeRangesTarde;

    const html = `
      <div class="print-container">
        <div class="print-header">
          <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 3px;">
            ${logoUrl ? `<img src="${logoUrl}" style="height: 32px; width: auto; object-fit: contain;" referrerpolicy="no-referrer" />` : ''}
            <div style="text-align: left;">
              <h1 style="font-size: 9pt; margin: 0; font-weight: 800; line-height: 1.1;">${schoolName.toUpperCase()}</h1>
              <h2 style="font-size: 8pt; margin: 1px 0; color: #1e293b; font-weight: 700;">HORÁRIO DE AULAS - TURMA: ${turma.name} (${shift === 'manha' ? 'MANHÃ' : 'TARDE'})</h2>
            </div>
          </div>
        </div>
        
        <div class="table-wrapper">
          <table class="grid-table">
            <thead>
              <tr>
                <th class="day-col">DIA</th>
                <th class="period-col">AULA</th>
                <th class="time-col">HORÁRIO</th>
                <th class="content-col">DISCIPLINA / PROFESSOR</th>
              </tr>
            </thead>
            <tbody>
              ${DAYS.map((day) => {
                return currentPeriods.map((pId, pIndex) => {
                  const pName = `${pIndex + 1}ª aula`;
                  const time = currentTimeRanges[pIndex];
                  const slotKey = `${day.id}-${pId}`;
                  let slot = schedules[turma.id]?.[slotKey];
                  
                  // Se não houver slot na turma, procurar em salas especiais
                  if (!slot) {
                    for (const rid in schedules) {
                      const room = turmas.find(t => t.id === rid);
                      if (room?.isRoom && schedules[rid][slotKey]?.associatedTurmaId === turma.id) {
                        slot = schedules[rid][slotKey];
                        break;
                      }
                    }
                  }
                  
                  const teacher = teachers.find(t => t.id === slot?.teacherId);
                  const subject = subjects.find(s => s.id === slot?.subjectId);
                  
                  return `
                    <tr class="${pIndex === 5 ? 'day-end' : ''}">
                      ${pIndex === 0 ? `<td rowspan="7" class="day-cell"><span>${day.label}</span></td>` : ''}
                      <td class="p-num-cell">${pName}</td>
                      <td class="p-time-cell">${time}</td>
                      <td class="slot-cell">
                        ${subject ? `<div class="subj-name">${subject.name}</div>` : '-'}
                        ${teacher ? `<div class="prof-name">${teacher.name}</div>` : ''}
                      </td>
                    </tr>
                    ${pIndex === 2 ? `
                      <tr class="interval-row" style="height: 12pt;">
                        <td colspan="2" class="p-time-cell" style="background: #f8fafc; font-weight: 800; font-size: 5.5pt; color: #64748b; height: 12pt; padding: 0;">${shift === 'manha' ? '10h às 10h20' : '15h30 às 15h50'}</td>
                        <td class="slot-cell" style="background: #f8fafc; text-align: center; font-weight: 800; font-size: 6.5pt; letter-spacing: 0.1em; color: #94a3b8; height: 12pt; padding: 0;">INTERVALO</td>
                      </tr>
                    ` : ''}
                  `;
                }).join('');
              }).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="print-footer" style="display: flex; flex-direction: column; align-items: center; gap: 0px; margin-top: 5px;">
          <div style="font-weight: 800; font-size: 7.5pt; color: #0f172a;">
            Sistema feito por: Prof. Lucas Mercer Leniar
            <span style="font-size: 6pt; color: #64748b; font-weight: normal; margin-left: 8px;">
              - Versão ${version} - ${new Date().toLocaleDateString('pt-BR')} - ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - Atualização de Grade
            </span>
          </div>
          <div style="font-size: 5.5pt; color: #2563eb; font-weight: 800; letter-spacing: 0.1em; margin-top: 1px; page-break-inside: avoid;">www.LucasLeniar.com.br</div>
        </div>
      </div>
    `;

    return html;
  };

  const handlePrintLabsHorizontal = () => {
    const timeRangesManha = ["7h30 às 8h20", "8h20 às 9h10", "9h10 às 10h", "10h20 às 11h10", "11h10 às 12h", "12h às 12h50"];
    const timeRangesTarde = ["13h às 13h50", "13h50 às 14h40", "14h40 às 15h30", "15h50 às 16h40", "16h40 às 17h30", "17h30 às 18h20"];
    
    const generateTable = (shift: 'manha' | 'tarde') => {
      const periods = shift === 'manha' ? PERIODS_MANHA : PERIODS_TARDE;
      const timeRanges = shift === 'manha' ? timeRangesManha : timeRangesTarde;
      
      const specialRooms = turmas.filter(t => t.isRoom);

      return `
        <div class="print-container">
          <!-- Cabeçalho em todas as páginas -->
          <div class="print-header">
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 2px;">
              ${logoUrl ? `<img src="${logoUrl}" style="height: 26px; width: auto; object-fit: contain;" referrerpolicy="no-referrer" />` : ''}
              <div style="text-align: center;">
                <h1 style="margin: 0; font-size: 8pt; font-weight: 800; text-transform: uppercase; line-height: 1.1;">${schoolName.toUpperCase()}</h1>
                <h2 style="margin: 0; font-size: 7pt; font-weight: 700; color: #334155; line-height: 1.1;">CRONOGRAMA DE SALAS ESPECIAIS (LABORATÓRIOS E SALA DE MATEMÁTICA)</h2>
              </div>
            </div>
          </div>

          <h2 class="period-title">PERÍODO: ${shift === 'manha' ? 'MANHÃ' : 'TARDE'}</h2>
          
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style="width: 24px; font-size: 5.5pt; padding: 1px;">DIA</th>
                  <th style="width: 24px; font-size: 5.5pt; padding: 0.5px;">AULA</th>
                  <th style="width: 45px; font-size: 5.5pt; padding: 0.5px;">HORÁRIO</th>
                  ${specialRooms.map(room => `
                    <th class="room-header" style="background-color: ${room.color || '#6366f1'} !important;">${room.name}</th>
                  `).join('')}
                </tr>
              </thead>
              <tbody>
                ${DAYS.map(day => periods.map((pId, pIdx) => {
                  const slotId = `${day.id}-${pId}`;
                  return `
                    <tr style="${pIdx === 5 ? 'border-bottom: 1.2pt solid black !important;' : ''}">
                      ${pIdx === 0 ? `<td rowspan="7" class="day-cell"><span>${day.label}</span></td>` : ''}
                      <td class="p-num-cell">${pIdx + 1}º</td>
                      <td class="p-time-cell">${timeRanges[pIdx]}</td>
                      ${specialRooms.map(room => {
                        const slot = schedules[room.id]?.[slotId];
                        const teacher = teachers.find(t => t.id === slot?.teacherId);
                        const subject = subjects.find(s => s.id === slot?.subjectId);
                        const turma = turmas.find(t => t.id === slot?.associatedTurmaId);

                        return `
                          <td class="slot-cell">
                            ${teacher ? `
                              <div class="teacher-name">${teacher.name}</div>
                              <div class="extra-info">
                                ${turma?.name || ''} ${subject ? `<span class="extra-info-subject">- ${subject.name}</span>` : ''}
                              </div>
                            ` : ''}
                          </td>
                        `;
                      }).join('')}
                    </tr>
                    ${pIdx === 2 ? `
                      <tr class="interval-row">
                        <td colspan="2" class="interval-time">${shift === 'manha' ? '10:00 - 10:20' : '15:30 - 15:50'}</td>
                        <td colspan="${specialRooms.length}" class="interval-text">INTERVALO</td>
                      </tr>
                    ` : ''}
                  `;
                }).join('')).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="print-footer">
             <div style="font-weight: 800; font-size: 6pt; color: #0f172a;">
               Sistema feito por: Prof. Lucas Mercer Leniar
               <span style="font-size: 5pt; color: #64748b; font-weight: normal; margin-left: 6px;">
                 - Versão ${version} - ${new Date().toLocaleDateString('pt-BR')} - ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - Atualização de Grade
               </span>
             </div>
             <div style="font-size: 4.5pt; color: #2563eb; font-weight: 800; letter-spacing: 0.1em; margin-top: 0px;">www.LucasLeniar.com.br</div>
          </div>
        </div>
      `;
    };

    const html = `
      <div style="padding: 0px;">
        ${generateTable('manha')}
        ${generateTable('tarde')}
      </div>
    `;

    executePrintHorizontal(html, 'Cronograma de Salas Especiais');
  };

  const executePrintHorizontal = (html: string, title: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title} - CECM</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
            <style>
              @page { size: A4 landscape; margin: 4mm; }
              * { box-sizing: border-box; }
              body { 
                font-family: 'Inter', sans-serif; 
                margin: 0; 
                padding: 0; 
                background: white; 
                height: 100%;
                overflow: hidden;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-container { 
                page-break-after: always; 
                break-after: page;
                width: 100%;
                height: 198mm; /* Configurado para caber perfeitamente no A4 paisagem de 210mm */
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-sizing: border-box;
                padding-bottom: 2px;
              }
              .print-header { 
                text-align: center; 
                margin-bottom: 2px; 
              }
              .period-title {
                background: #0f172a; 
                color: white !important; 
                text-align: center; 
                padding: 1.5px; 
                margin: 0 0 2px 0; 
                font-size: 7pt; 
                font-weight: 800; 
                text-transform: uppercase;
              }
              .table-wrapper {
                flex: 1;
                width: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
              }
              table { 
                width: 100% !important; 
                border-collapse: collapse !important; 
                table-layout: fixed !important; 
                border: 0.8pt solid black !important;
              }
              th, td { 
                border: 0.1pt solid black !important; 
                text-align: center; 
                vertical-align: middle;
                padding: 0px !important; 
              }
              th { 
                background-color: #f1f5f9 !important; 
                font-weight: 800 !important;
              }
              .room-header {
                font-size: 6.5pt; 
                padding: 1px 0.5px !important; 
                text-transform: uppercase; 
                color: white !important; 
                font-weight: 800; 
                line-height: 1;
                height: 12.5pt;
              }
              .day-cell { 
                background-color: #0f172a !important; 
                color: white !important; 
                text-align: center; 
                font-weight: 800; 
                width: 20px;
              }
              .day-cell span {
                display: block;
                writing-mode: vertical-lr;
                transform: rotate(180deg);
                margin: 0 auto;
                font-size: 5.5pt;
                letter-spacing: 0.05em;
                text-transform: uppercase;
              }
              .p-num-cell {
                font-size: 6pt;
                font-weight: 800;
                background-color: #f8fafc !important;
                height: 11pt;
              }
              .p-time-cell {
                font-size: 5pt;
                color: #475569;
                font-weight: 600;
                height: 11pt;
              }
              .slot-cell {
                padding: 0.5px 2px !important;
                height: 11pt;
                text-align: left !important;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
              }
              .teacher-name {
                font-weight: 800; 
                line-height: 1; 
                font-size: 6pt; 
                overflow: hidden; 
                text-overflow: ellipsis;
                color: black;
              }
              .extra-info {
                font-weight: 700; 
                color: #2563eb; 
                font-size: 5pt; 
                text-transform: uppercase; 
                border-left: 1pt solid #cbd5e1; 
                padding-left: 2px; 
                margin-top: 0.2px; 
                overflow: hidden; 
                text-overflow: ellipsis;
                line-height: 1;
              }
              .extra-info-subject {
                font-weight: 400; 
                color: #475569; 
                text-transform: none;
              }
              .interval-row {
                height: 8.5pt !important;
                background-color: #f8fafc !important;
              }
              .interval-time {
                font-size: 5pt;
                font-weight: 800;
                color: #64748b;
                height: 8.5pt !important;
              }
              .interval-text {
                font-size: 6pt;
                font-weight: 800;
                color: #94a3b8;
                letter-spacing: 0.8em;
                text-transform: uppercase;
                height: 8.5pt !important;
              }
              .print-footer {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0px;
                margin-top: 1px;
                page-break-inside: avoid;
              }
            </style>
          </head>
          <body>
            ${html}
            <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handlePrintGeralTurmas = () => {
    // Less aggressive filtering for printing
    const filteredTurmas = turmas.filter(t => !t.isRoom);
    const manhaTurmas = sortTurmasList(filteredTurmas.filter(t => t.shift === 'manha' || (!t.shift && (!t.name.toLowerCase().includes('tarde') && !t.id.toLowerCase().includes('tarde')))));
    const tardeTurmas = sortTurmasList(filteredTurmas.filter(t => t.shift === 'tarde' || (!t.shift && (t.name.toLowerCase().includes('tarde') || t.id.toLowerCase().includes('tarde')))));
    
    const generateScheduleTable = (shiftTurmas: Turma[], shift: 'manha' | 'tarde') => {
      if (shiftTurmas.length === 0) return '';
      
      const currentPeriods = shift === 'manha' ? PERIODS_MANHA : PERIODS_TARDE;
      const timeRangesManha = ["7h30-8h20", "8h20-9h10", "9h10-10h", "10h20-11h10", "11h10-12h", "12h-12h50"];
      const timeRangesTarde = ["13h-13h50", "13h50-14h40", "14h40-15h30", "15h50-16h40", "16h40-17h30", "17h30-18h20"];
      const currentTimeRanges = shift === 'manha' ? timeRangesManha : timeRangesTarde;

      return `
        <div class="print-container" style="page-break-after: always; break-after: page;">
          <div class="print-header">
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 1px;">
              ${logoUrl ? `<img src="${logoUrl}" style="height: 28px; width: auto; object-fit: contain;" referrerpolicy="no-referrer" />` : ''}
              <div style="text-align: center;">
                <h1 style="font-size: 8pt; margin: 0; font-weight: 800; text-transform: uppercase;">${schoolName.toUpperCase()}</h1>
                <h2 style="font-size: 7pt; margin: 0; font-weight: 700; color: #1e293b;">HORÁRIO DAS TURMAS - PERÍODO: ${shift === 'manha' ? 'MANHÃ' : 'TARDE'}</h2>
              </div>
            </div>
          </div>
          
          <div class="table-wrapper">
            <table class="grid-table">
              <thead>
                <tr>
                  <th class="corner-header"></th>
                  ${shiftTurmas.map(t => `<th class="turma-header">${t.name}</th>`).join('')}
                  <th class="time-header">HORÁRIO</th>
                </tr>
              </thead>
              <tbody>
                ${DAYS.map((day) => {
                  return currentPeriods.map((pId, pIndex) => {
                    const pName = `${pIndex + 1}ª`;
                    const time = currentTimeRanges[pIndex];
                    
                    return `
                      <tr class="${pIndex === 5 ? 'day-end' : ''}">
                        ${pIndex === 0 ? `<td rowspan="7" class="day-cell"><span>${day.label}</span></td>` : ''}
                          ${shiftTurmas.map(turma => {
                          const slotKey = `${day.id}-${pId}`;
                          let slot = schedules[turma.id]?.[slotKey];

                          // Se não houver slot direto, buscar em salas especiais
                          if (!slot) {
                            for (const rid in schedules) {
                              const room = turmas.find(t => t.id === rid);
                              if (room?.isRoom && schedules[rid][slotKey]?.associatedTurmaId === turma.id) {
                                slot = schedules[rid][slotKey];
                                break;
                              }
                            }
                          }

                          const teacher = teachers.find(t => t.id === slot?.teacherId);
                          const subject = subjects.find(s => s.id === slot?.subjectId);
                          return `
                            <td class="slot-cell">
                              ${subject ? `<div class="subj-name">${subject.name}</div>` : ''}
                              ${teacher ? `<div class="prof-name">${teacher.name}</div>` : ''}
                            </td>
                          `;
                        }).join('')}
                        <td class="time-info">
                          <span class="p-num">${pName}</span>
                          <span class="p-time">${time}</span>
                        </td>
                      </tr>
                      ${pIndex === 2 ? `
                        <tr class="interval-row" style="height: 5pt;">
                          ${shiftTurmas.map(() => `<td class="slot-cell" style="background: #f8fafc; text-align: center; font-size: 3.5pt; font-weight: 800; color: #94a3b8; height: 5pt; padding: 0;">INTERVALO</td>`).join('')}
                          <td class="time-info" style="background: #f1f5f9; padding: 0; height: 5pt;">
                            <span class="p-time" style="font-size: 3pt; font-weight: 800; color: #64748b; line-height: 1;">${shift === 'manha' ? '10h-10h20' : '15h30-15h50'}</span>
                          </td>
                        </tr>
                      ` : ''}
                    `;
                  }).join('');
                }).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="print-footer" style="display: flex; flex-direction: column; align-items: center; gap: 0px; margin-top: 1px;">
            <div style="font-weight: 800; font-size: 6.5pt; color: #0f172a;">
              Sistema feito por: Prof. Lucas Mercer Leniar
              <span style="font-size: 5pt; color: #64748b; font-weight: normal; margin-left: 8px;">
                - Versão ${version} - ${new Date().toLocaleDateString('pt-BR')} - ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - Atualização de Grade
              </span>
            </div>
            <div style="font-size: 4.5pt; color: #2563eb; font-weight: 800; letter-spacing: 0.1em; margin-top: 1px; page-break-inside: avoid;">www.LucasLeniar.com.br</div>
          </div>
        </div>
      `;
    };

    let html = '';
    if (manhaTurmas.length > 0) html += generateScheduleTable(manhaTurmas, 'manha');
    if (tardeTurmas.length > 0) html += generateScheduleTable(tardeTurmas, 'tarde');

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Quadro de Horários - CECM</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap" rel="stylesheet">
            <style>
              @page { 
                size: A4 landscape; 
                margin: 4mm; 
              }
              * { box-sizing: border-box; }
              body { 
                font-family: 'Inter', sans-serif; 
                margin: 0; 
                padding: 0; 
                background: white; 
                color: black;
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
                height: 100%;
                overflow: hidden;
              }
              
              .print-container { 
                page-break-after: always; 
                break-after: page;
                width: 100%;
                height: 192mm;
                display: flex;
                flex-direction: column;
                padding-bottom: 0mm;
              }
              
              .print-header { text-align: center; margin-bottom: 2px; }
              
              .table-wrapper {
                flex: 1;
                width: 100%;
                border: 0.8pt solid black;
              }
              
              .grid-table { 
                width: 100%; 
                border-collapse: collapse; 
                table-layout: fixed; 
              }
              
              th, td { 
                border: 0.1pt solid #000; 
                text-align: center; 
                vertical-align: middle;
                padding: 0px; 
              }
              
              .corner-header { width: 14px; }
              .time-header { width: 45px; font-size: 7.2pt; font-weight: 800; background-color: #f1f5f9; height: 15pt; }
              
              .turma-header { 
                background-color: #e2e8f0; 
                font-size: 7.2pt; 
                font-weight: 800; 
                height: 15pt;
              }
              
              .day-cell { 
                width: 14px;
                background-color: #f8fafc;
                padding: 0;
              }
              .day-cell span {
                display: block;
                writing-mode: vertical-lr;
                transform: rotate(180deg);
                font-size: 6pt; 
                font-weight: 900; 
                text-transform: uppercase;
                margin: 0 auto;
              }
              
              .slot-cell { 
                overflow: hidden;
                height: 14.8pt; 
                line-height: 1.1;
              }
              
              .subj-name { 
                font-size: 7.2pt; 
                font-weight: 800; 
                color: black; 
                text-transform: uppercase;
                line-height: 1.1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                padding: 0 1.5px;
              }
              
              .prof-name { 
                font-size: 5.8pt; 
                color: #334155; 
                line-height: 1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                padding: 0 1.5px;
                margin-top: 0.5px;
              }
              
              .time-info { 
                background-color: #f8fafc;
                line-height: 1.1;
                height: 14.8pt;
              }
              .p-num { display: block; font-size: 6.2pt; font-weight: 800; color: #1e3a8a; }
              .p-time { display: block; font-size: 4.8pt; font-weight: 500; color: #475569; }
              
              .print-footer {
                margin-top: 1px;
                text-align: right;
                font-size: 6.5pt;
                color: black;
                font-weight: 600;
                page-break-inside: avoid;
              }
              
              tr.day-end {
                border-bottom: 1.5pt solid black;
              }
            </style>
          </head>
          <body>
            ${html}
            <script>
              window.onload = () => { 
                setTimeout(() => { 
                  window.print(); 
                }, 1000); 
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handlePrintAllTurmasIndividual = () => {
    const html = sortTurmasList(turmas.filter(t => !t.isRoom))
      .map(t => handlePrintSingleTurma(t))
      .join('');
    
    executePrint(html, 'Horários por Turma');
  };

  const executePrint = (html: string, title: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title} - CECM</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap" rel="stylesheet">
            <style>
              @page { size: A4 portrait; margin: 7mm; }
              * { box-sizing: border-box; }
              body { 
                font-family: 'Inter', sans-serif; 
                margin: 0; 
                padding: 0; 
                background: white; 
                height: 100%;
                overflow: hidden;
              }
              .print-container { 
                page-break-after: always; 
                break-after: page;
                width: 100%; 
                height: 278mm;
                display: flex; 
                flex-direction: column; 
              }
              .print-header { text-align: center; margin-bottom: 4px; border-bottom: 1.2pt solid black; padding-bottom: 2px; }
              .print-header h1 { font-size: 10pt; margin: 0; font-weight: 800; }
              .print-header h2 { font-size: 8.5pt; margin: 1px 0; color: #1e293b; font-weight: 700; }
              .table-wrapper { border: 0.8pt solid black; margin-top: 2px; flex: 1; }
              .grid-table { width: 100%; border-collapse: collapse; table-layout: fixed; height: 100%; }
              th, td { border: 0.4pt solid black; padding: 1px 2px; text-align: center; vertical-align: middle; }
              th { background: #f1f5f9 !important; font-weight: 800; font-size: 7.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .day-col { width: 22px; }
              .period-col { width: 50px; }
              .time-col { width: 80px; }
              .day-cell { font-weight: 900; background: #f8fafc !important; font-size: 7.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .day-cell span { display: block; writing-mode: vertical-lr; transform: rotate(180deg); margin: 0 auto; }
              .p-num-cell { font-weight: 700; color: #2563eb !important; font-size: 6.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .p-time-cell { color: #64748b !important; font-size: 6pt; font-weight: 500; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .slot-cell { text-align: left; padding-left: 6px; overflow: hidden; }
              .subj-name { font-weight: 800; font-size: 8pt; text-transform: uppercase; margin-bottom: 0px; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
              .prof-name { font-size: 7.5pt; color: black !important; font-weight: 600; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .day-end { border-bottom: 1.2pt solid black; }
              .print-footer { margin-top: 2px; text-align: right; font-size: 6.5pt; color: black; font-weight: 600; page-break-inside: avoid; }
            </style>
          </head>
          <body>
            ${html}
            <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handlePrintTurmaSelection = (turma: Turma) => {
    const html = handlePrintSingleTurma(turma);
    executePrint(html, `Horário ${turma.name}`);
    setIsPrintingTurmaSelection(false);
  };

  const currentTurma = turmas.find(t => t.id === selectedTurmaId);

  return (
    <div className="flex-1 flex flex-col space-y-3 animate-in fade-in duration-700 pb-2 overflow-hidden">
      {/* Action Bar / Navigation */}
      <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] print:hidden flex flex-col divide-y-2 divide-slate-100 overflow-hidden">
        {/* Header Row: Navigation & Configuration */}
        <div className="flex flex-wrap items-center justify-between p-3 px-4 gap-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h1 className="text-sm font-black text-slate-900 uppercase tracking-tighter leading-none flex items-center gap-2">
                <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
                Gestão de Horários
              </h1>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 pl-4">
                {schoolName} • v{version}
              </span>
            </div>

            {/* View Mode & Shift Selectors */}
            <div className="flex items-center gap-3 ml-4 pl-4 border-l-2 border-slate-100">
              <div className="flex bg-slate-100 p-1 rounded-xl h-10 items-center">
                <button 
                  onClick={() => setViewMode('turmas')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${viewMode === 'turmas' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Calendar className="w-4 h-4" />
                  Turmas
                </button>
                <button 
                  onClick={() => setViewMode('rooms')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${viewMode === 'rooms' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <DoorClosed className="w-4 h-4" />
                  Salas Esp.
                </button>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl h-10 items-center">
                <button 
                  onClick={() => setImportShift('manha')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${importShift === 'manha' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Manhã
                </button>
                <button 
                  onClick={() => setImportShift('tarde')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${importShift === 'tarde' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Tarde
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-end w-full sm:w-auto ml-auto">
             {/* School Name Action Component */}
             <div className="relative">
              {showSchoolInput ? (
                <div className="flex items-center gap-1 bg-white rounded-xl px-3 py-1.5 border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-200">
                  <input 
                    type="text"
                    value={tempSchoolName}
                    onChange={(e) => setTempSchoolName(e.target.value)}
                    placeholder="Nome da Escola..."
                    className="w-48 text-[10px] font-bold focus:outline-none bg-transparent text-slate-900"
                    autoFocus
                    onBlur={() => {
                      if (tempSchoolName === schoolName) setShowSchoolInput(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = tempSchoolName.trim() || 'CECM GREGÓRIO SZEREMETA';
                        setSchoolName(val);
                        window.dispatchEvent(new CustomEvent('cecm_school_name_changed', { detail: val }));
                        setShowSchoolInput(false);
                      }
                      if (e.key === 'Escape') {
                        setTempSchoolName(schoolName);
                        setShowSchoolInput(false);
                      }
                    }}
                  />
                  <div className="flex items-center gap-1 ml-2">
                    <button 
                      onClick={() => { 
                        const val = tempSchoolName.trim() || 'CECM GREGÓRIO SZEREMETA';
                        setSchoolName(val);
                        window.dispatchEvent(new CustomEvent('cecm_school_name_changed', { detail: val }));
                        setShowSchoolInput(false); 
                      }} 
                      className="p-1 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => { 
                        setTempSchoolName(schoolName); 
                        setShowSchoolInput(false); 
                      }} 
                      className="p-1 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => { setTempSchoolName(schoolName); setShowSchoolInput(true); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 border-dashed border-emerald-200 text-emerald-600 hover:border-emerald-500 hover:text-emerald-700 bg-emerald-50/10"
                  title="Alterar Nome do Colégio"
                >
                  <School className="w-4 h-4" />
                  {schoolName.length > 25 ? `${schoolName.substring(0, 22)}...` : schoolName}
                </button>
              )}
            </div>

             {/* Logo Action Component */}
             <div className="relative">
              {showLogoInput ? (
                <div className="flex items-center gap-1 bg-white rounded-xl px-3 py-1.5 border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-200">
                  <input 
                    type="text"
                    value={tempLogoUrl}
                    onChange={(e) => setTempLogoUrl(e.target.value)}
                    placeholder="URL da Logo..."
                    className="w-40 text-[10px] font-bold focus:outline-none bg-transparent"
                    autoFocus
                    onBlur={() => {
                      if (tempLogoUrl === logoUrl) setShowLogoInput(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setLogoUrl(tempLogoUrl);
                        setShowLogoInput(false);
                      }
                      if (e.key === 'Escape') {
                        setTempLogoUrl(logoUrl);
                        setShowLogoInput(false);
                      }
                    }}
                  />
                  <div className="flex items-center gap-1 ml-2">
                    <button onClick={() => { setLogoUrl(tempLogoUrl); setShowLogoInput(false); }} className="p-1 hover:bg-green-50 rounded-lg text-green-600 transition-colors"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setTempLogoUrl(logoUrl); setShowLogoInput(false); }} className="p-1 hover:bg-red-50 rounded-lg text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => { setTempLogoUrl(logoUrl); setShowLogoInput(true); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 border-dashed ${logoUrl ? "border-indigo-200 text-indigo-400 hover:border-indigo-400 hover:text-indigo-600" : "border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600"}`}
                >
                  <ImageIcon className="w-4 h-4" />
                  {logoUrl ? 'Logo Escola' : 'Adicionar Logo'}
                </button>
              )}
            </div>

            {/* Botão Aulas Faltantes ao lado de Logo Escola */}
            <button 
              id="btn-missing-classes-header"
              onClick={() => setIsShowingMissingClasses(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-2 border-amber-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-800 hover:border-amber-500 hover:bg-amber-100 transition-all shadow-sm"
              title="Verificar Aulas Faltantes"
            >
              <AlertCircle className="w-4 h-4 text-amber-600 animate-pulse" />
              Aulas Faltantes
            </button>

            {/* Botão Gerar Automaticamente */}
            <button 
              id="btn-auto-generate-schedule"
              onClick={() => setIsAutoGenerateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 border-2 border-emerald-950 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-700 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(16,185,129,0.3)] active:translate-x-[0px] active:translate-y-[0px] active:shadow-none transition-all shadow-sm cursor-pointer"
              title="Gerar Horários Automaticamente"
            >
              <Sparkles className="w-4 h-4 text-emerald-200 animate-pulse" />
              Gerar Automaticamente
            </button>

            <div className="flex flex-col gap-1.5">
              <button 
                id="btn-help-guide"
                onClick={() => {
                  setHelpActiveTab('geral');
                  setIsHelpModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-400 border-2 border-slate-900 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-900 hover:bg-amber-500 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[0px] active:translate-y-[0px] active:shadow-none transition-all cursor-pointer shadow-sm"
                title="Ajuda e Manual de Uso"
              >
                <HelpCircle className="w-3.5 h-3.5 text-slate-900" />
                Dúvidas? Ver Tutorial
              </button>

              <button 
                onClick={handleSave}
                className={`flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[0px] active:translate-y-[0px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                  isSaved ? 'bg-green-500 text-white border-green-700' : 'bg-indigo-600 text-white border-indigo-900'
                }`}
              >
                {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {isSaved ? 'Gravado!' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>

        {/* Action Row: Cadastros, Impressão & Backup */}
        <div className="flex flex-wrap items-center justify-between p-2 px-4 bg-slate-50/50 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Cadastros:</span>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => {
                  setNewTurmaShift('todas');
                  setIsAddingTurma(true);
                }}
                className="group flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-all shadow-sm"
              >
                <div className="p-1 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Calendar className="w-3 h-3" />
                </div>
                Turmas
              </button>
              <button 
                onClick={() => setIsAddingSubject(true)}
                className="group flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-all shadow-sm"
              >
                <div className="p-1 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <BookOpen className="w-3 h-3" />
                </div>
                Disciplinas
              </button>
              <button 
                onClick={() => setIsAddingTeacher(true)}
                className="group flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-all shadow-sm"
              >
                <div className="p-1 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Users className="w-3 h-3" />
                </div>
                Professores
              </button>
              <button 
                onClick={() => setIsAddingRoom(true)}
                className="group flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-all shadow-sm"
              >
                <div className="p-1 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <DoorClosed className="w-3 h-3" />
                </div>
                Salas Esp.
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 pr-4 border-r border-slate-200">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Impressão:</span>
              <button 
                onClick={() => setIsPrintingTurmaSelection(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                Individual
              </button>
              <button 
                onClick={handlePrintLabsHorizontal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-[10px] font-bold hover:bg-indigo-100 transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                Geral Salas
              </button>
               <button 
                onClick={handlePrintGeralTurmas}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold hover:bg-black transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                Geral Turmas
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex bg-slate-200/50 p-1 rounded-xl items-center gap-1">
                <button 
                  onClick={handleExportData}
                  className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-blue-600 transition-all"
                  title="Baixar Backup (.txt)"
                >
                  <Download className="w-4 h-4" />
                </button>
                <label className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-indigo-600 transition-all cursor-pointer" title="Restaurar Backup (.txt)">
                  <FileText className="w-4 h-4" />
                  <input type="file" accept=".txt" className="hidden" onChange={handleImportBackup} />
                </label>
                <button 
                  onClick={() => setIsWhatsAppModalOpen(true)}
                  className="p-1.5 hover:bg-white rounded-lg text-emerald-600 hover:text-emerald-500 transition-all flex items-center justify-center cursor-pointer"
                  title="Enviar Backup via WhatsApp"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsClearingSelection(true)}
                  className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-red-600 transition-all"
                  title="Limpar Grade"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content (Shifted up) */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Professional Matrix View (Matching Screenshot) */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] overflow-hidden print:overflow-visible print:shadow-none print:border-slate-800" id="schedule-grid">
            <div className="p-3 border-b-2 border-slate-900 bg-slate-50 flex items-center justify-between sticky top-0 left-0 z-30 print:static print:border-b">
              <div className="flex items-center gap-3">
                {logoUrl && (
                  <div className="w-12 h-12 flex-shrink-0 bg-white border border-slate-200 rounded-lg p-1 overflow-hidden flex items-center justify-center">
                    <img src={logoUrl} alt="Logo Escola" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                )}
                <div className="flex flex-col">
                  <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                    Horário {importShift === 'manha' ? 'da Manhã' : 'da Tarde'} {viewMode === 'rooms' ? '- SALAS/LABS' : ''}
                  </h1>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">{schoolName}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600 rounded-sm" />
                  <span className="text-[9px] font-black uppercase text-slate-400">Conflito</span>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-3 h-3 bg-slate-900 rounded-sm shadow-sm" />
                  <span className="text-[9px] font-black uppercase text-slate-400">Cadastrada</span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full border-collapse border-spacing-0">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-900 sticky top-0 z-20">
                    <th className="bg-slate-100 sticky left-0 z-40 border-r-2 border-slate-900 w-10 min-w-[40px] max-w-[40px]"></th>
                    {viewMode === 'turmas' ? displayedTurmas.map(t => (
                      <th key={t.id} className="p-0 border-r border-slate-300 text-[10px] font-black uppercase tracking-tight text-slate-900 min-w-[80px] bg-slate-100">
                        <div className="flex items-center justify-between px-2 py-3 group">
                          <span className="truncate">{t.name}</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Remover turma ${t.name}?`)) removeTurma(t.id);
                            }}
                            className="print:hidden opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </th>
                    )) : turmas.filter(t => t.isRoom).map(t => (
                      <th key={t.id} className="p-0 border-r border-slate-300 text-[10px] font-black uppercase tracking-tight text-slate-900 min-w-[100px] bg-indigo-50">
                        <div className="flex items-center justify-between px-2 py-3 group">
                          <span className="truncate text-indigo-900">{t.name}</span>
                        </div>
                      </th>
                    ))}
                    <th className="p-3 bg-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-900 sticky right-0 z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.05)] w-28">
                      Horário
                    </th>
                  </tr>
                </thead>
                <tbody>
                      {DAYS.map((day) => (
                    <React.Fragment key={day.id}>
                      {(importShift === 'manha' ? PERIODS_MANHA : PERIODS_TARDE).map((actualPeriod, pIndex) => {
                        const timeRange = importShift === 'manha' 
                          ? ["7h30-8h20", "8h20-9h10", "9h10-10h", "10h20-11h10", "11h10-12h", "12h-12h50"][pIndex]
                          : ["13h-13h50", "13h50-14h40", "14h40-15h30", "15h50-16h40", "16h40-17h30", "17h30-18h20"][pIndex];

                        return (
                          <React.Fragment key={`${day.id}-${actualPeriod}`}>
                            <tr className={`border-b border-slate-200 hover:bg-slate-50 transition-colors h-14 ${pIndex === 5 ? 'border-b-[3px] border-slate-900' : ''}`}>
                              {/* Day Column (Sticky Left) */}
                                {pIndex === 0 && (
                                  <td rowSpan={7} className={`${viewMode === 'rooms' ? 'bg-indigo-900' : 'bg-slate-900'} text-white p-0 w-10 min-w-[40px] max-w-[40px] border-r-2 border-slate-900 sticky left-0 z-40 shadow-[2px_0_10px_rgba(0,0,0,0.1)]`}>
                                    <div className="flex items-center justify-center h-full w-full">
                                      <span className="text-[10px] font-black uppercase [writing-mode:vertical-lr] rotate-180 text-center tracking-widest whitespace-nowrap">
                                        {day.label}
                                      </span>
                                    </div>
                                  </td>
                                )}
                                
                                {(viewMode === 'turmas' ? displayedTurmas : turmas.filter(t => t.isRoom)).map(turma => {
                                  const slotId = `${day.id}-${actualPeriod}`;
                                  const slot = schedules[turma.id]?.[slotId];
                                  const teacher = teachers.find(t => t.id === slot?.teacherId);
                                  const subject = subjects.find(s => s.id === slot?.subjectId);
                                  const associatedTurma = turmas.find(t => t.id === slot?.associatedTurmaId);
                                  const conflicts = getConflicts(day.id, actualPeriod, slot?.teacherId || '', turma.id);

                                  return (
                                    <td 
                                      key={turma.id}
                                      onClick={() => handleSlotClick(day.id, actualPeriod, turma.id)}
                                      className={`p-1.5 border-r border-slate-200 cursor-pointer transition-all group relative ${
                                        conflicts.length > 0 
                                          ? 'bg-red-50' 
                                          : slot 
                                            ? viewMode === 'rooms' ? 'bg-indigo-50 hover:bg-indigo-100' : 'bg-slate-100 hover:bg-slate-200 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]' 
                                            : ''
                                      }`}
                                    >
                                      {slot ? (
                                        <div className="flex flex-col items-center justify-center text-center overflow-hidden">
                      <span className={`text-[10px] font-black uppercase leading-[1.1] mb-0.5 ${conflicts.length > 0 ? 'text-red-600' : viewMode === 'rooms' ? 'text-indigo-900' : 'text-slate-800'}`}>
                        {viewMode === 'rooms' ? associatedTurma?.name || 'N/A' : subject?.name}
                      </span>
                                          <span className={`text-[8px] font-bold uppercase truncate w-full ${viewMode === 'rooms' ? 'text-indigo-400' : 'text-slate-400'}`}>
                                            {teacher?.name} {viewMode === 'rooms' && subject ? `• ${subject.name}` : ''}
                                          </span>
                                        {conflicts.length > 0 && (
                                          <div className="absolute top-0.5 right-0.5">
                                            <AlertCircle className="w-2.5 h-2.5 text-red-500 fill-white" />
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Plus className="w-3.5 h-3.5 text-slate-400" />
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="p-1.5 border-l border-slate-400 bg-slate-50 sticky right-0 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] w-28">
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <span className={`text-[9px] font-black uppercase shrink-0 ${importShift === 'manha' ? 'text-blue-600' : 'text-red-500'}`}>
                                    {pIndex + 1}ª aula
                                  </span>
                                  <span className="text-[8px] font-bold text-slate-400 whitespace-nowrap">
                                    {timeRange}
                                  </span>
                                </div>
                              </td>
                            </tr>
                            {pIndex === 2 && (
                               <tr className="border-b border-slate-300 bg-slate-50/50 h-8">
                                 {(viewMode === 'turmas' ? displayedTurmas : turmas.filter(t => t.isRoom)).map(turma => (
                                   <td key={`intervalo-${turma.id}`} className="border-r border-slate-200 text-center">
                                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Intervalo</span>
                                   </td>
                                 ))}
                                 <td className="p-1 border-l border-slate-400 bg-slate-100 sticky right-0 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">
                                   <div className="flex flex-col items-center justify-center">
                                      <span className="text-[8px] font-black text-slate-400 uppercase leading-none">Intervalo</span>
                                      <span className="text-[7px] font-bold text-slate-500 mt-0.5">{importShift === 'manha' ? '10h - 10h20' : '15h30 - 15h50'}</span>
                                   </div>
                                 </td>
                               </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-slate-50 border-t-2 border-slate-900 text-center flex flex-col items-center gap-0.5">
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5">
                <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] leading-none">
                  Sistema feito por: Prof. Lucas Mercer Leniar
                </p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  Versão {version} - {new Date().toLocaleDateString('pt-BR')} - Atualização de Grade
                </p>
              </div>
              <a 
                href="https://www.LucasLeniar.com.br" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[9px] font-black text-blue-600 hover:underline tracking-widest uppercase mt-0.5"
              >
                www.LucasLeniar.com.br
              </a>
            </div>
          </div>

          <div className="mt-8 text-center print:block hidden">
             <h2 className="text-xl font-bold uppercase tracking-tight">Horário Escolar: {currentTurma?.name}</h2>
             <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">{schoolName}</p>
          </div>
        </div>

      {/* Editor Modal Overlay */}
      <AnimatePresence>
        {selectedSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl space-y-6"
            >
              <div className="text-center">
                <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Editar Aula</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                  {DAYS.find(d => d.id === selectedSlot.split('-')[0])?.label} • {getDisplayPeriod(parseInt(selectedSlot.split('-')[1]))}ª Aula • {getShift(parseInt(selectedSlot.split('-')[1])) === 'manha' ? 'MANHÃ' : 'TARDE'}
                </p>
              </div>

              <div className="space-y-4">
                {viewMode === 'rooms' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Turma que utilizará a sala</label>
                    <select 
                      value={tempAssociatedTurmaId}
                      onChange={e => {
                      setTempAssociatedTurmaId(e.target.value);
                      setSlotError(null);
                    }}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all"
                    >
                      <option value="">Selecionar Turma</option>
                {sortTurmasList(turmas.filter(t => !t.isRoom)).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {viewMode === 'turmas' && tempSubject && subjects.find(s => s.id === tempSubject) && (
                  <div className="px-1 space-y-1">
                    {subjects.find(s => s.id === tempSubject)?.roomIds?.map(rid => {
                      const room = turmas.find(t => t.id === rid);
                      if (!room) return null;
                      return (
                        <div key={rid} className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded-md animate-in fade-in slide-in-from-top-1">
                          <CheckCircle2 className="w-3 h-3" /> Requer {room.name}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{viewMode === 'rooms' ? 'Disciplina (Permitida para esta sala)' : 'Matéria'}</label>
                  {viewMode === 'turmas' ? (
                    <button 
                      onClick={() => {
                        setSelectedSlot(null);
                        setIsAddingSubject(true);
                      }}
                      className="text-[9px] font-bold text-[#657c36] hover:underline"
                    >
                      + Criar Nova
                    </button>
                  ) : (
                    <button 
                      onClick={() => setShowAllSubjectsInRoom(!showAllSubjectsInRoom)}
                      className="text-[9px] font-bold text-indigo-600 hover:underline"
                    >
                      {showAllSubjectsInRoom ? "Ver Apenas Permitidas" : "Ver Todas"}
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <select 
                    value={tempSubject}
                    onChange={e => {
                      const sId = e.target.value;
                      setTempSubject(sId);
                      setSlotError(null);
                      if (viewMode === 'turmas') {
                        // Se houver professores que ensinam esta disciplina, selecionar o primeiro
                        const linkedTeachers = teachers.filter(t => t.subjectIds.includes(sId));
                        if (linkedTeachers.length > 0) {
                          setTempTeacher(linkedTeachers[0].id);
                          setAllocateConsecutive(linkedTeachers[0].preferDoubleClasses || false);
                        } else if (teachers.length === 1) {
                          setTempTeacher(teachers[0].id);
                          setAllocateConsecutive(teachers[0].preferDoubleClasses || false);
                        }
                      }
                    }}
                    className={`w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none transition-all ${
                      viewMode === 'rooms' ? 'focus:border-indigo-500' : 'focus:border-[#657c36]'
                    }`}
                  >
                    <option value="">Selecionar Disciplina</option>
                    {viewMode === 'turmas' ? subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({getWorkloadUsage(s.id).usage}/{getWorkloadUsage(s.id).total})
                      </option>
                    )) : 
                      subjects
                        .filter(s => {
                          if (showAllSubjectsInRoom) return true;
                          // Use dynamic roomIds
                          if (s.roomIds?.includes(selectedTurmaId)) return true;
                          
                          // Fallback para IDs legados se a migração ainda não refletiu na UI
                          if (selectedTurmaId === ID_LAB_INFO_COMP && s.useLabComp) return true;
                          if (selectedTurmaId === ID_LAB_INFO_TAB && s.useLabTab) return true;
                          if (selectedTurmaId === ID_SALA_MAT && s.useSalaMat) return true;
                          
                          return false;
                        })
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))
                    }
                  </select>
                </div>

                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Professor</label>
                  <button 
                    onClick={() => {
                      setSelectedSlot(null);
                      setIsAddingTeacher(true);
                    }}
                    className="text-[9px] font-bold text-[#657c36] hover:underline"
                  >
                    + Criar Novo
                  </button>
                </div>
                <div className="space-y-2">
                  <select 
                    value={tempTeacher}
                    onChange={e => {
                      const tId = e.target.value;
                      setTempTeacher(tId);
                      setSlotError(null);
                      const teacher = teachers.find(t => t.id === tId);
                      // Se este professor só ensina uma disciplina e nenhuma está selecionada, auto-selecionar
                      if (teacher && teacher.subjectIds.length === 1 && !tempSubject) {
                        setTempSubject(teacher.subjectIds[0]);
                      }
                      if (teacher) {
                        setAllocateConsecutive(teacher.preferDoubleClasses || false);
                      }
                    }}
                    className={`w-full px-4 py-3 border-2 rounded-xl text-xs font-bold transition-all focus:outline-none ${
                      selectedSlot && getConflicts(selectedSlot.split('-')[0], parseInt(selectedSlot.split('-')[1]), tempTeacher, selectedTurmaId).length > 0
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-[#657c36]'
                    }`}
                  >
                    <option value="">Selecionar Professor</option>
                    {viewMode === 'turmas' ? (
                      <>
                        {/* First, show linked teachers */}
                        {teachers.filter(t => (!tempSubject || t.subjectIds.includes(tempSubject)) && (!t.turmaIds || t.turmaIds.length === 0 || t.turmaIds.includes(selectedTurmaId))).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                        
                        {/* Then, if a subject is selected, show others in a group */}
                        {tempSubject && teachers.filter(t => !t.subjectIds.includes(tempSubject) && (!t.turmaIds || t.turmaIds.length === 0 || t.turmaIds.includes(selectedTurmaId))).length > 0 && (
                          <optgroup label="Outros Professores (Não vinculados a esta disciplina)">
                            {teachers
                              .filter(t => !t.subjectIds.includes(tempSubject) && (!t.turmaIds || t.turmaIds.length === 0 || t.turmaIds.includes(selectedTurmaId)))
                              .map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                          </optgroup>
                        )}
                      </>
                    ) : (
                      teachers
                        .filter(t => !t.turmaIds || t.turmaIds.length === 0 || !tempAssociatedTurmaId || t.turmaIds.includes(tempAssociatedTurmaId))
                        .sort((a,b) => a.name.localeCompare(b.name)).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))
                    )}
                  </select>
                  
                  {selectedSlot && getConflicts(selectedSlot.split('-')[0], parseInt(selectedSlot.split('-')[1]), tempTeacher, selectedTurmaId).length > 0 && (
                    <div className="p-2 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-3 h-3 text-red-500 shadow-sm" />
                      <p className="text-[9px] font-bold text-red-600 leading-tight">
                        {getConflicts(selectedSlot.split('-')[0], parseInt(selectedSlot.split('-')[1]), tempTeacher, selectedTurmaId).includes('INDISPONÍVEL')
                          ? "ESTE PROFESSOR NÃO ESTÁ DISPONÍVEL NESTES HORÁRIOS!"
                          : `PROFESSOR JÁ ESTÁ EM: ${getConflicts(selectedSlot.split('-')[0], parseInt(selectedSlot.split('-')[1]), tempTeacher, selectedTurmaId).join(', ')}`}
                      </p>
                    </div>
                  )}

                  {/* Option for Double Classes */}
                  {tempTeacher && tempSubject && (
                    <div className="mt-2.5 p-2.5 bg-[#657c36]/5 border border-[#657c36]/20 rounded-xl flex items-center justify-between transition-all">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-[#657c36] uppercase tracking-wide">Alocar Aula Geminada</span>
                        {selectedSlot && getConsecutiveSlotLabel(selectedSlot) && (
                          <span className="text-[8px] font-bold text-slate-500 uppercase">
                            Também ocupará: {getConsecutiveSlotLabel(selectedSlot)?.label}
                          </span>
                        )}
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={allocateConsecutive} 
                          onChange={e => setAllocateConsecutive(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:shadow-sm after:transition-all peer-checked:bg-[#657c36]"></div>
                      </label>
                    </div>
                  )}

                  {/* Realtime check for geminated conflicts */}
                  {allocateConsecutive && selectedSlot && (() => {
                    const [day, periodStr] = selectedSlot.split('-');
                    const period = parseInt(periodStr);
                    let consecPeriod = 0;
                    if (period >= 1 && period <= 6) {
                      consecPeriod = (period < 6) ? period + 1 : 5;
                    } else if (period >= 7 && period <= 12) {
                      consecPeriod = (period < 12) ? period + 1 : 11;
                    }
                    if (consecPeriod > 0 && tempTeacher) {
                      const consecConflicts = getConflicts(day, consecPeriod, tempTeacher, selectedTurmaId);
                      if (consecConflicts.length > 0) {
                        return (
                          <div className="mt-1.5 p-2 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <p className="text-[9px] font-bold text-amber-700 leading-tight">
                              CONFLITO NO HORÁRIO GEMINADO ({getConsecutiveSlotLabel(selectedSlot)?.label}): {
                                consecConflicts.includes('INDISPONÍVEL') 
                                  ? "PROFESSOR INDISPONÍVEL NESTE HORÁRIO!" 
                                  : `PROFESSOR JÁ ESTÁ EM: ${consecConflicts.join(', ')}`
                              }
                            </p>
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}
                </div>
              </div>

              {slotError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 animate-in fade-in zoom-in-95">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-[10px] font-bold text-red-600 leading-tight">
                    {slotError}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedSlot(null)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={saveSlot}
                  className="flex-1 px-4 py-3 bg-black text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all uppercase tracking-widest"
                >
                  Confirmar
                </button>
              </div>
              
              <button 
                onClick={() => {
                  setTempTeacher('');
                  setTempSubject('');
                }}
                className="w-full text-[9px] font-black text-red-400 hover:text-red-500 uppercase tracking-widest pt-2"
              >
                Limpar Célula
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Turmas Management Modal */}
      <AnimatePresence>
        {isPrintingTurmaSelection && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <h3 className="text-xl font-black text-slate-900 uppercase">
                    Imprimir Horário por Turma
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Selecione a turma desejada</p>
                </div>
                <button 
                  onClick={() => setIsPrintingTurmaSelection(false)} 
                  className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto px-1 custom-scrollbar">
                <button 
                  onClick={handlePrintAllTurmasIndividual}
                  className="col-span-2 flex flex-col items-center justify-center p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all group border-2 border-blue-700/20"
                >
                  <Printer className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-black uppercase tracking-wider">Imprimir Todas as Turmas</span>
                  <span className="text-[9px] font-bold text-blue-100 mt-1 uppercase">(Uma página por turma - A4 modo Retrato)</span>
                </button>
                
                <div className="col-span-2 h-px bg-slate-100 my-2" />

                {sortTurmasList(turmas.filter(t => !t.isRoom)).map(turma => (
                  <button 
                    key={turma.id}
                    onClick={() => handlePrintTurmaSelection(turma)}
                    className="flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-black text-slate-800">{turma.name}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{turma.shift === 'manha' ? 'MANHÃ' : turma.shift === 'tarde' ? 'TARDE' : 'Período indefinido'}</span>
                    </div>
                    <Printer className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear Schedules Selection Modal */}
      <AnimatePresence>
        {isClearingSelection && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <h3 className="text-xl font-black text-slate-900 uppercase">
                    Limpar Grade de Horários
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 text-left">Escolha o que deseja apagar</p>
                </div>
                <button 
                  onClick={() => setIsClearingSelection(false)} 
                  className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto px-1 custom-scrollbar">
                <button 
                  onClick={() => {
                    if (confirm('ATENÇÃO: Isso irá apagar os horários de TODAS as turmas sem afetar professores ou disciplinas. Deseja realmente limpar tudo?')) {
                      setSchedules({});
                      incrementVersion();
                      setIsClearingSelection(false);
                    }
                  }}
                  className="flex flex-col items-center justify-center p-6 bg-orange-50 text-orange-600 rounded-2xl hover:bg-orange-100 transition-all group border-2 border-orange-200/50"
                >
                  <Trash2 className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-black uppercase tracking-wider">Limpar Tudo</span>
                  <span className="text-[9px] font-bold text-orange-400 mt-1 uppercase">(Apaga todos os horários de todas as turmas)</span>
                </button>
                
                <div className="relative h-6 flex items-center justify-center my-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                  <span className="relative px-3 bg-white text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em]">Ou selecione uma turma</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pb-2">
                  {sortTurmasList(turmas.filter(t => !t.isRoom)).map(turma => (
                    <button 
                      key={turma.id}
                      onClick={() => {
                        if (confirm(`Limpar todos os horários da turma ${turma.name}?`)) {
                          setSchedules(prev => {
                            const next = { ...prev };
                            delete next[turma.id];
                            return next;
                          });
                          incrementVersion();
                          setIsClearingSelection(false);
                        }
                      }}
                      className="flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-amber-400 hover:bg-amber-50 transition-all group"
                    >
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-black text-slate-800">{turma.name}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{turma.shift === 'manha' ? 'MANHÃ' : turma.shift === 'tarde' ? 'TARDE' : 'Período indefinido'}</span>
                      </div>
                      <Trash2 className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Turmas Management Modal */}
      <AnimatePresence>
        {isAddingTurma && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 uppercase">
                  {editingTurmaId ? 'Editar Turma' : 'Gerenciar Turmas'}
                </h3>
                <button 
                  onClick={() => {
                    setIsAddingTurma(false);
                    setEditingTurmaId(null);
                    setNewTurmaName('');
                  }} 
                  className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newTurmaName}
                        onChange={e => setNewTurmaName(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && addTurma()}
                        placeholder="Nome da Turma (Ex: 6ºA)"
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-slate-900 transition-all"
                      />
                    <button onClick={addTurma} className={`px-6 rounded-xl transition-all ${editingTurmaId ? 'bg-[#657c36] text-white' : 'bg-slate-900 text-white hover:bg-black'}`}>
                      {editingTurmaId ? <CheckCircle2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={newTurmaShift}
                      onChange={e => setNewTurmaShift(e.target.value as any)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black text-slate-500 focus:outline-none focus:border-slate-900 transition-all"
                    >
                      {!editingTurmaId && <option value="todas">Período: Todas as Turmas</option>}
                      <option value="manha">Período: Manhã</option>
                      <option value="tarde">Período: Tarde</option>
                    </select>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {sortTurmasList(
                    turmas.filter(t => {
                      if (t.isRoom) return false;
                      if (newTurmaShift === 'todas') return true;
                      return t.shift === newTurmaShift;
                    })
                  ).map(turma => (
                    <div key={turma.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-white border border-transparent hover:border-slate-100 transition-all group">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-800">{turma.name}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{turma.shift === 'manha' ? 'MANHÃ' : turma.shift === 'tarde' ? 'TARDE' : 'Período não definido'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => startEditTurma(turma)} 
                          className="p-2 text-slate-300 hover:text-blue-500 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => removeTurma(turma.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rooms Management Modal */}
      <AnimatePresence>
        {isAddingRoom && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center px-8 pt-8">
                <h3 className="text-xl font-black text-slate-900 uppercase">
                  Salas Especiais
                </h3>
                <button 
                  onClick={() => setIsAddingRoom(false)} 
                  className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-8 pt-4 space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nova Sala Especial</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Ex: LAB ARTES"
                        value={newRoomName}
                        onChange={e => setNewRoomName(e.target.value)}
                        className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                        onKeyDown={e => e.key === 'Enter' && addRoom()}
                      />
                      <input 
                        type="color" 
                        value={newRoomColor}
                        onChange={e => setNewRoomColor(e.target.value)}
                        className="w-12 h-11 p-1 bg-slate-50 border-2 border-slate-100 rounded-xl cursor-pointer"
                      />
                      <button 
                        onClick={addRoom}
                        className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100" />
                  
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {turmas
                      .filter(t => t.isRoom)
                      .map(room => (
                        <div key={room.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-white border border-transparent hover:border-slate-100 transition-all group">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: room.color || '#6366f1' }}
                            />
                            <div className="flex flex-col">
                              <input 
                                type="text"
                                value={room.name}
                                onChange={e => {
                                  const newName = e.target.value.toUpperCase();
                                  setTurmas(prev => prev.map(t => t.id === room.id ? { ...t, name: newName } : t));
                                  incrementVersion();
                                }}
                                className="text-xs font-black text-slate-800 bg-transparent border-none p-0 focus:ring-0 w-32"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <input 
                              type="color"
                              value={room.color || '#6366f1'}
                              onChange={e => {
                                setTurmas(prev => prev.map(t => t.id === room.id ? { ...t, color: e.target.value } : t));
                                incrementVersion();
                              }}
                              className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer"
                            />
                            <button 
                              onClick={() => {
                                if (confirm(`Deseja remover a sala ${room.name}? Isso apagará os horários desta sala.`)) {
                                  removeTurma(room.id);
                                }
                              }}
                              className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                
                <div className="pt-2">
                  <button 
                    onClick={() => setIsAddingRoom(false)}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-black transition-all"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WhatsApp Backup Export Modal */}
      <AnimatePresence>
        {isWhatsAppModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="flex justify-between items-center px-8 pt-8">
                <div className="flex items-center gap-2">
                  <WhatsAppIcon className="w-6 h-6 text-[#25D366]" />
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                    Exportar via WhatsApp
                  </h3>
                </div>
                <button 
                  onClick={() => setIsWhatsAppModalOpen(false)} 
                  className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-8 pt-4 space-y-5">
                <div className="text-xs text-slate-500 font-medium leading-relaxed">
                  Esta ferramenta fará o <span className="font-bold text-slate-700">download automático</span> do arquivo de backup (.txt) por segurança e abrirá o WhatsApp com uma instrução tutorial completa para que você possa enviá-la com o arquivo anexado ao seu contato de forma fácil.
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Número do Contato (com DDD)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 41999999999"
                    value={tempWaPhone}
                    onChange={e => setTempWaPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition-all font-mono"
                    onKeyDown={e => e.key === 'Enter' && handleWhatsAppExport()}
                  />
                  <p className="text-[8.5px] font-bold text-slate-400 uppercase px-1 leading-normal tracking-tight">
                    Digite apenas números com DDD (Ex: 41998887766). Ficará salvo para as próximas exportações!
                  </p>
                </div>

                <div className="pt-2 space-y-3">
                  <button 
                    onClick={handleWhatsAppExport}
                    className="w-full py-4 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border-none"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    Gerar & Enviar Backup
                  </button>
                  
                  <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-800 block">Como funciona:</span>
                    <ol className="list-decimal list-inside text-[9.5px] text-emerald-700 space-y-1 font-semibold leading-normal">
                      <li>O arquivo de backup <span className="font-bold">.txt</span> será baixado para o seu computador ou celular.</li>
                      <li>O WhatsApp se abrirá com o tutorial do backup pré-preenchido como mensagem de texto.</li>
                      <li>Envie a mensagem no chat e <span className="font-bold">anexe o arquivo .txt baixado</span> logo em seguida!</li>
                    </ol>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Teachers Management Modal */}
      <AnimatePresence>
        {isAddingTeacher && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center px-8 pt-8">
                <h3 className="text-xl font-black text-slate-900 uppercase">
                  {editingTeacherId ? 'Editar Professor' : 'Gerenciar Professores'}
                </h3>
                <button 
                  onClick={() => {
                    setIsAddingTeacher(false);
                    setEditingTeacherId(null);
                    setNewTeacherName('');
                    setNewTeacherSubjectIds([]);
                    setNewTeacherAvailability([]);
                    setNewTeacherTurmaIds([]);
                  }} 
                  className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500"
                >
                  ×
                </button>
              </div>

              <div className="p-8 pt-4 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  {subjects.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col items-center gap-3 text-center">
                    <AlertCircle className="w-8 h-8 text-amber-500" />
                    <p className="text-xs font-bold text-amber-900">
                      Você precisa cadastrar as <span className="underline">Disciplinas</span> antes de adicionar professores.
                    </p>
                    <button 
                      onClick={() => {
                        setIsAddingTeacher(false);
                        setIsAddingSubject(true);
                      }}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-black uppercase"
                    >
                      Ir para Disciplinas
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-1">
                        <input 
                          type="text" 
                          value={newTeacherName}
                          onChange={e => setNewTeacherName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addTeacher()}
                          placeholder="Nome do Professor"
                          className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-bold focus:outline-none transition-all ${
                            teachers.some(t => t.name.trim().toLowerCase() === newTeacherName.trim().toLowerCase() && t.id !== editingTeacherId) && newTeacherName.trim() !== ""
                              ? "border-red-500 ring-2 ring-red-50" 
                              : "border-slate-200 focus:border-slate-900"
                          }`}
                        />
                        {teachers.some(t => t.name.trim().toLowerCase() === newTeacherName.trim().toLowerCase() && t.id !== editingTeacherId) && newTeacherName.trim() !== "" && (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-lg border border-red-100">
                            <AlertCircle className="w-3 h-3 text-red-500" />
                            <span className="text-[10px] font-black text-red-600 uppercase tracking-tight">Nome já cadastrado!</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Selecione as Disciplinas</label>
                        <div className="flex flex-wrap gap-1.5 border border-slate-100 rounded-xl p-2 bg-slate-50 transition-all">
                          {subjects.map(s => (
                            <label key={s.id} className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-lg cursor-pointer transition-all hover:border-[#657c36] hover:bg-[#657c36]/5 group">
                              <input 
                                type="checkbox"
                                checked={newTeacherSubjectIds.includes(s.id)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setNewTeacherSubjectIds([...newTeacherSubjectIds, s.id]);
                                  } else {
                                    setNewTeacherSubjectIds(newTeacherSubjectIds.filter(id => id !== s.id));
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-[#657c36] focus:ring-[#657c36]"
                              />
                              <span className="text-[10px] font-black text-slate-600 uppercase group-hover:text-slate-900 tracking-tight">{s.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 col-span-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Turmas que o Professor Leciona</label>
                        <div className="flex flex-wrap gap-1.5 border border-slate-100 rounded-xl p-2 bg-slate-50 transition-all max-h-40 overflow-y-auto">
                          {turmas.filter(t => !t.isRoom).map(t => (
                            <label key={t.id} className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-lg cursor-pointer transition-all hover:border-[#657c36] hover:bg-[#657c36]/5 group">
                              <input 
                                type="checkbox"
                                checked={newTeacherTurmaIds.includes(t.id)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setNewTeacherTurmaIds([...newTeacherTurmaIds, t.id]);
                                  } else {
                                    setNewTeacherTurmaIds(newTeacherTurmaIds.filter(id => id !== t.id));
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-[#657c36] focus:ring-[#657c36]"
                              />
                              <span className="text-[10px] font-black text-slate-600 uppercase group-hover:text-slate-900 tracking-tight">{t.name}</span>
                            </label>
                          ))}
                          {turmas.filter(t => !t.isRoom).length === 0 && (
                            <span className="text-[10px] font-bold text-slate-400 uppercase p-1">Nenhuma turma cadastrada</span>
                          )}
                        </div>
                        <div className="flex gap-2 px-1">
                          <button 
                            type="button"
                            onClick={() => setNewTeacherTurmaIds(turmas.filter(t => !t.isRoom).map(t => t.id))}
                            className="text-[9px] font-black uppercase text-[#657c36] hover:underline cursor-pointer"
                          >
                            Selecionar Todas
                          </button>
                          <span className="text-slate-300">|</span>
                          <button 
                            type="button"
                            onClick={() => setNewTeacherTurmaIds([])}
                            className="text-[9px] font-black uppercase text-red-600 hover:underline cursor-pointer"
                          >
                            Livre (Todas)
                          </button>
                        </div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase px-1 leading-normal tracking-tight mt-1">
                          Se nenhuma turma for selecionada, o professor poderá lecionar em QUALQUER turma por padrão.
                        </p>
                      </div>

                      {/* Preferência de Aulas Geminadas */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Preferência de Aulas</label>
                        <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl transition-all">
                          <div className="flex flex-col gap-0.5 max-w-[80%]">
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">Preferir Aulas Geminadas</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase leading-normal">Tentar preencher dois horários consecutivos no mesmo dia para este professor</span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input 
                              type="checkbox" 
                              checked={newTeacherPreferDouble} 
                              onChange={e => setNewTeacherPreferDouble(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#657c36]"></div>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Disponibilidade no Colégio</label>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-3 text-slate-500">Marque apenas os horários que o professor PODE trabalhar</p>
                          
                          <div className="space-y-4">
                            {/* Manhã */}
                            <div>
                              <h4 className="text-[9px] font-black text-[#657c36] uppercase tracking-wider mb-2 border-b border-[#657c36]/10 pb-1">Período da Manhã</h4>
                              <div className="grid grid-cols-6 gap-1">
                                <div className="col-span-1"></div>
                                {DAYS.map(day => (
                                  <div key={day.id} className="text-[10px] font-black text-slate-400 text-center uppercase tracking-tighter">{day.id}</div>
                                ))}
                                
                                {[1,2,3,4,5,6].map(p => (
                                  <React.Fragment key={p}>
                                    <div className="text-[10px] font-black text-slate-500 flex items-center justify-center p-0.5 h-7">
                                      {p}ª
                                    </div>
                                    {DAYS.map(day => {
                                      const slotId = `${day.id}-${p}`;
                                      const isSelected = newTeacherAvailability.includes(slotId);
                                      return (
                                        <button
                                          key={slotId}
                                          type="button"
                                          onClick={() => {
                                            if (isSelected) {
                                              setNewTeacherAvailability(newTeacherAvailability.filter(id => id !== slotId));
                                            } else {
                                              setNewTeacherAvailability([...newTeacherAvailability, slotId]);
                                            }
                                          }}
                                          className={`h-7 rounded-md border-2 transition-all flex items-center justify-center ${
                                            isSelected 
                                              ? "bg-[#657c36] border-[#657c36] text-white" 
                                              : "bg-white border-slate-200 hover:border-slate-300"
                                          }`}
                                          title={`${day.label} - ${p}ª Aula`}
                                        >
                                          {isSelected && <CheckCircle2 className="w-3 h-3" />}
                                        </button>
                                      );
                                    })}
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>

                            {/* Tarde */}
                            <div>
                              <h4 className="text-[9px] font-black text-orange-600 uppercase tracking-wider mb-2 border-b border-orange-100 pb-1">Período da Tarde</h4>
                              <div className="grid grid-cols-6 gap-1">
                                <div className="col-span-1"></div>
                                {DAYS.map(day => (
                                  <div key={day.id} className="text-[10px] font-black text-slate-400 text-center uppercase tracking-tighter">{day.id}</div>
                                ))}
                                
                                {[7,8,9,10,11,12].map((p, idx) => (
                                  <React.Fragment key={p}>
                                    <div className="text-[10px] font-black text-slate-500 flex items-center justify-center p-0.5 h-7">
                                      {idx + 1}ª
                                    </div>
                                    {DAYS.map(day => {
                                      const slotId = `${day.id}-${p}`;
                                      const isSelected = newTeacherAvailability.includes(slotId);
                                      return (
                                        <button
                                          key={slotId}
                                          type="button"
                                          onClick={() => {
                                            if (isSelected) {
                                              setNewTeacherAvailability(newTeacherAvailability.filter(id => id !== slotId));
                                            } else {
                                              setNewTeacherAvailability([...newTeacherAvailability, slotId]);
                                            }
                                          }}
                                          className={`h-7 rounded-md border-2 transition-all flex items-center justify-center ${
                                            isSelected 
                                              ? "bg-orange-500 border-orange-500 text-white" 
                                              : "bg-white border-slate-200 hover:border-slate-300"
                                          }`}
                                          title={`${day.label} - ${idx + 1}ª Aula Tarde`}
                                        >
                                          {isSelected && <CheckCircle2 className="w-3 h-3" />}
                                        </button>
                                      );
                                    })}
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex gap-2">
                            <button 
                              type="button"
                              onClick={() => setNewTeacherAvailability(
                                DAYS.flatMap(d => [1,2,3,4,5,6,7,8,9,10,11,12].map(p => `${d.id}-${p}`))
                              )}
                              className="text-[9px] font-black uppercase text-blue-600 hover:underline"
                            >
                              PODE TODOS
                            </button>
                            <span className="text-slate-300">|</span>
                            <button 
                              type="button"
                              onClick={() => setNewTeacherAvailability([])}
                              className="text-[9px] font-black uppercase text-red-600 hover:underline"
                            >
                              LIMPAR
                            </button>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={addTeacher} 
                        className={`w-full py-3 rounded-xl font-black uppercase text-xs transition-all flex items-center justify-center gap-2 ${
                          editingTeacherId ? 'bg-[#657c36] text-white' : 'bg-slate-900 text-white hover:bg-black'
                        }`}
                      >
                        {editingTeacherId ? <><CheckCircle2 className="w-4 h-4" /> Salvar Alterações</> : <><Plus className="w-4 h-4" /> Cadastrar Professor</>}
                      </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {teachers.map(teacher => {
                        const teacherSubjects = subjects.filter(s => teacher.subjectIds?.includes(s.id));
                        return (
                          <div key={teacher.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-white border border-transparent hover:border-slate-100 transition-all group">
                            <div className="flex flex-col max-w-[70%]">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-800">{teacher.name}</span>
                                {teacher.availability && teacher.availability.length > 0 && (
                                  <span className="text-[7px] font-black bg-blue-100 text-blue-600 px-1 py-0.5 rounded uppercase tracking-tighter" title="Disponibilidade configurada">Disp.</span>
                                )}
                                {teacher.preferDoubleClasses && (
                                  <span className="text-[7px] font-black bg-amber-100 text-amber-700 px-1 py-0.5 rounded uppercase tracking-tighter" title="Prefere aulas geminadas">Geminadas</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {teacherSubjects.map(s => (
                                  <span key={s.id} className="text-[8px] font-black bg-[#657c36]/10 text-[#657c36] px-1.5 py-0.5 rounded uppercase">{s.name}</span>
                                ))}
                                {teacherSubjects.length === 0 && <span className="text-[8px] font-bold text-slate-400">Sem disciplina vinculada</span>}
                              </div>
                              {teacher.turmaIds && teacher.turmaIds.length > 0 ? (
                                <div className="flex flex-wrap gap-1 items-center mt-1">
                                  <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-tight">Turmas:</span>
                                  {turmas.filter(t => teacher.turmaIds?.includes(t.id)).map(t => (
                                    <span key={t.id} className="text-[7.5px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-600 px-1 rounded uppercase tracking-tighter leading-none">{t.name}</span>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[7.5px] font-semibold text-slate-400 mt-1 uppercase tracking-tight">Todas as Turmas</div>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => startEditTeacher(teacher)} 
                                className="p-2 text-slate-300 hover:text-blue-500 transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => removeTeacher(teacher.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      {/* Subjects Management Modal */}
      <AnimatePresence>
        {isAddingSubject && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 uppercase">
                  {editingSubjectId ? 'Editar Disciplina' : 'Gerenciar Disciplinas'}
                </h3>
                <button 
                  onClick={() => {
                    setIsAddingSubject(false);
                    setEditingSubjectId(null);
                    setNewSubjectName('');
                    setNewSubjectWorkload(2);
                    setNewSubjectUseLabComp(false);
                    setNewSubjectUseLabTab(false);
                    setNewSubjectUseSalaMat(false);
                    setNewSubjectRoomIds([]);
                    setNewSubjectLabWorkload(0);
                    setNewSubjectClassWorkload(0);
                    setNewSubjectCustomWorkloads({});
                    setShowCustomWorkloads(false);
                  }} 
                  className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <input 
                    type="text" 
                    value={newSubjectName}
                    onChange={e => setNewSubjectName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSubject()}
                    placeholder="Nome da Disciplina (Ex: Matemática)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-slate-900 transition-all"
                  />
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase ml-1">Carga Horária Total (Aulas):</span>
                    <input 
                      type="number" 
                      min="1"
                      value={newSubjectWorkload}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 1;
                        setNewSubjectWorkload(val);
                        // Padrão: todas as aulas em sala, zero em laboratório
                        // O usuário pode customizar isso por turma na seção abaixo
                        setNewSubjectClassWorkload(val);
                        setNewSubjectLabWorkload(0);
                      }}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Salas Especiais:</span>
                    <div className="flex flex-wrap gap-3">
                      {turmas.filter(t => t.isRoom).map(room => (
                        <label key={room.id} className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={newSubjectRoomIds.includes(room.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setNewSubjectRoomIds([...newSubjectRoomIds, room.id]);
                              } else {
                                setNewSubjectRoomIds(newSubjectRoomIds.filter(rid => rid !== room.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-[#657c36] focus:ring-[#657c36]"
                          />
                          <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900">{room.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Restrições e Direcionamento Curricular */}
                  <div className="space-y-4 p-4 border border-slate-100 bg-slate-50/50 rounded-2xl">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Direcionamento da Grade Curricular
                    </span>

                    {/* Nível de Ensino */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-0.5">Nível de Ensino:</label>
                      <select
                        value={newSubjectLevelConstraint}
                        onChange={e => setNewSubjectLevelConstraint(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-900 transition-all cursor-pointer"
                      >
                        <option value="ambos">Ambos os Níveis (Ensino Médio e Fundamental)</option>
                        <option value="fundamental">Apenas Ensino Fundamental II (6º ao 9º Ano)</option>
                        <option value="medio">Apenas Ensino Médio (1º ao 3º Ano)</option>
                      </select>
                    </div>

                    {/* Filtro de Série/Ano */}
                    <div className="space-y-1 font-sans">
                      <div className="flex justify-between items-center px-0.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Restringir a Séries específicas:</label>
                        <span className="text-[8px] text-slate-400 font-bold uppercase">(Ex: 6, 7º, 1)</span>
                      </div>
                      <input 
                        type="text" 
                        value={newSubjectGradeConstraint}
                        onChange={e => setNewSubjectGradeConstraint(e.target.value)}
                        placeholder="Ex: 6, 6º (Separado por vírgula. Vazio = todas)"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-900 transition-all font-mono"
                      />
                    </div>

                    {/* Suffix / Sigla */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center px-0.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Restringir a Sufixo/Sigla específico:</label>
                        <span className="text-[8px] text-slate-400 font-bold uppercase">(Ex: A, B, Integral)</span>
                      </div>
                      <input 
                        type="text" 
                        value={newSubjectSuffixConstraint}
                        onChange={e => setNewSubjectSuffixConstraint(e.target.value)}
                        placeholder="Ex: B, Integral (Vazio = Sem filtro)"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-900 transition-all font-mono"
                      />
                    </div>

                    {/* Checkbox Whitelist of target classes */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-0.5 block">Vincular apenas a turmas selecionadas:</label>
                      <div className="max-h-28 overflow-y-auto p-2 bg-white border border-slate-100 rounded-xl space-y-1.5 custom-scrollbar">
                        {turmas.filter(t => !t.isRoom).map(turma => (
                          <label key={turma.id} className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={newSubjectAllowedTurmaIds.includes(turma.id)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setNewSubjectAllowedTurmaIds([...newSubjectAllowedTurmaIds, turma.id]);
                                } else {
                                  setNewSubjectAllowedTurmaIds(newSubjectAllowedTurmaIds.filter(id => id !== turma.id));
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-slate-800 focus:ring-slate-800 cursor-pointer"
                            />
                            <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-900">{turma.name}</span>
                          </label>
                        ))}
                        {turmas.filter(t => !t.isRoom).length === 0 && (
                          <span className="text-[10px] text-slate-400 font-bold block pt-1 text-center">Nenhuma turma cadastrada</span>
                        )}
                      </div>
                      <span className="text-[8px] text-slate-400 font-semibold leading-normal ml-1 block leading-snug">
                        * Deixe as turmas desmarcadas para usar as restrições automáticas de nível, série e sufixo configuradas acima.
                      </span>
                    </div>
                  </div>

                  {(newSubjectClassWorkload + newSubjectLabWorkload) > newSubjectWorkload && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-[10px] font-bold text-red-600 leading-tight">
                        A soma das aulas ({newSubjectClassWorkload + newSubjectLabWorkload}) excede a carga total ({newSubjectWorkload}).
                      </p>
                    </div>
                  )}

                  <div className="pt-2">
                    <button 
                      onClick={() => setShowCustomWorkloads(!showCustomWorkloads)}
                      className="w-full flex items-center justify-between px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                    >
                      <span className="text-[10px] font-black text-slate-600 uppercase">Cargas específicas por Turma</span>
                      <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showCustomWorkloads ? 'rotate-180' : ''}`} />
                    </button>

                    {showCustomWorkloads && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 space-y-2 border-l-2 border-slate-100 pl-3 pb-2"
                      >
                        <p className="text-[9px] font-bold text-slate-400 uppercase leading-snug mb-2">
                          Caso uma turma tenha distribuição diferente do padrão ({newSubjectWorkload} aulas):
                        </p>
                        {turmas.filter(t => !t.isRoom).sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric: true})).map(turma => {
                          const custom = newSubjectCustomWorkloads[turma.id] || { 
                            workload: newSubjectWorkload, 
                            classWorkload: newSubjectClassWorkload, 
                            labWorkload: newSubjectLabWorkload 
                          };
                          
                          const isCustomized = !!newSubjectCustomWorkloads[turma.id];

                          return (
                            <div key={turma.id} className={`p-2 rounded-lg border transition-all ${isCustomized ? 'bg-white border-[#657c36]/40 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-70 hover:opacity-100'}`}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] font-black text-slate-700 uppercase tracking-tighter">{turma.name}</span>
                                {isCustomized ? (
                                  <button 
                                    onClick={() => {
                                      const updated = { ...newSubjectCustomWorkloads };
                                      delete updated[turma.id];
                                      setNewSubjectCustomWorkloads(updated);
                                    }}
                                    className="text-[7pt] font-black text-red-500 uppercase hover:text-red-700"
                                  >
                                    Limpar
                                  </button>
                                ) : (
                                  <span className="text-[7pt] font-bold text-slate-300 uppercase">Padrão</span>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <div className="flex-1 flex items-center bg-white border border-slate-200 rounded px-1.5 py-0.5">
                                  <span className="text-[7pt] font-bold text-slate-400 mr-1">TOT</span>
                                  <input 
                                    type="number"
                                    value={custom.workload}
                                    onChange={e => {
                                      const val = parseInt(e.target.value) || 0;
                                      setNewSubjectCustomWorkloads({
                                        ...newSubjectCustomWorkloads,
                                        [turma.id]: { ...custom, workload: val }
                                      });
                                    }}
                                    className="w-full bg-transparent text-[10px] font-black text-center focus:outline-none"
                                  />
                                </div>
                                <div className="flex-1 flex items-center bg-white border border-slate-200 rounded px-1.5 py-0.5">
                                  <span className="text-[7pt] font-bold text-slate-400 mr-1">SAL</span>
                                  <input 
                                    type="number"
                                    value={custom.classWorkload}
                                    onChange={e => setNewSubjectCustomWorkloads({
                                      ...newSubjectCustomWorkloads,
                                      [turma.id]: { ...custom, classWorkload: parseInt(e.target.value) || 0 }
                                    })}
                                    className="w-full bg-transparent text-[10px] font-black text-center focus:outline-none"
                                  />
                                </div>
                                <div className="flex-1 flex items-center bg-white border border-slate-200 rounded px-1.5 py-0.5">
                                  <span className="text-[7pt] font-bold text-slate-400 mr-1">LAB</span>
                                  <input 
                                    type="number"
                                    value={custom.labWorkload}
                                    onChange={e => setNewSubjectCustomWorkloads({
                                      ...newSubjectCustomWorkloads,
                                      [turma.id]: { ...custom, labWorkload: parseInt(e.target.value) || 0 }
                                    })}
                                    className="w-full bg-transparent text-[10px] font-black text-center focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </div>

                  <button 
                    onClick={addSubject} 
                    disabled={(newSubjectClassWorkload + newSubjectLabWorkload) > newSubjectWorkload}
                    className={`w-full py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all ${((newSubjectClassWorkload + newSubjectLabWorkload) > newSubjectWorkload) ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : (editingSubjectId ? 'bg-[#657c36] text-white shadow-[#657c36]/20 shadow-lg' : 'bg-slate-900 text-white hover:bg-black shadow-xl')}`}
                  >
                    {editingSubjectId ? 'Atualizar Disciplina' : 'Adicionar Disciplina'}
                  </button>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-2 pr-2 custom-scrollbar border-t border-slate-100 pt-4">
                  {subjects.map(subject => (
                    <div key={subject.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-white border border-transparent hover:border-slate-100 transition-all group">
                      <div className="flex flex-col transition-all">
                        <span className="text-xs font-black text-slate-800">{subject.name}</span>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                           <span className="text-[10px] font-bold text-slate-400 uppercase">{subject.workload} aulas</span>
                           {subject.useLabComp && <span className="text-[8px] px-1 bg-green-50 text-green-700 rounded border border-green-100 font-bold">LAB COMP</span>}
                           {subject.useLabTab && <span className="text-[8px] px-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-100 font-bold">LAB TAB</span>}
                           {subject.useSalaMat && <span className="text-[8px] px-1 bg-blue-50 text-blue-700 rounded border border-blue-100 font-bold">SALA MAT</span>}
                           {(subject.labWorkload || 0) > 0 && <span className="text-[8px] text-slate-500 font-bold italic">{subject.labWorkload} lab / {subject.classWorkload} sala</span>}
                           {subject.levelConstraint === 'fundamental' && <span className="text-[8px] px-1 bg-blue-50 text-blue-700 rounded border border-blue-100 font-bold">FUNDAMENTAL</span>}
                           {subject.levelConstraint === 'medio' && <span className="text-[8px] px-1 bg-purple-50 text-purple-700 rounded border border-purple-100 font-bold">ENSINO MÉDIO</span>}
                           {subject.gradeConstraint && <span className="text-[8px] px-1 bg-amber-50 text-amber-700 rounded border border-amber-100 font-bold">SÉRIES: {subject.gradeConstraint}</span>}
                           {subject.suffixConstraint && <span className="text-[8px] px-1 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 font-bold">SUFIXO: {subject.suffixConstraint}</span>}
                           {subject.allowedTurmaIds && subject.allowedTurmaIds.length > 0 && (
                             <span className="text-[8px] px-1 bg-slate-100 text-slate-700 rounded border border-slate-200 font-bold">
                               TURMAS: {subject.allowedTurmaIds.length}
                             </span>
                           )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => startEditSubject(subject)} 
                          className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => removeSubject(subject.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isShowingMissingClasses && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-[95vw] lg:max-w-7xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">
                      Diagnóstico de Aulas Faltantes
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                      Acompanhe quais aulas ainda precisam ser distribuídas por turma
                    </p>
                  </div>
                </div>
                <button 
                  id="btn-close-missing-classes-header"
                  onClick={() => setIsShowingMissingClasses(false)} 
                  className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 text-slate-500 transition-colors shadow-sm cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Banner / Metrics Dashboard */}
              <div className="px-6 py-4 bg-white border-b border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                {(() => {
                  let overallExpected = 0;
                  let overallAllocated = 0;
                  let metricTurmas = turmas.filter(t => !t.isRoom);

                  // Apply shift filters to metrics
                  if (missingClassesShift === 'manha') {
                    metricTurmas = metricTurmas.filter(t => {
                      if (t.shift) return t.shift === 'manha';
                      return !t.name.toLowerCase().includes('tarde') && !t.id.toLowerCase().includes('tarde');
                    });
                  } else if (missingClassesShift === 'tarde') {
                    metricTurmas = metricTurmas.filter(t => {
                      if (t.shift) return t.shift === 'tarde';
                      return t.name.toLowerCase().includes('tarde') || t.id.toLowerCase().includes('tarde');
                    });
                  }

                  // Apply search filter to metrics
                  if (missingClassesSearch.trim()) {
                    const searchLower = missingClassesSearch.toLowerCase();
                    metricTurmas = metricTurmas.filter(t => {
                      const matchesTurma = t.name.toLowerCase().includes(searchLower);
                      const matchesSubject = subjects.some(s => {
                        const hasThisSubject = getSubjectWorkloadsForTurma(s, t.id).workload > 0;
                        return hasThisSubject && s.name.toLowerCase().includes(searchLower);
                      });
                      return matchesTurma || matchesSubject;
                    });
                  }

                  metricTurmas.forEach(t => {
                    subjects.forEach(s => {
                      // If searching, restrict counted workloads to matching elements
                      if (missingClassesSearch.trim()) {
                        const sNameLower = s.name.toLowerCase();
                        const tNameLower = t.name.toLowerCase();
                        const searchLower = missingClassesSearch.toLowerCase();
                        if (!sNameLower.includes(searchLower) && !tNameLower.includes(searchLower)) {
                          return;
                        }
                      }
                      const { total, usage } = getClassSubjectWorkload(t.id, s.id);
                      overallExpected += total;
                      overallAllocated += usage;
                    });
                  });

                  const overallMissing = Math.max(0, overallExpected - overallAllocated);
                  const overallCompletion = overallExpected > 0 ? Math.round((overallAllocated / overallExpected) * 100) : 0;

                  return (
                    <>
                      <div className="bg-slate-50 p-3.5 rounded-2xl flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Aulas Esperadas</span>
                        <span className="text-2xl font-black text-slate-800 leading-tight mt-1">{overallExpected}</span>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-2xl flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Aulas Distribuídas</span>
                        <span className="text-xl font-black text-green-600 leading-tight mt-1 flex items-center gap-1.5">
                           {overallAllocated}
                          <span className="text-xs font-bold text-slate-400 font-mono">({overallCompletion}%)</span>
                        </span>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-2xl flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Aulas Faltantes</span>
                        <span className="text-2xl font-black text-rose-600 leading-tight mt-1">
                          {overallMissing}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-2xl flex flex-col justify-center">
                        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-green-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${overallCompletion}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-2 text-right">
                          {overallCompletion}% Concluído
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Dynamic Alerts and Workload vs Availability Warnings Panel */}
              {(() => {
                const availabilityWarnings: string[] = [];
                teachers.forEach(t => {
                  let totalRequiredWorkload = 0;
                  subjects.forEach(s => {
                    if (t.subjectIds && t.subjectIds.includes(s.id)) {
                      turmas.forEach(tu => {
                        if (!tu.isRoom) {
                          const teachesThisTurma = !t.turmaIds || t.turmaIds.length === 0 || t.turmaIds.includes(tu.id);
                          if (teachesThisTurma) {
                            const { workload } = getSubjectWorkloadsForTurma(s, tu.id);
                            totalRequiredWorkload += workload;
                          }
                        }
                      });
                    }
                  });

                  if (totalRequiredWorkload > 0) {
                    const availableSlotsCount = t.availability?.length || 0;
                    if (t.availability && t.availability.length > 0 && availableSlotsCount < totalRequiredWorkload) {
                      availabilityWarnings.push(
                        `Conflito: O professor ${t.name} precisa lecionar ${totalRequiredWorkload} aula(s), mas tem apenas ${availableSlotsCount} slot(s) de disponibilidade cadastrados no perfil.`
                      );
                    }
                  }
                });

                if (availabilityWarnings.length === 0) return null;

                return (
                  <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col gap-2 shadow-sm font-sans">
                    <div className="flex items-center gap-2 text-amber-800 font-black text-[10px] uppercase tracking-wider font-sans">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      Alertas de Conflitos e Carga Horária
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      {availabilityWarnings.map((warn, i) => (
                        <li key={i} className="text-xs font-bold text-slate-700 leading-normal font-sans">{warn}</li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {/* Advanced Search & Filtering Controls */}
              <div className="p-4 px-6 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  {/* Shift Selection tabs */}
                  <div className="flex bg-slate-200/60 p-1 rounded-xl items-center gap-1">
                    <button
                      id="btn-missing-classes-shift-all"
                      onClick={() => setMissingClassesShift('todos')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${missingClassesShift === 'todos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Todos
                    </button>
                    <button
                      id="btn-missing-classes-shift-manha"
                      onClick={() => setMissingClassesShift('manha')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${missingClassesShift === 'manha' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Manhã
                    </button>
                    <button
                      id="btn-missing-classes-shift-tarde"
                      onClick={() => setMissingClassesShift('tarde')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${missingClassesShift === 'tarde' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Tarde
                    </button>
                  </div>

                  {/* Toggle only pending */}
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
                    <input 
                      id="chk-missing-classes-only-pending"
                      type="checkbox"
                      checked={missingClassesOnlyPending}
                      onChange={e => setMissingClassesOnlyPending(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight select-none">
                      Mostrar apenas pendências
                    </span>
                  </label>
                </div>

                {/* Search Text Input */}
                <div className="relative w-full md:w-72">
                  <input
                    id="input-missing-classes-search"
                    type="text"
                    value={missingClassesSearch}
                    onChange={e => setMissingClassesSearch(e.target.value)}
                    placeholder="Buscar por turma ou disciplina..."
                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-800 transition-all shadow-sm"
                  />
                  {missingClassesSearch && (
                    <button 
                      id="btn-clear-missing-search"
                      onClick={() => setMissingClassesSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Main List Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20 custom-scrollbar">
                {(() => {
                  let filteredTurmas = turmas.filter(t => !t.isRoom);

                  // Apply shift filters
                  if (missingClassesShift === 'manha') {
                    filteredTurmas = filteredTurmas.filter(t => {
                      if (t.shift) return t.shift === 'manha';
                      return !t.name.toLowerCase().includes('tarde') && !t.id.toLowerCase().includes('tarde');
                    });
                  } else if (missingClassesShift === 'tarde') {
                    filteredTurmas = filteredTurmas.filter(t => {
                      if (t.shift) return t.shift === 'tarde';
                      return t.name.toLowerCase().includes('tarde') || t.id.toLowerCase().includes('tarde');
                    });
                  }

                  // Apply search term
                  if (missingClassesSearch.trim()) {
                    const searchLower = missingClassesSearch.toLowerCase();
                    filteredTurmas = filteredTurmas.filter(t => {
                      const matchesTurma = t.name.toLowerCase().includes(searchLower);
                      const matchesSubject = subjects.some(s => {
                        const hasThisSubject = getSubjectWorkloadsForTurma(s, t.id).workload > 0;
                        return hasThisSubject && s.name.toLowerCase().includes(searchLower);
                      });
                      return matchesTurma || matchesSubject;
                    });
                  }

                  // Apply Only Pending filter to classrooms list
                  if (missingClassesOnlyPending) {
                    filteredTurmas = filteredTurmas.filter(t => {
                      return subjects.some(s => {
                        const { usage, total } = getClassSubjectWorkload(t.id, s.id);
                        return total > 0 && usage < total;
                      });
                    });
                  }

                  if (filteredTurmas.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                        <span className="text-sm font-black text-slate-800 uppercase">Tudo em Ordem!</span>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm">
                          Nenhuma pendência encontrada com as opções selecionadas. Todas as turmas estão com a grade totalmente alocada!
                        </p>
                      </div>
                    );
                  }

                  // Sort turmas cleanly and render
                  return sortTurmasList(filteredTurmas).map(turma => {
                    // Let's compute statistics for this class
                    let classExpected = 0;
                    let classAllocated = 0;
                    
                    const classSubjects = subjects.map(s => {
                      const { usage, total, classroomUsage, labUsage } = getClassSubjectWorkload(turma.id, s.id);
                      const missingCount = Math.max(0, total - usage);
                      if (total > 0) {
                        classExpected += total;
                        classAllocated += usage;
                      }
                      return {
                        subject: s,
                        usage,
                        total,
                        classroomUsage,
                        labUsage,
                        missingCount
                      };
                    }).filter(item => item.total > 0);

                    // Sort subjects of class: place pending ones pointing on top!
                    const sortedClassSubjects = [...classSubjects]
                      .filter(item => {
                        if (missingClassesSearch.trim()) {
                          const sNameLower = item.subject.name.toLowerCase();
                          const tNameLower = turma.name.toLowerCase();
                          const searchLower = missingClassesSearch.toLowerCase();
                          return sNameLower.includes(searchLower) || tNameLower.includes(searchLower);
                        }
                        return true;
                      })
                      .filter(item => {
                        if (missingClassesOnlyPending) {
                          return item.missingCount > 0;
                        }
                        return true;
                      })
                      .sort((a,b) => {
                        if (a.missingCount > 0 && b.missingCount === 0) return -1;
                        if (a.missingCount === 0 && b.missingCount > 0) return 1;
                        return a.subject.name.localeCompare(b.subject.name);
                      });

                    const classMissing = Math.max(0, classExpected - classAllocated);
                    const classCompletionRate = classExpected > 0 ? Math.round((classAllocated / classExpected) * 100) : 0;

                    if (sortedClassSubjects.length === 0) return null;

                    return (
                      <div key={turma.id} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                        {/* Turma summary row */}
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-100 font-sans">
                          <div className="flex items-center gap-2">
                            <div className="min-w-[4.25rem] px-2 h-11 rounded-xl bg-slate-900 flex flex-col items-center justify-center text-white font-black shrink-0">
                              <span className="text-[11px] font-extrabold uppercase tracking-tight leading-none text-center whitespace-nowrap">{turma.name}</span>
                              <span className="text-[6.5px] font-bold uppercase tracking-widest text-slate-300 mt-1 font-sans">
                                {turma.shift === 'manha' ? 'MAN' : 'TAR'}
                              </span>
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-slate-800 uppercase font-sans leading-none">
                                Turma {turma.name}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-1 text-[8px] font-bold text-slate-400 uppercase tracking-wider font-sans leading-none">
                                <span>{turma.shift === 'manha' ? 'Período da Manhã' : 'Período da Tarde'}</span>
                                <span>•</span>
                                <span className={classMissing > 0 ? 'text-amber-600 font-black' : 'text-green-600'}>
                                  {classMissing > 0 ? `Faltam ${classMissing} aulas` : 'Grade Completa'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Class progress */}
                          <div className="flex flex-col w-full sm:w-36">
                            <div className="flex justify-between items-center text-[8px] font-black uppercase text-slate-500 mb-0.5">
                              <span>Distribuição</span>
                              <span>{classAllocated}/{classExpected} ({classCompletionRate}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${classCompletionRate === 100 ? 'bg-green-500' : 'bg-amber-500'}`}
                                style={{ width: `${classCompletionRate}%` }}
                              />
                            </div>
                          </div>

                          {/* Quick Jump Action Button */}
                          <button
                            id={`btn-goto-grid-${turma.id}`}
                            onClick={() => {
                              setSelectedTurmaId(turma.id);
                              setViewMode('turmas');
                              setIsShowingMissingClasses(false);
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-lg text-[9px] font-black text-slate-700 uppercase tracking-wider transition-all border border-transparent hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                          >
                            Ir para Grade
                          </button>
                        </div>

                        {/* Schedule detail cards inside this classroom */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                          {sortedClassSubjects.map(({ subject, usage, total, missingCount, classroomUsage, labUsage }) => {
                            const isPending = missingCount > 0;
                            return (
                              <div 
                                key={subject.id} 
                                className={`p-2 rounded-xl border transition-all flex flex-col justify-between ${
                                  isPending 
                                    ? 'bg-amber-50/40 border-amber-200/50 shadow-xs' 
                                    : 'bg-slate-50/50 border-slate-100 opacity-60'
                                }`}
                              >
                                <div>
                                  <div className="flex justify-between items-start gap-1 mb-1.5 flex-nowrap">
                                    <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-tight truncate block font-sans" title={subject.name}>
                                      {subject.name}
                                    </span>
                                    {isPending ? (
                                      <span className="text-[7px] font-black bg-amber-500 text-white rounded px-1 py-0.5 uppercase tracking-wide shrink-0">
                                        -{missingCount}a
                                      </span>
                                    ) : (
                                      <span className="text-[7px] font-black bg-green-100 text-green-700 rounded px-1 py-0.5 uppercase tracking-wide shrink-0">
                                        OK
                                      </span>
                                    )}
                                  </div>

                                  <div className="space-y-1">
                                    {/* Subject progress indicator */}
                                    <div className="flex justify-between text-[7.5px] font-bold text-slate-400 uppercase font-sans">
                                      <span>Alocado</span>
                                      <span>{usage}/{total}</span>
                                    </div>
                                    <div className="w-full bg-slate-200/60 rounded-full h-1 overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${isPending ? 'bg-amber-500' : 'bg-green-500'}`} 
                                        style={{ width: `${Math.min(100, (usage / total) * 100)}%` }}
                                      />
                                    </div>

                                    {/* Special Room Specific Counts */}
                                    {(subject.labWorkload !== undefined || subject.classWorkload !== undefined) && (
                                      <div className="flex items-center gap-1 text-[7px] text-slate-400 font-bold font-sans">
                                        <span>S: {classroomUsage}/{subject.classWorkload || 0}</span>
                                        <span>•</span>
                                        <span>L: {labUsage}/{subject.labWorkload || 0}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Arm and go to cell button */}
                                <button
                                  id={`btn-load-subject-${turma.id}-${subject.id}`}
                                  onClick={() => {
                                    setSelectedTurmaId(turma.id);
                                    setTempSubject(subject.id);
                                    setViewMode('turmas');
                                    setIsShowingMissingClasses(false);
                                  }}
                                  className="w-full mt-2 py-0.5 text-[8px] font-extrabold text-center uppercase tracking-wider text-[#657c36] hover:bg-[#657c36] hover:text-white border border-[#657c36]/20 bg-white hover:border-transparent rounded-md transition-all shadow-xs cursor-pointer font-sans"
                                >
                                  Carregar
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Modal Footer */}
              <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest gap-4">
                <span className="hidden sm:inline font-sans">Clique em "Ir para Grade" ou "Carregar Matéria" para começar a ajustar</span>
                <button
                  id="btn-close-missing-classes-footer"
                  onClick={() => setIsShowingMissingClasses(false)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md hover:scale-102 cursor-pointer ml-auto"
                >
                  Fechar janela
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auto-Schedule Generation Options Modal */}
      <AnimatePresence>
        {isAutoGenerateModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="flex justify-between items-center px-8 pt-8">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-6 h-6 text-emerald-600 animate-pulse" />
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                    Gerar Horários do Zero
                  </h3>
                </div>
                <button 
                  onClick={() => setIsAutoGenerateModalOpen(false)} 
                  className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-8 pt-4 space-y-6">
                <div className="text-xs text-slate-500 font-medium leading-relaxed font-sans">
                  O algoritmo inteligente organizará todas as aulas cadastradas de forma equilibrada, <span className="font-bold text-slate-700">respeitando a disponibilidade dos professores, cargas horárias e salas especiais</span>, garantindo zero duplicidades e choques de horário.
                </div>

                {/* Opções de Modo */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Modo de Geração</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAutoGenMode('all')}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${autoGenMode === 'all' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-990 font-bold' : 'border-slate-100 bg-slate-50 hover:border-slate-300 text-slate-600'}`}
                    >
                      <div className="text-xs font-black uppercase tracking-wider">Do Zero</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Limpa o quadro atual e distribui todas as aulas novamente.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAutoGenMode('empty')}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${autoGenMode === 'empty' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-990 font-bold' : 'border-slate-100 bg-slate-50 hover:border-slate-300 text-slate-600'}`}
                    >
                      <div className="text-xs font-black uppercase tracking-wider">Apenas Vazios</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Mantém as aulas decididas manualmente e preenche apenas os vazios.</div>
                    </button>
                  </div>
                </div>

                {/* Opções de Períodos/Turnos */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Foco de Geração</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAutoGenShift('both')}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${autoGenShift === 'both' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-990 font-bold font-sans' : 'border-slate-100 bg-slate-50 hover:border-slate-300 text-slate-600'}`}
                    >
                      <div className="text-xs font-black uppercase tracking-wider">Manhã e Tarde</div>
                      <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">Distribui aulas para ambos os turnos simultaneamente.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAutoGenShift('labs')}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${autoGenShift === 'labs' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-990 font-bold font-sans' : 'border-slate-100 bg-slate-50 hover:border-slate-300 text-slate-600'}`}
                    >
                      <div className="text-xs font-black uppercase tracking-wider text-indigo-700">Salas Especiais</div>
                      <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">Distribui somente as aulas agendadas em laboratórios e salas especiais.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAutoGenShift('manha')}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${autoGenShift === 'manha' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-990 font-bold font-sans' : 'border-slate-100 bg-slate-50 hover:border-slate-300 text-slate-600'}`}
                    >
                      <div className="text-xs font-black uppercase tracking-wider text-blue-600">Apenas Manhã</div>
                      <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">Gera horários apenas para as turmas do turno da manhã (períodos 1-6).</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAutoGenShift('tarde')}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${autoGenShift === 'tarde' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-990 font-bold font-sans' : 'border-slate-100 bg-slate-50 hover:border-slate-300 text-slate-600'}`}
                    >
                      <div className="text-xs font-black uppercase tracking-wider text-amber-600">Apenas Tarde</div>
                      <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">Gera horários apenas para as turmas do turno da tarde (períodos 7-12).</div>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={runAutoScheduling}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-600/20 active:translate-y-[1px] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Wand2 className="w-4 h-4 text-emerald-100" />
                    Iniciar Programação Inteligente
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auto-Schedule Results Modal */}
      <AnimatePresence>
        {isAutoGenerateResultsModalOpen && autoGenResults && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="bg-slate-50 p-6 px-8 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {autoGenResults.solved ? (
                    <Sparkles className="w-6 h-6 text-emerald-600 animate-bounce" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" />
                  )}
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight font-sans">
                    {autoGenResults.solved ? 'Sucesso absoluto!' : 'Geração Parcial Concluída'}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsAutoGenerateResultsModalOpen(false)} 
                  className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                {/* Alerta de erro de cadastro / pré-requisito se houver */}
                {autoGenResults.errors.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-red-800 text-xs font-black uppercase tracking-wider font-sans">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      Inconsistências Identificadas no Cadastro:
                    </div>
                    <ul className="list-disc pl-5 text-[10px] text-red-600 font-bold space-y-1 leading-relaxed font-sans">
                      {autoGenResults.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Métricas gerais */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-center items-center text-center">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-sans">Aulas Requeridas</div>
                    <div className="text-3xl font-black text-slate-900 font-mono">
                      {autoGenResults.scannedCount}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl border flex flex-col justify-center items-center text-center transition-all bg-emerald-50 border-emerald-100">
                    <div className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1 font-sans">Aulas Alocadas</div>
                    <div className="text-3xl font-black text-emerald-900 font-mono">
                      {autoGenResults.placedCount} <span className="text-xs font-semibold text-emerald-600 font-sans">({Math.round((autoGenResults.placedCount / (autoGenResults.scannedCount || 1)) * 100)}%)</span>
                    </div>
                  </div>
                </div>

                {/* Resultados explicativos */}
                <div className="text-xs text-slate-600 font-medium leading-relaxed font-sans">
                  {autoGenResults.solved ? (
                    <span>O sistema conseguiu encaixar <span className="text-emerald-700 font-bold">100% dos horários planejados</span> em um arranjo totalmente otimizado e livre de conflitos! Suas turmas e professores já estão devidamente escalados.</span>
                  ) : (
                    <span>
                      Devido a restrições complexas de disponibilidade de professores ou limitações de salas especiais, <span className="text-amber-700 font-extrabold">{autoGenResults.pending.length} grupo(s) de aulas</span> ficaram com alocações pendentes. Eles foram listados abaixo para que você possa encaixá-los manualmente na grade ajustando levemente as disponibilidades.
                    </span>
                  )}
                </div>

                {/* Tabela de Pendências */}
                {autoGenResults.pending.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">Lista de Aulas Pendentes ({autoGenResults.pending.length})</div>
                    <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                      <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-slate-50 border-b border-indigo-100/50 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                              <th className="py-2.5 px-4 font-sans">Turma</th>
                              <th className="py-2.5 px-4 font-sans">Matéria</th>
                              <th className="py-2.5 px-4 font-sans">Professor</th>
                              <th className="py-2.5 px-4 font-sans">Motivo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100/70 font-mono text-[9px] text-slate-700">
                            {autoGenResults.pending.map((item, i) => (
                              <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2 px-4 uppercase font-bold text-slate-800">{item.turmaName}</td>
                                <td className="py-2 px-4 text-slate-600">{item.subjectName}</td>
                                <td className="py-2 px-4 text-slate-600 truncate max-w-[120px]" title={item.teacherName}>{item.teacherName}</td>
                                <td className="py-2 px-4 text-amber-600 font-sans leading-tight">{item.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-[10px] font-medium leading-relaxed text-indigo-700 font-sans">
                  🔔 <span className="font-bold">Dica:</span> Caso queira forçar a alocação de alguma aula pendente, experimente desobrigar a disponibilidade facultativa do professor (permitindo-lhe lecionar em mais períodos) ou aumente as matérias compatíveis em uma sala especial!
                </div>

                {/* Footer buttons */}
                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => {
                      setIsAutoGenerateResultsModalOpen(false);
                      handleSave();
                    }}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:shadow-indigo-600/10 active:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4 text-indigo-100" />
                    Salvar Alterações na Grade
                  </button>
                  <button
                    onClick={() => setIsAutoGenerateResultsModalOpen(false)}
                    className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Help & Tutorial Modal */}
      <AnimatePresence>
        {isHelpModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] shadow-2xl overflow-hidden border-2 border-slate-900 flex flex-col"
            >
              {/* Header */}
              <div className="bg-amber-400 p-6 border-b-2 border-slate-900 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <HelpCircle className="w-6 h-6 text-slate-900" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider leading-none font-sans">
                      Central de Ajuda & Manual de Uso
                    </h3>
                    <p className="text-[10px] text-slate-800 font-bold uppercase tracking-wide mt-1 font-sans">
                      Aprenda a gerenciar, calibrar e gerar a grade horária ideal
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsHelpModalOpen(false)} 
                  className="p-2 bg-white rounded-full hover:bg-slate-50 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-0 active:translate-x-0 active:shadow-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body Content */}
              <div className="flex flex-1 overflow-hidden min-h-0 bg-slate-50">
                {/* Tabs Sidebar */}
                <div className="w-1/4 max-w-[240px] border-r-2 border-slate-100 bg-white p-4 space-y-1.5 overflow-y-auto shrink-0 custom-scrollbar">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-2 mb-2 font-sans">Tópicos do Manual</span>
                  
                  {[
                    { id: 'geral', label: '1. Visão Geral', icon: School },
                    { id: 'disciplinas', label: '2. Regras Curriculares', icon: BookOpen },
                    { id: 'professores', label: '3. Professores', icon: Users },
                    { id: 'turmas_salas', label: '4. Turmas & Salas', icon: Calendar },
                    { id: 'geracao', label: '5. Gerador Inteligente', icon: Sparkles },
                    { id: 'validacoes', label: '6. Diagnósticos', icon: AlertTriangle }
                  ].map(tab => {
                    const TabIcon = tab.icon;
                    const isActive = helpActiveTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setHelpActiveTab(tab.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-left transition-all border-2 cursor-pointer ${
                          isActive 
                            ? 'bg-slate-900 text-amber-400 border-slate-900 shadow-sm' 
                            : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <TabIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 overflow-y-auto bg-white custom-scrollbar">
                  {helpActiveTab === 'geral' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                        <School className="w-4 h-4 text-indigo-600 animate-bounce" />
                        1. Visão Geral do Sistema
                      </h4>
                      <div className="space-y-3 text-xs text-slate-600 font-sans leading-relaxed">
                        <p>
                          Bem-vindo ao sistema de <strong>Planejamento e Otimização Inteligente de Grade Horária</strong>. Esta aplicação foi estruturada especificamente para atender as exigências complexas de colégios, conciliando turmas de Ensino Fundamental II e Ensino Médio, restrições físicas de laboratórios e calendários flexíveis de professores.
                        </p>
                        <p>
                          A tela principal se divide em áreas fundamentais de uso dinâmico:
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5 font-sans">
                          <li><strong className="text-slate-900">Quadro de Horários Central:</strong> Exibe a grade real da turma ou sala especial selecionada. Cada dia contém aulas do turno correspondente (Manhã: períodos 1 a 6; Tarde: períodos 7 a 12).</li>
                          <li><strong className="text-slate-900">Seletores Extras na Barra Superior:</strong> Você pode alterar o Nome da Escola e a Logomarca clicando neles diretamente, facilitando a emissão de relatórios escolares impressos personalizados.</li>
                          <li><strong className="text-slate-900">Troca de Modos de Visualização:</strong> Exiba a grade consolidada por <strong>Turma</strong> ou mude para conferir o agendamento em <strong>Salas Especiais / Laboratórios</strong>.</li>
                          <li><strong className="text-slate-900">Controles de Exportação e Backup (Action Row inferior):</strong> Salve dados no navegador, importe um arquivo JSON salvando as modificações completas, exporte backups de segurança e imprima os quadros por turma com excelente qualidade gráfica.</li>
                        </ul>
                        <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-805 flex gap-2">
                          <Info className="w-4 h-4 mt-0.5 shrink-0 text-indigo-500" />
                          <div className="text-[11px] leading-relaxed">
                            <span className="font-bold uppercase tracking-wide block mb-0.5">🔔 DICA RÁPIDA DE USO:</span>
                            A grade salva automaticamente rascunhos no seu navegador. No entanto, para persistir de forma permanente ou compartilhar entre computadores, utilize sempre o botão <strong className="uppercase">Salvar Alterações</strong> no canto superior direito e faça o download do JSON de backup de tempos em tempos.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {helpActiveTab === 'disciplinas' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                        <BookOpen className="w-4 h-4 text-emerald-600 animate-bounce" />
                        2. Gerenciamento e Regras de Disciplinas
                      </h4>
                      <div className="space-y-3 text-xs text-slate-600 font-sans leading-relaxed">
                        <p>
                          O sistema possui um motor inteligente que impede o agendamento incorreto de matérias em séries ou turmas para as quais elas não foram criadas. Agora você pode parametrizar restrições com alta precisão ao adicionar ou editar qualquer disciplina:
                        </p>
                        
                        <div className="space-y-3.5">
                          {/* Item 1 */}
                          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                            <h5 className="font-bold text-slate-900 uppercase tracking-wide text-[10px] flex items-center gap-1.5 font-sans">
                              <div className="w-1.5 h-3 bg-blue-500 rounded-full"></div>
                              A. Restrição por Nível de Ensino (Médio vs Fundamental)
                            </h5>
                            <p className="text-[11px] text-slate-500 pl-3 leading-relaxed">
                              Configure se a matéria é de uso <strong className="text-slate-850">Geral (Ambos os níveis)</strong>, exclusivo para as séries do <strong className="text-slate-850">Ensino Fundamental II (6º ao 9º Ano)</strong> ou restrita ao <strong className="text-slate-850">Ensino Médio (1º ao 3º Ano)</strong>. 
                              <br />
                              <span className="text-amber-600 font-medium font-sans italic text-[10px]">* Regra rígida nativa:</span> Filosofia e Sociologia são bloqueadas para o Ensino Fundamental por padrão, evitando inclusões desatentas. Outras disciplinas customizadas respeitarão estritamente esta validação durante a geração automática ou manual.
                            </p>
                          </div>

                          {/* Item 2 */}
                          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                            <h5 className="font-bold text-slate-900 uppercase tracking-wide text-[10px] flex items-center gap-1.5 font-sans">
                              <div className="w-1.5 h-3 bg-amber-500 rounded-full"></div>
                              B. Filtro por Séries Específicas
                            </h5>
                            <p className="text-[11px] text-slate-500 pl-3 leading-relaxed">
                              Permite escrever as séries válidas separadas por vírgula (ex: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[9px] font-bold">6, 6º</code>). O sistema analisa o nome da turma para validar se a disciplina pertence àquela série curricular.
                              <br />
                              <span className="text-amber-600 font-medium font-sans italic text-[10px]">* Regra padrão:</span> O Ensino Religioso é nativamente restrito apenas a turmas com o termo "6", mas agora você pode aplicar essa mesma lógica a qualquer série ou disciplina nova que inserir no painel.
                            </p>
                          </div>

                          {/* Item 3 */}
                          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                            <h5 className="font-bold text-slate-900 uppercase tracking-wide text-[10px] flex items-center gap-1.5 font-sans">
                              <div className="w-1.5 h-3 bg-indigo-500 rounded-full"></div>
                              C. Restrição por Sufixo / Siglas do Nome de Turma
                            </h5>
                            <p className="text-[11px] text-slate-500 pl-3 leading-relaxed">
                              Ideal para itinerários formativos, trilhas de aprofundamento técnico ou disciplinas eletivas específicas. Digite siglas separadas por vírgula (como <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[9px] font-bold">B, Integral</code>).
                              <br />
                              <span className="text-amber-600 font-medium font-sans italic text-[10px]">* Exemplo Prático:</span> Matérias profissionalizantes como <strong>Marketing</strong> podem ser configuradas para só entrarem em turmas que possuam a sigla "B" no seu identificador. Se uma turma não tiver o sufixo cadastrado em seu nome (ex: "1º Ano A"), ela não receberá essa aula.
                            </p>
                          </div>

                          {/* Item 4 */}
                          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                            <h5 className="font-bold text-slate-900 uppercase tracking-wide text-[10px] flex items-center gap-1.5 font-sans">
                              <div className="w-1.5 h-3 bg-emerald-500 rounded-full"></div>
                              D. Vínculo Exclusivo de Whitelist (Checkboxes)
                            </h5>
                            <p className="text-[11px] text-slate-500 pl-3 leading-relaxed">
                              Caso queira um controle absoluto sobre quem terá a disciplina, você pode marcar diretamente na lista de caixas de seleção apenas as turmas válidas. Se marcar alguma turma ali, o filtro automático por série e sufixo é ignorado em prol desta sua escolha manual cirúrgica de turmas recomendadas.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {helpActiveTab === 'professores' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                        <Users className="w-4 h-4 text-indigo-600 animate-bounce" />
                        3. Cadastro de Professores e Disponibilidade
                      </h4>
                      <div className="space-y-3 text-xs text-slate-600 font-sans leading-relaxed">
                        <p>
                          Os professores guiam a alocação de tempos do colégio. Configurar corretamente a ficha de cada um garante que o robô de horários trabalhe em harmonia estrita:
                        </p>
                        
                        <ul className="list-disc pl-5 space-y-1.5 font-sans">
                          <li><strong>Múltiplas Disciplinas:</strong> Um professor de química também pode lecionar física ou matemática. Marque todas as aplicáveis no momento do cadastro do docente!</li>
                          <li><strong>Preferência de Geminação (Aulas Gêmeas):</strong> Se ativado, o sistema prefere alocar aulas desse professor seguidas (lado a lado na mesma turma), favorecendo o desenvolvimento contínuo do plano didático sem quebras.</li>
                          <li><strong>Vínculo de Turmas (Opcional):</strong> Caso o professor lecione somente a um grupo seleto de turmas, vincule-as para que ele não receba aulas de outras turmas acidentalmente. Se deixar vazio, ele estará habilitado a dar aula para todas as turmas que possuem disciplinas compatíveis.</li>
                        </ul>

                        <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-2">
                          <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider block font-sans">📆 Como Gerenciar a Grade de Disponibilidade:</span>
                          <p className="text-[11px] leading-relaxed font-sans">
                            A grade de disponibilidade de cada professor é exibida no cadastro de forma quadriculada para cada dia útil (segunda a sexta-feira).
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-sans">
                            <div className="flex items-center gap-2 p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl">
                              <div className="w-3 h-3 bg-emerald-500 rounded border border-emerald-700 shrink-0"></div>
                              <span><strong>Verde (Disponível):</strong> O professor está livre para receber aulas nestes períodos.</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-slate-100 text-slate-700 border border-slate-300 rounded-xl">
                              <div className="w-3 h-3 bg-slate-200 rounded border border-slate-400 shrink-0"></div>
                              <span><strong>Cinza (Bloqueado):</strong> Horário inválido (ex: o professor está em outro colégio ou de folga nestes períodos).</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium leading-normal italic pt-1 text-center font-sans">
                            * DICA: Clique em um quadrado cinza para torná-lo verde e vice-versa. Certifique-se de disponibilizar períodos suficientes para a carga horária que o professor precisa ministrar!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {helpActiveTab === 'turmas_salas' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                        <Calendar className="w-4 h-4 text-blue-600 animate-bounce" />
                        4. Cadastro de Turmas e Salas Especiais
                      </h4>
                      <div className="space-y-3 text-xs text-slate-600 font-sans leading-relaxed">
                        <p>
                          O cadastro correto de onde os alunos assistirão às aulas e como suas turmas estão identificadas é capital para a validação da grade de horários:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <span className="text-[10px] font-black text-indigo-700 uppercase block tracking-wider mb-1">A. Gestão de Turmas</span>
                            <p className="text-[11px] leading-relaxed">
                              Cada turma representa uma classe (Ex: <strong>6º Ano A</strong>, <strong>1º Ano E.M. B</strong>).
                              Ao cadastrar ou editar uma turma, você especifica seu <strong>Turno</strong> oficial:
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-[10px] mt-1.5 text-slate-500">
                              <li><strong>Manhã:</strong> Aulas alocadas nos períodos de 1 a 6.</li>
                              <li><strong>Tarde:</strong> Aulas alocadas nos períodos de 7 a 12.</li>
                              <li><strong>Ambos os turnos:</strong> Pode receber aulas em qualquer um dos 12 períodos do dia se houver necessidade.</li>
                            </ul>
                          </div>

                          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <span className="text-[10px] font-black text-purple-700 uppercase block tracking-wider mb-1 font-sans">B. Salas Especiais e Laboratórios</span>
                            <p className="text-[11px] leading-relaxed">
                              Útil para agendar o uso rotativo de estruturas compartilhadas, tais como:
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-[10px] mt-1.5 text-slate-500 font-sans">
                              <li>Laboratório de Informática (Lab Comp)</li>
                              <li>Carrinho de Chromebooks / Tablets (Lab Tab)</li>
                              <li>Sala Especial de Matemática (Sala Mat)</li>
                            </ul>
                            <p className="text-[10px] mt-2 leading-relaxed text-slate-500 border-t border-slate-200/60 pt-1.5 font-medium">
                              Ao desenhar Disciplinas, você aponta se elas <strong>restringem ou requerem</strong> o agendamento em algum desses laboratórios/salas. O sistema então cuida para que duas turmas diferentes não fiquem alocadas no mesmo laboratório no mesmo momento!
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {helpActiveTab === 'geracao' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                        <Sparkles className="w-4 h-4 text-emerald-600 animate-bounce" />
                        5. Motor de Geração Automática
                      </h4>
                      <div className="space-y-3 text-xs text-slate-600 font-sans leading-relaxed">
                        <p>
                          O grande trunfo do sistema reside em seu gerador inteligente. Ele calcula centenas de combinações em milissegundos para propor a melhor grade de aulas possível.
                        </p>
                        
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                          <span className="text-[10px] font-black text-amber-900 uppercase block tracking-wider mb-1 font-sans">Engrenagens da Ferramenta de IA:</span>
                          <p className="text-[11px] leading-relaxed">
                            Ao clicar em <strong className="uppercase">Gerar Automaticamente</strong> no menu superior, você verá um painel com parâmetros de refinamento:
                          </p>
                          <ul className="list-disc pl-5 mt-2 space-y-1.5 text-[11px] text-slate-700">
                            <li><strong className="text-slate-900">Modo "Do Zero":</strong> Limpa completamente a grade do colégio inteiro e faz uma nova organização ideal a nível global.</li>
                            <li><strong className="text-slate-900">Modo "Apenas Vazios":</strong> Preserva as aulas que você inseriu manualmente na grade, agendando de forma inteligente somente as pendentes nos espaços em branco.</li>
                            <li><strong className="text-slate-900">Filtro por Turnos:</strong> Permite escolher processar e organizar apenas as turmas da manhã, apenas as turmas da tarde ou ambas juntas de uma vez.</li>
                            <li><strong className="text-slate-900">Otimizar Apenas Laboratórios/Salas:</strong> Roda o algoritmo de inteligência focando estritamente na distribuição de uso eficaz dos laboratórios de informática, tablets e demais recursos de sala especial compartilhados!</li>
                          </ul>
                        </div>

                        <p className="text-[10px] text-slate-400 font-sans italic leading-normal">
                          * Nota: Se o algoritmo sinalizar que não conseguiu alocar certas matérias, ele exibirá uma listagem detalhada apontando exatamente o motivo no final da execução (geralmente choque de disponibilidade do docente ou falta de salas livres).
                        </p>
                      </div>
                    </div>
                  )}

                  {helpActiveTab === 'validacoes' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 animate-bounce" />
                        6. Diagnósticos de Grade, Conflitos e Aulas Faltantes
                      </h4>
                      <div className="space-y-3 text-xs text-slate-600 font-sans leading-relaxed">
                        <p>
                          Para garantir a segurança acadêmica do seu planejamento escolar, incluímos um sistema avançado de alertas em tempo real. Ele avisa instantaneamente sempre que houver inconsistências na sua montagem manual:
                        </p>

                        <div className="space-y-3.5 font-sans text-xs">
                          {/* Alerta 1 */}
                          <div className="flex gap-3 p-3 bg-red-50 border border-red-100 rounded-2xl text-red-800">
                            <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                            <div>
                              <strong className="text-[10px] font-black uppercase tracking-wide block mb-0.5 font-sans">Disponibilidade Estrita do Professor:</strong>
                              Caso você tente arrastar um professor para lecionar em um horário que ele marcou como indisponível (cinza) no seu cadastro, o sistema irá bloquear e exibir um alerta, mantendo a integridade dos acordos trabalhistas do seu docente.
                            </div>
                          </div>

                          {/* Alerta 2 */}
                          <div className="flex gap-3 p-3 bg-amber-50 border border-amber-100 rounded-2xl text-amber-805">
                            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                            <div>
                              <strong className="text-[10px] font-black uppercase tracking-wide block mb-0.5 font-sans">Estouro de Carga Horária Exigida:</strong>
                              O monitoramento do dashboard emitirá avisos se a soma das aulas alocadas para uma disciplina na grade horária superar a carga total definida por matriz curricular.
                            </div>
                          </div>

                          {/* Alerta 3 */}
                          <div className="flex gap-3 p-3 bg-indigo-50 border border-indigo-150 rounded-2xl text-indigo-805">
                            <Info className="w-5 h-5 shrink-0 text-indigo-500 mt-0.5" />
                            <div>
                              <strong className="text-[10px] font-black uppercase tracking-wide block mb-0.5 font-sans">Módulo "Aulas Faltantes":</strong>
                              Clique no botão <strong className="uppercase">Aulas Faltantes</strong> na barra superior a qualquer momento. Ele abre uma tabela interativa que exibe, disciplina por disciplina e turma por turma, quantas aulas ainda faltam para atingir a conformidade requerida do plano de ensino.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 p-4 border-t-2 border-slate-900 flex justify-between items-center shrink-0">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">
                  SISTEMA DE GESTÃO ESCOLAR INTEGRADA COGNITIVA
                </span>
                <button
                  onClick={() => setIsHelpModalOpen(false)}
                  className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-0 active:translate-x-0 active:shadow-none"
                >
                  Entendi, fechar tutorial!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
