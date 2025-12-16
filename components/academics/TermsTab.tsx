import { ShieldCheck, Calendar, Plus, MoreVertical, Search, Filter } from 'lucide-react';
import { ActionButton } from './ui/ActionButton';
import { TermRow, ExamSessionRow } from './types';

interface TermsTabProps {
  terms: TermRow[];
  sessions: ExamSessionRow[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onShowTermModal: () => void;
  onShowSessionModal: () => void;
  chipClass: (color: string) => string;
  formatDate: (date?: string | null) => string;
  onSelectTermForSession: (termId: number) => void;
}

export function TermsTab({
  terms,
  sessions,
  loading,
  search,
  onSearchChange,
  onShowTermModal,
  onShowSessionModal,
  chipClass,
  formatDate,
  onSelectTermForSession,
}: TermsTabProps) {
  const filteredTerms = terms.filter(t => 
    t.term_name.toLowerCase().includes(search.toLowerCase()) || 
    String(t.year).includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Terms & Exam Sessions</h3>
          <p className="text-sm text-gray-500">Define term dates and exam sessions (BOT/MOT/EOT)</p>
        </div>
        <div className="flex items-center gap-3">
          <ActionButton onClick={onShowTermModal} label="Add Term" icon={Plus} color="blue" compact />
          <ActionButton onClick={onShowSessionModal} label="Add Session" icon={Plus} color="orange" compact />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by year or term..."
                value={search}
                onChange={e => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
          <div className="text-sm text-gray-500">
            {terms.length} terms • {sessions.length} sessions
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : filteredTerms.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="mb-4">No terms created yet</p>
            <button
              type="button"
              onClick={onShowTermModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create your first Term
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTerms.map(term => {
              const termSessions = sessions.filter(s => s.term_id === term.id);
              return (
                <div key={term.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Calendar className="w-7 h-7 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-lg">
                          {term.term_name.replace('_', ' ')} • {term.year}
                        </h4>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-sm text-gray-500">
                            {formatDate(term.start_date)} → {formatDate(term.end_date)}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${chipClass('blue')}`}>
                            {termSessions.length} sessions
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectTermForSession(term.id)}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add Session
                    </button>
                  </div>

                  {termSessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      No exam sessions added for this term
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {termSessions.map(session => (
                        <div key={session.id} className="border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                                session.exam_type === 'BOT'
                                  ? chipClass('blue')
                                  : session.exam_type === 'MOT'
                                  ? chipClass('purple')
                                  : chipClass('orange')
                              }`}
                            >
                              {session.exam_type}
                            </span>
                            <button type="button" className="p-1 hover:bg-gray-100 rounded-lg">
                              <MoreVertical className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Start:</span>
                              <span className="font-medium">{formatDate(session.start_date)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">End:</span>
                              <span className="font-medium">{formatDate(session.end_date)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}