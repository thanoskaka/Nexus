export interface PriceFormulaContext {
  price: number;
  fx?: number;
  unit?: number;
}

export function applyPriceFormula(formula: string, context: PriceFormulaContext) {
  const trimmed = formula.trim();
  if (!trimmed) {
    return {
      value: null,
      resolvedExpression: '',
      error: 'Enter a formula using {price}.',
    };
  }

  const resolvedExpression = trimmed
    .replaceAll('{price}', formatFormulaNumber(context.price))
    .replaceAll('{fx}', formatFormulaNumber(context.fx ?? 1))
    .replaceAll('{unit}', formatFormulaNumber(context.unit ?? 1));

  if (!resolvedExpression.includes(formatFormulaNumber(context.price))) {
    return {
      value: null,
      resolvedExpression,
      error: 'Formula must include {price}.',
    };
  }

  if (!/^[0-9+\-*/().\s]+$/.test(resolvedExpression)) {
    return {
      value: null,
      resolvedExpression,
      error: 'Formula can only use numbers, spaces, parentheses, and + - * / operators.',
    };
  }

  try {
    const evaluator = new Function(`return (${resolvedExpression});`);
    const value = Number(evaluator());
    if (!Number.isFinite(value)) {
      return {
        value: null,
        resolvedExpression,
        error: 'Formula did not produce a valid number.',
      };
    }

    return {
      value,
      resolvedExpression,
      error: null,
    };
  } catch {
    return {
      value: null,
      resolvedExpression,
      error: 'Formula could not be evaluated. Check the syntax.',
    };
  }
}

function formatFormulaNumber(value: number) {
  return Number(value).toString();
}
