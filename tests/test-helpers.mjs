/** Total fixed accuracy, excluding the one die whose size follows mental stability. */
export function accuracyTotal(expression) {
  if (!/^1d(?:10|20|30)(?:[+-]\d+)*$/.test(expression)) {
    throw new Error(`Expected one accuracy die and additive modifiers, received: ${expression}`);
  }
  return [...expression.replace(/^1d\d+/, "").matchAll(/[+-]\d+/g)]
    .reduce((total, match) => total + Number(match[0]), 0);
}
