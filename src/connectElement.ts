import LiveState, {LiveStateConfig} from "./LiveState";
import liveState, { liveStateConfig } from "./liveStateDecorator";
import subscript from 'subscript';

export type ConnectOptions = LiveStateConfig & {
  properties?: Array<LiveStateProperty>;
  attributes?: Array<string>;
  events?: {
    send?: Array<string>,
    receive?: Array<string>
  }
}

/**
 * This will will connect a live state instance to an element. It will:
 * 
 * - set a `liveState` property on the element
 * - call `connect` on the LiveState instance
 * - connect properties and attributes
 * - call `sendEvent` and `receiveEvent` for each specified event
 */
export const connectElement = (liveStateOrEl: LiveState | HTMLElement, elOrOptions: HTMLElement | ConnectOptions, options?: ConnectOptions) => {
  if (liveStateOrEl instanceof LiveState) {
    const liveState = liveStateOrEl as LiveState;
    const el = elOrOptions as HTMLElement;
    if (el['liveState'] !== liveState) {
      doConnect(el, liveState, options);
    }
  } else {
    const liveState = new LiveState(elOrOptions as ConnectOptions);
    doConnect(liveStateOrEl as HTMLElement, liveState, elOrOptions as ConnectOptions);
  }
}

const doConnect = (el: HTMLElement, liveState: LiveState, options: ConnectOptions) => {
  const { properties, attributes, events } = options;
  liveState.connect();
  connectProperties(liveState, el, properties);
  attributes?.forEach((attr) => connectAtttribute(liveState, el, attr));
  events?.send?.forEach((eventName) => sendEvent(liveState, el, eventName));
  events?.receive?.forEach((eventName) => receiveEvent(liveState, el, eventName));
  el['liveState'] = liveState;

}

const connectProperties = (liveState, el, properties) => {
  let mergedProperties = properties || [];
  mergedProperties = el._liveStateProperties ? mergedProperties.concat(el._liveStateProperties) : mergedProperties;
  mergedProperties?.forEach((p) => connectProperty(liveState, el, p));
}

/**
 * A property name or an object with a `name` and `path` property. The `name`
 * property will be used as the property name on the element, and the `path`
 * property will be used to look up the value on the state. The path should be
 * a json pointer.
 */
export type LiveStateProperty = string | { name: string, path: string };

/**
 Listens to `livestate-change` events on the LiveState instance passed in, and
 updates the property on the element with value of the propery on the state.
 */
export const connectProperty = (liveState: LiveState, el: HTMLElement, property: LiveStateProperty) => {
  liveState.addEventListener('livestate-change', buildPropertyListener(el, property));
}

const buildPropertyListener = (el, property: LiveStateProperty) => {
  if (typeof property === 'string') {
    return ({ detail: { state } }) => {
      el[property] = state[property];
    }
  } else {
    return ({ detail: { state } }) => {
      const fn = subscript(property.path);
      const val = fn(state);
      el[property.name] = val;
    }
  }
};

/**
 Listens to `livestate-change` events on the LiveState instance passed in, and
 sets the attributeon the element with value of the same name on the state.
 */
export const connectAtttribute = (liveState: LiveState, el: HTMLElement, attr: string) => {
  liveState.addEventListener('livestate-change', ({ detail: { state } }) => {
    el.setAttribute(attr, state[attr]);
  });
}

/**
 * Listens to the specified event on the LiveState instance and when received,
 * redispatches it on the element
 */
export const receiveEvent = (liveState: LiveState, el: HTMLElement, eventName: string) => {
  liveState.addEventListener(eventName, ({ detail }) => {
    el.dispatchEvent(new CustomEvent(eventName, { detail }));
  });
}

/**
 * Listens to the specified event on the element, and when received,
 * redispatches it on the liveState instance.
 */
export const sendEvent = (liveState: LiveState, el: HTMLElement, eventName: string) => {
  el.addEventListener(eventName, (event) => {
    const { detail } = event as CustomEvent
    liveState.dispatchEvent(new CustomEvent(eventName, { detail }));
  });
}

export default connectElement;