//#region lib/types/invariant.js
/** Small invariant helper exported for built-entry verification. */
function assertCommandCodeInvariant(condition, message) {
	if (!condition) throw new Error("dsh-llm-commandcode invariant failed: " + message);
}
//#endregion
export { assertCommandCodeInvariant };
