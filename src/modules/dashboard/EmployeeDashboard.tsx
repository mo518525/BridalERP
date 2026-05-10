import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, CheckSquare, Plus, Trash2, Check } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { tok } from '../../utils/themeTokens';
import { api } from '../../lib/api';
import { formatDate } from '../../utils/formatters';
import type { Announcement, EmployeeTodo } from '../../types';

function glass(isDark: boolean, extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.38)',
    backdropFilter: isDark ? 'blur(16px) saturate(148%)' : 'blur(22px) saturate(180%)',
    WebkitBackdropFilter: isDark ? 'blur(16px) saturate(148%)' : 'blur(22px) saturate(180%)',
    border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.94)',
    boxShadow: isDark
      ? '0 18px 38px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.08)'
      : '0 14px 28px rgba(180,180,180,0.03), inset 0 1px 0 rgba(255,255,255,0.99)',
    ...extra,
  };
}

export function EmployeeDashboard() {
  const { theme, addToast, language } = useUIStore();
  const { user: me } = useAuthStore();
  const isDark = theme === 'dark';
  const t = tok(isDark);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [todos, setTodos] = useState<EmployeeTodo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.announcements.getAll().then(setAnnouncements).catch(console.error);
    api.todos.getAll().then(setTodos).catch(console.error);
  }, []);

  const addTodo = async () => {
    const text = newTodo.trim();
    if (!text) return;
    try {
      const created = await api.todos.create(text);
      setTodos(prev => [...prev, created]);
      setNewTodo('');
      inputRef.current?.focus();
    } catch (e) { addToast('error', String(e)); }
  };

  const toggleTodo = async (id: string) => {
    try {
      await api.todos.toggle(id);
      setTodos(prev => prev.map(td => td.id === id ? { ...td, done: !td.done } : td));
    } catch (e) { addToast('error', String(e)); }
  };

  const deleteTodo = async (id: string) => {
    try {
      await api.todos.delete(id);
      setTodos(prev => prev.filter(td => td.id !== id));
    } catch (e) { addToast('error', String(e)); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04, type: 'spring', stiffness: 440, damping: 38 }}
        className="rounded-[24px] px-5 py-4"
        style={glass(isDark)}
      >
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.15rem', fontWeight: 700, color: t.text1 }}>
          مرحباً، {me?.name}
        </h1>
        <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.72rem', color: t.textMuted, marginTop: 2 }}>
          {new Date().toLocaleDateString('ar-SY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </motion.div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">

        {/* Announcements */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, type: 'spring', stiffness: 440, damping: 38 }}
          className="rounded-[24px] p-5"
          style={glass(isDark)}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <span style={{ color: t.gold }}><Megaphone size={17} /></span>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1rem', color: t.text1 }}>
              إعلانات الإدارة
            </h2>
          </div>

          {announcements.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2" style={{ color: t.textFaint }}>
              <Megaphone size={32} className="opacity-25" />
              <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem' }}>لا توجد إعلانات حالياً</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {announcements.map((ann, i) => (
                  <motion.div
                    key={ann.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-[16px] px-4 py-3"
                    style={{
                      background: isDark ? 'rgba(201,168,76,0.07)' : 'rgba(201,168,76,0.06)',
                      border: isDark ? '1px solid rgba(201,168,76,0.20)' : '1px solid rgba(201,168,76,0.18)',
                    }}
                  >
                    <p style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: '0.88rem', color: t.text1 }}>
                      {ann.title}
                    </p>
                    {ann.body && (
                      <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem', color: t.text2, marginTop: 4, lineHeight: 1.6 }}>
                        {ann.body}
                      </p>
                    )}
                    <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.63rem', color: t.textFaint, marginTop: 6 }}>
                      {formatDate(ann.created_at, language)}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Todo list */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.12, type: 'spring', stiffness: 440, damping: 38 }}
          className="rounded-[24px] p-5 flex flex-col"
          style={glass(isDark)}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <span style={{ color: t.gold }}><CheckSquare size={17} /></span>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1rem', color: t.text1 }}>
              مهامي
            </h2>
            <span className="mr-auto text-xs px-2 py-0.5 rounded-full"
              style={{ fontFamily: 'Cairo, sans-serif', background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', color: t.textMuted }}>
              {todos.filter(td => !td.done).length} متبقية
            </span>
          </div>

          {/* Add input */}
          <div className="flex gap-2 mb-4">
            <input
              ref={inputRef}
              value={newTodo}
              onChange={e => setNewTodo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTodo()}
              placeholder="أضف مهمة جديدة..."
              className="flex-1 rounded-[12px] px-3 py-2 text-sm outline-none"
              style={{
                fontFamily: 'Cairo, sans-serif',
                background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.08)',
                color: t.text1,
              }}
            />
            <button
              onClick={addTodo}
              disabled={!newTodo.trim()}
              className="flex items-center justify-center w-9 h-9 rounded-[12px] flex-shrink-0 disabled:opacity-40"
              style={{ background: 'rgba(201,168,76,0.18)', color: t.gold, border: '1px solid rgba(201,168,76,0.30)' }}
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Todo items */}
          <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
            <AnimatePresence initial={false}>
              {todos.length === 0 && (
                <div className="flex flex-col items-center py-10 gap-2" style={{ color: t.textFaint }}>
                  <CheckSquare size={28} className="opacity-25" />
                  <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.75rem' }}>لا توجد مهام — أضف واحدة!</p>
                </div>
              )}
              {todos.map(td => (
                <motion.div
                  key={td.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 group"
                  style={{
                    background: td.done
                      ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)')
                      : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.60)'),
                    border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(255,255,255,0.80)',
                  }}
                >
                  <button
                    onClick={() => toggleTodo(td.id)}
                    className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center"
                    style={{
                      background: td.done ? 'rgba(16,185,129,0.20)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                      border: td.done ? '1.5px solid rgba(16,185,129,0.50)' : (isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid rgba(0,0,0,0.12)'),
                      color: td.done ? '#10b981' : 'transparent',
                    }}
                  >
                    {td.done && <Check size={11} strokeWidth={3} />}
                  </button>
                  <span
                    className="flex-1 text-sm"
                    style={{
                      fontFamily: 'Cairo, sans-serif',
                      color: td.done ? t.textFaint : t.text1,
                      textDecoration: td.done ? 'line-through' : 'none',
                    }}
                  >
                    {td.text}
                  </span>
                  <button
                    onClick={() => deleteTodo(td.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    style={{ color: '#e05252' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
