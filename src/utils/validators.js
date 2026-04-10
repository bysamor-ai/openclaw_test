/**
 * Input validation helpers used across blog skills.
 */

/**
 * Assert that `value` is a non-empty string.
 *
 * @param {unknown} value
 * @param {string}  name  - field name for the error message
 * @throws {TypeError}
 */
export function requireString(value, name) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`"${name}" must be a non-empty string.`);
  }
}

/**
 * Assert that `value` is a positive integer.
 *
 * @param {unknown} value
 * @param {string}  name
 * @throws {TypeError}
 */
export function requirePositiveInt(value, name) {
  if (!Number.isInteger(value) || value < 1) {
    throw new TypeError(`"${name}" must be a positive integer.`);
  }
}

/**
 * Coerce an optional number field, returning `defaultValue` when undefined.
 *
 * @param {unknown} value
 * @param {number}  defaultValue
 * @param {string}  name
 * @returns {number}
 */
export function optionalPositiveInt(value, defaultValue, name) {
  if (value === undefined || value === null) return defaultValue;
  requirePositiveInt(value, name);
  return value;
}

/**
 * Assert that `value` is one of the allowed strings.
 *
 * @param {unknown}  value
 * @param {string[]} allowed
 * @param {string}   name
 * @throws {TypeError}
 */
export function requireOneOf(value, allowed, name) {
  if (!allowed.includes(value)) {
    throw new TypeError(
      `"${name}" must be one of: ${allowed.join(', ')}. Received: "${value}".`
    );
  }
}
