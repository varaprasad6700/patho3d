import React, { useState } from 'react';
import { X, Search, AlertCircle, Loader2 } from 'lucide-react';
import { validateClinicalQuery } from '../utils/pathologyEngine';

interface AskPathologyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitQuery: (query: string) => Promise<void>;
  isLoading: boolean;
  serverError: string | null;
}

const EXAMPLE_DOCTOR_QUESTIONS = [
  'How does chronic portal hypertension in hepatic cirrhosis cause splanchnic vasodilation and hepatorenal syndrome?',
  'How does LAD plaque rupture trigger acute myocardial stunning and eccentric left ventricular remodeling?',
  'How does chronic hyperglycemia cause glomerular hyperfiltration and Kimmelstiel-Wilson nodular sclerosis?',
  'How do NSAIDs and H. pylori erode the gastroduodenal mucosal barrier and trigger peritoneal guarding upon perforation?',
  'How does severe sepsis cause endothelial glycocalyx shedding, NETosis, and microvascular immunothrombosis?',
  'How does acute MCA stroke trigger glutamate NMDA excitotoxicity, cytotoxic edema, and reactive astrogliosis?',
];

export const AskPathologyModal: React.FC<AskPathologyModalProps> = ({
  isOpen,
  onClose,
  onSubmitQuery,
  isLoading,
  serverError,
}) => {
  const [questionInput, setQuestionInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateClinicalQuery(questionInput);
    if (!check.valid) {
      setValidationError(check.error ?? 'Invalid clinical query.');
      return;
    }
    setValidationError(null);
    await onSubmitQuery(check.sanitizedQuery);
    setQuestionInput('');
  };

  const handleSelectExample = (q: string) => {
    setQuestionInput(q);
    setValidationError(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ask-pathology-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="ask-pathology-dialog-title"
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              Ask a Clinical Pathophysiology & Host Reaction Question
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Describe any disease process across Cardiovascular, Gastrointestinal, Hepatobiliary,
              Renal, Respiratory, Neurological, or Cellular systems to generate an interactive 4-stage
              3D model.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close pathology query dialog"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="mt-4 space-y-4" noValidate>
          <div>
            <label
              htmlFor="clinical-question-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Clinical Question or Pathological Mechanism
            </label>
            <textarea
              id="clinical-question-input"
              rows={3}
              value={questionInput}
              onChange={(e) => {
                setQuestionInput(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="e.g., How does chronic aortic stenosis trigger concentric left ventricular hypertrophy and subendocardial ischemia?"
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {(validationError || serverError) && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 p-3 text-xs text-rose-700 dark:text-rose-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{validationError || serverError}</span>
            </div>
          )}

          {/* Quick-Fill Clinical Question Examples */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Sample Physician & Medical Board Questions (Click to populate):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXAMPLE_DOCTOR_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectExample(q)}
                  disabled={isLoading}
                  className="text-left rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 hover:border-teal-500/60 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  <span className="block line-clamp-2 leading-snug">{q}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-60 px-4 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing 3D Pathophysiology...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Generate 3D Model & Reaction</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
