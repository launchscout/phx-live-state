import { html, LitElement } from "lit";
import { property, customElement, state } from 'lit/decorators.js';
import sinon from "sinon";
import LiveState from "../src/LiveState";
import { expect } from "@esm-bundle/chai";
import {Channel} from 'phoenix';
import { fixture } from '@open-wc/testing';
import { connectElement } from "../src";

@customElement('test-element')
class TestElement extends LitElement {
  @property() foo: string;
  @state() bar: string;

  @state() nested: string;

  constructor() {
    super();
    this.addEventListener('livestate-error', (e: CustomEvent) => {
      this.foo = (e.detail as any).message;
      this.bar = (e.detail as any).type;
    })
  }
  render() {
    return html`<div>${this.foo} ${this.bar}</div>`
  }
}

describe('connectElement', () => {
  let socketMock, liveState, stubChannel, receiveStub;
  beforeEach(() => {
    liveState = new LiveState({url: "wss://foo.com", topic: "stuff"});
    socketMock = sinon.mock(liveState.socket);
    receiveStub = sinon.stub();
    receiveStub.withArgs("ok", sinon.match.func).returns({receive: receiveStub});
    stubChannel = sinon.createStubInstance(Channel, {
      join: sinon.stub().returns({
        receive: receiveStub
      }),
      on: sinon.spy(),
      push: sinon.spy()
    });
    liveState.channel = stubChannel;
  });
  
  beforeEach(() => {
    socketMock.expects('connect').exactly(1);
  });

  it('creates livestate instance with arity 2 version', async() => {
    const el: TestElement = await fixture('<test-element></test-element>');
    connectElement(el, {
      url: 'ws://foo.bar',
      topic: 'howdy',
      properties: ['bar'],
      attributes: ['foo']
    });
    expect(el['liveState']).to.be.instanceOf(LiveState);
  });

  it('updates on state changes', async () => {
    const el: TestElement = await fixture('<test-element></test-element>');
    connectElement(liveState, el, {
      properties: ['bar'],
      attributes: ['foo']
    });
    const stateChange = liveState.channel.on.getCall(0).args[1];
    stateChange({state: { foo: 'wuzzle', bar: 'wizzle' }, version: 1});
    await el.updateComplete;
    expect(el.bar).to.equal('wizzle');
    expect(el.shadowRoot.innerHTML).to.contain('wizzle');
    expect(el.getAttribute('foo')).to.equal('wuzzle');
    expect(el.shadowRoot.innerHTML).to.contain('wuzzle');
  });

  it('updates nested state properties', async () => {
    const el: TestElement = await fixture('<test-element></test-element>');
    connectElement(liveState, el, {
      properties: [{name: 'nested', path: 'foo.bar'}],
    });
    const stateChange = liveState.channel.on.getCall(0).args[1];
    stateChange({state: { foo: {bar: 'wizzle' }}, version: 1});
    await el.updateComplete;
    expect(el.nested).to.equal('wizzle');
  });

  it('sends events', async () => {
    const el: TestElement = await fixture('<test-element></test-element>');
    connectElement(liveState, el, {
      properties: ['bar'],
      attributes: ['foo'],
      events: {
        send: ['sayHi']
      }
    });
    el.dispatchEvent(new CustomEvent('sayHi', { detail: { greeting: 'wazzaap' } }));
    expect(liveState.channel.push.callCount).to.equal(1);
    const pushCall = liveState.channel.push.getCall(0);
    expect(pushCall.args[0]).to.equal('lvs_evt:sayHi');
    expect(pushCall.args[1]).to.deep.equal({ greeting: 'wazzaap' });
  });

  it('connects idempotently', async () => {
    const el: TestElement = await fixture('<test-element></test-element>');
    connectElement(liveState, el, {
      properties: ['bar'],
      attributes: ['foo'],
      events: {
        send: ['sayHi']
      }
    });
    connectElement(liveState, el, {
      properties: ['bar'],
      attributes: ['foo'],
      events: {
        send: ['sayHi']
      }
    });
    el.dispatchEvent(new CustomEvent('sayHi', { detail: { greeting: 'wazzaap' } }));
    expect(liveState.channel.push.callCount).to.equal(1);
  });

  it('receives events', async () => {
    const el: TestElement = await fixture('<test-element></test-element>');
    connectElement(liveState, el, {
      properties: ['bar'],
      attributes: ['foo'],
      events: {
        send: ['sayHi'],
        receive: ['sayHiBack']
      }
    });
    const onArgs = liveState.channel.on.getCall(3).args;
    expect(onArgs[0]).to.equal("sayHiBack")
    const onHandler = onArgs[1];
    let eventDetail;
    el.addEventListener('sayHiBack', ({ detail }: CustomEvent) => { eventDetail = detail });
    onHandler({ foo: 'bar' })
    expect(eventDetail).to.deep.equal({ foo: 'bar' });
  });

  it('receives errors', async () => {
    const el: TestElement = await fixture('<test-element></test-element>');
    connectElement(liveState, el, {
      properties: ['bar'],
      attributes: ['foo'],
      events: {
        send: ['sayHi'],
        receive: ['sayHiBack', 'livestate-error']
      }
    });
    const errorHandler = receiveStub.getCall(1).args[1];
    errorHandler(new Event('WebSocket', {}));
    await el.updateComplete;
    expect(el.shadowRoot.innerHTML).to.contain('join error');
  });
});
