import LiveState from "./LiveState";
import liveState from "./liveStateDecorator";

export type ConnectOptions = {
  properties?: Array<string>;
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
export const connectElement = (liveState: LiveState, el: HTMLElement, { properties, attributes, events }: ConnectOptions) => {
  if (el['liveState'] !== liveState) {
    liveState.connect();
    connectProperties(liveState, el, properties);
    attributes?.forEach((attr) => connectAtttribute(liveState, el, attr));
    events?.send?.forEach((eventName) => sendEvent(liveState, el, eventName));
    events?.receive?.forEach((eventName) => receiveEvent(liveState, el, eventName));
    el['liveState'] = liveState;
  }
}

const connectProperties = (liveState, el, properties) => {
  let mergedProperties = properties || [];
  mergedProperties = el._liveStateProperties ? mergedProperties.concat(el._liveStateProperties) : mergedProperties;
  mergedProperties?.forEach((p) => connectProperty(liveState, el, p));
}

/**
 Listens to `livestate-change` events on the LiveState instance passed in, and
 updates the property on the element with value of the propery on the state.
 */
export const connectProperty = (liveState: LiveState, el: HTMLElement, propertyName: string) => {
  liveState.addEventListener('livestate-change', ({ detail: { state } }) => {
    el[propertyName] = state[propertyName];
  });
}

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