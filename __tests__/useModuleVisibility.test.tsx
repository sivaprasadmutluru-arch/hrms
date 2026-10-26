import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {AppState} from 'react-native';
import {api} from '../src/api/client';
import {useModuleVisibility} from '../src/utils/useModuleVisibility';

let result: ReturnType<typeof useModuleVisibility>;
let renderer: ReactTestRenderer.ReactTestRenderer;
function Harness({company}: {company: number}) {result = useModuleVisibility(company); return null;}
afterEach(async () => {if (renderer) await ReactTestRenderer.act(async () => renderer.unmount()); jest.restoreAllMocks();});

it('ignores stale company responses and keeps restrictions on refresh errors', async () => {
  let finishFirst: (value: Record<string, boolean>) => void = () => {};
  const query = jest.spyOn(api, 'moduleVisibility')
    .mockImplementationOnce(() => new Promise(resolve => {finishFirst = resolve;}))
    .mockResolvedValueOnce({payslips: false, loans: false});
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<Harness company={1} />);});
  expect(result!.visibility).toBeNull();
  await ReactTestRenderer.act(async () => {renderer.update(<Harness company={64} />);});
  expect(result!.visibility).toEqual({payslips: false, loans: false});
  await ReactTestRenderer.act(async () => {finishFirst({payslips: true});});
  expect(result!.visibility?.payslips).toBe(false);
  query.mockRejectedValueOnce(new Error('offline'));
  await ReactTestRenderer.act(async () => {await result!.refreshVisibility();});
  expect(result!.visibility?.loans).toBe(false);
});

it('refreshes visibility when the app comes back into the foreground', async () => {
  let listener: (state: string) => void = () => {};
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    listener = callback as (state: string) => void; return {remove};
  });
  jest.spyOn(api, 'moduleVisibility').mockResolvedValueOnce({payslips: true}).mockResolvedValueOnce({payslips: false});
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<Harness company={64} />);});
  expect(result!.visibility?.payslips).toBe(true);
  await ReactTestRenderer.act(async () => {listener('active');});
  expect(result!.visibility?.payslips).toBe(false);
});
