import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
  isDirty?: boolean;
}

export function Modal({ open, onClose, title, children, size = 'md', footer, isDirty = false }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isDirty) onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose, isDirty]);

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => { if (!isDirty) onClose(); }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'relative w-full rounded-2xl border border-white/14',
              sizes[size]
            )}
            style={{
              background: 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(32px) saturate(180%)',
              WebkitBackdropFilter: 'blur(32px) saturate(180%)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.26), 0 0 0 0.5px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(0,0,0,0.12)',
            }}
          >
            {title && (
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <h2 className="text-base font-bold text-white/90">{title}</h2>
                <motion.button
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)', scale: 1.05 }}
                  whileTap={{ scale: 0.93 }}
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white/80 transition-colors"
                >
                  <X size={17} />
                </motion.button>
              </div>
            )}
            <div className="p-5 max-h-[70vh] overflow-y-auto scrollbar-thin">{children}</div>
            {footer && (
              <div className="px-5 py-4 border-t border-white/8 flex gap-3 justify-end">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'تأكيد', danger = false, loading }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>إلغاء</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-white/65">{message}</p>
    </Modal>
  );
}
