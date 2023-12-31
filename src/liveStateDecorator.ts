import connectElement, { ConnectOptions } from "./connectElement.js";
import LiveState, { LiveStateConfig } from "./LiveState.js";
import { connectProperty } from "./connectElement";
import { registerContext, observeContext } from 'wc-context';
import 'reflect-metadata';

export type LiveStateDecoratorOptions = {

  /** The end point to connect to, should be a websocket url (ws or wss) */
  url?: string,

  /** The topic for the channel */
  topic?: string,

  /** will be sent as params on channel join */
  params?: object

  /** A list of property names, each of which will be updated from the state
  * on any state chnages.
  */
  properties?: Array<string>;

  /** A list of attribute names, each of which will be updated from the state
  * on any state chnages.
  */
  attributes?: Array<string>;

  events?: {
    send?: Array<string>,
    receive?: Array<string>
  }

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

  /** This will use an existing liveState instance that has been provided with
  * the given name, rather than creating one. */
  context?: string

}

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
This typescript class decorator will:
* Adds a `connectedCallback` method that sets a `liveState` property and calls `connectElement`
* Adds a `disconnectedCallback` method that calls `disconnect` on the `liveState` instance

Both will call inherited callbacks.

The decorator expects to passed an object with the following properties, all of which
are optional:
* url
* topic
* params
* provide - share this LiveState instance as a context (see below)
  * scope
  * name
* context - connect to an existing LiveState instance (see below)
* properties - passed into `connectElement`
* attributes - passed into `connectElement`
* events - passed into `connectElement`

```typescript
@liveState({
  url: 'http://foo.bar',
  topic: 'discord_chat:new',
  properties: ['messages'],
  events: {
    send: ['new_message', 'start_chat']
  }
})
```
### Context

As of 0.7.0, we now support sharing LiveState instances via a context. The way this works is that one element will provide an instance like so:

```typescript
@liveState({
  channelName: "todo:all",
  properties: ['todos'],
  events: {
    send: ['add_todo']
  },
  provide: {
    scope: window,
    name: 'todoLiveState'
  }
})
```

This will cause the LiveState instance to be set on the `window` as `todoLiveState`. An element that wishes to connect to an existing LiveState instance uses the context property:

```typescript
@liveState({
  events: {
    send: ['add_todo']
  },
  context: 'todoLiveState'
})
```

This will find an instance with the specified name (in any scope). This will be handled regardless of order, if the consuming instance is created first a queue of consumers will be created that will be resolved and attached when the providing instance is created.

 */
export function liveState(options: LiveStateDecoratorOptions) {
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

/**
This decorator, introduced in version 0.8.0, adds the ability to have live state config properties be contributed by the element instance. They will override values from the `liveState` decorator on the class, if used. 

Example:

```typescript
@customElement('join-params')
@liveState({topic: 'join_params', properties: ['result']})
export class JoinParamsElement extends LitElement {
  
  @property({attribute: 'the-url'})
  @liveStateConfig('url')
  theUrl: string = "foo";
  
  @property({attribute: 'api-key'})
  @liveStateConfig('params.api_key')
  apiKey: string = '';
```

This will cause the `the-url` attribute of the element to be used as the url to connect to, and the `api-key` attribute to be passed as an `api_key` parameter to the channel join.

 */
export const liveStateConfig = (configProperty) => {
  return (proto, propertyName) => {
    proto._liveStateConfig = proto._liveStateConfig || {};
    proto._liveStateConfig[configProperty] = function () { return this[propertyName]; }
  }
}

/**
This decorator will cause a property to be updated from the state on any state change. It takes
an optional expression to pull the value from the state, otherwise it will assume there exists 
a property on the state of the same name.

Example:

```typescript
class DecoratedElement extends LitElement {

  @liveStateProperty()
  foo: string = 'bar';

  @liveStateProperty('bing.baz.bar')
  nested: string;

}
```
 */

export const liveStateProperty = (path? : string) => {
  return (proto, propertyName) => {
    proto._liveStateProperties = proto._liveStateProperties || [];
    if (path) {
      proto._liveStateProperties.push({name: propertyName, path});
    } else {
      proto._liveStateProperties.push(propertyName);
    }
  }
}

export default liveState;
