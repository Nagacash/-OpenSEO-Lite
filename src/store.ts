/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface UserKeyConfig {
  provider: 'openrouter' | 'nvidia' | 'openai';
  apiKey: string;
  model: string;
}

export interface SecurityStatus {
  ssrfProtection: boolean;
  owaspHeaders: boolean;
  clientSideEncryptionNotice: boolean;
  rateLimitCheck: boolean;
}

interface AppStoreState {
  // Key configuration
  provider: 'openrouter' | 'nvidia' | 'openai';
  apiKey: string;
  model: string;
  isKeyModalOpen: boolean;
  showKeyPassword: boolean;

  // Security & Compliance
  acceptedPolicy: boolean;
  policyAcceptedAt: string | null;

  // Actions
  setProvider: (provider: 'openrouter' | 'nvidia' | 'openai') => void;
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
  setIsKeyModalOpen: (open: boolean) => void;
  setShowKeyPassword: (show: boolean) => void;
  clearKey: () => void;
  saveKeyConfig: (key: string, provider: 'openrouter' | 'nvidia' | 'openai', model: string) => void;
  acceptPolicy: () => void;
}

/**
 * Zustand store with local storage persistence.
 * Safe Client-side storage: Keys stay in the user's browser, never sent to 3rd party databases.
 */
export const useAppStore = create<AppStoreState>()(
  persist(
    (set) => ({
      provider: 'openrouter',
      apiKey: '',
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      isKeyModalOpen: false,
      showKeyPassword: false,
      acceptedPolicy: false,
      policyAcceptedAt: null,

      setProvider: (provider) => {
        let defaultModel = 'meta-llama/llama-3.3-70b-instruct:free';
        if (provider === 'nvidia') {
          defaultModel = 'meta/llama-3.1-70b-instruct';
        } else if (provider === 'openai') {
          defaultModel = 'gpt-4o-mini';
        }
        set({ provider, model: defaultModel });
      },

      setApiKey: (apiKey) => set({ apiKey }),

      setModel: (model) => set({ model }),

      setIsKeyModalOpen: (isKeyModalOpen) => set({ isKeyModalOpen }),

      setShowKeyPassword: (showKeyPassword) => set({ showKeyPassword }),

      clearKey: () => set({ apiKey: '', model: 'meta-llama/llama-3.3-70b-instruct:free' }),

      saveKeyConfig: (apiKey, provider, model) =>
        set({
          apiKey,
          provider,
          model,
        }),

      acceptPolicy: () =>
        set({
          acceptedPolicy: true,
          policyAcceptedAt: new Date().toISOString(),
        }),
    }),
    {
      name: 'openseo_agent_storage_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        provider: state.provider,
        apiKey: state.apiKey,
        model: state.model,
        acceptedPolicy: state.acceptedPolicy,
        policyAcceptedAt: state.policyAcceptedAt,
      }),
    }
  )
);
