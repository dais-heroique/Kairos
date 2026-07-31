// Règle produit n°1 (voir CLAUDE.md / consigne projet) : jamais un nombre
// nu pour une estimation — toujours <EstimatedValue> (fourchette +
// confiance + méthode). Attrape les deux formes que prennent les champs
// d'estimation dans les schémas @kairos/shared : soit un suffixe
// camelCase (salesLow, estSalesHigh, ...), soit les champs `low`/`high`
// exacts d'un EstimatedRange imbriqué (estimatedEarnings.low).
const RAW_FIELD_PATTERN = /^(low|high)$|(Low|High)$/;

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Interdit le rendu JSX direct d'un champ Low/High (ex. salesLow, estimatedHigh) — passer par <EstimatedValue>.",
    },
    schema: [],
    messages: {
      rawEstimate:
        "N'affiche jamais {{prop}} directement en JSX — utilise <EstimatedValue> pour toujours montrer une fourchette + confiance (règle produit n°1).",
    },
  },
  create(context) {
    return {
      JSXExpressionContainer(node) {
        const expr = node.expression;
        if (!expr || expr.type !== "MemberExpression" || expr.computed) return;
        const property = expr.property;
        if (!property || property.type !== "Identifier") return;
        if (!RAW_FIELD_PATTERN.test(property.name)) return;
        context.report({ node, messageId: "rawEstimate", data: { prop: property.name } });
      },
    };
  },
};
