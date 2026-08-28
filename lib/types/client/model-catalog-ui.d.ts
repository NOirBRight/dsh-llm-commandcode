/** Shared model catalog visual pattern extracted from opencode-go. */
import type { CSSProperties, ReactNode } from 'react';
declare const inputStyle: CSSProperties;
declare const rowInputStyle: CSSProperties;
declare const selectStyle: CSSProperties;
declare const rowStyle: CSSProperties;
declare const modelContentStyle: CSSProperties;
declare const modelDetailStyle: CSSProperties;
declare const capabilitiesStyle: CSSProperties;
declare const fieldStyle: CSSProperties;
declare const labelStyle: CSSProperties;
/** Small interface that hides the shared styles behind layout components. */
export declare function ModelCatalogDetails({ children }: {
    children: ReactNode;
}): ReactNode;
export declare function ModelCatalogRow({ children }: {
    children: ReactNode;
}): ReactNode;
export declare function ModelCatalogCapabilities({ children }: {
    children: ReactNode;
}): ReactNode;
export declare function ModelCatalogRowGrid({ children }: {
    children: ReactNode;
}): ReactNode;
export interface ModelCatalogFieldsProps {
    contextWindow: string;
    contextLabel: string;
    contextPlaceholder?: string;
    onContextWindowChange: (value: string) => void;
    visionChecked: boolean;
    visionLabel: string;
    onVisionChange: (value: boolean) => void;
    thinkingChecked: boolean;
    thinkingLabel: string;
    thinkingDisabled?: boolean;
    onThinkingChange: (value: boolean) => void;
    defaultThinkingLabel: string;
    defaultThinkingValue?: string;
    defaultThinkingOptions: readonly string[];
    onDefaultThinkingChange?: (value: string) => void;
    getOptionLabel?: (option: string) => string;
    showDefaultThinking?: boolean;
    disabled?: boolean;
}
/**
 * Helper that renders the accepted model expansion visuals:
 * first row (context window) then second row (Vision, Reasoning/Thinking, Default thinking select conditional).
 * Preserves 36h for context, 32h for row/select, flex column gap10, grid 2cols, flex wrap gap14, custom arrow.
 */
export declare function ModelCatalogFields(props: ModelCatalogFieldsProps): ReactNode;
export declare const catalogStyles: {
    readonly inputStyle: CSSProperties;
    readonly rowInputStyle: CSSProperties;
    readonly selectStyle: CSSProperties;
    readonly rowStyle: CSSProperties;
    readonly modelContentStyle: CSSProperties;
    readonly modelDetailStyle: CSSProperties;
    readonly capabilitiesStyle: CSSProperties;
    readonly fieldStyle: CSSProperties;
    readonly labelStyle: CSSProperties;
};
export { inputStyle, rowInputStyle, selectStyle, rowStyle, modelContentStyle, modelDetailStyle, capabilitiesStyle, fieldStyle, labelStyle };
//# sourceMappingURL=model-catalog-ui.d.ts.map