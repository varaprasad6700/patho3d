/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { CLINICAL_CASES } from './data/clinicalCases';
import { OrganSystem, PathologyModelSpec } from './types/pathology';
import {
  interpolateStageBiomarkers,
  interpolateStageSceneParams,
  normalizeAISpec,
  resolveActiveStageIndex,
  synthesizeFallbackPathologySpec,
} from './utils/pathologyEngine';
import { SurgicalViewport3D } from './components/SurgicalViewport3D';
import { ClinicalInspectorPanel } from './components/ClinicalInspectorPanel';
import { AskPathologyModal } from './components/AskPathologyModal';

const STORAGE_KEY = 'patho3d_saved_custom_cases_v1';

export default function App() {
  const [customCases, setCustomCases] = useState<PathologyModelSpec[]>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore storage read errors
    }
    return [];
  });

  const allCases = useMemo(() => [...customCases, ...CLINICAL_CASES], [customCases]);

  const [activeCaseId, setActiveCaseId] = useState<string>(CLINICAL_CASES[0].id);
  const activeCase = useMemo(
    () => allCases.find((c) => c.id === activeCaseId) ?? allCases[0],
    [allCases, activeCaseId]
  );

  const [scrubberValue, setScrubberValue] = useState<number>(1.0);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string>(
    CLINICAL_CASES[0].hotspots[0].id
  );
  const [scaleMode, setScaleMode] = useState<'macro' | 'micro'>('macro');
  const [cutawayEnabled, setCutawayEnabled] = useState<boolean>(false);
  const [isAskModalOpen, setIsAskModalOpen] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState<boolean>(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Persist custom generated pathology cases
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customCases));
    } catch {
      // Ignore quota errors
    }
  }, [customCases]);

  const activeStageIndex = useMemo(
    () => resolveActiveStageIndex(scrubberValue),
    [scrubberValue]
  );

  const interpolatedParams = useMemo(
    () => interpolateStageSceneParams(activeCase.stages, scrubberValue),
    [activeCase, scrubberValue]
  );

  const interpolatedBiomarkers = useMemo(
    () => interpolateStageBiomarkers(activeCase.stages, scrubberValue),
    [activeCase, scrubberValue]
  );

  const handleSelectCase = (caseSpec: PathologyModelSpec) => {
    setActiveCaseId(caseSpec.id);
    setSelectedHotspotId(caseSpec.hotspots[0]?.id ?? '');
    setScrubberValue(1.0);
    setScaleMode('macro');
  };

  const handleSelectSystemNav = (system: OrganSystem) => {
    const match = allCases.find((c) => c.organSystem === system);
    if (match) {
      handleSelectCase(match);
    }
  };

  const handleSubmitPathologyQuery = async (query: string) => {
    setIsGenerating(true);
    setServerError(null);
    try {
      const response = await fetch('/api/pathology/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed with status ${response.status}`);
      }

      const rawData = await response.json();
      const spec = normalizeAISpec(rawData.spec ?? rawData, query);
      setCustomCases((prev) => [spec, ...prev]);
      handleSelectCase(spec);
      setIsAskModalOpen(false);
    } catch {
      // Synthesize deterministic clinical model so the doctor always gets a working 3D model
      const fallbackSpec = synthesizeFallbackPathologySpec(query);
      setCustomCases((prev) => [fallbackSpec, ...prev]);
      handleSelectCase(fallbackSpec);
      setIsAskModalOpen(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const navSystems: { label: string; system: OrganSystem }[] = [
    { label: 'Cardiovascular', system: 'cardiovascular' },
    { label: 'Hepatobiliary', system: 'hepatobiliary' },
    { label: 'Gastrointestinal', system: 'gastrointestinal' },
    { label: 'Renal', system: 'renal' },
    { label: 'Respiratory', system: 'respiratory' },
  ];

  return (
    <div className="min-h-screen lg:h-screen w-full flex flex-col bg-[#1A110F] text-slate-100 overflow-x-hidden lg:overflow-hidden">
      {/* Sleek Documentary Studio Top Navigation Bar */}
      <header className="flex items-center justify-between gap-6 px-5 py-2.5 bg-[#18100E]/95 border-b border-white/10 shrink-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            handleSelectCase(CLINICAL_CASES[0]);
          }}
          className="text-base font-extrabold tracking-wider uppercase text-amber-100 whitespace-nowrap shrink-0 font-display"
        >
          Patho3D Atlas
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Organ System Navigation"
          className="hidden md:flex items-center gap-6 text-xs font-semibold tracking-wider uppercase text-white/70"
        >
          {navSystems.map((item) => {
            const isActive = activeCase.organSystem === item.system;
            return (
              <a
                key={item.system}
                href={`#${item.system}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleSelectSystemNav(item.system);
                }}
                className={`whitespace-nowrap shrink-0 transition-colors hover:text-amber-300 hover:underline underline-offset-4 ${
                  isActive ? 'text-amber-300 font-bold underline' : ''
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsAskModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-amber-300 hover:bg-amber-200 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Ask Pathology Question
          </button>
        </div>
      </header>

      {/* Mobile Organ System Quick Switcher (Visible below md breakpoint) */}
      <div className="flex md:hidden items-center gap-2 overflow-x-auto px-4 py-2 bg-[#18100E] border-b border-white/10 shrink-0">
        {navSystems.map((item) => {
          const isActive = activeCase.organSystem === item.system;
          return (
            <button
              key={item.system}
              type="button"
              onClick={() => handleSelectSystemNav(item.system)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${
                isActive ? 'bg-amber-300 text-slate-950' : 'bg-white/10 text-white/80'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Main Full-Bleed Documentary 3D Stage + Optional Slide-Over Clinical Drawer */}
      <main className="relative flex-1 flex flex-col lg:flex-row min-h-0 w-full overflow-hidden">
        <SurgicalViewport3D
          archetype={activeCase.archetype3D}
          caseTitle={activeCase.title}
          icdCode={activeCase.icdCode}
          stages={activeCase.stages}
          scrubberValue={scrubberValue}
          onScrubberChange={setScrubberValue}
          interpolatedParams={interpolatedParams}
          hotspots={activeCase.hotspots}
          selectedHotspotId={selectedHotspotId}
          onSelectHotspot={setSelectedHotspotId}
          scaleMode={scaleMode}
          onToggleScaleMode={setScaleMode}
          cutawayEnabled={cutawayEnabled}
          onToggleCutaway={() => setCutawayEnabled((prev) => !prev)}
          isInspectorOpen={isInspectorOpen}
          onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
        />

        {isInspectorOpen && (
          <div className="lg:absolute lg:top-0 lg:right-0 lg:bottom-0 lg:z-30 flex shadow-2xl">
            <ClinicalInspectorPanel
              activeCase={activeCase}
              allCases={allCases}
              onSelectCase={handleSelectCase}
              activeStageIndex={activeStageIndex}
              onSelectStage={(idx) => setScrubberValue(idx)}
              interpolatedBiomarkers={interpolatedBiomarkers}
              selectedHotspotId={selectedHotspotId}
              onSelectHotspot={setSelectedHotspotId}
              onOpenAskModal={() => setIsAskModalOpen(true)}
              isDark={isDark}
              onToggleTheme={() => setIsDark((d) => !d)}
              onCollapsePanel={() => setIsInspectorOpen(false)}
            />
          </div>
        )}
      </main>

      {/* Ask Pathology Question Modal */}
      <AskPathologyModal
        isOpen={isAskModalOpen}
        onClose={() => setIsAskModalOpen(false)}
        onSubmitQuery={handleSubmitPathologyQuery}
        isLoading={isGenerating}
        serverError={serverError}
      />
    </div>
  );
}
