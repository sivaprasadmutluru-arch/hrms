import React from 'react';
import Renderer from 'react-test-renderer';
import LeaveAttachments from '../src/components/LeaveAttachments';
import {api} from '../src/api/client';
import {transferLeaveAttachment} from '../src/native/LeaveAttachmentFiles';

jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('../src/native/LeaveAttachmentFiles', () => ({transferLeaveAttachment: jest.fn()}));
let mockAuth = {token: 'test-token', user: {companyId: 1}, profile: {companyId: 1}};
jest.mock('../src/context/AuthContext', () => ({useAuth: () => mockAuth}));
let renderer: Renderer.ReactTestRenderer;
async function mount(request: any = {id: 17, companyId: 64}) {
  await Renderer.act(async () => {renderer = Renderer.create(<LeaveAttachments request={request} />);});
}
beforeEach(() => {jest.spyOn(api, 'leaveRequestFiles').mockResolvedValue([{id: 4, fileName: 'certificate.pdf'}]);});
afterEach(async () => {if (renderer) await Renderer.act(async () => renderer.unmount()); jest.restoreAllMocks(); jest.clearAllMocks();});
it('shows a document indicator and separate View/Download actions', async () => {
  await mount();
  expect(api.leaveRequestFiles).toHaveBeenCalledWith(17, 64);
  const stopPropagation = jest.fn();
  await Renderer.act(async () => renderer.root.findAllByProps({accessibilityLabel: 'View 1 attached leave document'})[0].props.onPress({stopPropagation}));
  expect(stopPropagation).toHaveBeenCalled();
  const view = renderer.root.findAllByProps({accessibilityLabel: 'View certificate.pdf'})[0];
  await Renderer.act(async () => view.props.onPress({stopPropagation}));
  expect(transferLeaveAttachment).toHaveBeenLastCalledWith(17, {id: 4, fileName: 'certificate.pdf'}, 64, false, expect.any(Function));
  await Renderer.act(async () => renderer.root.findAllByProps({accessibilityLabel: 'Download certificate.pdf'})[0].props.onPress({stopPropagation}));
  expect(transferLeaveAttachment).toHaveBeenLastCalledWith(17, {id: 4, fileName: 'certificate.pdf'}, 64, true, expect.any(Function));
});
it('does not show a document icon for leave with no attachments', async () => {
  jest.spyOn(api, 'leaveRequestFiles').mockResolvedValue([]);
  await mount();
  expect(renderer.toJSON()).toBeNull();
});
it('shows a retry action if metadata cannot be loaded', async () => {
  jest.spyOn(api, 'leaveRequestFiles').mockRejectedValue(new Error('offline'));
  await mount();
  expect(renderer.root.findAllByProps({accessibilityLabel: 'Retry loading leave documents'}).length).toBeGreaterThan(0);
});
it('clears old documents immediately when switching company/request', async () => {
  await mount();
  let resolve: (value: any[]) => void = () => {};
  jest.spyOn(api, 'leaveRequestFiles').mockReturnValue(new Promise(done => {resolve = done;}));
  await Renderer.act(async () => renderer.update(<LeaveAttachments request={{id: 18, companyId: 65}} />));
  expect(renderer.root.findAllByProps({accessibilityLabel: 'View 1 attached leave document'})).toHaveLength(0);
  await Renderer.act(async () => resolve([]));
  expect(renderer.toJSON()).toBeNull();
});
