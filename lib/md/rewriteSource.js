"use strict";

const acorn = require("acorn");
const walk = require("acorn-walk");

const parser = acorn.Parser;

const noop = () => {};
const visitorsWithoutAncestors = {
  ClassDeclaration(node, state, c) {
    if (state.ancestors[state.ancestors.length - 2] === state.body) {
      state.prepend(node, `${node.id.name}=`);
    }
    walk.base.ClassDeclaration(node, state, c);
  },
  ForOfStatement(node, state, c) {
    if (node.await === true) {
      state.containsAwait = true;
    }
    walk.base.ForOfStatement(node, state, c);
  },
  FunctionDeclaration(node, state, c) {
    state.prepend(node, `${node.id.name}=`);
  },
  FunctionExpression: noop,
  ArrowFunctionExpression: noop,
  MethodDefinition: noop,
  AwaitExpression(node, state, c) {
    state.containsAwait = true;
    walk.base.AwaitExpression(node, state, c);
  },
  ReturnStatement(node, state, c) {
    state.containsReturn = true;
    walk.base.ReturnStatement(node, state, c);
  },
  VariableDeclaration(node, state, c) {
    if (
      node.kind === "var" ||
      state.ancestors[state.ancestors.length - 2] === state.body
    ) {
      if (node.declarations.length === 1) {
        state.replace(node.start, node.start + node.kind.length, "void");
      } else {
        state.replace(node.start, node.start + node.kind.length, "void (");
      }

      for (const decl of node.declarations) {
        state.prepend(decl, "(");
        state.append(decl, decl.init ? ")" : "=undefined)");
      }

      if (node.declarations.length !== 1) {
        state.append(node.declarations[node.declarations.length - 1], ")");
      }
    }

    walk.base.VariableDeclaration(node, state, c);
  }
};

const visitors = {};
for (const nodeType of Object.keys(walk.base)) {
  const callback = visitorsWithoutAncestors[nodeType] || walk.base[nodeType];
  visitors[nodeType] = (node, state, c) => {
    const isNew = node !== state.ancestors[state.ancestors.length - 1];
    if (isNew) {
      state.ancestors.push(node);
    }
    callback(node, state, c);
    if (isNew) {
      state.ancestors.pop();
    }
  };
}

function rewriteSource(src) {
  const wrappedArray = src.split("");
  let root;
  try {
    root = parser.parse(src, { sourceType: "script" });
  } catch {
    return null;
  }
  const body = root.body[0].expression.callee.body;
  const state = {
    body,
    ancestors: [],
    replace(from, to, str) {
      for (let i = from; i < to; i++) {
        wrappedArray[i] = "";
      }
      if (from === to) str += wrappedArray[from];
      wrappedArray[from] = str;
    },
    prepend(node, str) {
      wrappedArray[node.start] = str + wrappedArray[node.start];
    },
    append(node, str) {
      wrappedArray[node.end - 1] += str;
    },
    containsAwait: false,
    containsReturn: false
  };

  walk.recursive(body, state, visitors);

  const last = body.body[body.body.length - 1];
  if (
    last.type === "ExpressionStatement" &&
    last.expression.type !== "AssignmentExpression"
  ) {
    // For an expression statement of the form
    // ( expr ) ;
    // ^^^^^^^^^^   // last
    //   ^^^^       // last.expression
    //
    // We do not want the left parenthesis before the `return` keyword;
    // therefore we prepend the `return (` to `last`.
    //
    // On the other hand, we do not want the right parenthesis after the
    // semicolon. Since there can only be more right parentheses between
    // last.expression.end and the semicolon, appending one more to
    // last.expression should be fine.
    state.prepend(last, "return (");
    state.append(last.expression, ")");
  }

  return wrappedArray.join("");
}

module.exports = rewriteSource;
