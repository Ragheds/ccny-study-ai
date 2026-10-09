import {
  parse,
  type ConstantNode,
  type FunctionNode,
  type OperatorNode,
  type SymbolNode,
} from "mathjs";
export function restrictedFunction(expression: string): (x: number) => number {
  if (expression.length > 120) throw Error("Expression too long.");
  const root = parse(expression);
  let count = 0;
  root.traverse((node, path, parent) => {
    if (++count > 60) throw Error("Expression too complex.");
    switch (node.type) {
      case "ConstantNode": {
        const value = Number((node as ConstantNode).value);
        if (!Number.isFinite(value) || Math.abs(value) > 1000000)
          throw Error("Constant out of range.");
        break;
      }
      case "SymbolNode": {
        const name = (node as SymbolNode).name;
        const allowed =
          parent?.type === "FunctionNode" && path === "fn"
            ? ["sqrt", "abs", "sin", "cos", "tan", "log", "exp"]
            : ["x", "pi", "e"];
        if (!allowed.includes(name))
          throw Error("Only x and safe numeric functions are allowed.");
        break;
      }
      case "OperatorNode": {
        const operator = node as OperatorNode;
        if (!["+", "-", "*", "/", "^"].includes(operator.op))
          throw Error("Operator not supported.");
        if (
          operator.op === "^" &&
          (operator.args[1]?.type !== "ConstantNode" ||
            Math.abs(Number((operator.args[1] as ConstantNode).value)) > 12)
        )
          throw Error("Exponent must be a small constant.");
        break;
      }
      case "FunctionNode":
        if ((node as FunctionNode).args.length !== 1)
          throw Error("Use one argument.");
        break;
      case "ParenthesisNode":
        break;
      default:
        throw Error("Expression type not allowed.");
    }
  });
  const code = root.compile();
  return (x) => {
    const result = code.evaluate(new Map([["x", x]]));
    return typeof result === "number" && Number.isFinite(result) ? result : NaN;
  };
}
export function sampleFunction(
  expression: string,
  xRange: [number, number],
  yRange: [number, number],
): [number, number][][] {
  const fn = restrictedFunction(expression);
  const segments: [number, number][][] = [];
  let line: [number, number][] = [];
  let previous: number | null = null;
  for (let i = 0; i <= 400; i++) {
    const x = xRange[0] + ((xRange[1] - xRange[0]) * i) / 400;
    const y = fn(x);
    if (
      !Number.isFinite(y) ||
      y < yRange[0] ||
      y > yRange[1] ||
      (previous !== null &&
        Math.abs(y - previous) > (yRange[1] - yRange[0]) * 0.4)
    ) {
      if (line.length > 1) segments.push(line);
      line = [];
      previous = null;
      if (!Number.isFinite(y) || y < yRange[0] || y > yRange[1]) continue;
    }
    line.push([x, y]);
    previous = y;
  }
  if (line.length > 1) segments.push(line);
  return segments;
}
