import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../store/uiStore';

const ICONS = {
  success: <CheckCircle size={17} className="text-emerald-400" />,
  error:   <XCircle    size={17} className="text-red-400" />,
  warning: <AlertCircle size={17} className="text-amber-400" />,
  info:    <Info        size={17} className="text-blue-400" />,
};

const BORDER: Record<string, string> = {
  success: 'rgba(16,185,129,0.30)',
  error:   'rgba(239,68,68,0.30)',
  warning: 'rgba(245,158,11,0.30)',
  info:    'rgba(59,130,246,0.30)',
};

const BG: Record<string, string> = {
  success: 'rgba(16,185,129,0.10)',
  error:   'rgba(239,68,68,0.10)',
  warning: 'rgba(245,158,11,0.10)',
  info:    'rgba(59,130,246,0.10)',
};

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore();
  return (
    <div className="fixed bottom-4 end-4 z-[100] flex flex-col gap-2 w-80">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="flex items-start gap-3 p-3 rounded-xl border backdrop-blur-xl shadow-xl"
            style={{
              background: BG[t.type],
              borderColor: BORDER[t.type],
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}
          >
            <span className="flex-shrink-0 mt-0.5">{ICONS[t.type]}</span>
            <p className="flex-1 text-sm font-medium text-white/85">{t.message}</p>
            <button onClick={() => removeToast(t.id)} className="flex-shrink-0 text-white/30 hover:text-white/70 transition-colors">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

