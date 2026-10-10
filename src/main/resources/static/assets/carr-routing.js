// URL aliases preserve saved links; permissions remain in the existing pages/APIs.
export const legacyCarrRoutes={
 'role-dashboard':'dashboard','team-tasks':'tasks','task-reviews':'workflows',
 'task-analytics':'analytics','task-reports':'reports','employees':'cars','configuration':'settings'
};
export function canonicalCarrPath(pathname,search='',hash='') {
 const segment=pathname.replace(/\/$/,'').split('/').pop();
 const destination=segment==='dashboard'&&new URLSearchParams(search).get('create')==='true'?'tasks':legacyCarrRoutes[segment] || segment || 'dashboard';
 return '/carr/'+destination+search+hash;
}
