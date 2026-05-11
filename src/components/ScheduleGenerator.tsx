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
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractScheduleFromImage } from '../services/geminiService';

interface Teacher {
  id: string;
  name: string;
  subjectId?: string;
}

interface Subject {
  id: string;
  name: string;
  workload: number;
}

interface Turma {
  id: string;
  name: string;
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
  
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');
  const [importShift, setImportShift] = useState<'manha' | 'tarde'>('manha');
  
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherSubjectId, setNewTeacherSubjectId] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectWorkload, setNewSubjectWorkload] = useState<number>(2);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [tempTeacher, setTempTeacher] = useState('');
  const [tempSubject, setTempSubject] = useState('');
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);

  const [isSaved, setIsSaved] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [isAddingSubject, setIsAddingSubject] = useState(false);

  // Load data
  useEffect(() => {
    const savedTeachers = localStorage.getItem('cecm_teachers');
    const savedSubjects = localStorage.getItem('cecm_subjects');
    const savedTurmas = localStorage.getItem('cecm_turmas');
    const savedSchedules = localStorage.getItem('cecm_schedules');

    if (savedTeachers) setTeachers(JSON.parse(savedTeachers));
    if (savedSubjects) setSubjects(JSON.parse(savedSubjects));
    
    if (savedTurmas) {
      const parsedTurmas = JSON.parse(savedTurmas);
      setTurmas(parsedTurmas);
      if (parsedTurmas.length > 0) setSelectedTurmaId(parsedTurmas[0].id);
    } else {
      // Default classes if none exist
      const defaultTurmas = Array.from({ length: 12 }, (_, i) => ({
        id: crypto.randomUUID(),
        name: `${Math.floor(i/3) + 6}º Ano ${String.fromCharCode(65 + (i % 3))}`
      }));
      setTurmas(defaultTurmas);
      setSelectedTurmaId(defaultTurmas[0].id);
    }

    if (savedSchedules) setSchedules(JSON.parse(savedSchedules));
  }, []);

  // Conflict Detection
  const getConflicts = (dayId: string, period: number, teacherId: string, excludeTurmaId: string) => {
    if (!teacherId) return [];
    const slotId = `${dayId}-${period}`;
    const conflicts: string[] = [];

    Object.entries(schedules).forEach(([turmaId, schedule]) => {
      if (turmaId !== excludeTurmaId && schedule[slotId]?.teacherId === teacherId) {
        const turmaName = turmas.find(t => t.id === turmaId)?.name || 'Outra Turma';
        conflicts.push(turmaName);
      }
    });

    return conflicts;
  };

  // Save data
  const handleSave = async () => {
    localStorage.setItem('cecm_teachers', JSON.stringify(teachers));
    localStorage.setItem('cecm_subjects', JSON.stringify(subjects));
    localStorage.setItem('cecm_turmas', JSON.stringify(turmas));
    localStorage.setItem('cecm_schedules', JSON.stringify(schedules));
    
    setIsSaved(true);

    // Generate PDF as requested
    const element = document.getElementById('schedule-grid');
    if (element) {
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin: 0.2,
        filename: `Horario_Escolar_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' as const }
      };
      html2pdf().set(opt).from(element).save();
    }

    setTimeout(() => setIsSaved(false), 2000);
  };

  const addTeacher = () => {
    if (!newTeacherName.trim()) return;
    
    if (editingTeacherId) {
      setTeachers(prev => prev.map(t => t.id === editingTeacherId 
        ? { ...t, name: newTeacherName, subjectId: newTeacherSubjectId || undefined } 
        : t
      ));
      setEditingTeacherId(null);
    } else {
      const newTeacher = { 
        id: crypto.randomUUID(), 
        name: newTeacherName,
        subjectId: newTeacherSubjectId || undefined
      };
      setTeachers([...teachers, newTeacher]);
    }
    
    setNewTeacherName('');
    setNewTeacherSubjectId('');
  };

  const startEditTeacher = (teacher: Teacher) => {
    setEditingTeacherId(teacher.id);
    setNewTeacherName(teacher.name);
    setNewTeacherSubjectId(teacher.subjectId || '');
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
        id: crypto.randomUUID(), 
        name: newSubjectName, 
        workload: newSubjectWorkload || 1 
      };
      setSubjects([...subjects, newSubject]);
    }
    
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
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
  };

  const removeTurma = (id: string) => {
    setTurmas(turmas.filter(t => t.id !== id));
    if (selectedTurmaId === id) setSelectedTurmaId(turmas[0]?.id || '');
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
    
    const currentSchedule = { ...(schedules[selectedTurmaId] || {}) };
    
    if (!tempTeacher || !tempSubject) {
      delete currentSchedule[selectedSlot];
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
    
    setSelectedSlot(null);
  };

  const getWorkloadUsage = (subjectId: string) => {
    if (!selectedTurmaId) return 0;
    const currentSchedule = schedules[selectedTurmaId] || {};
    return Object.values(currentSchedule).filter((slot: ScheduleSlot) => slot.subjectId === subjectId).length;
  };

  const printSchedule = () => {
    window.focus();
    window.print();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const reader = new FileReader();
      const fileType = file.type;
      
      reader.onload = async (e) => {
        try {
          const base64Data = e.target?.result?.toString().split(',')[1];
          if (!base64Data) return;

          const data = await extractScheduleFromImage(base64Data, fileType);
          
          const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

          // Merge subjects first (needed for teacher links)
          const updatedSubjects = [...subjects];
          data.subjects.forEach(newSubject => {
            const normalizedNew = normalize(newSubject.name);
            if (!updatedSubjects.find(s => normalize(s.name) === normalizedNew || normalizedNew.includes(normalize(s.name)))) {
              updatedSubjects.push({ 
                id: crypto.randomUUID(), 
                name: newSubject.name, 
                workload: newSubject.workload 
              });
            }
          });
          setSubjects(updatedSubjects);

          // Merge teachers and link subjects
          const updatedTeachers = [...teachers];
          data.teachers.forEach(newTeacher => {
            const normalizedNewName = normalize(newTeacher.name);
            const existingTeacher = updatedTeachers.find(t => normalize(t.name) === normalizedNewName || normalizedNewName.includes(normalize(t.name)));
            
            const linkedSubject = newTeacher.subject 
              ? updatedSubjects.find(s => normalize(newTeacher.subject!).includes(normalize(s.name)) || normalize(s.name).includes(normalize(newTeacher.subject!)))
              : null;

            if (!existingTeacher) {
              updatedTeachers.push({ 
                id: crypto.randomUUID(), 
                name: newTeacher.name,
                subjectId: linkedSubject?.id 
              });
            } else if (!existingTeacher.subjectId && linkedSubject) {
              existingTeacher.subjectId = linkedSubject.id;
            }
          });
          setTeachers(updatedTeachers);

          // Merge turmas and schedules
          const updatedTurmas = [...turmas];
          const updatedSchedules = { ...schedules };

          data.turmas.forEach(newTurma => {
            const normalizedTurmaName = normalize(newTurma.name);
            
            // FILTRAGEM DE LIXO DEFINITIVA: 
            const lettersCount = (newTurma.name.match(/[A-Za-z]/g) || []).length;
            const numbersCount = (newTurma.name.match(/\d/g) || []).length;
            
            const isGarbage = (numbersCount > lettersCount && numbersCount > 2) || (newTurma.name.length > 20 && lettersCount < 4);
            const isSequenceOfNumbers = newTurma.name.split(/\s+/).length > 10;
            const isGenericHeader = normalizedTurmaName.includes('carga horaria') || 
                                   normalizedTurmaName.includes('total') || 
                                   normalizedTurmaName.includes('professor') || 
                                   normalizedTurmaName.includes('horario') ||
                                   normalizedTurmaName.includes('cronograma') ||
                                   normalizedTurmaName.includes('obs');

            if (newTurma.name.length > 30 || isGarbage || isSequenceOfNumbers || isGenericHeader || !newTurma.name.trim()) {
              console.warn("Filtrando turma possivelmente inválida:", newTurma.name);
              return;
            }

            let turma = updatedTurmas.find(t => normalize(t.name) === normalizedTurmaName || normalizedTurmaName.includes(normalize(t.name)) || normalize(t.name).includes(normalizedTurmaName));
            
            if (!turma) {
              turma = { id: crypto.randomUUID(), name: newTurma.name };
              updatedTurmas.push(turma);
            }

            const scheduleForTurma: Schedule = {};
            Object.entries(newTurma.schedule).forEach(([extractedSlotId, slotData]: [string, any]) => {
              const [dayId, periodStr] = extractedSlotId.split('-');
              const periodNum = parseInt(periodStr);
              
              const actualPeriod = importShift === 'tarde' ? periodNum + 6 : periodNum;
              const slotId = `${dayId}-${actualPeriod}`;

              if (!slotData || (!slotData.teacher && !slotData.subject)) return;

              const normExtractedTeacher = normalize(slotData.teacher || "");
              const normExtractedSubject = normalize(slotData.subject || "");

              // Match Teacher
              let teacher = updatedTeachers.find(t => 
                normalize(t.name) === normExtractedTeacher || 
                (normExtractedTeacher.length > 2 && (normExtractedTeacher.includes(normalize(t.name)) || normalize(t.name).includes(normExtractedTeacher)))
              );
              
              // Match Subject
              let subject = updatedSubjects.find(s => 
                normalize(s.name) === normExtractedSubject || 
                (normExtractedSubject.length > 2 && (normExtractedSubject.includes(normalize(s.name)) || normalize(s.name).includes(normExtractedSubject)))
              );

              // If only one matched, try to find the other through the teacher's default subject or subject's first teacher
              if (teacher && !subject) {
                subject = updatedSubjects.find(s => s.id === teacher.subjectId);
              }
              if (subject && !teacher) {
                teacher = updatedTeachers.find(t => t.subjectId === subject.id);
              }

              // Final check: if we still missing one, use very loose partial matching for the teacher name in the subject field and vice-versa
              if (!teacher && normExtractedTeacher.length > 2) {
                teacher = updatedTeachers.find(t => normalize(t.name).split(/\s+/).some(part => part.length > 3 && normExtractedTeacher.includes(part)));
              }
              
              if (teacher && subject) {
                scheduleForTurma[slotId] = { teacherId: teacher.id, subjectId: subject.id };
              } else if (normExtractedTeacher || normExtractedSubject) {
                // Better recovery: if we found at least a hint, try one more time with very loose matches
                const looseTeacher = teacher || updatedTeachers.find(t => 
                  normalize(t.name).length > 3 && (normExtractedTeacher.includes(normalize(t.name)) || normalize(t.name).includes(normExtractedTeacher))
                );
                const looseSubject = subject || updatedSubjects.find(s => 
                  normalize(s.name).length > 3 && (normExtractedSubject.includes(normalize(s.name)) || normalize(s.name).includes(normExtractedSubject))
                );

                if (looseTeacher && looseSubject) {
                  scheduleForTurma[slotId] = { teacherId: looseTeacher.id, subjectId: looseSubject.id };
                }
              }
            });
            
            updatedSchedules[turma.id] = { ...(updatedSchedules[turma.id] || {}), ...scheduleForTurma };
          });

          // Auto-calculate workload based on maximum usage found in any class
          const finalSubjects = updatedSubjects.map(subj => {
            let maxUsage = 0;
            Object.values(updatedSchedules).forEach((sched: Schedule) => {
              const usage = Object.values(sched).filter((slot: ScheduleSlot) => slot.subjectId === subj.id).length;
              if (usage > maxUsage) maxUsage = usage;
            });
            return { ...subj, workload: maxUsage || subj.workload };
          });

          setSubjects(finalSubjects);
          setTurmas(updatedTurmas);
          setSchedules(updatedSchedules);
          
          if (updatedTurmas.length > 0) {
            setSelectedTurmaId(updatedTurmas[0].id);
          }
          
          let actuallySavedSlots = 0;
          Object.values(updatedSchedules).forEach((sched: any) => {
            actuallySavedSlots += Object.keys(sched).length;
          });
          
          alert(`Importação concluída!\nTurmas processadas: ${data.turmas.length}\nNovos Professores: ${data.teachers.length}\nNovas Disciplinas: ${data.subjects.length}\nAulas mapeadas com sucesso: ${actuallySavedSlots}`);
          
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
          console.error("Error processing Gemini response:", err);
          alert("Erro ao processar os dados do horário. Tente novamente.");
        } finally {
          setIsImporting(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Failed to import schedule:", error);
      alert("Falha ao importar o horário. Verifique o arquivo e tente novamente.");
      setIsImporting(false);
    } finally {
      // Reset input
      event.target.value = '';
    }
  };

  const currentTurma = turmas.find(t => t.id === selectedTurmaId);

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest pl-2">
            Gestão de Horários
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Management Toggles */}
          <div className="flex border-r border-slate-100 pr-4 mr-2 gap-2">
            <button 
              onClick={() => setIsAddingTeacher(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#657c36]/10 text-[#657c36] hover:bg-[#657c36]/20 rounded-xl text-xs font-bold transition-all"
            >
              <Users className="w-4 h-4" />
              Professores
            </button>
            <button 
              onClick={() => setIsAddingSubject(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#657c36]/10 text-[#657c36] hover:bg-[#657c36]/20 rounded-xl text-xs font-bold transition-all"
            >
              <BookOpen className="w-4 h-4" />
              Disciplinas
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

          <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
            <button 
              onClick={() => {
                const updatedSchedules = { ...schedules };
                if (selectedTurmaId) {
                  delete updatedSchedules[selectedTurmaId];
                  setSchedules(updatedSchedules);
                } else {
                  if (confirm('Limpar TODA a grade de horários?')) setSchedules({});
                }
              }}
              className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-amber-600 hover:bg-amber-50 transition-all"
              title="Limpar Grade atual"
            >
              Limpar Grade
            </button>
            <button 
              onClick={() => {
                if (confirm('Deseja realmente apagar TUDO (Professores, Matérias e Grade)?')) {
                  setTeachers([]);
                  setSubjects([]);
                  setSchedules({});
                  setTurmas([]);
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-red-600 hover:bg-red-50 transition-all"
              title="Apagar tudo"
            >
              Resetar
            </button>
          </div>

          <label className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            isImporting ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}>
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isImporting ? 'Importando...' : 'Importar Horário'}
            <input 
              type="file" 
              accept="application/pdf,image/*" 
              className="hidden" 
              onChange={handleFileUpload}
              disabled={isImporting}
            />
          </label>
          <button 
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isSaved ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-black'
            }`}
          >
            {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {isSaved ? 'Salvo!' : 'Salvar'}
          </button>
          <button 
            onClick={printSchedule}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Main Content (Shifted up) */}
      <div className="w-full">
        {/* Professional Matrix View (Matching Screenshot) */}
        <div className="bg-white rounded-xl border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] overflow-hidden print:overflow-visible print:shadow-none print:border-slate-800" id="schedule-grid">
            <div className="p-4 border-b-2 border-slate-900 bg-slate-50 flex items-center justify-between sticky top-0 left-0 z-30 print:static print:border-b">
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
                  <div className="w-3 h-3 bg-[#657c36] rounded-sm" />
                  <span className="text-[9px] font-black uppercase text-slate-400">Disciplina</span>
                </div>
              </div>
            </div>
            
            <div className="overflow-auto max-h-[70vh] custom-scrollbar">
              <table className="w-full border-collapse border-spacing-0">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-900 sticky top-0 z-20">
                    <th className="p-2 bg-slate-100 sticky left-0 z-40 border-r-2 border-slate-900 min-w-[50px]"></th>
                    {turmas.map(t => (
                      <th key={t.id} className="p-0 border-r border-slate-300 text-xs font-black uppercase tracking-widest text-slate-900 min-w-[130px] max-w-[200px] truncate bg-slate-100">
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
                    <th className="p-3 bg-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-900 sticky right-0 z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.05)] w-40">
                      Cronograma Horário
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, dayIndex) => (
                    <React.Fragment key={day.id}>
                      {/* Day Label Cell - Merged across rows */}
                      {PERIODS_MANHA.map((period, pIndex) => {
                        const actualPeriod = importShift === 'manha' ? period : period + 6;
                        const timeRange = importShift === 'manha' 
                          ? ["7h30 às 8h20", "8h20 às 9h10", "9h10 às 10h", "10h20 às 11h10", "11h10 às 12h", "12h às 12h50"][pIndex]
                          : ["13h às 13h50", "13h50 às 14h40", "14h40 às 15h30", "15h50 às 16h40", "16h40 às 17h30", "17h30 às 18h20"][pIndex];

                        return (
                          <tr key={`${day.id}-${actualPeriod}`} className={`border-b border-slate-300 hover:bg-slate-50 transition-colors ${pIndex === 5 ? 'border-b-4 border-slate-900' : ''}`}>
                            {/* Day Column (Sticky Left) */}
                            {pIndex === 0 && (
                              <td rowSpan={6} className="p-2 bg-slate-900 text-white text-[10px] font-black uppercase [writing-mode:vertical-lr] rotate-180 text-center tracking-[0.3em] border-r-2 border-slate-900 sticky left-0 z-40 shadow-[2px_0_10px_rgba(0,0,0,0.1)]">
                                {day.label}
                              </td>
                            )}
                            
                            {turmas.map(turma => {
                              const slotId = `${day.id}-${actualPeriod}`;
                              const slot = schedules[turma.id]?.[slotId];
                              const teacher = teachers.find(t => t.id === slot?.teacherId);
                              const subject = subjects.find(s => s.id === slot?.subjectId);
                              const conflicts = getConflicts(day.id, actualPeriod, slot?.teacherId || '', turma.id);

                              return (
                                <td 
                                  key={turma.id}
                                  onClick={() => handleSlotClick(day.id, actualPeriod, turma.id)}
                                  className={`p-2 border-r border-slate-200 cursor-pointer transition-all group relative ${conflicts.length > 0 ? 'bg-red-50' : ''}`}
                                >
                                  {slot ? (
                                    <div className="flex flex-col items-center text-center">
                                      <span className={`text-[10px] font-black uppercase leading-tight ${conflicts.length > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                                        {subject?.name}
                                      </span>
                                      <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 truncate w-full">
                                        {teacher?.name}
                                      </span>
                                      {conflicts.length > 0 && (
                                        <div className="absolute top-1 right-1">
                                          <AlertCircle className="w-2.5 h-2.5 text-red-500 fill-white" />
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="h-6 flex items-center justify-center opacity-20 group-hover:opacity-100 transition-opacity">
                                      <Plus className="w-3 h-3 text-slate-400" />
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                            <td className="p-2 border-l border-slate-900 bg-slate-50 sticky right-0 z-10 shadow-[-4px_0_10px_rgba(0,0,0,0.05)]">
                              <div className="flex items-center justify-between gap-4">
                                <span className={`text-[10px] font-black uppercase shrink-0 ${importShift === 'manha' ? 'text-blue-600' : 'text-red-500'}`}>
                                  {pIndex + 1}ª aula
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                                  {timeRange}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-slate-50 border-t-2 border-slate-900 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                {new Date().toLocaleDateString('pt-BR')} - Atualização de Grade
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
                      // Auto-select first teacher linked to this subject if any
                      const linkedTeacher = teachers.find(t => t.subjectId === sId);
                      if (linkedTeacher) {
                        setTempTeacher(linkedTeacher.id);
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
                      if (teacher?.subjectId) {
                        setTempSubject(teacher.subjectId);
                      }
                    }}
                    className={`w-full px-4 py-3 border-2 rounded-xl text-xs font-bold transition-all focus:outline-none ${
                      getConflicts(selectedSlot.split('-')[0], parseInt(selectedSlot.split('-')[1]), tempTeacher, selectedTurmaId).length > 0
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-[#657c36]'
                    }`}
                  >
                    <option value="">Selecionar Professor</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  
                  {getConflicts(selectedSlot.split('-')[0], parseInt(selectedSlot.split('-')[1]), tempTeacher, selectedTurmaId).length > 0 && (
                    <div className="p-2 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-3 h-3 text-red-500" />
                      <p className="text-[9px] font-bold text-red-600 leading-tight">
                        PROFESSOR JÁ ESTÁ EM: {getConflicts(selectedSlot.split('-')[0], parseInt(selectedSlot.split('-')[1]), tempTeacher, selectedTurmaId).join(', ')}
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

      {/* Teachers Management Modal */}
      <AnimatePresence>
        {isAddingTeacher && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 uppercase">
                  {editingTeacherId ? 'Editar Professor' : 'Gerenciar Professores'}
                </h3>
                <button 
                  onClick={() => {
                    setIsAddingTeacher(false);
                    setEditingTeacherId(null);
                    setNewTeacherName('');
                    setNewTeacherSubjectId('');
                  }} 
                  className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  <input 
                    type="text" 
                    value={newTeacherName}
                    onChange={e => setNewTeacherName(e.target.value)}
                    placeholder="Nome do Professor"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-slate-900 transition-all"
                  />
                  <div className="flex gap-2">
                    <select
                      value={newTeacherSubjectId}
                      onChange={e => setNewTeacherSubjectId(e.target.value)}
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black text-slate-500 focus:outline-none focus:border-slate-900 transition-all"
                    >
                      <option value="">Vincular Disciplina</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <button onClick={addTeacher} className={`px-6 rounded-xl transition-all ${editingTeacherId ? 'bg-[#657c36] text-white' : 'bg-slate-900 text-white hover:bg-black'}`}>
                      {editingTeacherId ? <CheckCircle2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {teachers.map(teacher => {
                    const subject = subjects.find(s => s.id === teacher.subjectId);
                    return (
                      <div key={teacher.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-white border border-transparent hover:border-slate-100 transition-all group">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-800">{teacher.name}</span>
                          {subject && <span className="text-[9px] font-bold text-[#657c36] uppercase">{subject.name}</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => startEditTeacher(teacher)} 
                            className="p-2 text-slate-300 hover:text-blue-500 transition-colors"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => removeTeacher(teacher.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
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
                    setNewSubjectWorkload(1);
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
                          <Save className="w-4 h-4" />
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
