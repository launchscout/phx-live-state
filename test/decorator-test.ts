import { liveState, extractConfig, liveStateConfig, liveStateProperty } from '../src/liveStateDecorator';
import { fixture } from '@open-wc/testing';
import { customElement, property } from 'lit/decorators.js';
import { LitElement, html } from 'lit';
import { expect } from '@esm-bundle/chai';
import LiveState from "../src/LiveState";
import sinon from "sinon";
import {Channel} from 'phoenix';

class InstanceDecorated {

  @liveStateConfig('topic')
  blarg: string = 'stuff';

  @liveStateConfig('params.foo')
  yadda: string = 'other stuff';

  @liveStateConfig('url')
  get theUrl() { return 'bobbida'; }

  @liveStateConfig('socketOptions')
  socketOptions: object = { logger: null };
}

describe('liveStateConfig', () => {
  it('adds instance config', () => {
    const instanceDecorated = new InstanceDecorated();
    const config = extractConfig(instanceDecorated);
    expect(config.topic).to.eql('stuff');
    expect(config.url).to.eql('bobbida');
    expect(config.params['foo']).to.eql('other stuff'); 
    expect(config.socketOptions['logger']).to.eql(null);
  });
});

@customElement('decorated-element')
@liveState({
  provide: {
    scope: window,
    name: 'theLiveState'
  }
})
class DecoratedElement extends LitElement {

  @liveStateProperty()
  @property()
  foo: string = 'bar';

  @liveStateProperty('bing.baz.bar')
  nested: string;

  render() {
    return html`<div>${this.foo}</div>`
  }
}

describe('liveStateProperty', () => {
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
    window['theLiveState'] = liveState;
  });

  it('updates on state changes', async () => {
    const el: DecoratedElement = await fixture('<decorated-element></decorated-element>');
    const stateChange = liveState.channel.on.getCall(0).args[1];
    stateChange({state: { foo: 'wuzzle', bing: {baz: {bar: 'blah'}}}, version: 1});
    await el.updateComplete;
    expect(el.foo).to.equal('wuzzle');
  });

  it('updates nested properties on state changes', async () => {
    const el: DecoratedElement = await fixture('<decorated-element></decorated-element>');
    const stateChange = liveState.channel.on.getCall(0).args[1];
    stateChange({state: { bing: {baz: { bar: 'wuzzle'} } }, version: 1});
    await el.updateComplete;
    expect(el.nested).to.equal('wuzzle');
  });

});
