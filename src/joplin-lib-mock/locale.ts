// Simple mock for locale - just returns the string as-is without translation
export function _(str: string, ...args: any[]): string {
	// Simple string interpolation if needed
	if (args.length === 0) return str;
	
	// Basic sprintf-like functionality for %s, %d placeholders
	let output = str;
	let argIndex = 0;
	output = output.replace(/%[sd]/g, () => {
		if (argIndex < args.length) {
			return String(args[argIndex++]);
		}
		return '';
	});
	
	return output;
}

export function _n(singular: string, plural: string, n: number, ...args: any[]): string {
	const str = n === 1 ? singular : plural;
	return _(str, n, ...args);
}

// Default export for convenience
export default { _, _n };
