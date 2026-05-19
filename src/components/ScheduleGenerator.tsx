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
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Teacher {
  id: string;
  name: string;
  subjectIds: string[]; // Alterado para suportar múltiplas disciplinas
  availability?: string[]; // Array de slotIds selecionados como DISPONÍVEIS ("seg-1", "ter-6", etc)
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

export default function ScheduleGenerator() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [schedules, setSchedules] = useState<AllSchedules>({});
  const [version, setVersion] = useState<number>(10);
  const [logoUrl, setLogoUrl] = useState<string>('http://lucasleniar.com.br/mint/civico.png');
  const [showLogoInput, setShowLogoInput] = useState(false);
  const [tempLogoUrl, setTempLogoUrl] = useState('');
  
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'turmas' | 'rooms'>('turmas');
  const [importShift, setImportShift] = useState<'manha' | 'tarde'>('manha');
  
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherSubjectIds, setNewTeacherSubjectIds] = useState<string[]>([]);
  const [newTeacherAvailability, setNewTeacherAvailability] = useState<string[]>([]);
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
  
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [tempTeacher, setTempTeacher] = useState('');
  const [tempSubject, setTempSubject] = useState('');
  const [tempAssociatedTurmaId, setTempAssociatedTurmaId] = useState('');
  const [slotError, setSlotError] = useState<string | null>(null);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);

  const [isSaved, setIsSaved] = useState(false);

  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [isAddingTurma, setIsAddingTurma] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomColor, setNewRoomColor] = useState('#6366f1');
  const [isPrintingTurmaSelection, setIsPrintingTurmaSelection] = useState(false);
  const [isClearingSelection, setIsClearingSelection] = useState(false);
  const [newTurmaName, setNewTurmaName] = useState('');
  const [newTurmaShift, setNewTurmaShift] = useState<'manha' | 'tarde'>('manha');
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
      const isNamedTarde = t.name.toLowerCase().includes('tarde');
      return importShift === 'manha' ? !isNamedTarde : isNamedTarde;
    })
  );

  // Initialize version and logo on mount
  useEffect(() => {
    const savedLogo = localStorage.getItem('cecm_logo_url');
    if (savedLogo) setLogoUrl(savedLogo);
    
    const savedVersion = localStorage.getItem('cecm_version');
    if (savedVersion) setVersion(parseInt(savedVersion));

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddingTeacher(false);
        setIsAddingRoom(false);
        setIsAddingSubject(false);
        setIsAddingTurma(false);
        setIsPrintingTurmaSelection(false);
        setIsClearingSelection(false);
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
      
      const savedVersion = localStorage.getItem('cecm_version');
      if (savedVersion) setVersion(parseInt(savedVersion));

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

        if (updated) {
          localStorage.setItem('cecm_turmas', JSON.stringify(parsedTurmas));
        }

        setTurmas(parsedTurmas);
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
          shift: 'manha'
        }));
        const initialTurmas = [...specialRooms, ...defaultTurmas];
        setTurmas(initialTurmas);
        localStorage.setItem('cecm_turmas', JSON.stringify(initialTurmas));
        if (initialTurmas.length > 0) setSelectedTurmaId(initialTurmas[0].id);
      }
      
      if (savedSchedules) setSchedules(JSON.parse(savedSchedules));
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
  }, [teachers, subjects, turmas, schedules, version, logoUrl]);

  // Backup functions
  const handleExportData = () => {
    const data = {
      teachers,
      subjects,
      turmas,
      schedules,
      version,
      logoUrl,
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
                  color: t.color || (t.id === ID_LAB_INFO_COMP ? '#9333ea' : t.id === ID_LAB_INFO_TAB ? '#2563eb' : '#f97316') 
                };
              }
              return t;
            });

            const specialRooms = [
              { id: ID_LAB_INFO_COMP, name: 'LABORATÓRIO 1', shift: 'ambos', isRoom: true, color: '#9333ea' },
              { id: ID_LAB_INFO_TAB, name: 'LABORATÓRIO 2', shift: 'ambos', isRoom: true, color: '#2563eb' },
              { id: ID_SALA_MAT, name: 'SALA DE MATEMÁTICA', shift: 'ambos', isRoom: true, color: '#f97316' }
            ];
            
            specialRooms.forEach(room => {
              if (!importedTurmas.find((t: any) => t.id === room.id)) {
                importedTurmas.push(room);
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
            setVersion(prev => (data.version || prev) + 1);
            
            if (importedTurmas.length > 0) {
              setSelectedTurmaId(importedTurmas[0].id);
              const firstTurma = importedTurmas[0];
              if (firstTurma.shift) {
                setImportShift(firstTurma.shift);
              } else if (firstTurma.name?.toLowerCase().includes('tarde')) {
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

  const incrementVersion = () => setVersion(v => v + 1);

  const handleSave = async () => {
    incrementVersion();
    localStorage.setItem('cecm_teachers', JSON.stringify(teachers));
    localStorage.setItem('cecm_subjects', JSON.stringify(subjects));
    localStorage.setItem('cecm_turmas', JSON.stringify(turmas));
    localStorage.setItem('cecm_schedules', JSON.stringify(schedules));
    localStorage.setItem('cecm_logo_url', logoUrl);
    
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
        ? { ...t, name: newTeacherName, subjectIds: newTeacherSubjectIds, availability: newTeacherAvailability } 
        : t
      ));
      setEditingTeacherId(null);
    } else {
      const newTeacher: Teacher = { 
        id: generateId(), 
        name: newTeacherName,
        subjectIds: newTeacherSubjectIds,
        availability: newTeacherAvailability
      };
      setTeachers([...teachers, newTeacher]);
    }
    
    incrementVersion();
    setNewTeacherName('');
    setNewTeacherSubjectIds([]);
    setNewTeacherAvailability([]);
  };

  const startEditTeacher = (teacher: Teacher) => {
    setEditingTeacherId(teacher.id);
    setNewTeacherName(teacher.name);
    setNewTeacherSubjectIds(teacher.subjectIds || []);
    setNewTeacherAvailability(teacher.availability || []);
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
      customWorkloads: newSubjectCustomWorkloads
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
    
    // Validação de duplicidade de nome
    const nameExists = turmas.some(t => 
      !t.isRoom &&
      t.name.trim().toLowerCase() === newTurmaName.trim().toLowerCase() && 
      t.id !== editingTurmaId
    );

    if (nameExists) {
      alert(`Erro: Já existe uma turma cadastrada com o nome "${newTurmaName}".`);
      return;
    }

    if (editingTurmaId) {
      const oldTurma = turmas.find(t => t.id === editingTurmaId);
      const shiftChanged = oldTurma && oldTurma.shift !== newTurmaShift;
      
      setTurmas(prev => prev.map(t => t.id === editingTurmaId 
        ? { ...t, name: newTurmaName, shift: newTurmaShift } 
        : t
      ));

      if (shiftChanged) {
        setSchedules(prev => {
          const next = { ...prev };
          if (next[editingTurmaId]) {
            next[editingTurmaId] = remapScheduleIfNecessary({ id: editingTurmaId, shift: newTurmaShift } as Turma, next[editingTurmaId]);
          }
          return next;
        });
      }
      setEditingTurmaId(null);
    } else {
      const newTurma = { 
        id: generateId(), 
        name: newTurmaName,
        shift: newTurmaShift
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

  const handleSlotClick = (dayId: string, periodId: number, turmaId: string) => {
    setSelectedTurmaId(turmaId);
    const slotId = `${dayId}-${periodId}`;
    const currentSchedule = schedules[turmaId] || {};
    setSelectedSlot(slotId);
    setTempTeacher(currentSchedule[slotId]?.teacherId || '');
    setTempSubject(currentSchedule[slotId]?.subjectId || '');
    setTempAssociatedTurmaId(currentSchedule[slotId]?.associatedTurmaId || '');
    setSlotError(null);
    setShowAllSubjectsInRoom(false); // Reset when opening modal
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
      // Workload Validation
      const subject = subjects.find(s => s.id === tempSubject);
      if (subject) {
        const usage = getWorkloadUsage(tempSubject);
        const currentSlotData = (schedules[selectedTurmaId] || {})[selectedSlot] as ScheduleSlot;
        
        const isEditingSame = currentSlotData?.subjectId === tempSubject && 
                              (viewMode === 'rooms' ? currentSlotData?.associatedTurmaId === tempAssociatedTurmaId : true);

        if (!isEditingSame) {
          if (viewMode === 'turmas') {
            // Classroom assignment
            if (usage.classroomUsage >= usage.classroomTotal) {
              setSlotError(`Limite de aulas em SALA atingido para ${subject.name} (${usage.classroomTotal} aulas). Verifique a configuração da carga horária desta disciplina.`);
              return;
            }
          } else {
            // Lab assignment
            if (usage.labUsage >= usage.labTotal) {
              setSlotError(`Limite de aulas em LABORATÓRIO/ESPECIAL atingido para ${subject.name} (${usage.labUsage}/${usage.labTotal} aulas). Você precisa aumentar a 'Carga em Lab' nas configurações da disciplina.`);
              return;
            }
          }

          if (usage.usage >= usage.total) {
            setSlotError(`Limite TOTAL de carga horária atingido para ${subject.name} (Máximo ${usage.total} aulas semanais).`);
            return;
          }
        }
      }
    }

    currentSchedule[selectedSlot] = { 
      teacherId: tempTeacher, 
      subjectId: tempSubject,
        associatedTurmaId: viewMode === 'rooms' ? tempAssociatedTurmaId : undefined
      };

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

    const custom = subject.customWorkloads?.[actualTurmaId];
    const total = custom ? custom.workload : subject.workload;
    const cTotal = custom ? custom.classWorkload : (subject.classWorkload || 0);
    const lTotal = custom ? custom.labWorkload : (subject.labWorkload || 0);

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
    const shift = turma.shift || (turma.name.toLowerCase().includes('tarde') ? 'tarde' : 'manha');
    const currentPeriods = shift === 'manha' ? PERIODS_MANHA : PERIODS_TARDE;
    const timeRangesManha = ["7h30 às 8h20", "8h20 às 9h10", "9h10 às 10h", "10h20 às 11h10", "11h10 às 12h", "12h às 12h50"];
    const timeRangesTarde = ["13h às 13h50", "13h50 às 14h40", "14h40 às 15h30", "15h50 às 16h40", "16h40 às 17h30", "17h30 às 18h20"];
    const currentTimeRanges = shift === 'manha' ? timeRangesManha : timeRangesTarde;

    const html = `
      <div class="print-container">
        <div class="print-header">
          <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 5px;">
            ${logoUrl ? `<img src="${logoUrl}" style="height: 40px; width: auto; object-fit: contain;" referrerpolicy="no-referrer" />` : ''}
            <div style="text-align: left;">
              <h1 style="font-size: 10pt; margin: 0; font-weight: 800; line-height: 1.2;">COLÉGIO ESTADUAL CÍVICO-MILITAR GREGÓRIO SZEREMETA - EFMP</h1>
              <h2 style="font-size: 8.5pt; margin: 2px 0; color: #1e293b; font-weight: 700;">HORÁRIO DE AULAS - TURMA: ${turma.name} (${shift === 'manha' ? 'MANHÃ' : 'TARDE'})</h2>
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
                      <tr class="interval-row">
                        <td colspan="2" class="p-time-cell" style="background: #f8fafc; font-weight: 800; font-size: 6.5pt; color: #64748b;">${shift === 'manha' ? '10h às 10h20' : '15h30 às 15h50'}</td>
                        <td class="slot-cell" style="background: #f8fafc; text-align: center; font-weight: 800; font-size: 7.5pt; letter-spacing: 0.15em; color: #94a3b8;">INTERVALO</td>
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
              - Versão ${version} - ${new Date().toLocaleDateString('pt-BR')} - ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div style="font-size: 5.5pt; color: #2563eb; font-weight: 800; letter-spacing: 0.1em; margin-top: 1px;">www.LucasLeniar.com.br</div>
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
        <div style="margin-bottom: 0px; page-break-after: always; width: 100%; box-sizing: border-box;">
          <!-- Cabeçalho em todas as páginas -->
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 4px; border-bottom: 1pt solid black; padding-bottom: 3px;">
            ${logoUrl ? `<img src="${logoUrl}" style="height: 32px; width: auto; object-fit: contain;" referrerpolicy="no-referrer" />` : ''}
            <div style="text-align: center;">
              <h1 style="margin: 0; font-size: 9pt; font-weight: 800; text-transform: uppercase;">COLÉGIO ESTADUAL CÍVICO-MILITAR GREGÓRIO SZEREMETA</h1>
              <h2 style="margin: 0; font-size: 7.5pt; font-weight: 700; color: #334155;">CRONOGRAMA DE SALAS ESPECIAIS (LABORATÓRIOS E SALA DE MATEMÁTICA)</h2>
            </div>
          </div>

          <h2 style="background: #0f172a; color: white; text-align: center; padding: 2px; margin: 0; font-size: 8pt; font-weight: 800; text-transform: uppercase;">PERÍODO: ${shift === 'manha' ? 'MANHÃ' : 'TARDE'}</h2>
          
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed; border: 1pt solid black;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="border: 0.1pt solid black; width: 24px; font-size: 5.5pt; padding: 1px;">DIA</th>
                <th style="border: 0.1pt solid black; width: 24px; font-size: 5.5pt; padding: 0.5px;">AULA</th>
                <th style="border: 0.1pt solid black; width: 45px; font-size: 5.5pt; padding: 0.5px;">HORÁRIO</th>
                ${specialRooms.map(room => `
                  <th style="border: 0.1pt solid black; font-size: 6.5pt; padding: 1px 0.5px; text-transform: uppercase; background-color: ${room.color || '#6366f1'} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: white; font-weight: 800; line-height: 1;">${room.name}</th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${DAYS.map(day => periods.map((pId, pIdx) => {
                const slotId = `${day.id}-${pId}`;
                return `
                  <tr style="${pIdx === 5 ? 'border-bottom: 1.5pt solid black;' : ''}">
                    ${pIdx === 0 ? `<td rowspan="7" style="border: 0.1pt solid black; background-color: #0f172a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: white; text-align: center; font-weight: 800; font-size: 6pt; width: 24px;"><span style="display: block; writing-mode: vertical-lr; transform: rotate(180deg); margin: 0 auto; letter-spacing: 0.05em;">${day.label}</span></td>` : ''}
                    <td style="border: 0.1pt solid black; text-align: center; font-size: 6.5pt; font-weight: 800; background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; height: 14pt;">${pIdx + 1}º</td>
                    <td style="border: 0.1pt solid black; text-align: center; font-size: 5.5pt; color: #64748b; font-weight: 600;">${timeRanges[pIdx]}</td>
                    ${specialRooms.map(room => {
                      const slot = schedules[room.id]?.[slotId];
                      const teacher = teachers.find(t => t.id === slot?.teacherId);
                      const subject = subjects.find(s => s.id === slot?.subjectId);
                      const turma = turmas.find(t => t.id === slot?.associatedTurmaId);

                      return `
                        <td style="border: 0.1pt solid black; padding: 1px 2px; height: 14pt; vertical-align: middle; font-size: 6.5pt; text-align: left; overflow: hidden; white-space: nowrap;">
                          ${teacher ? `
                            <div style="font-weight: 800; line-height: 1.1; font-size: 6.5pt; overflow: hidden; text-overflow: ellipsis;">${teacher.name}</div>
                            <div style="font-weight: 700; color: #000; font-size: 5.5pt; text-transform: uppercase; border-left: 1pt solid #cbd5e1; padding-left: 2px; margin-top: 0px; overflow: hidden; text-overflow: ellipsis;">
                              ${turma?.name || ''} ${subject ? `<span style="font-weight: 400; color: #475569; font-size: 5.5pt; text-transform: none;">- ${subject.name}</span>` : ''}
                            </div>
                          ` : ''}
                        </td>
                      `;
                    }).join('')}
                  </tr>
                  ${pIdx === 2 ? `
                    <tr style="height: 11pt; background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                      <td colspan="2" style="border: 0.1pt solid black; text-align: center; font-size: 6pt; font-weight: 800; color: #64748b;">${shift === 'manha' ? '10:00 - 10:20' : '15:30 - 15:50'}</td>
                      <td colspan="${specialRooms.length + 1}" style="border: 0.1pt solid black; text-align: center; font-size: 7.5pt; font-weight: 800; color: #94a3b8; letter-spacing: 0.8em; text-transform: uppercase; padding: 0;">INTERVALO</td>
                    </tr>
                  ` : ''}
                `;
              }).join('')).join('')}
            </tbody>
          </table>
          
          <div style="display: flex; flex-direction: column; align-items: center; gap: 0px; margin-top: 3px;">
             <div style="font-weight: 800; font-size: 6.5pt; color: #0f172a;">
               Sistema feito por: Prof. Lucas Mercer Leniar
               <span style="font-size: 5.5pt; color: #64748b; font-weight: normal; margin-left: 6px;">
                 - Versão ${version} - ${new Date().toLocaleDateString('pt-BR')} - ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
               </span>
             </div>
             <div style="font-size: 5pt; color: #2563eb; font-weight: 800; letter-spacing: 0.1em; margin-top: 0px;">www.LucasLeniar.com.br</div>
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
              @page { size: A4 landscape; margin: 7mm; }
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
              table { border-collapse: collapse; }
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
    const manhaTurmas = sortTurmasList(filteredTurmas.filter(t => t.shift === 'manha' || (!t.shift && !t.name.toLowerCase().includes('tarde'))));
    const tardeTurmas = sortTurmasList(filteredTurmas.filter(t => t.shift === 'tarde' || (!t.shift && t.name.toLowerCase().includes('tarde'))));
    
    const generateScheduleTable = (shiftTurmas: Turma[], shift: 'manha' | 'tarde') => {
      if (shiftTurmas.length === 0) return '';
      
      const currentPeriods = shift === 'manha' ? PERIODS_MANHA : PERIODS_TARDE;
      const timeRangesManha = ["7h30-8h20", "8h20-9h10", "9h10-10h", "10h20-11h10", "11h10-12h", "12h-12h50"];
      const timeRangesTarde = ["13h-13h50", "13h50-14h40", "14h40-15h30", "15h50-16h40", "16h40-17h30", "17h30-18h20"];
      const currentTimeRanges = shift === 'manha' ? timeRangesManha : timeRangesTarde;

      return `
        <div class="print-container" style="page-break-after: always; break-after: page;">
          <div class="print-header">
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 2px;">
              ${logoUrl ? `<img src="${logoUrl}" style="height: 32px; width: auto; object-fit: contain;" referrerpolicy="no-referrer" />` : ''}
              <div style="text-align: center;">
                <h1 style="font-size: 8.5pt; margin: 0; font-weight: 800; text-transform: uppercase;">COLÉGIO ESTADUAL CÍVICO-MILITAR GREGÓRIO SZEREMETA</h1>
                <h2 style="font-size: 7.5pt; margin: 0; font-weight: 700; color: #1e293b;">HORÁRIO DAS TURMAS - PERÍODO: ${shift === 'manha' ? 'MANHÃ' : 'TARDE'}</h2>
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
                        <tr class="interval-row">
                          ${shiftTurmas.map(() => `<td class="slot-cell" style="background: #f8fafc; text-align: center; font-size: 5pt; font-weight: 800; color: #94a3b8;">INTERVALO</td>`).join('')}
                          <td class="time-info" style="background: #f1f5f9; padding: 0;">
                            <span class="p-time" style="font-size: 4pt; font-weight: 800; color: #64748b;">${shift === 'manha' ? '10h-10h20' : '15h30-15h50'}</span>
                          </td>
                        </tr>
                      ` : ''}
                    `;
                  }).join('');
                }).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="print-footer" style="display: flex; flex-direction: column; align-items: center; gap: 0px; margin-top: 3px;">
            <div style="font-weight: 800; font-size: 7pt; color: #0f172a;">
              Sistema feito por: Prof. Lucas Mercer Leniar
              <span style="font-size: 5.5pt; color: #64748b; font-weight: normal; margin-left: 8px;">
                - Versão ${version} - ${new Date().toLocaleDateString('pt-BR')} - ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div style="font-size: 5pt; color: #2563eb; font-weight: 800; letter-spacing: 0.1em; margin-top: 1px;">www.LucasLeniar.com.br</div>
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
                margin: 7mm; 
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
                height: 200mm;
                display: flex;
                flex-direction: column;
                padding-bottom: 2mm;
              }
              
              .print-header { text-align: center; margin-bottom: 2px; }
              
              .table-wrapper {
                flex: 1;
                width: 100%;
                overflow: hidden;
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
              .time-header { width: 45px; font-size: 5.5pt; font-weight: 800; background-color: #f1f5f9; }
              
              .turma-header { 
                background-color: #e2e8f0; 
                font-size: 5.5pt; 
                font-weight: 800; 
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
                font-size: 5pt; 
                font-weight: 900; 
                text-transform: uppercase;
                margin: 0 auto;
              }
              
              .slot-cell { 
                overflow: hidden;
                height: 16pt; 
                line-height: 1.1;
              }
              
              .subj-name { 
                font-size: 6pt; 
                font-weight: 800; 
                color: black; 
                text-transform: uppercase;
                line-height: 1.1;
                white-space: nowrap;
                overflow: hidden;
              }
              
              .prof-name { 
                font-size: 5.5pt; 
                color: black; 
                line-height: 1;
                white-space: nowrap;
                overflow: hidden;
              }
              
              .time-info { 
                background-color: #f8fafc;
                line-height: 1;
                height: 16pt;
              }
              .p-num { display: block; font-size: 6.5pt; font-weight: 700; color: #2563eb; }
              .p-time { display: block; font-size: 5pt; font-weight: 400; color: #64748b; }
              
              .print-footer {
                margin-top: 2px;
                text-align: right;
                font-size: 6.5pt;
                color: black;
                font-weight: 600;
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
                height: 285mm;
                display: flex; 
                flex-direction: column; 
              }
              .print-header { text-align: center; margin-bottom: 4px; border-bottom: 1.2pt solid black; padding-bottom: 2px; }
              .print-header h1 { font-size: 10pt; margin: 0; font-weight: 800; }
              .print-header h2 { font-size: 8.5pt; margin: 1px 0; color: #1e293b; font-weight: 700; }
              .table-wrapper { border: 0.8pt solid black; margin-top: 2px; flex: 1; overflow: hidden; }
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
              .print-footer { margin-top: 3px; text-align: right; font-size: 6.5pt; color: black; font-weight: 600; }
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
                CECM Gregório Szeremeta • v{version}
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

          <div className="flex items-center gap-3">
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

            <button 
              onClick={handleSave}
              className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[0px] active:translate-y-[0px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                isSaved ? 'bg-green-500 text-white border-green-700' : 'bg-indigo-600 text-white border-indigo-900'
              }`}
            >
              {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {isSaved ? 'Gravado!' : 'Salvar Alterações'}
            </button>
          </div>
        </div>

        {/* Action Row: Cadastros, Impressão & Backup */}
        <div className="flex flex-wrap items-center justify-between p-2 px-4 bg-slate-50/50 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Cadastros:</span>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setIsAddingTurma(true)}
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
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">CECM Gregório Szeremeta</p>
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
             <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">CECM Gregório Szeremeta</p>
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
                        } else if (teachers.length === 1) {
                          setTempTeacher(teachers[0].id);
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
                    }}
                    className={`w-full px-4 py-3 border-2 rounded-xl text-xs font-bold transition-all focus:outline-none ${
                      getConflicts(selectedSlot.split('-')[0], parseInt(selectedSlot.split('-')[1]), tempTeacher, selectedTurmaId).length > 0
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-[#657c36]'
                    }`}
                  >
                    <option value="">Selecionar Professor</option>
                    {viewMode === 'turmas' ? (
                      <>
                        {/* First, show linked teachers */}
                        {teachers.filter(t => !tempSubject || t.subjectIds.includes(tempSubject)).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                        
                        {/* Then, if a subject is selected, show others in a group */}
                        {tempSubject && teachers.filter(t => !t.subjectIds.includes(tempSubject)).length > 0 && (
                          <optgroup label="Outros Professores (Não vinculados a esta disciplina)">
                            {teachers
                              .filter(t => !t.subjectIds.includes(tempSubject))
                              .map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                          </optgroup>
                        )}
                      </>
                    ) : (
                      teachers.sort((a,b) => a.name.localeCompare(b.name)).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))
                    )}
                    
                    {/* If no subject is selected, just show all (already handled by first filter) */}
                  </select>
                  
                  {getConflicts(selectedSlot.split('-')[0], parseInt(selectedSlot.split('-')[1]), tempTeacher, selectedTurmaId).length > 0 && (
                    <div className="p-2 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-3 h-3 text-red-500 shadow-sm" />
                      <p className="text-[9px] font-bold text-red-600 leading-tight">
                        {getConflicts(selectedSlot.split('-')[0], parseInt(selectedSlot.split('-')[1]), tempTeacher, selectedTurmaId).includes('INDISPONÍVEL')
                          ? "ESTE PROFESSOR NÃO ESTÁ DISPONÍVEL NESTES HORÁRIOS!"
                          : `PROFESSOR JÁ ESTÁ EM: ${getConflicts(selectedSlot.split('-')[0], parseInt(selectedSlot.split('-')[1]), tempTeacher, selectedTurmaId).join(', ')}`}
                      </p>
                    </div>
                  )}
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
                      <option value="manha">Período: Manhã</option>
                      <option value="tarde">Período: Tarde</option>
                    </select>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {sortTurmasList(turmas.filter(t => !t.isRoom)).map(turma => (
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
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {teacherSubjects.map(s => (
                                  <span key={s.id} className="text-[8px] font-black bg-[#657c36]/10 text-[#657c36] px-1.5 py-0.5 rounded uppercase">{s.name}</span>
                                ))}
                                {teacherSubjects.length === 0 && <span className="text-[8px] font-bold text-slate-400">Sem disciplina vinculada</span>}
                              </div>
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
      </AnimatePresence>
    </div>
  );
}
