import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Loader2, User, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { formatDateTime } from '../../utils/formatters';
import { useUIStore } from '../../store/uiStore';
import type { ActivityLog } from '../../types';

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  sale:   'bg-gold-100 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400',
  rental: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  return: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
};

export function ActivityLogPage() {
  const { t } = useTranslation();
  const { language } = useUIStore();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.activity.getLog(200).then(setLogs).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold"
          style={{ fontFamily:'Cairo,sans-serif', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.60)', border:'1px solid rgba(255,255,255,0.10)' }}>
          <ArrowRight size={15} /> رجوع
        </button>
        <h1 className="text-2xl font-bold text-navy-800 dark:text-cream-100 flex items-center gap-2 flex-1">
          <ClipboardList size={24} className="text-gold-500" /> {t('nav.activityLog')}
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-gold-500" /></div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-navy-400">
          <ClipboardList size={48} className="mb-3 opacity-30" />
          <p>{t('messages.noData')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id} padding="sm" className="animate-slide-up">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-gold-600 dark:text-gold-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                      {log.action}
                    </span>
                    <span className="text-xs text-navy-400 bg-cream-100 dark:bg-navy-800 px-2 py-0.5 rounded-full">{log.entity_type}</span>
                  </div>
                  <p className="text-sm text-navy-700 dark:text-cream-200 mt-1">{log.description}</p>
                  <p className="text-xs text-navy-400 mt-0.5">{formatDateTime(log.created_at, language)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
