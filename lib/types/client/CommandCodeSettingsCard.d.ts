/** Command Code provider card using the shared DSH provider layout. */
import type { ReactNode } from 'react';
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client';
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { CommandCodeDiscoveryRequest, CommandCodeDiscoveryResult, CommandCodeSaveResult, CommandCodeSettingsView } from '../client-contract.ts';
import type { CommandCodeModelConfig, CommandCodeUsageRead } from '../types.ts';
import type { CommandCodeSettingsKey } from './locales.ts';
import './provider-section.ts';
export interface CommandCodeCredentialState {
    configured: boolean;
    writable: boolean;
}
export interface CommandCodeCardFace {
    t: (key: CommandCodeSettingsKey) => string;
    hooks: {
        commandCodeSettings: SettingsScope<CommandCodeSettingsView>;
    };
    describeCredential: () => Promise<CommandCodeCredentialState>;
    storeApiKey: (apiKey: string) => Promise<void>;
    saveConfiguration: (settings: CommandCodeSettingsView) => Promise<CommandCodeSaveResult>;
    discoverModels: (request: CommandCodeDiscoveryRequest) => Promise<CommandCodeDiscoveryResult>;
    fetchUsage: () => Promise<CommandCodeUsageRead>;
    beginModelPicker: (initiallyPicked: ReadonlySet<string>, onAdopt: (models: readonly CommandCodeModelConfig[]) => void) => void;
    completeModelPicker: (candidates: readonly CommandCodeModelConfig[]) => void;
    failModelPicker: (message: string) => void;
    closeModelPicker: () => void;
}
export type CommandCodeSettingsCardProps = PropsRuntime<'settings.provider.item'> & InjectFace<CommandCodeCardFace>;
/** Standard collapsible provider card. */
export declare function CommandCodeSettingsCard(props: CommandCodeSettingsCardProps): ReactNode;
//# sourceMappingURL=CommandCodeSettingsCard.d.ts.map