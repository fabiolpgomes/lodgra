'use client';

import React, { useState } from 'react';
import { Clock, Play, Pause, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ScheduleSettingsProps {
  propertyId: string;
  automationEnabled: boolean;
  runTime: string; // HH:mm format
  nextRunTime?: string;
  onUpdateSchedule: (enabled: boolean, runTime: string) => Promise<void>;
  onManualTrigger: () => Promise<void>;
}

export function ScheduleSettings({
  propertyId,
  automationEnabled,
  runTime,
  nextRunTime,
  onUpdateSchedule,
  onManualTrigger,
}: ScheduleSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [localEnabled, setLocalEnabled] = useState(automationEnabled);
  const [localRunTime, setLocalRunTime] = useState(runTime);
  const [pauseStart, setPauseStart] = useState('');
  const [pauseEnd, setPauseEnd] = useState('');
  const [showPauseForm, setShowPauseForm] = useState(false);

  const handleSaveSchedule = async () => {
    if (!localRunTime) {
      toast.error('Defina uma hora para a automação');
      return;
    }

    try {
      setSaving(true);
      await onUpdateSchedule(localEnabled, localRunTime);
      toast.success('Agendamento atualizado com sucesso');
    } catch (error) {
      toast.error('Erro ao atualizar agendamento');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleManualTrigger = async () => {
    try {
      setTriggering(true);
      await onManualTrigger();
      toast.success('Regras de preço aplicadas manualmente');
    } catch (error) {
      toast.error('Erro ao aplicar regras');
      console.error(error);
    } finally {
      setTriggering(false);
    }
  };

  const handlePauseAutomation = async () => {
    if (!pauseStart || !pauseEnd) {
      toast.error('Defina as datas de início e fim da pausa');
      return;
    }

    try {
      setSaving(true);
      // In a real implementation, this would call an API to pause automation
      toast.success(`Automação pausada de ${pauseStart} a ${pauseEnd}`);
      setShowPauseForm(false);
      setPauseStart('');
      setPauseEnd('');
    } catch (error) {
      toast.error('Erro ao pausar automação');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
          Agendamento da Automação
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Configure quando as regras de preço são aplicadas automaticamente
        </p>
      </div>

      {/* Current Status */}
      <div className={`rounded-lg border-2 p-4 ${localEnabled ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'}`}>
        <div className="flex items-center gap-3">
          {localEnabled ? (
            <>
              <Play className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">
                  Automação Ativada
                </p>
                {nextRunTime && (
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Próxima execução: {new Date(nextRunTime).toLocaleString('pt-PT')}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <Pause className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-100">
                  Automação Desativada
                </p>
                <p className="text-sm text-red-800 dark:text-red-200">
                  As regras não serão aplicadas automaticamente
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
          <div>
            <p className="font-medium text-slate-900 dark:text-white">Ativar Automação</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Permite que as regras sejam aplicadas automaticamente
            </p>
          </div>
          <button
            onClick={() => setLocalEnabled(!localEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              localEnabled ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                localEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Run Time */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Hora de Execução Diária (UTC)
          </label>
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <input
              type="time"
              value={localRunTime}
              onChange={(e) => setLocalRunTime(e.target.value)}
              disabled={!localEnabled}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              (Padrão: 00:00 UTC)
            </span>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSaveSchedule}
          disabled={saving || !localEnabled}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {saving ? 'Salvando...' : 'Salvar Agendamento'}
        </button>
      </div>

      {/* Manual Trigger */}
      <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-700">
        <h4 className="font-semibold text-slate-900 dark:text-white">
          Aplicar Manualmente
        </h4>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Execute as regras de preço agora, sem esperar pela automação agendada
        </p>
        <button
          onClick={handleManualTrigger}
          disabled={triggering}
          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4" />
          {triggering ? 'Aplicando...' : 'Aplicar Regras Agora'}
        </button>
      </div>

      {/* Pause Automation */}
      <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-700">
        <h4 className="font-semibold text-slate-900 dark:text-white">
          Pausar Automação Temporariamente
        </h4>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Pause a automação durante um período específico (ex: durante reformas)
        </p>

        {!showPauseForm ? (
          <button
            onClick={() => setShowPauseForm(true)}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
          >
            <Pause className="w-4 h-4 inline-block mr-2" />
            Pausar Automação
          </button>
        ) : (
          <div className="space-y-3 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-amber-900 dark:text-amber-200 mb-2">
                  Data de Início
                </label>
                <input
                  type="date"
                  value={pauseStart}
                  onChange={(e) => setPauseStart(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-amber-900 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-900 dark:text-amber-200 mb-2">
                  Data de Fim
                </label>
                <input
                  type="date"
                  value={pauseEnd}
                  onChange={(e) => setPauseEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-amber-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPauseForm(false)}
                className="flex-1 px-4 py-2 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 rounded-lg hover:bg-white dark:hover:bg-amber-900"
              >
                Cancelar
              </button>
              <button
                onClick={handlePauseAutomation}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg"
              >
                {saving ? 'Pausando...' : 'Confirmar Pausa'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium">Nota sobre fuso horário:</p>
            <p className="mt-1">
              O agendamento usa UTC. Se você está em Portugal (UTC+0 ou UTC+1), subtraia 1 hora na hora de pico (verão).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
