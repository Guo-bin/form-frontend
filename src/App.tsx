import { useState, useEffect } from 'react';
import { FormRenderer } from './components/FormRenderer';

interface FormTemplate {
  form_id: string;
  form_type: string;
  form_title: string;
  version: string;
  created_by: string;
}

interface FormSchema {
  form_id: string;
  form_title: string;
  fields: any[];
}

interface TimelineEvent {
  event_id: string;
  date: string;
  type: string;
  title: string;
  description: string;
  created_by: string;
  record_id?: string;
  form_id?: string;
}

interface EduArticle {
  id: string;
  specialty: string;
  title: string;
  content: string;
}

export default function App() {
  const API_BASE = (import.meta.env.VITE_API_URL || 'https://form-server-ysnw.onrender.com').replace(/\/$/, '');

  const [currentTab, setCurrentTab] = useState<'forms' | 'timeline' | 'education'>('forms');
  const [formsList, setFormsList] = useState<FormTemplate[]>([]);

  // Selected Form for Filling
  const [activeFormId, setActiveFormId] = useState<string | null>(null);
  const [activeSchema, setActiveSchema] = useState<FormSchema | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [liveScore, setLiveScore] = useState<number>(0);

  // Patient Identity state (Prompted before form start or when looking at timeline)
  const [patientId, setPatientId] = useState<string>('P001');
  const [patientName, setPatientName] = useState<string>('王小明');
  const [showIdentityModal, setShowIdentityModal] = useState<boolean>(false);
  const [identityConfirmed, setIdentityConfirmed] = useState<boolean>(false);

  // Past record viewing state
  const [viewingPastRecordId, setViewingPastRecordId] = useState<string | null>(null);
  const [pastAnswers, setPastAnswers] = useState<Record<string, any>>({});
  const [pastSchema, setPastSchema] = useState<FormSchema | null>(null);
  const [pastScore, setPastScore] = useState<number>(0);

  // Timeline & articles
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [eduArticles, setEduArticles] = useState<EduArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Submit states
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [lastSubmittedScore, setLastSubmittedScore] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Pre-seeded patient lists for convenient user selection (but they can type anything)
  const samplePatients = [
    { id: 'P001', name: '王小明', label: '王小明 (Rheum JIA)' },
    { id: 'P002', name: '李美美', label: '李美美 (Rheum JIA)' },
    { id: 'P003', name: '陳小華', label: '陳小華 (ALL 白血病)' }
  ];

  // 1. Fetch Form Templates List on Mount/Tab change
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/forms`)
      .then(res => res.json())
      .then((data: FormTemplate[]) => {
        setFormsList(data);
      })
      .catch(err => console.error('Error fetching forms:', err));
  }, []);

  // 2. Fetch Timeline when patientId changes or timeline is loaded
  const fetchTimeline = () => {
    if (!patientId) return;
    fetch(`${API_BASE}/api/v1/patients/${patientId}/timeline`)
      .then(res => res.json())
      .then((data: { events: TimelineEvent[] }) => {
        setTimelineEvents(data.events || []);
      })
      .catch(err => console.error('Error loading timeline:', err));
  };

  useEffect(() => {
    if (currentTab === 'timeline') {
      fetchTimeline();
    }
  }, [currentTab, patientId]);

  // 3. Fetch Edu Articles
  useEffect(() => {
    const specialty = activeFormId && formsList.find(f => f.form_id === activeFormId)?.form_type === 'ALL_Care' 
      ? 'ALL Care' 
      : 'Rheum Care';
    
    const url = `${API_BASE}/api/v1/education?specialty=${encodeURIComponent(specialty)}&search=${encodeURIComponent(searchQuery)}`;
    fetch(url)
      .then(res => res.json())
      .then((data: EduArticle[]) => {
        setEduArticles(data);
      })
      .catch(err => console.error('Error loading education:', err));
  }, [activeFormId, formsList, searchQuery, currentTab]);

  // Trigger form start - check identity first
  const handleStartForm = (formId: string) => {
    setActiveFormId(formId);
    setSubmitSuccess(false);
    setViewingPastRecordId(null);
    
    if (!identityConfirmed) {
      setShowIdentityModal(true);
    } else {
      loadFormSchema(formId);
    }
  };

  // Load Schema and prefill read-only APIs
  const loadFormSchema = (formId: string) => {
    fetch(`${API_BASE}/api/v1/forms/${formId}/render`)
      .then(res => res.json())
      .then((sch: FormSchema) => {
        setActiveSchema(sch);

        // Fetch patient details to prefill lab metrics
        return fetch(`${API_BASE}/api/v1/patients`);
      })
      .then(res => res.json())
      .then((patientsList: any[]) => {
        const patientData = patientsList.find(p => p.patient_id === patientId) || {};
        
        // Setup initial answers
        const init: Record<string, any> = {};
        if (activeSchema) {
          activeSchema.fields.forEach((field: any) => {
            if (field.type === 'readonly_api') {
              if (field.id === 'q0_patient_id') init[field.id] = patientId;
              else if (field.id === 'q0_patient_name') init[field.id] = patientName;
              else if (field.id === 'q6_wbc' || field.id === 'q7_wbc') init[field.id] = patientData.wbc || '3.8';
              else if (field.id === 'q6_crp' || field.id === 'q7_crp') init[field.id] = patientData.crp || '1.2';
            } else {
              init[field.id] = field.properties?.default_value !== undefined 
                ? field.properties.default_value 
                : '';
            }
          });
          setAnswers(init);
        }
      })
      .catch(err => console.error('Error rendering form schema:', err));
  };

  // Confirm identity dialog action
  const handleConfirmIdentity = () => {
    if (!patientId || !patientName) {
      alert('請填寫病患 ID 與姓名！');
      return;
    }
    setIdentityConfirmed(true);
    setShowIdentityModal(false);
    if (activeFormId) {
      loadFormSchema(activeFormId);
    }
  };

  // Submit form answers
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSchema || !activeFormId) return;

    setSubmitting(true);
    fetch(`${API_BASE}/api/v1/forms/${activeFormId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        patient_id: patientId,
        patient_answers: answers
      })
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(d => { throw new Error(d.error || 'Submit failed'); });
        }
        return res.json();
      })
      .then(data => {
        setSubmitting(false);
        setSubmitSuccess(true);
        setLastSubmittedScore(data.total_score);
        setActiveFormId(null);
        setActiveSchema(null);
        // Refresh timeline
        fetchTimeline();
      })
      .catch(err => {
        setSubmitting(false);
        alert(err.message);
      });
  };

  // View historical submissions in read-only form
  const handleViewPastRecord = (recordId: string, formId: string) => {
    fetch(`${API_BASE}/api/v1/records/view/${recordId}`)
      .then(res => res.json())
      .then(data => {
        setPastAnswers({ ...data.patient_answers, ...data.backend_answers });
        setPastScore(data.total_score);
        setViewingPastRecordId(recordId);

        return fetch(`${API_BASE}/api/v1/forms/${formId}/render`);
      })
      .then(res => res.json())
      .then((sch: FormSchema) => {
        setPastSchema(sch);
      })
      .catch(err => console.error('Error loading history copy:', err));
  };

  return (
    <div className="max-w-5xl mx-auto my-8 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 pb-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏥</span>
          <div>
            <h1 className="text-xl font-bold text-slate-800">智慧照護與個案管理系統</h1>
            <p className="text-xs text-slate-500 font-medium">病患居家自主照護端</p>
          </div>
        </div>
        
        <div className="flex gap-1.5 bg-slate-100 p-1 border border-slate-200 rounded-xl self-start md:self-auto">
          <button 
            className={`px-4 py-2 rounded-lg font-semibold text-xs md:text-sm transition-all ${
              currentTab === 'forms' 
                ? 'bg-teal-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
            }`}
            onClick={() => { setCurrentTab('forms'); setActiveFormId(null); setActiveSchema(null); setViewingPastRecordId(null); }}
          >
            📋 選擇診斷表單
          </button>
          <button 
            className={`px-4 py-2 rounded-lg font-semibold text-xs md:text-sm transition-all ${
              currentTab === 'timeline' 
                ? 'bg-teal-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
            }`}
            onClick={() => { setCurrentTab('timeline'); setViewingPastRecordId(null); }}
          >
            ⏰ 健康歷程時間軸
          </button>
          <button 
            className={`px-4 py-2 rounded-lg font-semibold text-xs md:text-sm transition-all ${
              currentTab === 'education' 
                ? 'bg-teal-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
            }`}
            onClick={() => setCurrentTab('education')}
          >
            📚 衛教專區
          </button>
        </div>
      </header>

      {/* Patient info indicator */}
      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl mb-6 flex flex-col sm:flex-row gap-3 sm:items-center text-xs text-slate-600">
        <div className="flex items-center gap-1">
          <span>👤 當前填寫身份：</span>
          <span className="font-bold text-slate-800">
            {identityConfirmed ? `${patientName} (ID: ${patientId})` : '未驗證身份 (預設P001)'}
          </span>
        </div>
        <button
          onClick={() => setShowIdentityModal(true)}
          className="text-teal-600 hover:underline font-semibold sm:ml-auto"
        >
          ✏️ 切換/設定病患身份
        </button>
      </div>

      {/* Identity Setting Dialog modal overlay */}
      {showIdentityModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl text-slate-800">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">👤 設定填報者病患身份</h3>
            
            <div className="space-y-4">
              {/* Quick Select for testing */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                <span className="text-[10px] text-slate-500 font-bold block">快速切換測試病患：</span>
                <div className="flex gap-2">
                  {samplePatients.map(sp => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => { setPatientId(sp.id); setPatientName(sp.name); }}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-700"
                    >
                      {sp.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-600 font-bold">病患識別碼 (Patient ID)：</label>
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="如: P001"
                  style={{ colorScheme: 'light' }}
                  className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-xs outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-600 font-bold">病患姓名 (Patient Name)：</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="如: 王小明"
                  style={{ colorScheme: 'light' }}
                  className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-xs outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 mt-5">
              <button
                onClick={handleConfirmIdentity}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                確認身份並繼續
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: FORMS LIST */}
      {/* ========================================================= */}
      {currentTab === 'forms' && (
        <div className="animate-fade-in">
          {submitSuccess && (
            <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 p-6 rounded-xl text-center mb-6 animate-fade-in">
              <h3 className="text-base font-bold">🎉 表單提交成功！</h3>
              <p className="text-xs text-slate-600 mt-1">
                您的填表結果已存檔。系統自動疾病活性得分：<strong className="text-emerald-700 text-lg font-bold">{lastSubmittedScore} 分</strong>。
              </p>
              <button 
                onClick={() => setSubmitSuccess(false)}
                className="mt-4 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
              >
                好的，關閉
              </button>
            </div>
          )}

          {activeSchema && activeFormId ? (
            <form onSubmit={handleSubmitForm} className="animate-fade-in">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-5">
                  <h2 className="text-sm font-bold text-slate-800">{activeSchema.form_title}</h2>
                  <button 
                    type="button" 
                    onClick={() => { setActiveFormId(null); setActiveSchema(null); }}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                  >
                    ✕ 取消並返回
                  </button>
                </div>

                <FormRenderer
                  schema={activeSchema}
                  answers={answers}
                  onAnswersChange={setAnswers}
                  onLiveScoreChange={setLiveScore}
                />
              </div>

              {/* Sticky live calculator preview */}
              <div className="sticky bottom-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white border border-teal-600/30 rounded-2xl p-5 shadow-lg z-10 animate-slide-up">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-sans">表單即時評估</span>
                  <span className="text-sm text-slate-700 font-medium">即時分數加總預覽</span>
                </div>
                <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-2xl font-extrabold text-teal-600 bg-teal-500/10 px-4 py-1.5 border border-teal-500/20 rounded-xl font-mono">
                    {liveScore} <span className="text-xs font-normal text-slate-500">分</span>
                  </div>
                  <button 
                    type="submit" 
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm shadow-sm transition-all active:scale-[0.98]"
                    disabled={submitting}
                  >
                    {submitting ? '提交中...' : '確認提交答案'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div>
              <h2 className="text-base font-bold text-slate-800 mb-4 pb-1 border-b border-slate-200">
                📋 可用診斷表單項目
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formsList.map(form => (
                  <div 
                    key={form.form_id} 
                    className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
                  >
                    <div>
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded mb-2.5 ${
                        form.form_type === 'ALL_Care' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-violet-100 text-violet-800'
                      }`}>
                        {form.form_type}
                      </span>
                      <h3 className="text-sm font-bold text-slate-800 mb-1">{form.form_title}</h3>
                      <p className="text-[10px] text-slate-400 font-medium">
                        版本: {form.version} | 建立者: {form.created_by}
                      </p>
                    </div>

                    <button
                      onClick={() => handleStartForm(form.form_id)}
                      className="mt-5 w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                    >
                      開始填寫表單
                    </button>
                  </div>
                ))}
                {formsList.length === 0 && (
                  <div className="col-span-2 py-8 text-center text-slate-400 text-xs">
                    目前伺服器中尚無任何發佈的表單範本。請先至後台 (localhost:3003) 設計並發佈表單。
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: TIMELINE */}
      {/* ========================================================= */}
      {currentTab === 'timeline' && (
        <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline Events list */}
          <div className="lg:col-span-2">
            <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
              📅 病患健康歷程時間軸
            </h2>
            
            {timelineEvents.length > 0 ? (
              <div className="flex flex-col gap-6 relative pl-6 mt-6 border-l border-slate-200 ml-2">
                {timelineEvents.map(event => {
                  let dotColorClass = 'bg-slate-400';
                  if (event.type === 'form') dotColorClass = 'bg-teal-500 shadow-sm';
                  else if (event.type === 'medication') dotColorClass = 'bg-violet-500 shadow-sm';
                  else if (event.type === 'visit') dotColorClass = 'bg-amber-500 shadow-sm';

                  const hasRecordLink = event.title.includes('表單提交');

                  return (
                    <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-5 hover:bg-slate-100 transition-all" key={event.event_id}>
                      <div className={`absolute -left-[30px] top-6.5 w-2 h-2 rounded-full border border-white ${dotColorClass}`}></div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1.5">
                        <span className="font-semibold uppercase tracking-wider text-[9px]">分類: {event.type}</span>
                        <span>{event.date}</span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-800 mb-1">{event.title}</h3>
                      <p className="text-xs text-slate-600">{event.description}</p>
                      
                      <div className="flex justify-between items-center mt-3">
                        {hasRecordLink && event.record_id && event.form_id && (
                          <button
                            onClick={() => handleViewPastRecord(event.record_id!, event.form_id!)} 
                            className="text-[10px] text-teal-600 hover:text-teal-700 font-semibold underline"
                          >
                            🔍 檢視填寫明細 (唯讀模式)
                          </button>
                        )}
                        <p className="text-[10px] text-slate-500 font-medium ml-auto">記錄人：{event.created_by}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm">
                尚無此病患 ID 的歷程紀錄。請先填表提交以自動生成第一筆歷程。
              </div>
            )}
          </div>

          {/* Read-only Past Record Inspect Panel */}
          <div className="lg:col-span-1">
            {viewingPastRecordId && pastSchema ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 animate-fade-in shadow-xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-bold text-teal-600">🔍 填報歷史唯讀檢視</h3>
                  <button 
                    onClick={() => setViewingPastRecordId(null)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="text-[10px] text-slate-500 space-y-1 bg-white p-2.5 border border-slate-200 rounded-lg">
                  <div>紀錄識別代碼: <strong>{viewingPastRecordId}</strong></div>
                  <div>當次得分: <strong className="text-teal-600 font-bold">{pastScore} 分</strong></div>
                </div>

                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  <FormRenderer
                    schema={pastSchema}
                    answers={pastAnswers}
                    onAnswersChange={() => {}}
                    readOnly={true}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center text-slate-400 text-xs">
                💡 填表送出後，若在時間軸有看到「表單提交」事件，您可以點擊「檢視填寫明細」在右側查看病患當時填報的答題內容。
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: EDUCATION */}
      {currentTab === 'education' && (
        <div className="animate-fade-in">
          <div className="mb-6">
            <input 
              type="text" 
              style={{ colorScheme: 'light' }}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all text-sm shadow-xs"
              placeholder="搜尋衛教文章標題或內容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            {eduArticles.length > 0 ? (
              eduArticles.map(art => (
                <div 
                  className="bg-white border border-slate-200 rounded-xl p-5 hover:translate-y-[-2px] hover:border-slate-300 transition-all duration-300 shadow-xs"
                  key={art.id}
                >
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mb-3 bg-teal-500/10 border border-teal-500/20 text-teal-600">
                    {art.specialty}
                  </span>
                  <h3 className="text-sm font-bold text-slate-800 mb-2">{art.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{art.content}</p>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                沒有找到符合的衛教文章。
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
