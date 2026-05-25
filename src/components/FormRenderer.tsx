import React, { useEffect, useState, useCallback } from 'react';
import { RadioField } from './fields/RadioField';
import { InputField } from './fields/InputField';
import { TextareaField } from './fields/TextareaField';
import { SliderField } from './fields/SliderField';
import { ReadonlyField } from './fields/ReadonlyField';
import { CheckboxField } from './fields/CheckboxField';

interface Option {
  value: string;
  text: string;
  score: number;
}

interface Condition {
  field_id: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS';
  value: any;
}

interface Rule {
  rule_type: 'SET_REQUIRED' | 'SET_VISIBLE' | 'SET_HIDDEN' | 'JUMP_TO';
  conditions: Condition[];
  target_field_id: string;
}

interface NumericScoreRule {
  operator: 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS' | 'GREATER_EQUAL' | 'LESS_EQUAL';
  value: number;
  score: number;
}

interface FormField {
  id: string;
  type: 'radio' | 'checkbox' | 'number' | 'text' | 'textarea' | 'slider' | 'readonly_api';
  label: string;
  is_visible_base?: boolean;
  is_required_base: boolean;
  backend_editable: boolean;
  options?: Option[];
  numeric_score_rules?: NumericScoreRule[];
  properties?: {
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
  };
  rules?: Rule[];
}

interface FormSchema {
  form_id: string;
  form_title: string;
  fields: FormField[];
}

interface FormRendererProps {
  schema: FormSchema;
  answers: Record<string, any>;
  onAnswersChange: (answers: Record<string, any>) => void;
  readOnly?: boolean;
  onLiveScoreChange?: (score: number) => void;
}

export const FormRenderer: React.FC<FormRendererProps> = ({
  schema,
  answers,
  onAnswersChange,
  readOnly = false,
  onLiveScoreChange
}) => {
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [requiredFields, setRequiredFields] = useState<Set<string>>(new Set());
  const [skippedFields, setSkippedFields] = useState<Set<string>>(new Set());
  const [highlightedFieldId, setHighlightedFieldId] = useState<string | null>(null);

  // Rule Evaluator Engine
  const evaluateRules = useCallback((fields: FormField[], currentAnswers: Record<string, any>) => {
    const visible = new Set<string>();
    const required = new Set<string>();
    const skipped = new Set<string>();

    // Initial setup: Default visibility & requirements
    fields.forEach(field => {
      if (field.is_visible_base !== false) {
        visible.add(field.id);
      }
      if (field.is_required_base) {
        required.add(field.id);
      }
    });

    // Evaluate rules
    fields.forEach((field, index) => {
      if (!field.rules || field.rules.length === 0) return;

      field.rules.forEach(rule => {
        // check condition
        let conditionMet = true;
        if (rule.conditions && rule.conditions.length > 0) {
          for (const cond of rule.conditions) {
            const val = currentAnswers[cond.field_id];
            let singleMet = false;

            if (cond.operator === 'EQUALS') {
              singleMet = String(val) === String(cond.value);
            } else if (cond.operator === 'NOT_EQUALS') {
              singleMet = String(val) !== String(cond.value);
            } else if (cond.operator === 'GREATER_THAN') {
              singleMet = Number(val) > Number(cond.value);
            } else if (cond.operator === 'LESS_THAN') {
              singleMet = Number(val) < Number(cond.value);
            } else if (cond.operator === 'CONTAINS') {
              if (Array.isArray(val)) {
                singleMet = val.includes(String(cond.value));
              } else {
                singleMet = String(val).includes(String(cond.value));
              }
            }

            if (!singleMet) {
              conditionMet = false;
              break;
            }
          }
        } else {
          conditionMet = false;
        }

        if (conditionMet) {
          const targetId = rule.target_field_id;
          if (rule.rule_type === 'SET_VISIBLE' && targetId) {
            visible.add(targetId);
          } else if (rule.rule_type === 'SET_HIDDEN' && targetId) {
            visible.delete(targetId);
            required.delete(targetId);
          } else if (rule.rule_type === 'SET_REQUIRED' && targetId) {
            required.add(targetId);
          } else if (rule.rule_type === 'JUMP_TO' && targetId) {
            visible.add(targetId);
            const targetIndex = fields.findIndex(f => f.id === targetId);
            if (targetIndex > index) {
              for (let i = index + 1; i < targetIndex; i++) {
                skipped.add(fields[i].id);
              }
            }
          }
        }
      });
    });

    // Remove skipped fields from visible & required
    const finalVisible = new Set<string>();
    visible.forEach(id => {
      if (!skipped.has(id)) {
        finalVisible.add(id);
      }
    });

    setVisibleFields(finalVisible);
    setRequiredFields(required);
    setSkippedFields(skipped);
  }, []);

  // Run evaluator when answers change
  useEffect(() => {
    evaluateRules(schema.fields, answers);
  }, [schema.fields, answers, evaluateRules]);

  // Recalculate Live Score
  useEffect(() => {
    if (!onLiveScoreChange) return;

    let score = 0;
    schema.fields.forEach(field => {
      if (!visibleFields.has(field.id)) return; // Skipped / Hidden fields don't count

      const val = answers[field.id];
      if (val === undefined || val === null || val === '') return;

      if (field.type === 'radio' || field.type === 'checkbox') {
        if (Array.isArray(val)) {
          val.forEach(v => {
            const opt = field.options?.find(o => o.value === String(v));
            if (opt && typeof opt.score === 'number') {
              score += opt.score;
            }
          });
        } else {
          const opt = field.options?.find(o => o.value === String(val));
          if (opt && typeof opt.score === 'number') {
            score += opt.score;
          }
        }
      } else if (['number', 'slider', 'readonly_api'].includes(field.type)) {
        const numVal = Number(val);
        if (!isNaN(numVal) && field.numeric_score_rules && Array.isArray(field.numeric_score_rules)) {
          field.numeric_score_rules.forEach(rule => {
            let met = false;
            const rVal = Number(rule.value);
            if (rule.operator === 'GREATER_THAN') met = numVal > rVal;
            else if (rule.operator === 'LESS_THAN') met = numVal < rVal;
            else if (rule.operator === 'EQUALS') met = numVal === rVal;
            else if (rule.operator === 'GREATER_EQUAL') met = numVal >= rVal;
            else if (rule.operator === 'LESS_EQUAL') met = numVal <= rVal;

            if (met && typeof rule.score === 'number') {
              score += rule.score;
            }
          });
        }
      }
    });

    onLiveScoreChange(score);
  }, [schema.fields, answers, visibleFields, onLiveScoreChange]);

  const handleFieldChange = (fieldId: string, value: any) => {
    const nextAnswers = {
      ...answers,
      [fieldId]: value
    };
    onAnswersChange(nextAnswers);

    // Dynamic visual jump animator
    const field = schema.fields.find(f => f.id === fieldId);
    if (field && field.rules) {
      field.rules.forEach(rule => {
        if (rule.rule_type === 'JUMP_TO' && rule.target_field_id) {
          let condMet = true;
          if (rule.conditions && rule.conditions.length > 0) {
            for (const cond of rule.conditions) {
              const val = nextAnswers[cond.field_id];
              let singleMet = false;

              if (cond.operator === 'EQUALS') {
                singleMet = String(val) === String(cond.value);
              } else if (cond.operator === 'NOT_EQUALS') {
                singleMet = String(val) !== String(cond.value);
              } else if (cond.operator === 'GREATER_THAN') {
                singleMet = Number(val) > Number(cond.value);
              } else if (cond.operator === 'LESS_THAN') {
                singleMet = Number(val) < Number(cond.value);
              } else if (cond.operator === 'CONTAINS') {
                if (Array.isArray(val)) {
                  singleMet = val.includes(String(cond.value));
                } else {
                  singleMet = String(val).includes(String(cond.value));
                }
              }

              if (!singleMet) {
                condMet = false;
                break;
              }
            }
          } else {
            condMet = false;
          }

          if (condMet) {
            const targetId = rule.target_field_id;
            setHighlightedFieldId(targetId);
            setTimeout(() => {
              setHighlightedFieldId(null);
            }, 2000);

            setTimeout(() => {
              const el = document.getElementById(`field-container-${targetId}`);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 150);
          }
        }
      });
    }
  };

  const getTriggeredRulesForField = (f: FormField) => {
    if (!f.rules) return [];
    return f.rules.filter(rule => {
      if (!rule.conditions || rule.conditions.length === 0) return false;
      for (const cond of rule.conditions) {
        const val = answers[cond.field_id];
        if (val === undefined || val === null || val === '') return false;
        
        let singleMet = false;
        if (cond.operator === 'EQUALS') {
          singleMet = String(val) === String(cond.value);
        } else if (cond.operator === 'NOT_EQUALS') {
          singleMet = String(val) !== String(cond.value);
        } else if (cond.operator === 'GREATER_THAN') {
          singleMet = Number(val) > Number(cond.value);
        } else if (cond.operator === 'LESS_THAN') {
          singleMet = Number(val) < Number(cond.value);
        } else if (cond.operator === 'CONTAINS') {
          if (Array.isArray(val)) {
            singleMet = val.includes(String(cond.value));
          } else {
            singleMet = String(val).includes(String(cond.value));
          }
        }
        if (!singleMet) return false;
      }
      return true;
    });
  };

  return (
    <div className="space-y-6">
      {schema.fields.map((field, idx) => {
        const isActive = visibleFields.has(field.id);
        const isRequired = requiredFields.has(field.id) && isActive;
        const value = answers[field.id];
        const isHighlighted = highlightedFieldId === field.id;
        const isSkipped = skippedFields.has(field.id);

        if (!isActive && !isSkipped) {
          return null;
        }

        return (
          <div
            key={field.id}
            id={`field-container-${field.id}`}
            className={`flex flex-col gap-3 animate-fade-in border-b border-slate-100 pb-5 last:border-b-0 p-4 rounded-2xl transition-all duration-500 ${
              isHighlighted
                ? 'ring-2 ring-teal-500 bg-teal-50/50 scale-[1.01] shadow-md border-transparent'
                : !isActive
                ? 'opacity-60 bg-slate-50/80 border border-dashed border-slate-200 pointer-events-none'
                : 'bg-white'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <span className="text-teal-600 font-bold bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-md text-xs whitespace-nowrap">
                  第 {idx + 1} 題
                </span>
                <span>{field.label}</span>
                {isRequired && <span className="text-rose-500 font-bold">*</span>}
              </label>
              {!isActive && (
                <span className="text-[10px] bg-slate-200 text-slate-500 font-bold px-2 py-0.5 rounded-full self-start sm:self-auto whitespace-nowrap">
                  ⚠️ 此題已跳過/目前不適用
                </span>
              )}
            </div>

            {isActive && getTriggeredRulesForField(field).map((rule, rKey) => {
              const targetIdx = schema.fields.findIndex(f => f.id === rule.target_field_id);
              if (targetIdx === -1) return null;
              const targetNum = targetIdx + 1;
              const targetLabel = schema.fields[targetIdx].label;

              let text = '';
              let colorClass = '';
              if (rule.rule_type === 'JUMP_TO') {
                text = `👉 [跳題指引] 請跳至第 ${targetNum} 題 ( ${targetLabel} ) 繼續作答`;
                colorClass = 'bg-teal-50 border-teal-200 text-teal-800';
              } else if (rule.rule_type === 'SET_VISIBLE') {
                text = `👉 [填答引導] 請繼續填寫第 ${targetNum} 題 ( ${targetLabel} )`;
                colorClass = 'bg-indigo-50 border-indigo-200 text-indigo-800';
              } else if (rule.rule_type === 'SET_HIDDEN') {
                text = `👉 [填答引導] 第 ${targetNum} 題 ( ${targetLabel} ) 目前已變更為無需填寫項目`;
                colorClass = 'bg-slate-100 border-slate-300 text-slate-700';
              } else if (rule.rule_type === 'SET_REQUIRED') {
                text = `⚠️ [必填提示] 第 ${targetNum} 題 ( ${targetLabel} ) 目前已變更為必填項目！`;
                colorClass = 'bg-rose-50 border-rose-200 text-rose-800';
              }

              return (
                <div key={rKey} className={`p-2.5 border rounded-xl text-xs font-semibold flex items-center gap-2 animate-pulse ${colorClass}`}>
                  <span>💡</span>
                  <span>{text}</span>
                </div>
              );
            })}

            {field.type === 'readonly_api' && (
              <ReadonlyField field={field} value={value} />
            )}

            {(field.type === 'text' || field.type === 'number') && (
              <InputField
                field={field}
                value={value}
                onChange={(val) => handleFieldChange(field.id, val)}
                isRequired={isRequired}
                readOnly={readOnly || !isActive}
              />
            )}

            {field.type === 'textarea' && (
              <TextareaField
                field={field}
                value={value}
                onChange={(val) => handleFieldChange(field.id, val)}
                isRequired={isRequired}
                readOnly={readOnly || !isActive}
              />
            )}

            {field.type === 'slider' && (
              <SliderField
                field={field}
                value={value}
                onChange={(val) => handleFieldChange(field.id, val)}
                readOnly={readOnly || !isActive}
              />
            )}

            {field.type === 'radio' && (
              <RadioField
                field={field}
                value={value}
                onChange={(val) => handleFieldChange(field.id, val)}
                isRequired={isRequired}
                readOnly={readOnly || !isActive}
              />
            )}

            {field.type === 'checkbox' && (
              <CheckboxField
                field={field}
                value={value}
                onChange={(val) => handleFieldChange(field.id, val)}
                readOnly={readOnly || !isActive}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
