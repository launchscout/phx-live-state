import connectElement, { ConnectOptions } from "./connectElement";
import LiveState, { LiveStateConfig } from "./LiveState";
import { registerContext, observeContext } from 'wc-context';
import 'reflect-metadata';

export type LiveStateDecoratorOptions = {
  channelName?: string,

  /** 
   * This will create an instance in the given scope with the specified name. For 
   * example, a scope of `window` and a name of `liveState` will create `window.liveState`
   * Instances so provided can be found by other elements using a `context` attribute 
   * whose value matches the `name` used by the provider. This will work regardless of
   * which element occurs first (or highest) in the DOM
   */
  provide?: {
    scope: object,
    name: string | undefined
  },

  /** Used to lookup an instance provided by another element */
  context?: string
} & ConnectOptions & LiveStateConfig

const connectToLiveState = (element: any, options: LiveStateDecoratorOptions) => {
  if (options.provide) {
    const { scope, name } = options.provide;
    const liveState = scope[name] ? scope[name] :
      scope[name] = buildLiveState(element, options);
    registerContext(scope, name, liveState)
    connectElement(liveState, element, options as any);
  } else if (options.context) {
    observeContext(element, options.context, element, (element, liveState) => {
      connectElement(liveState, element, options as any);
    });
  } else {
    const liveState = buildLiveState(element, options);
    connectElement(liveState, element, options);
  }
  return element.liveState;
}

export const extractConfig = (element): LiveStateConfig => {
  const elementConfig = element._liveStateConfig ?
    Object.keys(element._liveStateConfig).reduce((config, key) => {
      if (element._liveStateConfig[key] instanceof Function) {
        const configFn = element._liveStateConfig[key];
        config[key] = configFn.apply(element);
      } else {
        config[key] = element._liveStateConfig[key];
      }
      return config;
    }, {}) : {}
  flattenParams(elementConfig);
  return elementConfig;
}

const flattenParams = (object) => {
  const params = Object.keys(object).filter((key) => key.startsWith('params.')).reduce((params, key) => {
    params[key.replace('params.', '')] = object[key];
    return params;
  }, {});
  object.params = params;
}

export const buildLiveState = (element: any, { url, topic, params }: LiveStateDecoratorOptions) => {
  const elementConfig = extractConfig(element);
  const config = Object.assign({ url, topic, params }, elementConfig);
  return new LiveState(config);
}

/**
 * This typescript class decorator will:
 * - Add a `connectedCallback` method that sets a `liveState` property and calls {@link connectElement}
 * - Adds a `disconnectedCallback` method that calls `disconnect` on the `liveState` instance
 * Both will call inherited callbacks.
 */
export const liveState = (options: LiveStateDecoratorOptions) => {
  return (targetClass: Function) => {
    Reflect.defineMetadata('liveStateConfig', options, targetClass);
    const superConnected = targetClass.prototype.connectedCallback;
    targetClass.prototype.connectedCallback = function () {
      superConnected?.apply(this);
      connectToLiveState(this, options);
    }
    const superDisconnected = targetClass.prototype.disconnectedCallback;
    targetClass.prototype.disconnectedCallback = function () {
      superDisconnected?.apply(this)
      this.liveState && this.liveState.disconnect();
    }
  }
}

export const liveStateConfig = (configProperty) => {
  return (proto, propertyName) => {
    proto._liveStateConfig = proto._liveStateConfig || {};
    proto._liveStateConfig[configProperty] = function() {return this[propertyName]; }
  }
}
export default liveState;
