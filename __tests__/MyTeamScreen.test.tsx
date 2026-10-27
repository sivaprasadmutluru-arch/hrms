import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import MyTeamScreen from '../src/screens/MyTeamScreen';
import BottomTabs from '../src/components/BottomTabs';
import TeamDateField from '../src/components/TeamDateField';
import {api} from '../src/api/client';

jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('../src/native/LeaveAttachmentFiles', () => ({transferLeaveAttachment: jest.fn()}));
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({top:0,bottom:0,left:0,right:0})}));
let mockAuth = {user:{companyId:64},profile:{companyId:64,companyName:'SOPHISTICAVE',isReportingManager:true}};
jest.mock('../src/context/AuthContext', () => ({useAuth: () => mockAuth}));
let renderer: ReactTestRenderer.ReactTestRenderer;
function textTree(node: any): string {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return Array.isArray(node) ? node.map(textTree).join(' ') : textTree(node.children);
}
const press = (label: string) => renderer.root.findAllByProps({accessibilityLabel:label})[0].props.onPress();
const members = [{id:1,fullName:'Amina',companyId:64},{id:2,fullName:'Bilal',companyId:64}];
beforeEach(() => {
  mockAuth = {user:{companyId:64},profile:{companyId:64,companyName:'SOPHISTICAVE',isReportingManager:true}};
  jest.spyOn(api,'teamEmployees').mockResolvedValue(members);
  jest.spyOn(api,'teamLeaves').mockResolvedValue([{id:7,employeeId:1,employeeName:'Amina',status:'REQUESTED',canReview:true,startDate:'2026-10-24',endDate:'2026-10-24'}, {id:8,employeeId:2,employeeName:'Bilal',status:'REQUESTED',canReview:false}]);
  jest.spyOn(api,'teamAttendance').mockResolvedValue([]);
  jest.spyOn(api,'teamRegularisations').mockResolvedValue([{id:9,employeeId:1,employeeName:'Amina',status:'PENDING',canReview:true,attendanceDate:'2026-10-24'}]);
});
afterEach(async () => {if (renderer) await ReactTestRenderer.act(async () => renderer.unmount()); jest.restoreAllMocks();});
async function mount() {await ReactTestRenderer.act(async () => {renderer=ReactTestRenderer.create(<MyTeamScreen />);});}

it('shows the whole roster without requiring attendance or leave records', async () => {
  await mount();
  expect(textTree(renderer.toJSON())).toContain('2 direct reports');
  expect(renderer.root.findAllByProps({accessibilityLabel:'Attendance for Amina'}).length).toBeGreaterThan(0);
  expect(renderer.root.findAllByProps({accessibilityLabel:'Attendance for Bilal'}).length).toBeGreaterThan(0);
  await ReactTestRenderer.act(async () => renderer.root.findAllByProps({accessibilityLabel:'Search my team'})[0].props.onChangeText('amina'));
  expect(renderer.root.findAllByProps({accessibilityLabel:'Attendance for Bilal'})).toHaveLength(0);
});
it('requires confirmation before approval and omits unauthorized actions', async () => {
  const approve = jest.spyOn(api,'decideTeamLeave').mockResolvedValue({});
  await mount();
  await ReactTestRenderer.act(async () => press('Pending team leave'));
  expect(renderer.root.findAllByProps({accessibilityLabel:'Approve Bilal'})).toHaveLength(0);
  await ReactTestRenderer.act(async () => press('Approve Amina'));
  expect(approve).not.toHaveBeenCalled();
  await ReactTestRenderer.act(async () => press('Confirm team decision'));
  expect(approve).toHaveBeenCalledWith(7,'approve',64,'');
});
it('requires a rejection reason and sends regularisation decisions to the team endpoint', async () => {
  const reject = jest.spyOn(api,'decideTeamRegularisation').mockResolvedValue({});
  await mount();
  await ReactTestRenderer.act(async () => press('Pending team regularisations'));
  await ReactTestRenderer.act(async () => press('Reject Amina'));
  await ReactTestRenderer.act(async () => press('Confirm team decision'));
  expect(reject).not.toHaveBeenCalled();
  expect(textTree(renderer.toJSON())).toContain('Enter a rejection reason.');
  await ReactTestRenderer.act(async () => renderer.root.findAllByProps({accessibilityLabel:'Team rejection reason'})[0].props.onChangeText('Incorrect time'));
  await ReactTestRenderer.act(async () => press('Confirm team decision'));
  expect(reject).toHaveBeenCalledWith(9,'reject',64,'Incorrect time');
});
it('filters one employee history from the roster', async () => {
  await mount();
  await ReactTestRenderer.act(async () => press('Leave history for Amina'));
  expect(renderer.root.findAllByProps({accessibilityLabel:'Approve Bilal'})).toHaveLength(0);
  expect(renderer.root.findAllByProps({accessibilityLabel:'Approve Amina'}).length).toBeGreaterThan(0);
});
it('adds My Team independently of Admin visibility', async () => {
  await ReactTestRenderer.act(async () => {renderer=ReactTestRenderer.create(<BottomTabs active="team" onChange={() => {}} showTeam showAdmin={false} />);});
  const text=textTree(renderer.toJSON());
  expect(text).toContain('My Team'); expect(text).not.toContain('Admin');
});

it('discards a stale roster response after a company switch', async () => {
  let resolveOld!: (value: any[]) => void;
  const old = new Promise<any[]>(resolve => {resolveOld=resolve;});
  jest.mocked(api.teamEmployees).mockImplementation(company => company === 64 ? old : Promise.resolve([{id:3,fullName:'New company report',companyId:66}]));
  await mount();
  mockAuth = {user:{companyId:66},profile:{companyId:66,companyName:'New company',isReportingManager:true}};
  await ReactTestRenderer.act(async () => renderer.update(<MyTeamScreen />));
  await ReactTestRenderer.act(async () => {resolveOld(members);});
  expect(textTree(renderer.toJSON())).toContain('New company report');
  expect(renderer.root.findAllByProps({accessibilityLabel:'Attendance for Amina'})).toHaveLength(0);
});

it('shows an explicit error when the new team endpoint is unavailable', async () => {
  jest.mocked(api.teamEmployees).mockRejectedValue(new Error('Team service unavailable'));
  await mount();
  expect(textTree(renderer.toJSON())).toContain('Team service unavailable');
  expect(renderer.root.findAllByProps({accessibilityLabel:'Approve Amina'})).toHaveLength(0);
});

it('lets a manager select an attendance date from the calendar', async () => {
  const change = jest.fn();
  await ReactTestRenderer.act(async () => {renderer=ReactTestRenderer.create(<TeamDateField label="Attendance from" value="2026-10-01" onChange={change} />);});
  await ReactTestRenderer.act(async () => press('Attendance from'));
  await ReactTestRenderer.act(async () => press('Select 2026-10-12'));
  expect(change).toHaveBeenCalledWith('2026-10-12');
});
