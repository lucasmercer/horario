/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Lock, 
  ChevronRight, 
  GraduationCap, 
  AlertCircle,
  Clock,
  ExternalLink
} from 'lucide-react';

export default function App() {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!password) {
      setError('Por favor, digite a senha.');
      return;
    }

    setIsLoading(true);
    
    // Verificando a senha ccm2024
    setTimeout(() => {
      setIsLoading(false);
      if (password === 'ccm2024') {
        // Redirecionamento simulado ou sucesso
        window.location.href = 'https://lucasmercer.github.io/horario';
      } else {
        setError('Senha incorreta. Tente novamente.');
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#657c36] flex items-center justify-center p-4 font-sans selection:bg-slate-200">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        {/* Card de Login */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/20 p-8 pt-10">
          {/* Cabeçalho */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-5 ring-8 ring-slate-50">
              <GraduationCap className="w-8 h-8 text-slate-700" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
              Horários CECM
            </h1>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-[0.2em] leading-tight max-w-[220px] mx-auto">
              Colégio Estadual Cívico-Militar Gregório Szeremeta
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] px-1">
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

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-xs font-bold uppercase tracking-tight">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-xl shadow-black/10 flex items-center justify-center gap-3 transition-all active:scale-[0.97] text-xs uppercase tracking-[0.2em]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  ACESSAR SISTEMA
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Rodapé */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-white/70 font-medium tracking-wide">
            Reserva - PR // Brasil • <span className="font-bold text-white">Criado por Prof. Lucas Mercer Leniar</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

