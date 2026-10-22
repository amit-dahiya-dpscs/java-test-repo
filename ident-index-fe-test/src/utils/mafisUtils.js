export const VALID_PATTERN_CHARS = new Set(['A', 'W', '\\', '/', 'X', 'U', '?', ' ']);

export const isValidPatternInput = (str) => {
    if (!str) return true;
    for (const char of str.toUpperCase()) {
        if (!VALID_PATTERN_CHARS.has(char)) return false;
    }
    return true;
};