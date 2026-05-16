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
  Pencil
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
}

interface Turma {
  id: string;
  name: string;
  shift?: 'manha' | 'tarde' | 'noite';
}

interface ScheduleSlot {
  teacherId: string;
  subjectId: string;
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

const getDisplayPeriod = (p: number) => p > 6 ? p - 6 : p;
const getShift = (p: number) => p > 6 ? 'tarde' : 'manha';

export default function ScheduleGenerator() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [schedules, setSchedules] = useState<AllSchedules>({});
  const [version, setVersion] = useState<number>(10);
  
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');
  const [importShift, setImportShift] = useState<'manha' | 'tarde'>('manha');
  
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherSubjectIds, setNewTeacherSubjectIds] = useState<string[]>([]);
  const [newTeacherAvailability, setNewTeacherAvailability] = useState<string[]>([]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectWorkload, setNewSubjectWorkload] = useState<number>(5);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [tempTeacher, setTempTeacher] = useState('');
  const [tempSubject, setTempSubject] = useState('');
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);

  const [isSaved, setIsSaved] = useState(false);

  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [isAddingTurma, setIsAddingTurma] = useState(false);
  const [isPrintingTurmaSelection, setIsPrintingTurmaSelection] = useState(false);
  const [newTurmaName, setNewTurmaName] = useState('');
  const [newTurmaShift, setNewTurmaShift] = useState<'manha' | 'tarde'>('manha');
  const [editingTurmaId, setEditingTurmaId] = useState<string | null>(null);

  // Filter turmas for the interactive grid - let's show all by default unless we really need filtering
  // The user complained about missing "middle" classes, so showing all might be safer
  // or at least ensure the ones without shift show up correctly.
  const displayedTurmas = turmas
    .filter(t => {
      if (t.shift) return t.shift === importShift;
      // Fallback for older data or implicitly named turmas
      const isNamedTarde = t.name.toLowerCase().includes('tarde');
      return importShift === 'manha' ? !isNamedTarde : isNamedTarde;
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

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
      if (savedSubjects) setSubjects(JSON.parse(savedSubjects));
      
      const savedVersion = localStorage.getItem('cecm_version');
      if (savedVersion) setVersion(parseInt(savedVersion));

      if (savedTurmas) {
        const parsedTurmas = JSON.parse(savedTurmas);
        setTurmas(parsedTurmas);
        if (parsedTurmas.length > 0) setSelectedTurmaId(parsedTurmas[0].id);
      } else {
        const defaultTurmas = Array.from({ length: 12 }, (_, i) => ({
          id: generateId(),
          name: `${Math.floor(i/3) + 6}º Ano ${String.fromCharCode(65 + (i % 3))}`
        }));
        setTurmas(defaultTurmas);
        setSelectedTurmaId(defaultTurmas[0].id);
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
  }, [teachers, subjects, turmas, schedules, version]);

  // Backup functions
  const handleExportData = () => {
    const data = {
      teachers,
      subjects,
      turmas,
      schedules,
      version,
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
            setSubjects(data.subjects || []);
            setTurmas(data.turmas || []);
            setSchedules(data.schedules || {});
            setVersion(prev => (data.version || prev) + 1);
            
            if (data.turmas && data.turmas.length > 0) {
              setSelectedTurmaId(data.turmas[0].id);
              // Handle potential legacy data where shift might be missing
              const firstTurma = data.turmas[0];
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
    
    if (editingSubjectId) {
      setSubjects(prev => prev.map(s => s.id === editingSubjectId 
        ? { ...s, name: newSubjectName, workload: newSubjectWorkload || 1 } 
        : s
      ));
      setEditingSubjectId(null);
    } else {
      const newSubject = { 
        id: generateId(), 
        name: newSubjectName, 
        workload: newSubjectWorkload || 1 
      };
      setSubjects([...subjects, newSubject]);
    }
    
    incrementVersion();
    setNewSubjectName('');
    setNewSubjectWorkload(2);
  };

  const startEditSubject = (subject: Subject) => {
    setEditingSubjectId(subject.id);
    setNewSubjectName(subject.name);
    setNewSubjectWorkload(subject.workload);
  };

  const removeTeacher = (id: string) => {
    setTeachers(teachers.filter(t => t.id !== id));
    incrementVersion();
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
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
    
    if (editingTurmaId) {
      setTurmas(prev => prev.map(t => t.id === editingTurmaId 
        ? { ...t, name: newTurmaName, shift: newTurmaShift } 
        : t
      ));
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

  const handleSlotClick = (dayId: string, periodId: number, turmaId: string) => {
    setSelectedTurmaId(turmaId);
    const slotId = `${dayId}-${periodId}`;
    const currentSchedule = schedules[turmaId] || {};
    setSelectedSlot(slotId);
    setTempTeacher(currentSchedule[slotId]?.teacherId || '');
    setTempSubject(currentSchedule[slotId]?.subjectId || '');
  };

  const saveSlot = () => {
    if (!selectedSlot || !selectedTurmaId) return;
    
    // Safety check if no subjects or teachers exist
    if (subjects.length === 0 || teachers.length === 0) {
      alert("É necessário cadastrar pelo menos uma disciplina e um professor primeiro.");
      return;
    }

    const currentSchedule = { ...(schedules[selectedTurmaId] || {}) };
    
    if (!tempSubject) {
      if (selectedSlot && currentSchedule[selectedSlot]) {
        delete currentSchedule[selectedSlot];
      } else {
        alert("Por favor, selecione uma disciplina.");
        return;
      }
    } else if (!tempTeacher) {
      alert("Por favor, selecione um professor para esta disciplina.");
      return;
    } else {
      // Workload Validation
      const subject = subjects.find(s => s.id === tempSubject);
      if (subject) {
        const currentUsage = Object.values(currentSchedule).filter((slot: ScheduleSlot) => slot.subjectId === tempSubject).length;
        const isEditingSameSubject = (currentSchedule[selectedSlot] as ScheduleSlot)?.subjectId === tempSubject;
        
        if (!isEditingSameSubject && currentUsage >= subject.workload) {
          alert(`Limite de carga horária atingido para ${subject.name} (${subject.workload} aulas semanais).`);
          return;
        }
      }
      currentSchedule[selectedSlot] = { teacherId: tempTeacher, subjectId: tempSubject };
    }

    setSchedules({
      ...schedules,
      [selectedTurmaId]: currentSchedule
    });
    
    incrementVersion();
    setSelectedSlot(null);
  };

  const getWorkloadUsage = (subjectId: string) => {
    if (!selectedTurmaId) return 0;
    const currentSchedule = schedules[selectedTurmaId] || {};
    return Object.values(currentSchedule).filter((slot: ScheduleSlot) => slot.subjectId === subjectId).length;
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
          <h1>COLÉGIO ESTADUAL CÍVICO-MILITAR GREGÓRIO SZEREMETA - EFMP</h1>
          <h2>HORÁRIO DE AULAS - TURMA: ${turma.name} (${shift.toUpperCase()})</h2>
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
                  const slot = schedules[turma.id]?.[`${day.id}-${pId}`];
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
        
        <div class="print-footer">
          Sistema feito por: Prof. Lucas Mercer Leniar - Versão ${version} - ${new Date().toLocaleDateString('pt-BR')} - ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    `;

    return html;
  };

  const handlePrintAllTurmasIndividual = () => {
    const html = turmas
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
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
              @page { size: A4 portrait; margin: 0.4cm; }
              body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background: white; }
              .print-container { 
                page-break-after: always; 
                width: 100%; 
                display: flex; 
                flex-direction: column; 
              }
              .print-header { text-align: center; margin-bottom: 8px; border-bottom: 1.5pt solid black; padding-bottom: 4px; }
              .print-header h1 { font-size: 11pt; margin: 0; font-weight: 800; }
              .print-header h2 { font-size: 9pt; margin: 2px 0; color: #1e293b; font-weight: 700; }
              .table-wrapper { border: 1pt solid black; margin-top: 4px; }
              .grid-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
              th, td { border: 0.5pt solid black; padding: 3px 2px; text-align: center; vertical-align: middle; }
              th { background: #f1f5f9; font-weight: 800; font-size: 7.5pt; }
              .day-col { width: 25px; }
              .period-col { width: 55px; }
              .time-col { width: 85px; }
              .day-cell { font-weight: 900; background: #f8fafc; font-size: 8pt; }
              .day-cell span { display: block; writing-mode: vertical-lr; transform: rotate(180deg); margin: 0 auto; }
              .p-num-cell { font-weight: 700; color: #2563eb; font-size: 7pt; }
              .p-time-cell { color: #64748b; font-size: 6.5pt; font-weight: 500; }
              .slot-cell { text-align: left; padding-left: 8px; }
              .subj-name { font-weight: 800; font-size: 8.5pt; text-transform: uppercase; margin-bottom: 0px; line-height: 1.1; }
              .prof-name { font-size: 8.5pt; color: #475569; font-weight: 600; line-height: 1; }
              .day-end { border-bottom: 1.5pt solid black; }
              .print-footer { margin-top: 4px; text-align: right; font-size: 7.5pt; color: black; font-weight: 600; }
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
    <div className="space-y-3 animate-in fade-in duration-700 pb-4">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2 px-4 bg-white rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest pl-2">
            Gestão de Horários
          </h2>
          <div className="px-2 py-1 bg-slate-100 rounded-md text-[9px] font-black text-slate-500 uppercase tracking-tighter">
            Versão {version}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Management Toggles */}
          <div className="flex border-r border-slate-100 pr-4 mr-2 gap-2">
            <button 
              onClick={() => setIsAddingTurma(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#657c36]/10 text-[#657c36] hover:bg-[#657c36]/20 rounded-xl text-xs font-bold transition-all"
            >
              <Calendar className="w-4 h-4" />
              Turmas
            </button>
            <button 
              onClick={() => setIsAddingSubject(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#657c36]/10 text-[#657c36] hover:bg-[#657c36]/20 rounded-xl text-xs font-bold transition-all"
            >
              <BookOpen className="w-4 h-4" />
              Disciplinas
            </button>
            <button 
              onClick={() => setIsAddingTeacher(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#657c36]/10 text-[#657c36] hover:bg-[#657c36]/20 rounded-xl text-xs font-bold transition-all"
            >
              <Users className="w-4 h-4" />
              Professores
            </button>
          </div>

          {/* Shift Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
            <button 
              onClick={() => setImportShift('manha')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${importShift === 'manha' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
            >
              Manhã
            </button>
            <button 
              onClick={() => setImportShift('tarde')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${importShift === 'tarde' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
            >
              Tarde
            </button>
          </div>

          {/* Backup Management */}
          <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
            <button 
              onClick={handleExportData}
              className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100 flex items-center gap-1.5"
              title="Baixar arquivo de backup (.txt)"
            >
              <Download className="w-3.5 h-3.5" />
              Backup: Exp.
            </button>
            <label 
              className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100 flex items-center gap-1.5 cursor-pointer"
              title="Carregar arquivo de backup (.txt)"
            >
              <FileText className="w-3.5 h-3.5" />
              Backup: Imp.
              <input 
                type="file" 
                accept=".txt" 
                className="hidden" 
                onChange={handleImportBackup} 
              />
            </label>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
            <button 
              onClick={() => {
                if (selectedTurmaId && confirm(`Limpar apenas o horário da turma ${currentTurma?.name}?`)) {
                  const updatedSchedules = { ...schedules };
                  delete updatedSchedules[selectedTurmaId];
                  setSchedules(updatedSchedules);
                  incrementVersion();
                }
              }}
              className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-amber-600 hover:bg-amber-50 transition-all border border-transparent hover:border-amber-100"
              title="Limpar Grade da turma atual"
            >
              Limpar Turma
            </button>
            <button 
              onClick={() => {
                if (confirm('Limpar o horário de TODAS as turmas? (Professores e Matérias serão mantidos)')) {
                  setSchedules({});
                  incrementVersion();
                }
              }}
              className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-orange-600 hover:bg-orange-50 transition-all border border-transparent hover:border-orange-100"
              title="Limpar todos os horários"
            >
              Limpar Todos
            </button>

          </div>


          <button 
            onClick={handleSave}
            className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm hover:shadow-md active:scale-[0.98] min-w-[110px] ${
              isSaved ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-black'
            }`}
          >
            {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {isSaved ? 'Salvo!' : 'Salvar'}
          </button>
          <button 
            onClick={() => setIsPrintingTurmaSelection(true)}
            className="flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm hover:shadow-md active:scale-[0.98] min-w-[110px]"
          >
            <Printer className="w-4 h-4" />
            Imprimir Turma
          </button>
          
          <button 
            onClick={() => {
              // Less aggressive filtering for printing
              const manhaTurmas = turmas.filter(t => t.shift === 'manha' || (!t.shift && !t.name.toLowerCase().includes('tarde'))).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
              const tardeTurmas = turmas.filter(t => t.shift === 'tarde' || (!t.shift && t.name.toLowerCase().includes('tarde'))).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
              
              const generateScheduleTable = (shiftTurmas: Turma[], shift: 'manha' | 'tarde') => {
                if (shiftTurmas.length === 0) return '';
                
                const currentPeriods = shift === 'manha' ? PERIODS_MANHA : PERIODS_TARDE;
                const timeRangesManha = ["7h30 às 8h20", "8h20 às 9h10", "9h10 às 10h", "10h20 às 11h10", "11h10 às 12h", "12h às 12h50"];
                const timeRangesTarde = ["13h às 13h50", "13h50 às 14h40", "14h40 às 15h30", "15h50 às 16h40", "16h40 às 17h30", "17h30 às 18h20"];
                const currentTimeRanges = shift === 'manha' ? timeRangesManha : timeRangesTarde;

                return `
                  <div class="print-container">
                    <div class="print-header">
                      <h1>COLÉGIO ESTADUAL CÍVICO-MILITAR GREGÓRIO SZEREMETA - EFMP</h1>
                      <h2>HORÁRIO DA ${shift === 'manha' ? 'MANHÃ' : 'TARDE'}</h2>
                    </div>
                    
                    <div class="table-wrapper">
                      <table class="grid-table">
                        <thead>
                          <tr>
                            <th class="corner-header"></th>
                            ${shiftTurmas.map(t => `<th class="turma-header">${t.name}</th>`).join('')}
                            <th class="time-header">CRONOGRAMA HORÁRIO</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${DAYS.map((day) => {
                            return currentPeriods.map((pId, pIndex) => {
                              const pName = `${pIndex + 1}ª aula`;
                              const time = currentTimeRanges[pIndex];
                              
                              return `
                                <tr class="${pIndex === 5 ? 'day-end' : ''}">
                                  ${pIndex === 0 ? `<td rowspan="7" class="day-cell"><span>${day.label}</span></td>` : ''}
                                  ${shiftTurmas.map(turma => {
                                    const slot = schedules[turma.id]?.[`${day.id}-${pId}`];
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
                                    ${shiftTurmas.map(() => `<td class="slot-cell" style="background: #f8fafc; text-align: center; font-size: 5.5pt; font-weight: 800; color: #94a3b8; letter-spacing: 0.1em;">INTERVALO</td>`).join('')}
                                    <td class="time-info" style="background: #f1f5f9;">
                                      <span class="p-num" style="color: #64748b; font-size: 5pt;">INTERVALO</span>
                                      <span class="p-time" style="font-size: 4.5pt;">${shift === 'manha' ? '10h-10h20' : '15h30-15h50'}</span>
                                    </td>
                                  </tr>
                                ` : ''}
                              `;
                            }).join('');
                          }).join('')}
                        </tbody>
                      </table>
                    </div>
                    
                    <div class="print-footer">
                      Sistema feito por: Prof. Lucas Mercer Leniar - Versão ${version} - ${new Date().toLocaleDateString('pt-BR')} - ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
                          margin: 0.2cm; 
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
                        }
                        
                        .print-container { 
                          page-break-after: always; 
                          width: 100%;
                          /* Removido altura fixa para evitar quebra em 2 folhas se o conteúdo for denso */
                          height: auto;
                          min-height: 170mm;
                          display: flex;
                          flex-direction: column;
                          overflow: hidden;
                        }
                        
                        .print-header { text-align: center; margin-bottom: 0px; }
                        .print-header h1 { font-size: 9pt; margin: 0; font-weight: 800; }
                        .print-header h2 { font-size: 8pt; margin: 0; font-weight: 700; color: #1e293b; }
                        
                        .table-wrapper {
                          flex: 1;
                          width: 100%;
                          overflow: hidden;
                          border: 0.8pt solid black;
                        }
                        
                        .grid-table { 
                          width: 100%; 
                          height: 100%;
                          border-collapse: collapse; 
                          table-layout: fixed; 
                        }
                        
                        th, td { 
                          border: 0.1pt solid #000; 
                          text-align: center; 
                          vertical-align: middle;
                          padding: 1px 0; /* Padding mínimo vertical */
                        }
                        
                        .corner-header { width: 22px; }
                        .time-header { width: 100px; font-size: 7.2pt; font-weight: 800; background-color: #f1f5f9; }
                        
                        .turma-header { 
                          background-color: #e2e8f0; 
                          font-size: 7pt; 
                          font-weight: 800; 
                          padding: 1px 0;
                        }
                        
                        .day-cell { 
                          width: 22px;
                          background-color: #f8fafc;
                          padding: 0;
                        }
                        .day-cell span {
                          display: block;
                          writing-mode: vertical-lr;
                          transform: rotate(180deg);
                          font-size: 6.8pt; 
                          font-weight: 900; 
                          text-transform: uppercase;
                          margin: 0 auto;
                        }
                        
                        .slot-cell { 
                          overflow: hidden;
                          height: 13pt; /* Reduzindo ainda mais */
                          line-height: 1;
                        }
                        
                        .subj-name { 
                          font-size: 6pt; 
                          font-weight: 800; 
                          color: black; 
                          text-transform: uppercase;
                          line-height: 1;
                          white-space: nowrap;
                          overflow: hidden;
                        }
                        
                        .prof-name { 
                          font-size: 5.5pt; 
                          color: #475569; 
                          line-height: 1;
                          white-space: nowrap;
                          overflow: hidden;
                        }
                        
                        .time-info { 
                          background-color: #f8fafc;
                          line-height: 0.85;
                          height: 13pt;
                        }
                        .p-num { display: block; font-size: 5.8pt; font-weight: 700; color: #2563eb; }
                        .p-time { display: block; font-size: 4.8pt; font-weight: 400; color: #64748b; }
                        
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
            }}
            className="flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm hover:shadow-md active:scale-[0.98] min-w-[110px]"
          >
            <Printer className="w-4 h-4" />
            Imprimir Quadro
          </button>
        </div>
      </div>

      {/* Main Content (Shifted up) */}
      <div className="w-full">
        {/* Professional Matrix View (Matching Screenshot) */}
        <div className="bg-white rounded-xl border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] overflow-hidden print:overflow-visible print:shadow-none print:border-slate-800" id="schedule-grid">
            <div className="p-3 border-b-2 border-slate-900 bg-slate-50 flex items-center justify-between sticky top-0 left-0 z-30 print:static print:border-b">
              <div className="flex flex-col">
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                  Horário {importShift === 'manha' ? 'da Manhã' : 'da Tarde'}
                </h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">CECM Gregório Szeremeta</p>
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
            
            <div className="overflow-auto max-h-[75vh] custom-scrollbar">
              <table className="w-full border-collapse border-spacing-0 min-w-max">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-900 sticky top-0 z-20">
                    <th className="bg-slate-100 sticky left-0 z-40 border-r-2 border-slate-900 w-10 min-w-[40px] max-w-[40px]"></th>
                    {displayedTurmas.map(t => (
                      <th key={t.id} className="p-0 border-r border-slate-300 text-xs font-black uppercase tracking-widest text-slate-900 min-w-[120px] bg-slate-100">
                        <div className="flex items-center justify-between px-3 py-3 group">
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
                                <td rowSpan={7} className="bg-slate-900 text-white p-0 w-10 min-w-[40px] max-w-[40px] border-r-2 border-slate-900 sticky left-0 z-40 shadow-[2px_0_10px_rgba(0,0,0,0.1)]">
                                  <div className="flex items-center justify-center h-full w-full">
                                    <span className="text-[10px] font-black uppercase [writing-mode:vertical-lr] rotate-180 text-center tracking-widest whitespace-nowrap">
                                      {day.label}
                                    </span>
                                  </div>
                                </td>
                              )}
                              
                              {displayedTurmas.map(turma => {
                                const slotId = `${day.id}-${actualPeriod}`;
                                const slot = schedules[turma.id]?.[slotId];
                                const teacher = teachers.find(t => t.id === slot?.teacherId);
                                const subject = subjects.find(s => s.id === slot?.subjectId);
                                const conflicts = getConflicts(day.id, actualPeriod, slot?.teacherId || '', turma.id);

                                return (
                                  <td 
                                    key={turma.id}
                                    onClick={() => handleSlotClick(day.id, actualPeriod, turma.id)}
                                    className={`p-1.5 border-r border-slate-200 cursor-pointer transition-all group relative ${
                                      conflicts.length > 0 
                                        ? 'bg-red-50' 
                                        : slot 
                                          ? 'bg-slate-100 hover:bg-slate-200 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]' 
                                          : ''
                                    }`}
                                  >
                                    {slot ? (
                                      <div className="flex flex-col items-center justify-center text-center overflow-hidden">
                                        <span className={`text-[10px] font-black uppercase leading-[1.1] mb-0.5 ${conflicts.length > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                                          {subject?.name}
                                        </span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase truncate w-full">
                                          {teacher?.name}
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
                                 {displayedTurmas.map(turma => (
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
            <div className="p-3 bg-slate-50 border-t-2 border-slate-900 text-center">
              <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">
                Sistema feito por: Prof. Lucas Mercer Leniar - Versão {version} - {new Date().toLocaleDateString('pt-BR')} - Atualização de Grade
              </p>
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
                  {DAYS.find(d => d.id === selectedSlot.split('-')[0])?.label} • {getDisplayPeriod(parseInt(selectedSlot.split('-')[1]))}ª Aula • {getShift(parseInt(selectedSlot.split('-')[1])).toUpperCase()}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matéria</label>
                  <button 
                    onClick={() => {
                      setSelectedSlot(null);
                      setIsAddingSubject(true);
                    }}
                    className="text-[9px] font-bold text-[#657c36] hover:underline"
                  >
                    + Criar Nova
                  </button>
                </div>
                <div className="space-y-2">
                  <select 
                    value={tempSubject}
                    onChange={e => {
                      const sId = e.target.value;
                      setTempSubject(sId);
                      // Se houver professores que ensinam esta disciplina, selecionar o primeiro
                      const linkedTeachers = teachers.filter(t => t.subjectIds.includes(sId));
                      if (linkedTeachers.length > 0) {
                        setTempTeacher(linkedTeachers[0].id);
                      } else if (teachers.length === 1) {
                        setTempTeacher(teachers[0].id);
                      }
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#657c36] transition-all"
                  >
                    <option value="">Selecionar Disciplina</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({getWorkloadUsage(s.id)}/{s.workload})</option>
                    ))}
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

                {turmas.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map(turma => (
                  <button 
                    key={turma.id}
                    onClick={() => handlePrintTurmaSelection(turma)}
                    className="flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-black text-slate-800">{turma.name}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{turma.shift || 'Período indefinido'}</span>
                    </div>
                    <Printer className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </button>
                ))}
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
                        onChange={e => setNewTurmaName(e.target.value)}
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
                  {turmas.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map(turma => (
                    <div key={turma.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-white border border-transparent hover:border-slate-100 transition-all group">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-800">{turma.name}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{turma.shift || 'Período não definido'}</span>
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
                        <div className="max-h-32 overflow-y-auto border border-slate-100 rounded-xl p-2 space-y-1 custom-scrollbar bg-slate-50">
                          {subjects.map(s => (
                            <label key={s.id} className="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-all border border-transparent hover:border-slate-100 group">
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
                                className="w-4 h-4 rounded-md border-slate-300 text-[#657c36] focus:ring-[#657c36]"
                              />
                              <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">{s.name}</span>
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
                              <div className="grid grid-cols-7 gap-1">
                                <div className="col-span-1"></div>
                                {[1,2,3,4,5,6].map(p => (
                                  <div key={p} className="text-[8px] font-black text-slate-400 text-center">{p}ª</div>
                                ))}
                                {DAYS.map(day => (
                                  <React.Fragment key={day.id}>
                                    <div className="text-[9px] font-black text-slate-500 flex items-center capitalize h-6">{day.id}</div>
                                    {[1,2,3,4,5,6].map(p => {
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
                                          className={`h-6 rounded-md border-2 transition-all flex items-center justify-center ${
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
                              <div className="grid grid-cols-7 gap-1">
                                <div className="col-span-1"></div>
                                {[1,2,3,4,5,6].map(p => (
                                  <div key={p} className="text-[8px] font-black text-slate-400 text-center">{p}ª</div>
                                ))}
                                {DAYS.map(day => (
                                  <React.Fragment key={day.id}>
                                    <div className="text-[9px] font-black text-slate-500 flex items-center capitalize h-6">{day.id}</div>
                                    {[7,8,9,10,11,12].map(p => {
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
                                          className={`h-6 rounded-md border-2 transition-all flex items-center justify-center ${
                                            isSelected 
                                              ? "bg-orange-500 border-orange-500 text-white" 
                                              : "bg-white border-slate-200 hover:border-slate-300"
                                          }`}
                                          title={`${day.label} - ${p-6}ª Aula Tarde`}
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
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6"
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
                  }} 
                  className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <input 
                    type="text" 
                    value={newSubjectName}
                    onChange={e => setNewSubjectName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSubject()}
                    placeholder="Nome da Disciplina (Ex: Matemática)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-slate-900 transition-all"
                  />
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase flex-1">Aulas por Semana:</span>
                    <input 
                      type="number" 
                      min="1"
                      max="10"
                      value={newSubjectWorkload}
                      onChange={e => setNewSubjectWorkload(parseInt(e.target.value) || 1)}
                      onKeyDown={e => e.key === 'Enter' && addSubject()}
                      className="w-12 bg-transparent text-sm font-black text-slate-900 text-center focus:outline-none"
                    />
                    <button onClick={addSubject} className={`px-4 py-2 rounded-lg transition-all ${editingSubjectId ? 'bg-[#657c36] text-white' : 'bg-slate-900 text-white hover:bg-black'}`}>
                      {editingSubjectId ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {subjects.map(subject => (
                    <div key={subject.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-white border border-transparent hover:border-slate-100 transition-all group">
                      <div className="flex flex-col transition-all">
                        <span className="text-xs font-black text-slate-800">{subject.name}</span>
                        <div className="flex items-center gap-2">
                           <span className="text-[9px] font-bold text-slate-400 uppercase">{subject.workload} aulas semanais</span>
                           {selectedTurmaId && (
                             <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black ${
                               getWorkloadUsage(subject.id) >= subject.workload 
                               ? 'bg-red-100 text-red-600' 
                               : 'bg-green-100 text-green-600'
                             }`}>
                               Uso: {getWorkloadUsage(subject.id)}/{subject.workload}
                             </span>
                           )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => startEditSubject(subject)} 
                          className="p-2 text-slate-300 hover:text-blue-500 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => removeSubject(subject.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
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
