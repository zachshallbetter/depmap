var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/react-dom/cjs/react-dom.development.js
var require_react_dom_development = __commonJS({
  "node_modules/react-dom/cjs/react-dom.development.js"(exports) {
    "use strict";
    (function() {
      function noop() {
      }
      function testStringCoercion(value) {
        return "" + value;
      }
      function createPortal$1(children, containerInfo, implementation) {
        var key = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
        try {
          testStringCoercion(key);
          var JSCompiler_inline_result = false;
        } catch (e) {
          JSCompiler_inline_result = true;
        }
        JSCompiler_inline_result && (console.error(
          "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
          "function" === typeof Symbol && Symbol.toStringTag && key[Symbol.toStringTag] || key.constructor.name || "Object"
        ), testStringCoercion(key));
        return {
          $$typeof: REACT_PORTAL_TYPE,
          key: null == key ? null : "" + key,
          children,
          containerInfo,
          implementation
        };
      }
      function getCrossOriginStringAs(as, input) {
        if ("font" === as) return "";
        if ("string" === typeof input)
          return "use-credentials" === input ? input : "";
      }
      function getValueDescriptorExpectingObjectForWarning(thing) {
        return null === thing ? "`null`" : void 0 === thing ? "`undefined`" : "" === thing ? "an empty string" : 'something with type "' + typeof thing + '"';
      }
      function getValueDescriptorExpectingEnumForWarning(thing) {
        return null === thing ? "`null`" : void 0 === thing ? "`undefined`" : "" === thing ? "an empty string" : "string" === typeof thing ? JSON.stringify(thing) : "number" === typeof thing ? "`" + thing + "`" : 'something with type "' + typeof thing + '"';
      }
      function resolveDispatcher() {
        var dispatcher = ReactSharedInternals.H;
        null === dispatcher && console.error(
          "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem."
        );
        return dispatcher;
      }
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
      var React15 = __require("react"), Internals = {
        d: {
          f: noop,
          r: function() {
            throw Error(
              "Invalid form element. requestFormReset must be passed a form that was rendered by React."
            );
          },
          D: noop,
          C: noop,
          L: noop,
          m: noop,
          X: noop,
          S: noop,
          M: noop
        },
        p: 0,
        findDOMNode: null
      }, REACT_PORTAL_TYPE = Symbol.for("react.portal"), ReactSharedInternals = React15.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
      "function" === typeof Map && null != Map.prototype && "function" === typeof Map.prototype.forEach && "function" === typeof Set && null != Set.prototype && "function" === typeof Set.prototype.clear && "function" === typeof Set.prototype.forEach || console.error(
        "React depends on Map and Set built-in types. Make sure that you load a polyfill in older browsers. https://reactjs.org/link/react-polyfills"
      );
      exports.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = Internals;
      exports.createPortal = function(children, container) {
        var key = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
        if (!container || 1 !== container.nodeType && 9 !== container.nodeType && 11 !== container.nodeType)
          throw Error("Target container is not a DOM element.");
        return createPortal$1(children, container, null, key);
      };
      exports.flushSync = function(fn) {
        var previousTransition = ReactSharedInternals.T, previousUpdatePriority = Internals.p;
        try {
          if (ReactSharedInternals.T = null, Internals.p = 2, fn)
            return fn();
        } finally {
          ReactSharedInternals.T = previousTransition, Internals.p = previousUpdatePriority, Internals.d.f() && console.error(
            "flushSync was called from inside a lifecycle method. React cannot flush when React is already rendering. Consider moving this call to a scheduler task or micro task."
          );
        }
      };
      exports.preconnect = function(href, options) {
        "string" === typeof href && href ? null != options && "object" !== typeof options ? console.error(
          "ReactDOM.preconnect(): Expected the `options` argument (second) to be an object but encountered %s instead. The only supported option at this time is `crossOrigin` which accepts a string.",
          getValueDescriptorExpectingEnumForWarning(options)
        ) : null != options && "string" !== typeof options.crossOrigin && console.error(
          "ReactDOM.preconnect(): Expected the `crossOrigin` option (second argument) to be a string but encountered %s instead. Try removing this option or passing a string value instead.",
          getValueDescriptorExpectingObjectForWarning(options.crossOrigin)
        ) : console.error(
          "ReactDOM.preconnect(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
          getValueDescriptorExpectingObjectForWarning(href)
        );
        "string" === typeof href && (options ? (options = options.crossOrigin, options = "string" === typeof options ? "use-credentials" === options ? options : "" : void 0) : options = null, Internals.d.C(href, options));
      };
      exports.prefetchDNS = function(href) {
        if ("string" !== typeof href || !href)
          console.error(
            "ReactDOM.prefetchDNS(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
            getValueDescriptorExpectingObjectForWarning(href)
          );
        else if (1 < arguments.length) {
          var options = arguments[1];
          "object" === typeof options && options.hasOwnProperty("crossOrigin") ? console.error(
            "ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. It looks like the you are attempting to set a crossOrigin property for this DNS lookup hint. Browsers do not perform DNS queries using CORS and setting this attribute on the resource hint has no effect. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.",
            getValueDescriptorExpectingEnumForWarning(options)
          ) : console.error(
            "ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.",
            getValueDescriptorExpectingEnumForWarning(options)
          );
        }
        "string" === typeof href && Internals.d.D(href);
      };
      exports.preinit = function(href, options) {
        "string" === typeof href && href ? null == options || "object" !== typeof options ? console.error(
          "ReactDOM.preinit(): Expected the `options` argument (second) to be an object with an `as` property describing the type of resource to be preinitialized but encountered %s instead.",
          getValueDescriptorExpectingEnumForWarning(options)
        ) : "style" !== options.as && "script" !== options.as && console.error(
          'ReactDOM.preinit(): Expected the `as` property in the `options` argument (second) to contain a valid value describing the type of resource to be preinitialized but encountered %s instead. Valid values for `as` are "style" and "script".',
          getValueDescriptorExpectingEnumForWarning(options.as)
        ) : console.error(
          "ReactDOM.preinit(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.",
          getValueDescriptorExpectingObjectForWarning(href)
        );
        if ("string" === typeof href && options && "string" === typeof options.as) {
          var as = options.as, crossOrigin = getCrossOriginStringAs(as, options.crossOrigin), integrity = "string" === typeof options.integrity ? options.integrity : void 0, fetchPriority = "string" === typeof options.fetchPriority ? options.fetchPriority : void 0;
          "style" === as ? Internals.d.S(
            href,
            "string" === typeof options.precedence ? options.precedence : void 0,
            {
              crossOrigin,
              integrity,
              fetchPriority
            }
          ) : "script" === as && Internals.d.X(href, {
            crossOrigin,
            integrity,
            fetchPriority,
            nonce: "string" === typeof options.nonce ? options.nonce : void 0
          });
        }
      };
      exports.preinitModule = function(href, options) {
        var encountered = "";
        "string" === typeof href && href || (encountered += " The `href` argument encountered was " + getValueDescriptorExpectingObjectForWarning(href) + ".");
        void 0 !== options && "object" !== typeof options ? encountered += " The `options` argument encountered was " + getValueDescriptorExpectingObjectForWarning(options) + "." : options && "as" in options && "script" !== options.as && (encountered += " The `as` option encountered was " + getValueDescriptorExpectingEnumForWarning(options.as) + ".");
        if (encountered)
          console.error(
            "ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` string and, optionally, an `options` object with a valid `as` property.%s",
            encountered
          );
        else
          switch (encountered = options && "string" === typeof options.as ? options.as : "script", encountered) {
            case "script":
              break;
            default:
              encountered = getValueDescriptorExpectingEnumForWarning(encountered), console.error(
                'ReactDOM.preinitModule(): Currently the only supported "as" type for this function is "script" but received "%s" instead. This warning was generated for `href` "%s". In the future other module types will be supported, aligning with the import-attributes proposal. Learn more here: (https://github.com/tc39/proposal-import-attributes)',
                encountered,
                href
              );
          }
        if ("string" === typeof href)
          if ("object" === typeof options && null !== options) {
            if (null == options.as || "script" === options.as)
              encountered = getCrossOriginStringAs(
                options.as,
                options.crossOrigin
              ), Internals.d.M(href, {
                crossOrigin: encountered,
                integrity: "string" === typeof options.integrity ? options.integrity : void 0,
                nonce: "string" === typeof options.nonce ? options.nonce : void 0
              });
          } else null == options && Internals.d.M(href);
      };
      exports.preload = function(href, options) {
        var encountered = "";
        "string" === typeof href && href || (encountered += " The `href` argument encountered was " + getValueDescriptorExpectingObjectForWarning(href) + ".");
        null == options || "object" !== typeof options ? encountered += " The `options` argument encountered was " + getValueDescriptorExpectingObjectForWarning(options) + "." : "string" === typeof options.as && options.as || (encountered += " The `as` option encountered was " + getValueDescriptorExpectingObjectForWarning(options.as) + ".");
        encountered && console.error(
          'ReactDOM.preload(): Expected two arguments, a non-empty `href` string and an `options` object with an `as` property valid for a `<link rel="preload" as="..." />` tag.%s',
          encountered
        );
        if ("string" === typeof href && "object" === typeof options && null !== options && "string" === typeof options.as) {
          encountered = options.as;
          var crossOrigin = getCrossOriginStringAs(
            encountered,
            options.crossOrigin
          );
          Internals.d.L(href, encountered, {
            crossOrigin,
            integrity: "string" === typeof options.integrity ? options.integrity : void 0,
            nonce: "string" === typeof options.nonce ? options.nonce : void 0,
            type: "string" === typeof options.type ? options.type : void 0,
            fetchPriority: "string" === typeof options.fetchPriority ? options.fetchPriority : void 0,
            referrerPolicy: "string" === typeof options.referrerPolicy ? options.referrerPolicy : void 0,
            imageSrcSet: "string" === typeof options.imageSrcSet ? options.imageSrcSet : void 0,
            imageSizes: "string" === typeof options.imageSizes ? options.imageSizes : void 0,
            media: "string" === typeof options.media ? options.media : void 0
          });
        }
      };
      exports.preloadModule = function(href, options) {
        var encountered = "";
        "string" === typeof href && href || (encountered += " The `href` argument encountered was " + getValueDescriptorExpectingObjectForWarning(href) + ".");
        void 0 !== options && "object" !== typeof options ? encountered += " The `options` argument encountered was " + getValueDescriptorExpectingObjectForWarning(options) + "." : options && "as" in options && "string" !== typeof options.as && (encountered += " The `as` option encountered was " + getValueDescriptorExpectingObjectForWarning(options.as) + ".");
        encountered && console.error(
          'ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, an `options` object with an `as` property valid for a `<link rel="modulepreload" as="..." />` tag.%s',
          encountered
        );
        "string" === typeof href && (options ? (encountered = getCrossOriginStringAs(
          options.as,
          options.crossOrigin
        ), Internals.d.m(href, {
          as: "string" === typeof options.as && "script" !== options.as ? options.as : void 0,
          crossOrigin: encountered,
          integrity: "string" === typeof options.integrity ? options.integrity : void 0
        })) : Internals.d.m(href));
      };
      exports.requestFormReset = function(form) {
        Internals.d.r(form);
      };
      exports.unstable_batchedUpdates = function(fn, a) {
        return fn(a);
      };
      exports.useFormState = function(action, initialState, permalink) {
        return resolveDispatcher().useFormState(action, initialState, permalink);
      };
      exports.useFormStatus = function() {
        return resolveDispatcher().useHostTransitionStatus();
      };
      exports.version = "19.1.1";
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
    })();
  }
});

// node_modules/react-dom/index.js
var require_react_dom = __commonJS({
  "node_modules/react-dom/index.js"(exports, module) {
    "use strict";
    if (false) {
      checkDCE();
      module.exports = null;
    } else {
      module.exports = require_react_dom_development();
    }
  }
});

// viewer/main.tsx
import * as React14 from "react";
import * as ReactDOM2 from "react-dom/client";
import * as d3 from "d3";

// node_modules/@radix-ui/react-toolbar/dist/index.mjs
import * as React13 from "react";

// node_modules/@radix-ui/primitive/dist/index.mjs
function composeEventHandlers(originalEventHandler, ourEventHandler, { checkForDefaultPrevented = true } = {}) {
  return function handleEvent(event) {
    originalEventHandler?.(event);
    if (checkForDefaultPrevented === false || !event.defaultPrevented) {
      return ourEventHandler?.(event);
    }
  };
}

// node_modules/@radix-ui/react-context/dist/index.mjs
import * as React from "react";
import { jsx } from "react/jsx-runtime";
function createContextScope(scopeName, createContextScopeDeps = []) {
  let defaultContexts = [];
  function createContext3(rootComponentName, defaultContext) {
    const BaseContext = React.createContext(defaultContext);
    const index = defaultContexts.length;
    defaultContexts = [...defaultContexts, defaultContext];
    const Provider = (props) => {
      const { scope, children, ...context } = props;
      const Context = scope?.[scopeName]?.[index] || BaseContext;
      const value = React.useMemo(() => context, Object.values(context));
      return /* @__PURE__ */ jsx(Context.Provider, { value, children });
    };
    Provider.displayName = rootComponentName + "Provider";
    function useContext22(consumerName, scope) {
      const Context = scope?.[scopeName]?.[index] || BaseContext;
      const context = React.useContext(Context);
      if (context) return context;
      if (defaultContext !== void 0) return defaultContext;
      throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
    }
    return [Provider, useContext22];
  }
  const createScope = () => {
    const scopeContexts = defaultContexts.map((defaultContext) => {
      return React.createContext(defaultContext);
    });
    return function useScope(scope) {
      const contexts = scope?.[scopeName] || scopeContexts;
      return React.useMemo(
        () => ({ [`__scope${scopeName}`]: { ...scope, [scopeName]: contexts } }),
        [scope, contexts]
      );
    };
  };
  createScope.scopeName = scopeName;
  return [createContext3, composeContextScopes(createScope, ...createContextScopeDeps)];
}
function composeContextScopes(...scopes) {
  const baseScope = scopes[0];
  if (scopes.length === 1) return baseScope;
  const createScope = () => {
    const scopeHooks = scopes.map((createScope2) => ({
      useScope: createScope2(),
      scopeName: createScope2.scopeName
    }));
    return function useComposedScopes(overrideScopes) {
      const nextScopes = scopeHooks.reduce((nextScopes2, { useScope, scopeName }) => {
        const scopeProps = useScope(overrideScopes);
        const currentScope = scopeProps[`__scope${scopeName}`];
        return { ...nextScopes2, ...currentScope };
      }, {});
      return React.useMemo(() => ({ [`__scope${baseScope.scopeName}`]: nextScopes }), [nextScopes]);
    };
  };
  createScope.scopeName = baseScope.scopeName;
  return createScope;
}

// node_modules/@radix-ui/react-roving-focus/dist/index.mjs
import * as React11 from "react";

// node_modules/@radix-ui/react-collection/dist/index.mjs
import React4 from "react";

// node_modules/@radix-ui/react-compose-refs/dist/index.mjs
import * as React2 from "react";
function setRef(ref, value) {
  if (typeof ref === "function") {
    return ref(value);
  } else if (ref !== null && ref !== void 0) {
    ref.current = value;
  }
}
function composeRefs(...refs) {
  return (node) => {
    let hasCleanup = false;
    const cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, node);
      if (!hasCleanup && typeof cleanup == "function") {
        hasCleanup = true;
      }
      return cleanup;
    });
    if (hasCleanup) {
      return () => {
        for (let i = 0; i < cleanups.length; i++) {
          const cleanup = cleanups[i];
          if (typeof cleanup == "function") {
            cleanup();
          } else {
            setRef(refs[i], null);
          }
        }
      };
    }
  };
}
function useComposedRefs(...refs) {
  return React2.useCallback(composeRefs(...refs), refs);
}

// node_modules/@radix-ui/react-slot/dist/index.mjs
import * as React3 from "react";
import { Fragment as Fragment2, jsx as jsx2 } from "react/jsx-runtime";
// @__NO_SIDE_EFFECTS__
function createSlot(ownerName) {
  const SlotClone = /* @__PURE__ */ createSlotClone(ownerName);
  const Slot2 = React3.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    const childrenArray = React3.Children.toArray(children);
    const slottable = childrenArray.find(isSlottable);
    if (slottable) {
      const newElement = slottable.props.children;
      const newChildren = childrenArray.map((child) => {
        if (child === slottable) {
          if (React3.Children.count(newElement) > 1) return React3.Children.only(null);
          return React3.isValidElement(newElement) ? newElement.props.children : null;
        } else {
          return child;
        }
      });
      return /* @__PURE__ */ jsx2(SlotClone, { ...slotProps, ref: forwardedRef, children: React3.isValidElement(newElement) ? React3.cloneElement(newElement, void 0, newChildren) : null });
    }
    return /* @__PURE__ */ jsx2(SlotClone, { ...slotProps, ref: forwardedRef, children });
  });
  Slot2.displayName = `${ownerName}.Slot`;
  return Slot2;
}
// @__NO_SIDE_EFFECTS__
function createSlotClone(ownerName) {
  const SlotClone = React3.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    if (React3.isValidElement(children)) {
      const childrenRef = getElementRef(children);
      const props2 = mergeProps(slotProps, children.props);
      if (children.type !== React3.Fragment) {
        props2.ref = forwardedRef ? composeRefs(forwardedRef, childrenRef) : childrenRef;
      }
      return React3.cloneElement(children, props2);
    }
    return React3.Children.count(children) > 1 ? React3.Children.only(null) : null;
  });
  SlotClone.displayName = `${ownerName}.SlotClone`;
  return SlotClone;
}
var SLOTTABLE_IDENTIFIER = Symbol("radix.slottable");
function isSlottable(child) {
  return React3.isValidElement(child) && typeof child.type === "function" && "__radixId" in child.type && child.type.__radixId === SLOTTABLE_IDENTIFIER;
}
function mergeProps(slotProps, childProps) {
  const overrideProps = { ...childProps };
  for (const propName in childProps) {
    const slotPropValue = slotProps[propName];
    const childPropValue = childProps[propName];
    const isHandler = /^on[A-Z]/.test(propName);
    if (isHandler) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args) => {
          const result = childPropValue(...args);
          slotPropValue(...args);
          return result;
        };
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue;
      }
    } else if (propName === "style") {
      overrideProps[propName] = { ...slotPropValue, ...childPropValue };
    } else if (propName === "className") {
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(" ");
    }
  }
  return { ...slotProps, ...overrideProps };
}
function getElementRef(element) {
  let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get;
  let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.ref;
  }
  getter = Object.getOwnPropertyDescriptor(element, "ref")?.get;
  mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.props.ref;
  }
  return element.props.ref || element.ref;
}

// node_modules/@radix-ui/react-collection/dist/index.mjs
import { jsx as jsx3 } from "react/jsx-runtime";
import React22 from "react";
import { jsx as jsx22 } from "react/jsx-runtime";
function createCollection(name) {
  const PROVIDER_NAME = name + "CollectionProvider";
  const [createCollectionContext, createCollectionScope2] = createContextScope(PROVIDER_NAME);
  const [CollectionProviderImpl, useCollectionContext] = createCollectionContext(
    PROVIDER_NAME,
    { collectionRef: { current: null }, itemMap: /* @__PURE__ */ new Map() }
  );
  const CollectionProvider = (props) => {
    const { scope, children } = props;
    const ref = React4.useRef(null);
    const itemMap = React4.useRef(/* @__PURE__ */ new Map()).current;
    return /* @__PURE__ */ jsx3(CollectionProviderImpl, { scope, itemMap, collectionRef: ref, children });
  };
  CollectionProvider.displayName = PROVIDER_NAME;
  const COLLECTION_SLOT_NAME = name + "CollectionSlot";
  const CollectionSlotImpl = createSlot(COLLECTION_SLOT_NAME);
  const CollectionSlot = React4.forwardRef(
    (props, forwardedRef) => {
      const { scope, children } = props;
      const context = useCollectionContext(COLLECTION_SLOT_NAME, scope);
      const composedRefs = useComposedRefs(forwardedRef, context.collectionRef);
      return /* @__PURE__ */ jsx3(CollectionSlotImpl, { ref: composedRefs, children });
    }
  );
  CollectionSlot.displayName = COLLECTION_SLOT_NAME;
  const ITEM_SLOT_NAME = name + "CollectionItemSlot";
  const ITEM_DATA_ATTR = "data-radix-collection-item";
  const CollectionItemSlotImpl = createSlot(ITEM_SLOT_NAME);
  const CollectionItemSlot = React4.forwardRef(
    (props, forwardedRef) => {
      const { scope, children, ...itemData } = props;
      const ref = React4.useRef(null);
      const composedRefs = useComposedRefs(forwardedRef, ref);
      const context = useCollectionContext(ITEM_SLOT_NAME, scope);
      React4.useEffect(() => {
        context.itemMap.set(ref, { ref, ...itemData });
        return () => void context.itemMap.delete(ref);
      });
      return /* @__PURE__ */ jsx3(CollectionItemSlotImpl, { ...{ [ITEM_DATA_ATTR]: "" }, ref: composedRefs, children });
    }
  );
  CollectionItemSlot.displayName = ITEM_SLOT_NAME;
  function useCollection2(scope) {
    const context = useCollectionContext(name + "CollectionConsumer", scope);
    const getItems = React4.useCallback(() => {
      const collectionNode = context.collectionRef.current;
      if (!collectionNode) return [];
      const orderedNodes = Array.from(collectionNode.querySelectorAll(`[${ITEM_DATA_ATTR}]`));
      const items = Array.from(context.itemMap.values());
      const orderedItems = items.sort(
        (a, b) => orderedNodes.indexOf(a.ref.current) - orderedNodes.indexOf(b.ref.current)
      );
      return orderedItems;
    }, [context.collectionRef, context.itemMap]);
    return getItems;
  }
  return [
    { Provider: CollectionProvider, Slot: CollectionSlot, ItemSlot: CollectionItemSlot },
    useCollection2,
    createCollectionScope2
  ];
}

// node_modules/@radix-ui/react-id/dist/index.mjs
import * as React6 from "react";

// node_modules/@radix-ui/react-use-layout-effect/dist/index.mjs
import * as React5 from "react";
var useLayoutEffect2 = globalThis?.document ? React5.useLayoutEffect : () => {
};

// node_modules/@radix-ui/react-id/dist/index.mjs
var useReactId = React6[" useId ".trim().toString()] || (() => void 0);
var count = 0;
function useId(deterministicId) {
  const [id, setId] = React6.useState(useReactId());
  useLayoutEffect2(() => {
    if (!deterministicId) setId((reactId) => reactId ?? String(count++));
  }, [deterministicId]);
  return deterministicId || (id ? `radix-${id}` : "");
}

// node_modules/@radix-ui/react-primitive/dist/index.mjs
var ReactDOM = __toESM(require_react_dom(), 1);
import * as React7 from "react";
import { jsx as jsx4 } from "react/jsx-runtime";
var NODES = [
  "a",
  "button",
  "div",
  "form",
  "h2",
  "h3",
  "img",
  "input",
  "label",
  "li",
  "nav",
  "ol",
  "p",
  "select",
  "span",
  "svg",
  "ul"
];
var Primitive = NODES.reduce((primitive, node) => {
  const Slot = createSlot(`Primitive.${node}`);
  const Node2 = React7.forwardRef((props, forwardedRef) => {
    const { asChild, ...primitiveProps } = props;
    const Comp = asChild ? Slot : node;
    if (typeof window !== "undefined") {
      window[Symbol.for("radix-ui")] = true;
    }
    return /* @__PURE__ */ jsx4(Comp, { ...primitiveProps, ref: forwardedRef });
  });
  Node2.displayName = `Primitive.${node}`;
  return { ...primitive, [node]: Node2 };
}, {});

// node_modules/@radix-ui/react-use-callback-ref/dist/index.mjs
import * as React8 from "react";
function useCallbackRef(callback) {
  const callbackRef = React8.useRef(callback);
  React8.useEffect(() => {
    callbackRef.current = callback;
  });
  return React8.useMemo(() => (...args) => callbackRef.current?.(...args), []);
}

// node_modules/@radix-ui/react-use-controllable-state/dist/index.mjs
import * as React9 from "react";
import * as React23 from "react";
var useInsertionEffect = React9[" useInsertionEffect ".trim().toString()] || useLayoutEffect2;
function useControllableState({
  prop,
  defaultProp,
  onChange = () => {
  },
  caller
}) {
  const [uncontrolledProp, setUncontrolledProp, onChangeRef] = useUncontrolledState({
    defaultProp,
    onChange
  });
  const isControlled = prop !== void 0;
  const value = isControlled ? prop : uncontrolledProp;
  if (true) {
    const isControlledRef = React9.useRef(prop !== void 0);
    React9.useEffect(() => {
      const wasControlled = isControlledRef.current;
      if (wasControlled !== isControlled) {
        const from = wasControlled ? "controlled" : "uncontrolled";
        const to = isControlled ? "controlled" : "uncontrolled";
        console.warn(
          `${caller} is changing from ${from} to ${to}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`
        );
      }
      isControlledRef.current = isControlled;
    }, [isControlled, caller]);
  }
  const setValue = React9.useCallback(
    (nextValue) => {
      if (isControlled) {
        const value2 = isFunction(nextValue) ? nextValue(prop) : nextValue;
        if (value2 !== prop) {
          onChangeRef.current?.(value2);
        }
      } else {
        setUncontrolledProp(nextValue);
      }
    },
    [isControlled, prop, setUncontrolledProp, onChangeRef]
  );
  return [value, setValue];
}
function useUncontrolledState({
  defaultProp,
  onChange
}) {
  const [value, setValue] = React9.useState(defaultProp);
  const prevValueRef = React9.useRef(value);
  const onChangeRef = React9.useRef(onChange);
  useInsertionEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  React9.useEffect(() => {
    if (prevValueRef.current !== value) {
      onChangeRef.current?.(value);
      prevValueRef.current = value;
    }
  }, [value, prevValueRef]);
  return [value, setValue, onChangeRef];
}
function isFunction(value) {
  return typeof value === "function";
}
var SYNC_STATE = Symbol("RADIX:SYNC_STATE");

// node_modules/@radix-ui/react-direction/dist/index.mjs
import * as React10 from "react";
import { jsx as jsx5 } from "react/jsx-runtime";
var DirectionContext = React10.createContext(void 0);
function useDirection(localDir) {
  const globalDir = React10.useContext(DirectionContext);
  return localDir || globalDir || "ltr";
}

// node_modules/@radix-ui/react-roving-focus/dist/index.mjs
import { jsx as jsx6 } from "react/jsx-runtime";
var ENTRY_FOCUS = "rovingFocusGroup.onEntryFocus";
var EVENT_OPTIONS = { bubbles: false, cancelable: true };
var GROUP_NAME = "RovingFocusGroup";
var [Collection, useCollection, createCollectionScope] = createCollection(GROUP_NAME);
var [createRovingFocusGroupContext, createRovingFocusGroupScope] = createContextScope(
  GROUP_NAME,
  [createCollectionScope]
);
var [RovingFocusProvider, useRovingFocusContext] = createRovingFocusGroupContext(GROUP_NAME);
var RovingFocusGroup = React11.forwardRef(
  (props, forwardedRef) => {
    return /* @__PURE__ */ jsx6(Collection.Provider, { scope: props.__scopeRovingFocusGroup, children: /* @__PURE__ */ jsx6(Collection.Slot, { scope: props.__scopeRovingFocusGroup, children: /* @__PURE__ */ jsx6(RovingFocusGroupImpl, { ...props, ref: forwardedRef }) }) });
  }
);
RovingFocusGroup.displayName = GROUP_NAME;
var RovingFocusGroupImpl = React11.forwardRef((props, forwardedRef) => {
  const {
    __scopeRovingFocusGroup,
    orientation,
    loop = false,
    dir,
    currentTabStopId: currentTabStopIdProp,
    defaultCurrentTabStopId,
    onCurrentTabStopIdChange,
    onEntryFocus,
    preventScrollOnEntryFocus = false,
    ...groupProps
  } = props;
  const ref = React11.useRef(null);
  const composedRefs = useComposedRefs(forwardedRef, ref);
  const direction = useDirection(dir);
  const [currentTabStopId, setCurrentTabStopId] = useControllableState({
    prop: currentTabStopIdProp,
    defaultProp: defaultCurrentTabStopId ?? null,
    onChange: onCurrentTabStopIdChange,
    caller: GROUP_NAME
  });
  const [isTabbingBackOut, setIsTabbingBackOut] = React11.useState(false);
  const handleEntryFocus = useCallbackRef(onEntryFocus);
  const getItems = useCollection(__scopeRovingFocusGroup);
  const isClickFocusRef = React11.useRef(false);
  const [focusableItemsCount, setFocusableItemsCount] = React11.useState(0);
  React11.useEffect(() => {
    const node = ref.current;
    if (node) {
      node.addEventListener(ENTRY_FOCUS, handleEntryFocus);
      return () => node.removeEventListener(ENTRY_FOCUS, handleEntryFocus);
    }
  }, [handleEntryFocus]);
  return /* @__PURE__ */ jsx6(
    RovingFocusProvider,
    {
      scope: __scopeRovingFocusGroup,
      orientation,
      dir: direction,
      loop,
      currentTabStopId,
      onItemFocus: React11.useCallback(
        (tabStopId) => setCurrentTabStopId(tabStopId),
        [setCurrentTabStopId]
      ),
      onItemShiftTab: React11.useCallback(() => setIsTabbingBackOut(true), []),
      onFocusableItemAdd: React11.useCallback(
        () => setFocusableItemsCount((prevCount) => prevCount + 1),
        []
      ),
      onFocusableItemRemove: React11.useCallback(
        () => setFocusableItemsCount((prevCount) => prevCount - 1),
        []
      ),
      children: /* @__PURE__ */ jsx6(
        Primitive.div,
        {
          tabIndex: isTabbingBackOut || focusableItemsCount === 0 ? -1 : 0,
          "data-orientation": orientation,
          ...groupProps,
          ref: composedRefs,
          style: { outline: "none", ...props.style },
          onMouseDown: composeEventHandlers(props.onMouseDown, () => {
            isClickFocusRef.current = true;
          }),
          onFocus: composeEventHandlers(props.onFocus, (event) => {
            const isKeyboardFocus = !isClickFocusRef.current;
            if (event.target === event.currentTarget && isKeyboardFocus && !isTabbingBackOut) {
              const entryFocusEvent = new CustomEvent(ENTRY_FOCUS, EVENT_OPTIONS);
              event.currentTarget.dispatchEvent(entryFocusEvent);
              if (!entryFocusEvent.defaultPrevented) {
                const items = getItems().filter((item) => item.focusable);
                const activeItem = items.find((item) => item.active);
                const currentItem = items.find((item) => item.id === currentTabStopId);
                const candidateItems = [activeItem, currentItem, ...items].filter(
                  Boolean
                );
                const candidateNodes = candidateItems.map((item) => item.ref.current);
                focusFirst(candidateNodes, preventScrollOnEntryFocus);
              }
            }
            isClickFocusRef.current = false;
          }),
          onBlur: composeEventHandlers(props.onBlur, () => setIsTabbingBackOut(false))
        }
      )
    }
  );
});
var ITEM_NAME = "RovingFocusGroupItem";
var RovingFocusGroupItem = React11.forwardRef(
  (props, forwardedRef) => {
    const {
      __scopeRovingFocusGroup,
      focusable = true,
      active = false,
      tabStopId,
      children,
      ...itemProps
    } = props;
    const autoId = useId();
    const id = tabStopId || autoId;
    const context = useRovingFocusContext(ITEM_NAME, __scopeRovingFocusGroup);
    const isCurrentTabStop = context.currentTabStopId === id;
    const getItems = useCollection(__scopeRovingFocusGroup);
    const { onFocusableItemAdd, onFocusableItemRemove, currentTabStopId } = context;
    React11.useEffect(() => {
      if (focusable) {
        onFocusableItemAdd();
        return () => onFocusableItemRemove();
      }
    }, [focusable, onFocusableItemAdd, onFocusableItemRemove]);
    return /* @__PURE__ */ jsx6(
      Collection.ItemSlot,
      {
        scope: __scopeRovingFocusGroup,
        id,
        focusable,
        active,
        children: /* @__PURE__ */ jsx6(
          Primitive.span,
          {
            tabIndex: isCurrentTabStop ? 0 : -1,
            "data-orientation": context.orientation,
            ...itemProps,
            ref: forwardedRef,
            onMouseDown: composeEventHandlers(props.onMouseDown, (event) => {
              if (!focusable) event.preventDefault();
              else context.onItemFocus(id);
            }),
            onFocus: composeEventHandlers(props.onFocus, () => context.onItemFocus(id)),
            onKeyDown: composeEventHandlers(props.onKeyDown, (event) => {
              if (event.key === "Tab" && event.shiftKey) {
                context.onItemShiftTab();
                return;
              }
              if (event.target !== event.currentTarget) return;
              const focusIntent = getFocusIntent(event, context.orientation, context.dir);
              if (focusIntent !== void 0) {
                if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
                event.preventDefault();
                const items = getItems().filter((item) => item.focusable);
                let candidateNodes = items.map((item) => item.ref.current);
                if (focusIntent === "last") candidateNodes.reverse();
                else if (focusIntent === "prev" || focusIntent === "next") {
                  if (focusIntent === "prev") candidateNodes.reverse();
                  const currentIndex = candidateNodes.indexOf(event.currentTarget);
                  candidateNodes = context.loop ? wrapArray(candidateNodes, currentIndex + 1) : candidateNodes.slice(currentIndex + 1);
                }
                setTimeout(() => focusFirst(candidateNodes));
              }
            }),
            children: typeof children === "function" ? children({ isCurrentTabStop, hasTabStop: currentTabStopId != null }) : children
          }
        )
      }
    );
  }
);
RovingFocusGroupItem.displayName = ITEM_NAME;
var MAP_KEY_TO_FOCUS_INTENT = {
  ArrowLeft: "prev",
  ArrowUp: "prev",
  ArrowRight: "next",
  ArrowDown: "next",
  PageUp: "first",
  Home: "first",
  PageDown: "last",
  End: "last"
};
function getDirectionAwareKey(key, dir) {
  if (dir !== "rtl") return key;
  return key === "ArrowLeft" ? "ArrowRight" : key === "ArrowRight" ? "ArrowLeft" : key;
}
function getFocusIntent(event, orientation, dir) {
  const key = getDirectionAwareKey(event.key, dir);
  if (orientation === "vertical" && ["ArrowLeft", "ArrowRight"].includes(key)) return void 0;
  if (orientation === "horizontal" && ["ArrowUp", "ArrowDown"].includes(key)) return void 0;
  return MAP_KEY_TO_FOCUS_INTENT[key];
}
function focusFirst(candidates, preventScroll = false) {
  const PREVIOUSLY_FOCUSED_ELEMENT = document.activeElement;
  for (const candidate of candidates) {
    if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) return;
    candidate.focus({ preventScroll });
    if (document.activeElement !== PREVIOUSLY_FOCUSED_ELEMENT) return;
  }
}
function wrapArray(array, startIndex) {
  return array.map((_, index) => array[(startIndex + index) % array.length]);
}
var Root = RovingFocusGroup;
var Item = RovingFocusGroupItem;

// node_modules/@radix-ui/react-separator/dist/index.mjs
import * as React12 from "react";
import { jsx as jsx7 } from "react/jsx-runtime";
var NAME = "Separator";
var DEFAULT_ORIENTATION = "horizontal";
var ORIENTATIONS = ["horizontal", "vertical"];
var Separator = React12.forwardRef((props, forwardedRef) => {
  const { decorative, orientation: orientationProp = DEFAULT_ORIENTATION, ...domProps } = props;
  const orientation = isValidOrientation(orientationProp) ? orientationProp : DEFAULT_ORIENTATION;
  const ariaOrientation = orientation === "vertical" ? orientation : void 0;
  const semanticProps = decorative ? { role: "none" } : { "aria-orientation": ariaOrientation, role: "separator" };
  return /* @__PURE__ */ jsx7(
    Primitive.div,
    {
      "data-orientation": orientation,
      ...semanticProps,
      ...domProps,
      ref: forwardedRef
    }
  );
});
Separator.displayName = NAME;
function isValidOrientation(orientation) {
  return ORIENTATIONS.includes(orientation);
}
var Root2 = Separator;

// node_modules/@radix-ui/react-toolbar/dist/index.mjs
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { createToggleGroupScope } from "@radix-ui/react-toggle-group";
import { jsx as jsx8 } from "react/jsx-runtime";
var TOOLBAR_NAME = "Toolbar";
var [createToolbarContext, createToolbarScope] = createContextScope(TOOLBAR_NAME, [
  createRovingFocusGroupScope,
  createToggleGroupScope
]);
var useRovingFocusGroupScope = createRovingFocusGroupScope();
var useToggleGroupScope = createToggleGroupScope();
var [ToolbarProvider, useToolbarContext] = createToolbarContext(TOOLBAR_NAME);
var Toolbar = React13.forwardRef(
  (props, forwardedRef) => {
    const { __scopeToolbar, orientation = "horizontal", dir, loop = true, ...toolbarProps } = props;
    const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeToolbar);
    const direction = useDirection(dir);
    return /* @__PURE__ */ jsx8(ToolbarProvider, { scope: __scopeToolbar, orientation, dir: direction, children: /* @__PURE__ */ jsx8(
      Root,
      {
        asChild: true,
        ...rovingFocusGroupScope,
        orientation,
        dir: direction,
        loop,
        children: /* @__PURE__ */ jsx8(
          Primitive.div,
          {
            role: "toolbar",
            "aria-orientation": orientation,
            dir: direction,
            ...toolbarProps,
            ref: forwardedRef
          }
        )
      }
    ) });
  }
);
Toolbar.displayName = TOOLBAR_NAME;
var SEPARATOR_NAME = "ToolbarSeparator";
var ToolbarSeparator = React13.forwardRef(
  (props, forwardedRef) => {
    const { __scopeToolbar, ...separatorProps } = props;
    const context = useToolbarContext(SEPARATOR_NAME, __scopeToolbar);
    return /* @__PURE__ */ jsx8(
      Root2,
      {
        orientation: context.orientation === "horizontal" ? "vertical" : "horizontal",
        ...separatorProps,
        ref: forwardedRef
      }
    );
  }
);
ToolbarSeparator.displayName = SEPARATOR_NAME;
var BUTTON_NAME = "ToolbarButton";
var ToolbarButton = React13.forwardRef(
  (props, forwardedRef) => {
    const { __scopeToolbar, ...buttonProps } = props;
    const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeToolbar);
    return /* @__PURE__ */ jsx8(Item, { asChild: true, ...rovingFocusGroupScope, focusable: !props.disabled, children: /* @__PURE__ */ jsx8(Primitive.button, { type: "button", ...buttonProps, ref: forwardedRef }) });
  }
);
ToolbarButton.displayName = BUTTON_NAME;
var LINK_NAME = "ToolbarLink";
var ToolbarLink = React13.forwardRef(
  (props, forwardedRef) => {
    const { __scopeToolbar, ...linkProps } = props;
    const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeToolbar);
    return /* @__PURE__ */ jsx8(Item, { asChild: true, ...rovingFocusGroupScope, focusable: true, children: /* @__PURE__ */ jsx8(
      Primitive.a,
      {
        ...linkProps,
        ref: forwardedRef,
        onKeyDown: composeEventHandlers(props.onKeyDown, (event) => {
          if (event.key === " ") event.currentTarget.click();
        })
      }
    ) });
  }
);
ToolbarLink.displayName = LINK_NAME;
var TOGGLE_GROUP_NAME = "ToolbarToggleGroup";
var ToolbarToggleGroup = React13.forwardRef(
  (props, forwardedRef) => {
    const { __scopeToolbar, ...toggleGroupProps } = props;
    const context = useToolbarContext(TOGGLE_GROUP_NAME, __scopeToolbar);
    const toggleGroupScope = useToggleGroupScope(__scopeToolbar);
    return /* @__PURE__ */ jsx8(
      ToggleGroupPrimitive.Root,
      {
        "data-orientation": context.orientation,
        dir: context.dir,
        ...toggleGroupScope,
        ...toggleGroupProps,
        ref: forwardedRef,
        rovingFocus: false
      }
    );
  }
);
ToolbarToggleGroup.displayName = TOGGLE_GROUP_NAME;
var TOGGLE_ITEM_NAME = "ToolbarToggleItem";
var ToolbarToggleItem = React13.forwardRef(
  (props, forwardedRef) => {
    const { __scopeToolbar, ...toggleItemProps } = props;
    const toggleGroupScope = useToggleGroupScope(__scopeToolbar);
    const scope = { __scopeToolbar: props.__scopeToolbar };
    return /* @__PURE__ */ jsx8(ToolbarButton, { asChild: true, ...scope, children: /* @__PURE__ */ jsx8(ToggleGroupPrimitive.Item, { ...toggleGroupScope, ...toggleItemProps, ref: forwardedRef }) });
  }
);
ToolbarToggleItem.displayName = TOGGLE_ITEM_NAME;
var Root4 = Toolbar;
var Separator2 = ToolbarSeparator;

// viewer/main.tsx
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import * as Select from "@radix-ui/react-select";
import * as ScrollArea from "@radix-ui/react-scroll-area";

// node_modules/@radix-ui/react-icons/dist/react-icons.esm.js
import { forwardRef as forwardRef6, createElement } from "react";
function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;
  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }
  return target;
}
var _excluded$T = ["color"];
var CheckIcon = /* @__PURE__ */ forwardRef6(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, _excluded$T);
  return createElement("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), createElement("path", {
    d: "M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var _excluded$W = ["color"];
var ChevronDownIcon = /* @__PURE__ */ forwardRef6(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, _excluded$W);
  return createElement("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), createElement("path", {
    d: "M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});

// viewer/main.tsx
import { Fragment as Fragment3, jsx as jsx9, jsxs } from "react/jsx-runtime";
var { useEffect: useEffect5, useMemo: useMemo4, useRef: useRef5, useState: useState4, forwardRef: forwardRef7 } = React14;
var FLAGS = {
  "page->ui": "#d9480f",
  "ui->block": "#c1121f",
  "ui->layout": "#6a040f",
  "block->page": "#ff7b00",
  "policy": "#b000b5",
  "policy:info": "#8b5cf6",
  "prisma-import": "#005f73",
  "server-in-client": "#ff3b30"
};
var KINDS = ["page", "layout-block", "content-block", "component", "ui", "animation", "styleguide", "types", "tokens", "server-lib", "api", "prisma", "other"];
function useUrlState(defaults) {
  const [state, setState] = useState4(() => {
    const u = new URL(window.location.href);
    const out = { ...defaults };
    Object.keys(defaults).forEach((k) => {
      const key = `dg.${k}`;
      if (!u.searchParams.has(key)) return;
      try {
        out[k] = JSON.parse(u.searchParams.get(key));
      } catch {
      }
    });
    return out;
  });
  const patch = (next) => {
    setState((s) => {
      const merged = { ...s, ...next };
      const u = new URL(window.location.href);
      for (const [k, v] of Object.entries(merged)) u.searchParams.set(`dg.${k}`, JSON.stringify(v));
      history.replaceState(null, "", u.toString());
      return merged;
    });
  };
  return [state, patch];
}
function shortLabel(p) {
  const parts = p.split("/"), file = parts.at(-1) || "", parent = parts.at(-2) || "root";
  const base = ["app", "components"].includes(parent) ? "root" : parent;
  if (/^page\.(t|j)sx?$/.test(file)) return `${base} (p)`;
  if (/^route\.(t|j)sx?$/.test(file)) return `${base} (r)`;
  if (/^index\.(t|j)sx?$/.test(file)) return `${base} (i)`;
  return file.replace(/\.(t|j)sx?$/, "");
}
function TreeView({ data, selectedId, onPick, onFilterDir }) {
  const [open, setOpen] = useState4({ app: true, components: true, lib: true });
  const [q, setQ] = useState4("");
  const tree = useMemo4(() => {
    const root = { name: "", path: "", files: [], dirs: {} };
    for (const n of data.nodes) {
      const parts = n.path.split("/");
      let cur = root;
      for (let i = 0; i < parts.length - 1; i++) {
        const seg = parts[i];
        cur.dirs[seg] ||= { name: seg, path: (cur.path ? cur.path + "/" : "") + seg, files: [], dirs: {} };
        cur = cur.dirs[seg];
      }
      cur.files.push(n);
    }
    return root;
  }, [data.nodes]);
  function Dir({ t, depth }) {
    return Object.keys(t.dirs).sort().map((name) => {
      const child = t.dirs[name], key = child.path || name, isOpen = !!open[key];
      const dirCount = Object.keys(child.dirs).length, fileCount = child.files.length;
      return /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center", style: { paddingLeft: depth * 12 }, children: [
          /* @__PURE__ */ jsx9("button", { className: "chip", onClick: () => setOpen((o) => ({ ...o, [key]: !o[key] })), children: isOpen ? "\u25BE" : "\u25B8" }),
          /* @__PURE__ */ jsxs("button", { className: "tree-item", style: { marginLeft: 6 }, onClick: () => onFilterDir(child.path), children: [
            name,
            /* @__PURE__ */ jsxs("span", { className: "badge", children: [
              dirCount ? " " + dirCount + "d" : "",
              " ",
              fileCount ? " " + fileCount + "f" : ""
            ] })
          ] })
        ] }),
        isOpen && /* @__PURE__ */ jsx9(Dir, { t: child, depth: depth + 1 }),
        isOpen && child.files.filter((f) => !q || f.path.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.path.localeCompare(b.path)).map((f) => /* @__PURE__ */ jsxs(
          "button",
          {
            style: { paddingLeft: (depth + 1) * 12 },
            className: "tree",
            onClick: () => onPick(f.id),
            children: [
              f.path.split("/").pop(),
              " ",
              /* @__PURE__ */ jsxs("span", { className: "badge", children: [
                "(",
                f.kind,
                ")"
              ] })
            ]
          },
          f.id
        ))
      ] }, key);
    });
  }
  return /* @__PURE__ */ jsxs("div", { className: "panel", children: [
    /* @__PURE__ */ jsx9("div", { className: "hd", children: "Tree" }),
    /* @__PURE__ */ jsxs("div", { className: "bd", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2 mb-2", children: [
        /* @__PURE__ */ jsx9("input", { className: "input", placeholder: "Filter tree\u2026", value: q, onChange: (e) => setQ(e.target.value) }),
        /* @__PURE__ */ jsx9("button", { className: "btn", onClick: () => onFilterDir(""), children: "Clear" })
      ] }),
      /* @__PURE__ */ jsx9(ScrollArea.Root, { type: "always", children: /* @__PURE__ */ jsx9(ScrollArea.Viewport, { children: /* @__PURE__ */ jsx9("div", { className: "tree", children: /* @__PURE__ */ jsx9(Dir, { t: tree, depth: 0 }) }) }) })
    ] })
  ] });
}
function Inspector({ node, edges, byId, onReveal, onExpand }) {
  if (!node) return null;
  const inc = edges.filter((e) => e.source === node.id || e.target === node.id);
  const inDeg = inc.filter((e) => e.target === node.id).length;
  const outDeg = inc.filter((e) => e.source === node.id).length;
  const flags = Array.from(new Set(inc.flatMap((e) => e.flags || [])));
  const neighbors = Array.from(new Set(inc.map((e) => e.source === node.id ? e.target : e.source))).map((id) => byId[id]);
  return /* @__PURE__ */ jsxs("div", { className: "panel", style: { marginTop: 12 }, children: [
    /* @__PURE__ */ jsx9("div", { className: "hd", children: "Inspector" }),
    /* @__PURE__ */ jsxs("div", { className: "bd", children: [
      /* @__PURE__ */ jsx9("div", { className: "small", children: "Focused" }),
      /* @__PURE__ */ jsx9("div", { style: { fontWeight: 600 }, children: node.path }),
      /* @__PURE__ */ jsxs("div", { className: "small", style: { marginTop: 6 }, children: [
        "kind: ",
        node.kind,
        " \xB7 tags: ",
        node.tags?.join(", ") || "\u2014",
        " ",
        node.circular ? " \xB7 in a cycle" : ""
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "kv", style: { marginTop: 8 }, children: [
        /* @__PURE__ */ jsx9("div", { className: "small", children: "in-degree" }),
        /* @__PURE__ */ jsx9("div", { children: inDeg }),
        /* @__PURE__ */ jsx9("div", { className: "small", children: "out-degree" }),
        /* @__PURE__ */ jsx9("div", { children: outDeg }),
        /* @__PURE__ */ jsx9("div", { className: "small", children: "flags" }),
        /* @__PURE__ */ jsx9("div", { children: flags.length ? flags.join(", ") : "\u2014" })
      ] }),
      /* @__PURE__ */ jsx9("div", { style: { marginTop: 8 }, className: "small", children: "Neighbors" }),
      /* @__PURE__ */ jsxs("ul", { style: { margin: 0, paddingLeft: 16 }, children: [
        neighbors.slice(0, 20).map((n) => /* @__PURE__ */ jsx9("li", { children: n.path }, n.id)),
        neighbors.length > 20 ? /* @__PURE__ */ jsxs("li", { children: [
          "\u2026 ",
          neighbors.length - 20,
          " more"
        ] }) : null
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, marginTop: 10 }, children: [
        /* @__PURE__ */ jsx9("button", { className: "btn", onClick: onExpand, children: "Expand neighbors" }),
        /* @__PURE__ */ jsx9("button", { className: "btn", onClick: onReveal, children: "Reveal in tree" })
      ] })
    ] })
  ] });
}
function PolicyMatrix({ data, onEdgeFilter }) {
  const [filterState, setFilterState] = useState4({});
  const matrix = useMemo4(() => {
    const counts = {};
    const flags = {};
    KINDS.forEach((src) => {
      counts[src] = {};
      flags[src] = {};
      KINDS.forEach((dst) => {
        counts[src][dst] = 0;
        flags[src][dst] = [];
      });
    });
    data.edges.forEach((edge) => {
      const srcNode = data.nodes.find((n) => n.id === edge.source);
      const dstNode = data.nodes.find((n) => n.id === edge.target);
      if (srcNode && dstNode) {
        counts[srcNode.kind][dstNode.kind]++;
        if (edge.flags) {
          flags[srcNode.kind][dstNode.kind].push(...edge.flags);
        }
      }
    });
    return { counts, flags };
  }, [data]);
  const maxCount = Math.max(...Object.values(matrix.counts).flatMap((row) => Object.values(row)));
  const getIntensity = (count2) => {
    if (count2 === 0) return 0;
    return 0.1 + count2 / maxCount * 0.9;
  };
  const toggleFilter = (src, dst) => {
    const key = `${src}->${dst}`;
    const newState = !filterState[key];
    setFilterState((prev) => ({ ...prev, [key]: newState }));
    onEdgeFilter(src, dst, newState);
  };
  return /* @__PURE__ */ jsxs("div", { className: "panel", style: { marginTop: 12 }, children: [
    /* @__PURE__ */ jsx9("div", { className: "hd", children: "Policy Matrix" }),
    /* @__PURE__ */ jsxs("div", { className: "bd", children: [
      /* @__PURE__ */ jsx9("div", { className: "small", style: { marginBottom: 8 }, children: "Edge counts between kinds. Click cells to filter." }),
      /* @__PURE__ */ jsx9("div", { style: { overflowX: "auto" }, children: /* @__PURE__ */ jsxs("table", { style: { fontSize: 10, borderCollapse: "collapse", width: "100%" }, children: [
        /* @__PURE__ */ jsx9("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx9("th", { style: { padding: 2, textAlign: "left", minWidth: 60 }, children: "src\\dst" }),
          KINDS.map((dst) => /* @__PURE__ */ jsx9("th", { style: { padding: 2, textAlign: "center", minWidth: 30, writingMode: "vertical-rl", textOrientation: "mixed" }, children: dst.slice(0, 3) }, dst))
        ] }) }),
        /* @__PURE__ */ jsx9("tbody", { children: KINDS.map((src) => /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx9("td", { style: { padding: 2, fontWeight: 600, fontSize: 9 }, children: src.slice(0, 8) }),
          KINDS.map((dst) => {
            const count2 = matrix.counts[src][dst];
            const cellFlags = matrix.flags[src][dst];
            const key = `${src}->${dst}`;
            const isActive = filterState[key];
            const intensity = getIntensity(count2);
            return /* @__PURE__ */ jsx9(
              "td",
              {
                style: {
                  padding: 1,
                  textAlign: "center",
                  backgroundColor: count2 > 0 ? isActive ? "#3b82f6" : `rgba(59,130,246,${intensity})` : "transparent",
                  color: count2 > 0 && intensity > 0.5 || isActive ? "white" : "inherit",
                  cursor: count2 > 0 ? "pointer" : "default",
                  border: isActive ? "1px solid #1d4ed8" : "1px solid #e5e7eb",
                  fontSize: 8
                },
                onClick: () => count2 > 0 && toggleFilter(src, dst),
                title: count2 > 0 ? `${src} \u2192 ${dst}: ${count2} edges${cellFlags.length ? "\nFlags: " + Array.from(new Set(cellFlags)).join(", ") : ""}` : void 0,
                children: count2 > 0 ? count2 : ""
              },
              dst
            );
          })
        ] }, src)) })
      ] }) }),
      /* @__PURE__ */ jsx9("div", { className: "small", style: { marginTop: 8, opacity: 0.7 }, children: "Blue intensity = edge count. Click to filter by kind pairs." })
    ] })
  ] });
}
var SelectItem = forwardRef7(({ children, className, ...props }, forwardedRef) => /* @__PURE__ */ jsxs(
  Select.Item,
  {
    className,
    ...props,
    ref: forwardedRef,
    style: { padding: "6px 12px", cursor: "pointer" },
    children: [
      /* @__PURE__ */ jsx9(Select.ItemText, { children }),
      /* @__PURE__ */ jsx9(Select.ItemIndicator, { style: { marginLeft: 6 }, children: /* @__PURE__ */ jsx9(CheckIcon, {}) })
    ]
  }
));
SelectItem.displayName = "SelectItem";
function DepGraph({ data, state, setState }) {
  const svgRef = useRef5(null);
  const [transform, setTransform] = useState4(d3.zoomIdentity);
  const colors = useMemo4(() => {
    const dark = matchMedia("(prefers-color-scheme: dark)").matches;
    return {
      stroke: dark ? "#4b5563" : "#c4c4c4",
      text: dark ? "#cbd5e1" : "#1f2937",
      kindScale: d3.scaleOrdinal().domain(KINDS).range(d3.schemeTableau10)
    };
  }, []);
  const nodes = useMemo4(() => data.nodes.map((n) => ({ ...n })), [data.nodes]);
  const edges = useMemo4(() => data.edges.map((e) => ({ ...e })), [data.edges]);
  const byId = useMemo4(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
  const adj = useMemo4(() => {
    const o = {};
    for (const e of edges) {
      (o[e.source] ||= /* @__PURE__ */ new Set()).add(e.target);
      (o[e.target] ||= /* @__PURE__ */ new Set()).add(e.source);
    }
    return o;
  }, [edges]);
  const degrees = useMemo4(() => {
    const d = {};
    for (const e of edges) {
      d[e.source] = (d[e.source] || 0) + 1;
      d[e.target] = (d[e.target] || 0) + 1;
    }
    return d;
  }, [edges]);
  const active = useMemo4(() => {
    const enabledFlags = state.enabledFlags;
    const onlyFlagged = state.onlyFlagged;
    if (state.selectedId) {
      const keep = /* @__PURE__ */ new Set([state.selectedId]);
      let front = /* @__PURE__ */ new Set([state.selectedId]);
      for (let i = 0; i < state.hops; i++) {
        const next = /* @__PURE__ */ new Set();
        for (const id of front) for (const n of Array.from(adj[id] || [])) next.add(n);
        next.forEach((n) => keep.add(n));
        front = next;
      }
      let es2 = edges.filter((e) => keep.has(e.source) && keep.has(e.target));
      if (onlyFlagged) es2 = es2.filter((e) => (e.flags || []).some((f) => enabledFlags[f]));
      if (state.kindPairFilters && Object.keys(state.kindPairFilters).length > 0) {
        es2 = es2.filter((e) => {
          const srcNode = byId[e.source];
          const dstNode = byId[e.target];
          const key = `${srcNode.kind}->${dstNode.kind}`;
          return state.kindPairFilters[key];
        });
      }
      const ids2 = new Set(nodes.filter((n) => keep.has(n.id)).map((n) => n.id));
      if (onlyFlagged && es2.length === 0) ids2.add(state.selectedId);
      return { ids: ids2, edges: es2 };
    }
    const allowedKinds = new Set(Object.entries(state.kindFilter).filter(([, v]) => v).map(([k]) => k));
    const ids = new Set(nodes.filter(
      (n) => (!state.dirPrefix || n.path.startsWith(state.dirPrefix)) && (!state.q || n.path.toLowerCase().includes(state.q.toLowerCase())) && (allowedKinds.size ? allowedKinds.has(n.kind) : true)
    ).map((n) => n.id));
    if (state.lowCoverageOnly) {
      for (const id of Array.from(ids)) {
        const n = nodes.find((x) => x.id === id);
        if (!n?.meta || typeof n.meta.coverage !== "number" || n.meta.coverage >= 60) ids.delete(id);
      }
    }
    let es = edges.filter((e) => ids.has(e.source) && ids.has(e.target));
    if (onlyFlagged) {
      es = es.filter((e) => (e.flags || []).some((f) => enabledFlags[f]));
      if (es.length) {
        const inc = /* @__PURE__ */ new Set();
        for (const e of es) {
          inc.add(e.source);
          inc.add(e.target);
        }
        for (const id of Array.from(ids)) if (!inc.has(id)) ids.delete(id);
      }
    }
    if (state.kindPairFilters && Object.keys(state.kindPairFilters).length > 0) {
      es = es.filter((e) => {
        const srcNode = byId[e.source];
        const dstNode = byId[e.target];
        const key = `${srcNode.kind}->${dstNode.kind}`;
        return state.kindPairFilters[key];
      });
    }
    return { ids, edges: es };
  }, [nodes, edges, state, adj, byId]);
  useEffect5(() => {
    if (!svgRef.current) return;
    const width = svgRef.current.clientWidth || 1e3;
    const height = 720;
    const colWidth = width / Math.max(1, KINDS.length - 2);
    const xForKind = (k) => 60 + Math.max(0, KINDS.indexOf(k)) * (colWidth * 0.9);
    const worker = new Worker("./layout-worker.js");
    const simNodes = nodes.filter((n) => active.ids.has(n.id));
    const simEdges = active.edges.map((e) => ({ ...e }));
    const columns = Object.fromEntries(KINDS.map((k) => [k, xForKind(k)]));
    worker.postMessage({ nodes: simNodes, edges: simEdges, width, height, columns });
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const g = svg.append("g").attr("transform", transform.toString());
    g.append("g").selectAll("line").data(KINDS).enter().append("line").attr("x1", (k) => xForKind(k)).attr("x2", (k) => xForKind(k)).attr("y1", 8).attr("y2", height - 8).attr("stroke", colors.stroke).attr("stroke-opacity", 0.12).attr("stroke-dasharray", "2,4");
    const bg = g.append("g").attr("stroke", colors.stroke).attr("stroke-opacity", 0.3).selectAll("line").data(simEdges).enter().append("line").attr("stroke-width", 1);
    const flagged = simEdges.filter((e) => (e.flags || []).some((f) => state.enabledFlags[f]));
    const hl = g.append("g").selectAll("line").data(flagged).enter().append("line").attr("stroke", (d) => FLAGS[(d.flags || []).find((f) => state.enabledFlags[f])] || "#d00").attr("stroke-width", 2.2).attr("stroke-opacity", 0.95);
    const nodeSel = g.append("g").selectAll("circle").data(simNodes).enter().append("circle").attr("r", (d) => {
      if (!state.sizeByDegree) return state.selectedId === d.id ? 9 : 7;
      const deg = degrees[d.id] || 0;
      return Math.min(14, 6 + Math.sqrt(deg)) + (state.selectedId === d.id ? 2 : 0);
    }).attr("fill", (d) => colors.kindScale(d.kind)).attr("stroke", (d) => d.circular ? "#ef4444" : d.meta?.coverage != null && d.meta.coverage < 60 ? "#f59e0b" : state.selectedId === d.id ? "#fff" : "#111827").attr("stroke-width", (d) => d.circular ? 2.6 : state.selectedId === d.id ? 2.2 : 1.2).style("cursor", "pointer").on("click", (_, d) => setState({ selectedId: d.id })).append("title").text((d) => d.path);
    const labels = g.append("g").selectAll("text").data(simNodes).enter().append("text").text((d) => shortLabel(d.path)).attr("font-size", 10).attr("dx", 10).attr("dy", 4).attr("fill", colors.text).attr("opacity", state.showLabels && transform.k >= 0.6 ? 1 : 0);
    const update = () => {
      bg.attr("x1", (d) => byId[d.source].x).attr("y1", (d) => byId[d.source].y).attr("x2", (d) => byId[d.target].x).attr("y2", (d) => byId[d.target].y);
      hl.attr("x1", (d) => byId[d.source].x).attr("y1", (d) => byId[d.source].y).attr("x2", (d) => byId[d.target].x).attr("y2", (d) => byId[d.target].y);
      nodeSel.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      labels.attr("x", (d) => d.x + 2).attr("y", (d) => d.y + 2);
    };
    const messageHandler = (ev) => {
      const { type, nodes: n } = ev.data;
      if (n) for (const m of n) {
        const t = byId[m.id];
        if (t) {
          t.x = m.x;
          t.y = m.y;
        }
      }
      update();
    };
    worker.addEventListener("message", messageHandler);
    const zoom2 = d3.zoom().scaleExtent([0.25, 4]).on("zoom", (ev) => {
      g.attr("transform", ev.transform.toString());
      setTransform(ev.transform);
      labels.attr("opacity", state.showLabels && ev.transform.k >= 0.6 ? 1 : 0);
    });
    svg.call(zoom2).call(zoom2.transform, transform);
    return () => {
      worker.terminate();
    };
  }, [nodes, edges, active, colors, transform, state.enabledFlags, state.selectedId, state.showLabels, state.sizeByDegree, degrees]);
  const selected = state.selectedId ? byId[state.selectedId] : null;
  return /* @__PURE__ */ jsxs(Fragment3, { children: [
    /* @__PURE__ */ jsxs(Root4, { className: "toolbar", style: { marginBottom: 8 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
        /* @__PURE__ */ jsx9(
          "input",
          {
            className: "input",
            type: "search",
            placeholder: "Search nodes by path\u2026",
            value: state.q,
            onChange: (e) => setState({ q: e.target.value })
          }
        ),
        /* @__PURE__ */ jsx9(
          ToggleGroup.Root,
          {
            type: "multiple",
            value: Object.entries(state.enabledFlags).filter(([, v]) => v).map(([k]) => k),
            onValueChange: (values) => setState({
              enabledFlags: Object.fromEntries(Object.keys(FLAGS).map((k) => [k, values.includes(k)]))
            }),
            children: Object.entries(FLAGS).map(([k, color]) => /* @__PURE__ */ jsx9(
              ToggleGroup.Item,
              {
                value: k,
                className: "chip",
                style: { color },
                children: k
              },
              k
            ))
          }
        ),
        /* @__PURE__ */ jsx9(Separator2, { style: { width: 1, height: 20, backgroundColor: "#e5e7eb", margin: "0 4px" } }),
        /* @__PURE__ */ jsxs(
          ToggleGroup.Root,
          {
            type: "multiple",
            value: [
              ...state.showLabels ? ["labels"] : [],
              ...state.sizeByDegree ? ["degree"] : [],
              ...state.onlyFlagged ? ["flagged"] : [],
              ...state.lowCoverageOnly ? ["coverage"] : []
            ],
            onValueChange: (values) => setState({
              showLabels: values.includes("labels"),
              sizeByDegree: values.includes("degree"),
              onlyFlagged: values.includes("flagged"),
              lowCoverageOnly: values.includes("coverage")
            }),
            children: [
              /* @__PURE__ */ jsx9(ToggleGroup.Item, { value: "labels", className: "chip", children: "Labels" }),
              /* @__PURE__ */ jsx9(ToggleGroup.Item, { value: "degree", className: "chip", children: "Size by Degree" }),
              /* @__PURE__ */ jsx9(ToggleGroup.Item, { value: "flagged", className: "chip", children: "Only Flagged" }),
              /* @__PURE__ */ jsx9(ToggleGroup.Item, { value: "coverage", className: "chip", children: "Coverage < 60%" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }, children: [
        /* @__PURE__ */ jsx9("span", { className: "small", children: "Hops" }),
        /* @__PURE__ */ jsxs(Select.Root, { value: String(state.hops), onValueChange: (v) => setState({ hops: Number(v) }), children: [
          /* @__PURE__ */ jsxs(Select.Trigger, { "aria-label": "Hops", className: "input", style: { display: "inline-flex", alignItems: "center", gap: 6, width: 80 }, children: [
            /* @__PURE__ */ jsx9(Select.Value, {}),
            /* @__PURE__ */ jsx9(Select.Icon, { children: /* @__PURE__ */ jsx9(ChevronDownIcon, {}) })
          ] }),
          /* @__PURE__ */ jsx9(Select.Portal, { children: /* @__PURE__ */ jsx9(Select.Content, { className: "panel", position: "popper", side: "bottom", align: "center", sideOffset: 4, children: /* @__PURE__ */ jsx9(Select.Viewport, { className: "bd", style: { padding: "4px 0" }, children: [1, 2, 3].map((v) => /* @__PURE__ */ jsx9(SelectItem, { value: String(v), className: "tree", children: v }, v)) }) }) })
        ] }),
        /* @__PURE__ */ jsx9("button", { className: "btn", onClick: () => setState({ selectedId: null }), children: "Clear focus" }),
        /* @__PURE__ */ jsx9("button", { className: "btn", onClick: () => setState({
          selectedId: null,
          q: "",
          dirPrefix: "",
          hops: 1,
          onlyFlagged: false,
          enabledFlags: Object.fromEntries(Object.keys(FLAGS).map((k) => [k, true])),
          kindFilter: Object.fromEntries(KINDS.map((k) => [k, true])),
          kindPairFilters: {},
          showLabels: false,
          sizeByDegree: false
        }), children: "Reset" })
      ] })
    ] }),
    /* @__PURE__ */ jsx9("svg", { ref: svgRef, width: "100%", height: "720" }),
    /* @__PURE__ */ jsx9(
      Inspector,
      {
        node: selected,
        edges: data.edges,
        byId,
        onReveal: () => document.querySelector(`.tree button[title='${selected?.path || ""}']`)?.scrollIntoView({ behavior: "smooth", block: "center" }),
        onExpand: () => setState({ hops: Math.min(3, state.hops + 1) })
      }
    )
  ] });
}
function App() {
  const [data, setData] = useState4({ nodes: [], edges: [], summary: {}, policy: {} });
  const [state, setStatePatch] = useUrlState({
    selectedId: null,
    q: "",
    dirPrefix: "",
    hops: 1,
    onlyFlagged: false,
    enabledFlags: Object.fromEntries(Object.keys(FLAGS).map((k) => [k, true])),
    kindFilter: Object.fromEntries(KINDS.map((k) => [k, true])),
    kindPairFilters: {},
    lowCoverageOnly: false,
    showLabels: false,
    sizeByDegree: false
  });
  const setState = (patch) => setStatePatch(patch);
  useEffect5(() => {
    fetch("/graph").then((r) => r.json()).then(setData);
  }, []);
  useEffect5(() => {
    const es = new EventSource("/events");
    const handler = () => fetch("/graph").then((r) => r.json()).then(setData);
    es.addEventListener("graph", handler);
    return () => es.close();
  }, []);
  const handleEdgeFilter = (srcKind, dstKind, active) => {
    const key = `${srcKind}->${dstKind}`;
    setState({
      kindPairFilters: active ? { ...state.kindPairFilters, [key]: true } : Object.fromEntries(Object.entries(state.kindPairFilters).filter(([k]) => k !== key))
    });
  };
  return /* @__PURE__ */ jsxs("div", { className: "layout", children: [
    /* @__PURE__ */ jsx9("div", { children: /* @__PURE__ */ jsx9(DepGraph, { data, state, setState }) }),
    /* @__PURE__ */ jsxs("aside", { children: [
      /* @__PURE__ */ jsx9(
        TreeView,
        {
          data,
          selectedId: state.selectedId,
          onPick: (id) => setState({ selectedId: id }),
          onFilterDir: (dir) => setState({ dirPrefix: dir })
        }
      ),
      /* @__PURE__ */ jsx9(
        PolicyMatrix,
        {
          data,
          onEdgeFilter: handleEdgeFilter
        }
      )
    ] })
  ] });
}
ReactDOM2.createRoot(document.getElementById("root")).render(/* @__PURE__ */ jsx9(App, {}));
/*! Bundled license information:

react-dom/cjs/react-dom.development.js:
  (**
   * @license React
   * react-dom.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
//# sourceMappingURL=viewer.js.map
