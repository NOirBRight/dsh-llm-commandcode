/** Byte-limited response-body reading shared by provider and account calls. */
/** Read a response as UTF-8 without buffering more than maxBytes. */
export declare function readBoundedText(response: Response, maxBytes: number, label: string, code: string, signal?: AbortSignal): Promise<string>;
//# sourceMappingURL=http.d.ts.map