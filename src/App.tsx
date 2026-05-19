/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, type FormEvent } from 'react';
import { 
  Lock, 
  ChevronRight, 
  GraduationCap, 
  AlertCircle
} from 'lucide-react';
import ScheduleGenerator from './components/ScheduleGenerator';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [schoolName, setSchoolName] = useState('CECM Gregório Szeremeta');

  useEffect(() => {
    // Check if previously logged in
    const auth = localStorage.getItem('isLoggedIn');
    if (auth === 'true') {
      setIsLoggedIn(true);
    }
    
    const savedSchoolName = localStorage.getItem('cecm_school_name');
    if (savedSchoolName) {
      setSchoolName(savedSchoolName);
    }

    const handleSchoolChanged = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setSchoolName(customEvent.detail);
      }
    };

    window.addEventListener('cecm_school_name_changed', handleSchoolChanged);
    return () => {
      window.removeEventListener('cecm_school_name_changed', handleSchoolChanged);
    };
  }, []);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!password) {
      setError('Por favor, digite o código.');
      return;
    }

    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      if (password === 'ccm2024') {
        localStorage.setItem('isLoggedIn', 'true');
        setIsLoggedIn(true);
      } else {
        setError('Código incorreto. Tente novamente.');
      }
    }, 800);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
    setPassword('');
  };

  if (isLoggedIn) {
    return (
      <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
        {/* Header with Logout */}
        <header className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-3">
            <div className="bg-[#657c36] p-2 rounded-lg">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 leading-tight">Gerador de Horários</h1>
              <p className="text-[10px] text-slate-500 font-bold tracking-tight">{schoolName}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="text-xs font-black text-slate-400 hover:text-red-600 transition-colors uppercase tracking-[0.1em] px-3 py-2"
          >
            Sair do Sistema
          </button>
        </header>

        <main className="flex-1 p-3 pt-2 max-w-7xl mx-auto w-full flex flex-col overflow-hidden">
           <ScheduleGenerator />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#657c36] flex items-center justify-center p-4 font-sans selection:bg-slate-200">
      <div className="w-full max-w-lg">
        {/* Card de Login */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/20 p-8 pt-10 md:p-10 md:pt-12">
          {/* Cabeçalho */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-5 ring-8 ring-slate-50">
              <GraduationCap className="w-8 h-8 text-slate-700" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Horários CECM
            </h1>
            <p className="text-[12px] font-bold text-slate-400 mt-2 tracking-wide leading-tight">
              {schoolName}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="block text-[10px] font-bold text-slate-400 tracking-wide px-1">
                  Código de Acesso
                </label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-300 group-focus-within:text-slate-600 transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  className="block w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 font-mono placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-500/5 focus:border-slate-900 focus:bg-white transition-all text-base"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-300 hover:text-slate-500 transition-colors"
                >
                  {showPassword ? <AlertCircle className="w-4 h-4" /> : <ChevronRight className="w-4 h-4 rotate-90" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 transition-all duration-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-xs font-bold tracking-tight">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-xl shadow-black/10 flex items-center justify-center gap-3 transition-all active:scale-[0.97] text-sm tracking-wide"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Acessar Sistema
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Rodapé Interno */}
          <div className="mt-10 text-center space-y-1.5 border-t border-slate-50 pt-8">
            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Reserva - PR // Brasil
            </p>
            <p className="text-[11px] font-bold text-slate-800 leading-none">
              Criado por Prof. Lucas Mercer Leniar
            </p>
            <a 
              href="https://www.LucasLeniar.com.br" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[9px] font-black text-blue-600 hover:underline tracking-widest uppercase block"
            >
              www.LucasLeniar.com.br
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
