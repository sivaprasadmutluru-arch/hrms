import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {api} from '../src/api/client';
import CreateDocumentRequestModal from '../src/components/CreateDocumentRequestModal';

jest.mock('../src/components/Icon', () => 'Icon');

afterEach(() => {jest.restoreAllMocks();});

it('validates the form and creates a company-scoped request with the tagged employees', async () => {
  jest.spyOn(api, 'companyEmployees').mockResolvedValue([{id: 7, fullName: 'Alex', companyId: 2}, {id: 8, fullName: 'Other company', companyId: 3}]);
  const create = jest.spyOn(api, 'createDocumentRequest').mockResolvedValue({id: 42});
  const onCreated = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<CreateDocumentRequestModal company={{id: 2, name: 'Pioneer'}} onClose={jest.fn()} onCreated={onCreated} />);
  });
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Other company');
  const createButton = () => renderer.root.findByProps({accessibilityLabel: 'Create document request'});
  await ReactTestRenderer.act(async () => {await createButton().props.onPress();});
  expect(create).not.toHaveBeenCalled();
  expect(JSON.stringify(renderer.toJSON())).toContain('Enter a request title.');
  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({accessibilityLabel: 'Document request title'}).props.onChangeText(' Passport copy ');
    renderer.root.findByProps({accessibilityLabel: 'Maximum document size'}).props.onChangeText('10');
    renderer.root.findByProps({accessibilityLabel: 'Document request description'}).props.onChangeText(' Please update ');
    renderer.root.findByProps({accessibilityLabel: 'Alex'}).props.onPress();
    renderer.root.findByProps({accessibilityLabel: 'Document format'}).props.onPress();
  });
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Format PDF'}).props.onPress();});
  await ReactTestRenderer.act(async () => {await createButton().props.onPress();});
  expect(create).toHaveBeenCalledWith({title: 'Passport copy', documentFormat: 'PDF', maxSizeMb: 10, description: 'Please update', company: {id: 2}, employees: [{id: 7}]}, 2);
  expect(onCreated).toHaveBeenCalledTimes(1);
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});

it('keeps the entered form after a server failure and allows a retry', async () => {
  jest.spyOn(api, 'companyEmployees').mockResolvedValue([]);
  const create = jest.spyOn(api, 'createDocumentRequest').mockRejectedValueOnce(new Error('Server unavailable')).mockResolvedValueOnce({id: 42});
  const onCreated = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<CreateDocumentRequestModal company={{id: 2, name: 'Pioneer'}} onClose={jest.fn()} onCreated={onCreated} />);
  });
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Document request title'}).props.onChangeText('Passport');});
  await ReactTestRenderer.act(async () => {await renderer.root.findByProps({accessibilityLabel: 'Create document request'}).props.onPress();});
  expect(onCreated).not.toHaveBeenCalled();
  expect(JSON.stringify(renderer.toJSON())).toContain('Server unavailable');
  expect(renderer.root.findByProps({accessibilityLabel: 'Document request title'}).props.value).toBe('Passport');
  await ReactTestRenderer.act(async () => {await renderer.root.findByProps({accessibilityLabel: 'Create document request'}).props.onPress();});
  expect(create).toHaveBeenCalledTimes(2);
  expect(onCreated).toHaveBeenCalledTimes(1);
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});

it('sends only one request when Create is pressed twice while submission is pending', async () => {
  jest.spyOn(api, 'companyEmployees').mockResolvedValue([]);
  let resolveCreate!: (value: any) => void;
  const create = jest.spyOn(api, 'createDocumentRequest').mockReturnValue(new Promise(resolve => {resolveCreate = resolve;}));
  const onCreated = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<CreateDocumentRequestModal company={{id: 2, name: 'Pioneer'}} onClose={jest.fn()} onCreated={onCreated} />);
  });
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Document request title'}).props.onChangeText('Passport');});
  const press = renderer.root.findByProps({accessibilityLabel: 'Create document request'}).props.onPress;
  let pending!: Promise<void>;
  await ReactTestRenderer.act(async () => {pending = press(); await press();});
  expect(create).toHaveBeenCalledTimes(1);
  await ReactTestRenderer.act(async () => {resolveCreate({id: 42}); await pending;});
  expect(onCreated).toHaveBeenCalledTimes(1);
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});
