import {r as runtime} from './rolldown-runtime-Dw2cE7zH.js';
import {w as reactFactory} from './vendor-charts-v4iwfbF3.js';
import {statuses} from './carr-task-metrics.js';
export const React=runtime(reactFactory(),1),h=React.createElement;
export const dateLabel=value=>value?new Date(String(value).length===10?value+'T12:00:00':value).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'No due date';
export function Badge({status}){return h('span',{className:`carr-task-badge ${status}`},statuses[status] || status);}
export function Progress({task}){return h('div',{className:'carr-progress'},h('progress',{max:100,value:task.progress,'aria-label':`${task.title} progress`}),h('span',null,task.progress+'%'));}
export function Avatar({name}){return h('span',{className:'carr-avatar','aria-hidden':true},(name || '?').split(/\s+/).map(part=>part[0]).slice(0,2).join('').toUpperCase());}
export function Field({label,wide,hint,children}){return h('label',{className:wide?'wide':''},h('span',null,label),children,hint&&h('small',{className:'carr-field-hint'},hint));}
export function Select({label,value,onChange,options,placeholder='All',required=false,disabled=false}){return h('select',{'aria-label':label,value,onChange:e=>onChange(e.target.value),required,disabled},h('option',{value:''},placeholder),options.map(option=>h('option',{key:option.value,value:option.value},option.label)));}
export function Modal({title,close,children,drawer=false,busy=false}) {
 const panel=React.useRef(null),closeRef=React.useRef(close);closeRef.current=close;
 React.useEffect(()=>{const before=document.activeElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';panel.current?.focus();
  const keydown=event=>{if(event.key==='Escape'){event.preventDefault();closeRef.current();}if(event.key!=='Tab')return;
   const items=[...panel.current.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')].filter(item=>!item.disabled && item.getClientRects().length);
   if(!items.length){event.preventDefault();return;}const first=items[0],last=items.at(-1);
   if(event.shiftKey && (document.activeElement===first || document.activeElement===panel.current)){event.preventDefault();last.focus();}
   else if(!event.shiftKey && (document.activeElement===last || document.activeElement===panel.current)){event.preventDefault();first.focus();}};
  document.addEventListener('keydown',keydown);return()=>{document.removeEventListener('keydown',keydown);document.body.style.overflow=overflow;if(before?.isConnected)before.focus();};},[]);
 return h('div',{className:`carr-task-modal ${drawer?'carr-drawer-overlay':''}`,onMouseDown:event=>{if(event.target===event.currentTarget&&!busy)close();}},
  h('section',{ref:panel,tabIndex:-1,className:`carr-task-dialog ${drawer?'carr-drawer':''}`,role:'dialog','aria-modal':true,'aria-label':title},
   h('header',null,h('div',null,drawer&&h('small',{className:'carr-eyebrow'},'TASK WORKSPACE'),h('h2',null,title)),h('button',{type:'button',onClick:close,disabled:busy,'aria-label':'Close dialog'},'Close')),
   h('div',{className:'carr-dialog-body'},children)));
}
