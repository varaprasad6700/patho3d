import React, { useState } from 'react';
import {
  AnatomicalHotspot,
  BiomarkerMetric,
  BiomarkerStatus,
  PathologyModelSpec,
} from '../types/pathology';
import { ORGAN_SYSTEM_LABELS } from '../data/clinicalCases';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Activity,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Crosshair,
  GitBranch,
  Microscope,
  PanelRightClose,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';

interface ClinicalInspectorPanelProps {
  activeCase: PathologyModelSpec;
  allCases: PathologyModelSpec[];
  onSelectCase: (caseSpec: PathologyModelSpec) => void;
  activeStageIndex: 0 | 1 | 2 | 3;
  onSelectStage: (stageIdx: 0 | 1 | 2 | 3) => void;
  interpolatedBiomarkers: BiomarkerMetric[];
  selectedHotspotId: string;
  onSelectHotspot: (id: string) => void;
  onOpenAskModal: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onCollapsePanel?: () => void;
}

type InspectorTab = 'mechanism' | 'hotspots' | 'cascade' | 'library';

function formatBiomarkerStatus(status: BiomarkerStatus): {
  glyph: string;
  label: string;
  colorClass: string;
} {
  switch (status) {
    case 'critical':
      return {
        glyph: '✖',
        label: 'Critical',
        colorClass: 'text-rose-600 dark:text-rose-400',
      };
    case 'elevated':
      return {
        glyph: '▲',
        label: 'Elevated',
        colorClass: 'text-amber-600 dark:text-amber-400',
      };
    case 'depressed':
      return {
        glyph: '▼',
        label: 'Depressed',
        colorClass: 'text-sky-600 dark:text-sky-400',
      };
    default:
      return {
        glyph: '●',
        label: 'Nominal',
        colorClass: 'text-emerald-600 dark:text-emerald-400',
      };
  }
}

export const ClinicalInspectorPanel: React.FC<ClinicalInspectorPanelProps> = ({
  activeCase,
  allCases,
  onSelectCase,
  activeStageIndex,
  onSelectStage,
  interpolatedBiomarkers,
  selectedHotspotId,
  onSelectHotspot,
  onOpenAskModal,
  isDark,
  onToggleTheme,
  onCollapsePanel,
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('mechanism');
  const [telemetryOpen, setTelemetryOpen] = useState<boolean>(true);

  const currentStage = activeCase.stages[activeStageIndex];
  const selectedHotspot: AnatomicalHotspot =
    activeCase.hotspots.find((h) => h.id === selectedHotspotId) ?? activeCase.hotspots[0];
  const organInfo = ORGAN_SYSTEM_LABELS[activeCase.organSystem];

  return (
    <aside
      aria-label="Clinical Pathophysiology and Host Reaction Inspector"
      className="w-full lg:w-[440px] xl:w-[480px] shrink-0 h-full bg-white dark:bg-[#0B0F19] border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
    >
      {/* Inspector Utility Bar: Organ Metadata + Theme Toggle + PWA Install + Hide Panel */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate">
          <span className="font-semibold text-teal-700 dark:text-teal-400">
            {organInfo.shortLabel}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono">{activeCase.icdCode}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <PWAInstallButton />
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to Clinical Light Theme' : 'Switch to Dark Surgical Theme'}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          {onCollapsePanel && (
            <button
              type="button"
              onClick={onCollapsePanel}
              aria-label="Hide Clinical Inspector Panel"
              title="Hide Clinical Inspector Panel (Shortcut: I)"
              className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
              <span>Hide</span>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Quantitative Physiological Biomarkers Strip (Tabular Numerals) */}
      <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-[#0F1624] border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setTelemetryOpen((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-teal-500 transition-colors cursor-pointer"
            aria-expanded={telemetryOpen}
          >
            <span>Stage {activeStageIndex} Lab & Hemodynamic Telemetry</span>
            {telemetryOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setTelemetryOpen((prev) => !prev)}
            className="text-[11px] font-mono text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
          >
            {telemetryOpen ? 'Hide Metrics' : 'Show Metrics'}
          </button>
        </div>

        {telemetryOpen && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {interpolatedBiomarkers.map((bm) => {
              const st = formatBiomarkerStatus(bm.status);
              return (
                <div
                  key={bm.label}
                  className="rounded-xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800/90 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="truncate font-medium">{bm.label}</span>
                    <span className={`font-mono text-[11px] font-semibold ${st.colorClass}`}>
                      {st.glyph} {st.label}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-base font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                      {bm.value.toFixed(bm.decimals ?? 0)}
                    </span>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {bm.unit}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] font-mono text-slate-400 dark:text-slate-500">
                    Ref: {bm.referenceRange}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Segmented Inspector Navigation Tabs */}
      <div className="px-5 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div
          role="tablist"
          aria-label="Clinical Inspector Views"
          className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'mechanism'}
            onClick={() => setActiveTab('mechanism')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'mechanism'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>Mechanism</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'hotspots'}
            onClick={() => setActiveTab('hotspots')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'hotspots'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>Hotspots ({activeCase.hotspots.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'cascade'}
            onClick={() => setActiveTab('cascade')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'cascade'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>Cascade</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'library'}
            onClick={() => setActiveTab('library')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'library'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>Cases ({allCases.length})</span>
          </button>
        </div>
      </div>

      {/* Scrollable Inspector Content Area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* TAB 1: STAGE PATHOPHYSIOLOGY & BODY REACTION */}
        {activeTab === 'mechanism' && (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-mono text-teal-600 dark:text-teal-400 font-semibold">
                0{currentStage.stageIndex + 1}. {currentStage.timeCourse}
              </div>
              <h2 className="mt-0.5 text-base font-bold text-slate-900 dark:text-white text-balance">
                {currentStage.stageName}
              </h2>
            </div>

            {/* How Pathology Affects the Body */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4 space-y-1.5">
              <div className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                1. Pathological Insult & Tissue Damage
              </div>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {currentStage.pathophysiologyNarrative}
              </p>
            </div>

            {/* How the Body Reacts (Compensatory / Immunological) */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4 space-y-1.5">
              <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                2. Host Physiological & Immunological Reaction
              </div>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {currentStage.bodyReactionNarrative}
              </p>
            </div>

            {/* Histological & Cellular Hallmark */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400">
                <Microscope className="w-3.5 h-3.5" />
                <span>3. Histological & Cellular Biopsy Hallmark</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {currentStage.histologicalHallmark}
              </p>
            </div>

            {/* Active 3D Hotspot Quick Card */}
            {selectedHotspot && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Pinned 3D Anatomical Locus #{selectedHotspot.indexNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('hotspots')}
                    className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                  >
                    View all {activeCase.hotspots.length} hotspots →
                  </button>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1.5">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedHotspot.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedHotspot.anatomicalStructure}
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 pt-1">
                    <strong className="text-slate-900 dark:text-white">Reaction:</strong>{' '}
                    {selectedHotspot.bodyReaction}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: 3D ANATOMICAL HOTSPOTS */}
        {activeTab === 'hotspots' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select an anatomical hotspot to focus the 3D camera and inspect local tissue damage
              versus systemic host reaction:
            </p>

            {activeCase.hotspots.map((hs) => {
              const isSelected = hs.id === selectedHotspot.id;
              return (
                <div
                  key={hs.id}
                  className={`rounded-xl border transition-colors p-4 space-y-2.5 ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50/30 dark:bg-teal-950/25'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectHotspot(hs.id)}
                      className="text-left group cursor-pointer"
                    >
                      <div className="text-xs font-mono text-teal-600 dark:text-teal-400 font-semibold">
                        Hotspot 0{hs.indexNumber} · {hs.anatomicalStructure}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-500 transition-colors">
                        {hs.label}
                      </h3>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectHotspot(hs.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {isSelected ? 'Focused in 3D' : 'Focus 3D'}
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    <div>
                      <strong className="text-rose-600 dark:text-rose-400">
                        Pathology Effect:
                      </strong>{' '}
                      {hs.pathologyEffect}
                    </div>
                    <div>
                      <strong className="text-amber-600 dark:text-amber-400">
                        Host Reaction:
                      </strong>{' '}
                      {hs.bodyReaction}
                    </div>
                    <div>
                      <strong className="text-teal-600 dark:text-teal-400">Histology:</strong>{' '}
                      {hs.histologicalFinding}
                    </div>
                    <div className="pt-1 text-slate-500 dark:text-slate-400 italic">
                      Clinical Pearl: {hs.clinicalPearl}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: COMPENSATORY REACTION CASCADE */}
        {activeTab === 'cascade' && (
          <div className="space-y-3.5">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Ordered causal sequence of how the body senses the primary insult and mounts
              hemodynamic, neurohormonal, immunological, and structural responses:
            </div>

            {activeCase.compensatoryPathway.map((step, idx) => (
              <div
                key={step.stepNumber}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono font-semibold text-teal-600 dark:text-teal-400">
                    0{step.stepNumber}. {step.mechanismType}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectStage(Math.min(3, idx) as 0 | 1 | 2 | 3)}
                    className="text-xs font-mono text-slate-500 hover:text-teal-400 underline cursor-pointer"
                  >
                    Sync to Stage {Math.min(3, idx)}
                  </button>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {step.phaseTitle}
                </h3>

                <div className="space-y-1.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  <div>
                    <strong className="text-slate-900 dark:text-white">Trigger:</strong>{' '}
                    {step.trigger}
                  </div>
                  <div>
                    <strong className="text-amber-600 dark:text-amber-400">
                      Physiological Reaction:
                    </strong>{' '}
                    {step.physiologicalReaction}
                  </div>
                  <div>
                    <strong className="text-teal-600 dark:text-teal-400">
                      Clinical Consequence:
                    </strong>{' '}
                    {step.clinicalConsequence}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: MULTI-SYSTEM CASE LIBRARY */}
        {activeTab === 'library' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                All Organ Systems Atlas ({allCases.length} models)
              </span>
              <button
                type="button"
                onClick={onOpenAskModal}
                className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
              >
                + Generate New Case
              </button>
            </div>

            {allCases.map((c) => {
              const isCurrent = c.id === activeCase.id;
              const sysLabel = ORGAN_SYSTEM_LABELS[c.organSystem]?.shortLabel ?? c.organSystem;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelectCase(c);
                    setActiveTab('mechanism');
                  }}
                  className={`w-full text-left rounded-xl border p-3.5 transition-colors cursor-pointer ${
                    isCurrent
                      ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-teal-600 dark:text-teal-400">
                      {sysLabel}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{c.icdCode}</span>
                    {c.isCustomGenerated && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-500 font-medium">Custom Query</span>
                      </>
                    )}
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                    {c.title}
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {c.clinicalQuestion}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Sticky Clinical Question Trigger */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#080C14]">
        <button
          type="button"
          onClick={onOpenAskModal}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Ask Any Pathology & Reaction Question</span>
        </button>
      </div>
    </aside>
  );
};
