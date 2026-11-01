/* MoveProof Qatar — offline Android WebView inspection prototype. No backend and no external calls. */
'use strict';
const STORE = 'moveproof-qatar-prototype-v1';
const ROOMS = [
  {name:'Living Room', icon:'sofa', items:['Wall','Flooring','Sofa','Window']},
  {name:'Bedroom', icon:'bed', items:['Wall','Flooring','Wardrobe','AC','Door','Window']},
  {name:'Kitchen', icon:'grid', items:['Wall','Countertop','Cabinets','Flooring']},
  {name:'Bathroom', icon:'droplet', items:['Wall','Flooring','Sink','Door']},
  {name:'Other Room', icon:'plus', items:[]},
];
const DEFAULT_PROPERTIES = [{id:'al-sadd',name:'Al Sadd Apartment',type:'Apartment'},{id:'west-bay',name:'West Bay Apartment',type:'Apartment'}];
// The old test version accidentally persisted fictional 2025 records as real history.
// Omit them on new installs, and filter them from existing installs without touching real user records.
const isRealRecord = r => !!r && typeof r === 'object' && r.demo !== true && r.id !== 'sample-in' && r.id !== 'sample-out';
const paths={
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  clipboard:'<rect x="5" y="5" width="14" height="17" rx="2"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M9 13h6M9 17h4"/>',
  folder:'<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  file:'<path d="M5 2h9l5 5v15H5zM14 2v6h5M9 13h6M9 17h6"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  down:'<path d="m6 9 6 6 6-6"/>',
  up:'<path d="m6 15 6-6 6 6"/>',
  arrow:'<path d="M19 12H5m6-6-6 6 6 6"/>',
  camera:'<path d="M4 6h4l2-3h4l2 3h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><circle cx="12" cy="13" r="4"/>',
  image:'<rect x="2" y="3" width="20" height="18" rx="2"/><circle cx="8" cy="9" r="2"/><path d="m2 19 6-6 4 3 3-3 7 6"/>',
  alert:'<path d="m10.5 3-9 16a2 2 0 0 0 1.7 3h17.6a2 2 0 0 0 1.7-3l-9-16a2 2 0 0 0-3 0zM12 9v5M12 18h.01"/>',
  check:'<path d="m5 12 4 4 10-10"/>',
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  bed:'<path d="M2 4v17M22 21V4M2 16h20M4 10h16a2 2 0 0 1 2 2v4H2v-4a2 2 0 0 1 2-2zM5 8V6h6v4"/>',
  sofa:'<path d="M4 12V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v4M3 12a2 2 0 0 1 3 1v4h12v-4a2 2 0 1 1 4 0v6H2v-6a2 2 0 0 1 1-1zM5 19v3M19 19v3"/>',
  grid:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 9v12M15 9v12"/>',
  droplet:'<path d="M12 2s-7 8-7 13a7 7 0 0 0 14 0c0-5-7-13-7-13z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  refresh:'<path d="M20 7V3l-4 1M20 4a9 9 0 1 0 3 8"/>',
  shield:'<path d="m12 2 9 4v6c0 5-3.5 8.5-9 10-5.5-1.5-9-5-9-10V6z"/><path d="m8 12 3 3 5-6"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
  lock:'<rect x="4" y="10" width="16" height="12" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',
  edit:'<path d="m3 17 14-14 4 4-14 14H3zM14 6l4 4"/>',
};
const ico=(name,size=20)=>`<span class="icon" style="width:${size}px;height:${size}px" aria-hidden="true"><svg viewBox="0 0 24 24">${paths[name]||paths.info}</svg></span>`;
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate=x=>new Date(x).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
const id=()=>globalThis.crypto?.randomUUID?.()||'id-'+Date.now()+'-'+Math.floor(Math.random()*9999);
const itemKey=(room,name)=>`${room}::${name}`;
const parseKey=k=>{const pos=k.indexOf('::');return {room:k.slice(0,pos),name:k.slice(pos+2)};};
const propertyById=x=>data.properties.find(p=>p.id===x);
const propName=x=>propertyById(x)?.name||'Property';
const propAddress=x=>{const p=propertyById(x);if(!p)return '';return [p.zone&&`Zone ${p.zone}`,p.street&&`Street ${p.street}`,p.building&&`${p.type==='Villa'?'Villa':'Building'} ${p.building}`,p.unit&&`Unit ${p.unit}`].filter(Boolean).join(' · ')};
const stored=(()=>{try{return JSON.parse(localStorage.getItem(STORE)||'null');}catch{return null}})();
const storedDrafts=(Array.isArray(stored?.drafts)?stored.drafts:(stored?.draft?[stored.draft]:[])).filter(d=>d&&typeof d==='object'&&d.id&&Array.isArray(d.selected)&&d.details);
const activeDraft=storedDrafts.find(d=>d.id===stored?.activeDraftId)||(stored?.draft?storedDrafts[0]:null);
const data={properties:Array.isArray(stored?.properties)?[...DEFAULT_PROPERTIES,...stored.properties.filter(p=>p&&p.id&&!DEFAULT_PROPERTIES.some(d=>d.id===p.id))]:structuredClone(DEFAULT_PROPERTIES),showPropertyForm:false,records:Array.isArray(stored?.records)?stored.records.filter(isRealRecord):[],drafts:storedDrafts,draft:activeDraft,propertyId:stored?.propertyId||'al-sadd',type:stored?.type||'move-in',page:'dashboard',openedRoom:'Bedroom',customFormRoom:null,selectedKey:null,returnReview:false,photoError:'',skipPhoto:false,recordsProperty:stored?.propertyId||'al-sadd',recordsItem:'Bedroom::Wardrobe',recordsRoom:'',toastTimer:null,cameraStream:null};
const app=document.getElementById('app');const dlg=document.getElementById('camera-dialog');const video=document.getElementById('camera-video');const gallery=document.getElementById('gallery-input');
function persist(){try{if(data.draft)data.draft.updatedAt=new Date().toISOString();localStorage.setItem(STORE,JSON.stringify({properties:data.properties,records:data.records,drafts:data.drafts,activeDraftId:data.draft?.id||null,propertyId:data.propertyId,type:data.type}));return true}catch(err){toast('Storage limit reached. Photos may not survive a refresh; try fewer or smaller pictures.');return false}}
function toast(message){const t=document.getElementById('toast');t.textContent=message;t.classList.add('show');clearTimeout(data.toastTimer);data.toastTimer=setTimeout(()=>t.classList.remove('show'),4000)}
function nav(page){stopCamera();data.page=page;data.photoError='';render();window.scrollTo(0,0)}
function header(){return `<header class="topbar"><div class="brand"><div class="brandmark">${ico('home',22)}</div><div class="brandname">MoveProof <span style="font-weight:500">Qatar</span></div></div><span class="chip">LOCAL DEMO</span></header>`}
function navhead(title,sub,back='dashboard'){return `<div class="nav-header"><button type="button" class="back-icon" data-a="nav" data-v="${back}" aria-label="Back to ${back}">${ico('arrow',20)}</button><div><h1 class="nav-title">${escapeHtml(title)}</h1>${sub?`<div class="nav-sub">${escapeHtml(sub)}</div>`:''}</div></div>`}
function stepper(active){const names=['Type','Rooms & Items','Inspect','Review'];return `<div class="stepper" aria-label="Inspection progress">${names.map((n,i)=>`<div class="step ${active===i+1?'active':active>i+1?'done':''}" ${active===i+1?'aria-current="step"':''}><div class="num">${active>i+1?ico('check',15):i+1}</div><span>${n}</span></div>`).join('')}</div>`}
function footer(content){return `<div class="sticky-foot">${content}</div>`}
function lastRecord(){return data.records.filter(r=>r.propertyId===data.propertyId).sort((a,b)=>new Date(b.date)-new Date(a.date))[0]}
function dashboard(){const last=lastRecord();return `${header()}<div class="page dashboard"><div class="dashboard-intro"><h1 class="workspace-title">Your inspection workspace</h1><p class="subhead">Keep a clear record of your rental home's condition at move-in and move-out. Document rooms and furniture with photos, written notes and dates, then review the evidence whenever you need it.</p><button type="button" class="learn-more-link" data-a="learn-more">Learn more ${ico('chevron',15)}</button></div>
<div class="property-box"><label class="field-label" for="main-property">Selected property</label><div class="field-icon">${ico('home')}</div><select id="main-property" class="select" data-field="property">${data.properties.map(p=>`<option value="${escapeHtml(p.id)}" ${p.id===data.propertyId?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}</select><p class="property-address">${escapeHtml(propAddress(data.propertyId)||'No street address saved for this sample property')}</p><button type="button" class="outline-btn button-inline add-property-btn" data-a="toggle-property">${ico('plus',16)} ${data.showPropertyForm?'Close add property':'Add apartment / villa'}</button></div>
${data.showPropertyForm?`<section class="section-card add-property-form"><h3>Add apartment or villa</h3><p class="small-meta">Address information stays on this device. Zone, street and building / villa number are required.</p><form id="property-form"><div class="form-grid"><div><label class="field-label" for="property-type">Property type</label><select class="select" id="property-type"><option>Apartment</option><option>Villa</option></select></div><div><label class="field-label" for="property-name">Property name (optional)</label><input class="input" id="property-name" maxlength="65" placeholder="e.g. My Al Wakrah apartment"></div><div><label class="field-label" for="property-building">Building / Villa number *</label><input class="input" id="property-building" inputmode="text" maxlength="20" required placeholder="e.g. 28"></div><div><label class="field-label" for="property-street">Street number *</label><input class="input" id="property-street" inputmode="numeric" maxlength="20" required placeholder="e.g. 105"></div><div><label class="field-label" for="property-zone">Zone number *</label><input class="input" id="property-zone" inputmode="numeric" maxlength="10" required placeholder="e.g. 56"></div><div><label class="field-label" for="property-unit">Apartment / Unit number (optional)</label><input class="input" id="property-unit" maxlength="20" placeholder="e.g. 203"></div><div class="row-actions"><button class="outline-btn" type="button" data-a="toggle-property">Cancel</button><button class="action-btn" type="submit">${ico('check',16)} Save property</button></div></div></form></section>`:''}
<section class="hero-card" aria-label="Start new inspection"><div class="hero-top"><div class="hero-icon">${ico('clipboard',26)}</div><div><h2>New inspection</h2><p>Choose an inspection type to begin</p></div></div>
<div class="choice-grid"><button type="button" data-a="set-type" data-v="move-in" class="choice ${data.type==='move-in'?'selected':''}" aria-pressed="${data.type==='move-in'}"><div class="choice-header">${ico('home',19)}<span class="radio-dot"></span></div><strong style="font-size:13px">Move-in</strong><span class="mini-text">Record existing conditions</span></button><button type="button" data-a="set-type" data-v="move-out" class="choice ${data.type==='move-out'?'selected':''}" aria-pressed="${data.type==='move-out'}"><div class="choice-header">${ico('file',19)}<span class="radio-dot"></span></div><strong style="font-size:13px">Move-out</strong><span class="mini-text">Compare with move-in</span></button></div>
<button type="button" class="action-btn light full" data-a="new">Start ${data.type==='move-in'?'move-in':'move-out'} inspection ${ico('chevron',17)}</button></section>
<div class="section-title">Your activity <small>On this device</small></div>
<button class="quick-link" type="button" data-a="drafts"><span class="link-icon">${ico('file',21)}</span><span class="grow"><strong>Saved drafts</strong><small>${data.drafts.length} unfinished inspection${data.drafts.length===1?'':'s'} · Resume or delete</small></span><span class="chevron">${ico('chevron',17)}</span></button>
<button class="quick-link" type="button" data-a="records"><span class="link-icon">${ico('folder',21)}</span><span class="grow"><strong>Previous records</strong><small>View history and compare conditions</small></span><span class="chevron">${ico('chevron',17)}</span></button>
<button class="quick-link" type="button" data-a="last"><span class="link-icon">${ico('clock',21)}</span><span class="grow"><strong>Last inspection</strong><small>${last?`${last.type==='move-in'?'Move-in':'Move-out'} · ${fmtDate(last.date)}${last.demo?' · Sample':''}`:'No inspections saved'}</small></span><span class="chevron">${ico('chevron',17)}</span></button>
<p class="footer-note">${ico('lock',13)} Offline Android prototype · inspection records stored on this device</p></div>`}
function startNew(){
 const created={id:id(),propertyId:data.propertyId,type:data.type,startedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),selected:[itemKey('Bedroom','Wardrobe')],custom:[],details:{}};
 const previous=data.draft;
 data.drafts.push(created);
 data.draft=created;
 if(!persist()){data.drafts.pop();data.draft=previous;return}
 data.openedRoom='Bedroom';data.selectedKey=created.selected[0];data.returnReview=false;
 nav('rooms');
}
function resumeDraft(draftId){
 const draft=data.drafts.find(d=>d.id===draftId);
 if(!draft){toast('That draft is no longer available.');return}
 data.draft=draft;
 data.propertyId=draft.propertyId;
 data.type=draft.type;
 data.openedRoom=parseKey(draft.selected[0]||'Bedroom::Wardrobe').room;
 data.selectedKey=draft.selected[0]||null;
 data.returnReview=false;
 persist();nav('rooms');
}
function deleteDraft(draftId){
 const draft=data.drafts.find(d=>d.id===draftId);
 if(!draft)return;
 if(!confirm(`Delete this ${draft.type==='move-out'?'move-out':'move-in'} draft for ${propName(draft.propertyId)}? This cannot be undone.`))return;
 data.drafts=data.drafts.filter(d=>d.id!==draftId);
 if(data.draft?.id===draftId){data.draft=null;data.selectedKey=null}
 persist();render();toast('Draft deleted');
}
function draftsPage(){
 const saved=[...data.drafts].sort((a,b)=>new Date(b.updatedAt||b.startedAt)-new Date(a.updatedAt||a.startedAt));
 return `${header()}<div class="page">${navhead('Saved drafts','Continue an unfinished inspection or delete a draft')}
 <div class="eyebrow">Unfinished inspections</div><h2 class="flow-title">Your drafts</h2><p class="subhead">Starting a new inspection will not replace any of these drafts. Records stay on this device until you finish or delete them.</p>
 ${saved.length?saved.map(d=>{const count=(d.selected||[]).length;const completed=(d.selected||[]).filter(k=>d.details?.[k]?.condition).length;return `<section class="draft-card"><div class="draft-card-main"><span class="item-badge">${ico('file',19)}</span><div class="grow"><h3>${escapeHtml(propName(d.propertyId))}</h3><p>${d.type==='move-out'?'Move-out':'Move-in'} · ${completed}/${count} item${count===1?'':'s'} recorded</p><small>Last edited ${fmtDate(d.updatedAt||d.startedAt)}</small></div></div><div class="draft-actions"><button type="button" class="action-btn" data-a="resume-draft" data-v="${escapeHtml(d.id)}">Continue ${ico('chevron',16)}</button><button type="button" class="outline-btn delete-draft" data-a="delete-draft" data-v="${escapeHtml(d.id)}" aria-label="Delete draft for ${escapeHtml(propName(d.propertyId))}">${ico('trash',17)} Delete</button></div></section>`}).join(''):`<div class="card empty"><div class="empty-icon">${ico('file',29)}</div><h3>No drafts saved</h3><p>Unfinished inspections will appear here. Start a new inspection whenever you're ready.</p></div>`}
 <button class="outline-btn full" type="button" data-a="nav" data-v="dashboard" style="margin-top:16px">${ico('arrow',17)} Back to dashboard</button></div>`;
}
function learnMore(){return `${header()}<div class="page">${navhead('How MoveProof works','A simple guide to inspections')}<div class="eyebrow">About this app</div><h2 class="flow-title">Record the condition of your home</h2><p class="subhead">MoveProof helps renters create a private, dated record of a property's visible condition, especially when moving in or moving out.</p><div class="guide-stack"><section class="guide-step"><span class="guide-number">1</span><div><h3>Choose your property</h3><p>Add your apartment or villa and select move-in or move-out.</p></div></section><section class="guide-step"><span class="guide-number">2</span><div><h3>Inspect rooms and items</h3><p>Select items, mark their condition and add photographs or written notes. You can save multiple unfinished inspections as drafts.</p></div></section><section class="guide-step"><span class="guide-number">3</span><div><h3>Review your records</h3><p>Finish the inspection to save a dated record. Browse it by property, room and item, and compare move-in and move-out records when both exist.</p></div></section></div><div class="notice neutral">${ico('info',18)}<div class="notice-body">Records are kept on this device. This prototype does not provide cloud backup or determine legal responsibility for damage.</div></div><button type="button" class="action-btn full" data-a="nav" data-v="dashboard" style="margin-top:22px">Back to inspection workspace</button></div>`}

function allItems(room){const src=ROOMS.find(r=>r.name===room);return [...(src?.items||[]),...(data.draft?.custom||[]).filter(x=>x.room===room).map(x=>x.name)]}
function rooms(){if(!data.draft){nav('dashboard');return ''}return `${header()}<div class="page">${navhead('Rooms & items',`${propName(data.draft.propertyId)} · ${data.draft.type==='move-in'?'Move-in':'Move-out'}`)}${stepper(2)}<div class="eyebrow">Step 02 · Choose what to inspect</div><h2 style="font-size:20px;letter-spacing:-.6px;margin:7px 0 6px">Select rooms and items</h2><p class="subhead">Expand a room and check the items you want to document.</p>
${ROOMS.map(r=>{const open=data.openedRoom===r.name;const selectedCount=(data.draft.selected||[]).filter(k=>parseKey(k).room===r.name).length;return `<section class="room-card"><button type="button" class="room-head" data-a="toggle-room" data-v="${escapeHtml(r.name)}" aria-expanded="${open}"><span class="room-icon">${ico(r.icon,19)}</span><strong>${escapeHtml(r.name)}</strong>${selectedCount?`<small>${selectedCount} selected</small>`:''}${ico(open?'up':'down',17)}</button>${open?`<div class="room-body">${allItems(r.name).map(n=>{const key=itemKey(r.name,n);return `<label class="item-line"><input type="checkbox" data-field="item-check" value="${escapeHtml(key)}" ${data.draft.selected.includes(key)?'checked':''}><span class="item-name">${escapeHtml(n)}</span>${(data.draft.details[key]?.condition)?`<span class="selected-note">Recorded</span>`:''}</label>`}).join('')}${!allItems(r.name).length?`<p class="small-meta">No preset items. Add your own item below.</p>`:''}${data.customFormRoom===r.name?`<div class="inline-form"><div class="inline-form-title"><span>Add custom item</span><span class="mini-label">Optional</span></div><div class="form-grid"><div><label class="field-label" for="custom-name">Item name</label><input id="custom-name" class="input" placeholder="e.g. Mirror, light switch" maxlength="55"></div><div><label class="field-label" for="custom-category">Category (optional)</label><select id="custom-category" class="select"><option value="">Select category</option><option>Furniture</option><option>Fixture</option><option>Other</option></select></div><div><label class="field-label" for="custom-notes">Notes (optional)</label><textarea id="custom-notes" class="textarea" placeholder="Any additional details"></textarea></div><div class="row-actions"><button type="button" class="outline-btn button-inline" data-a="custom-cancel">Cancel</button><button type="button" class="action-btn button-inline" data-a="custom-add">${ico('plus',15)} Add item</button></div></div></div>`:`<button type="button" class="outline-btn full button-inline" style="margin-top:11px" data-a="custom-open" data-v="${escapeHtml(r.name)}">${ico('plus',16)} Add custom item</button>`}</div>`:''}</section>`}).join('')}
<p class="footer-note">${data.draft.selected.length} item(s) selected · You can revise this list later.</p>${footer(`<button type="button" class="action-btn full" data-a="rooms-next" ${!data.draft.selected.length?'disabled':''}>Continue to condition recording ${ico('chevron',17)}</button>`)}</div>`}
function detail(){if(!data.draft)return null;const key=data.selectedKey||data.draft.selected[0];if(!key)return null;return data.draft.details[key]||(data.draft.details[key]={condition:'',description:'',notes:'',photo:null,ack:false,timestamp:null,skipPhoto:false})}
function condition(){if(!data.draft){nav('dashboard');return ''}if(!data.draft.selected.includes(data.selectedKey))data.selectedKey=data.draft.selected[0];const k=data.selectedKey;const {room,name}=parseKey(k);const d=detail();const n=data.draft.selected.indexOf(k);return `${header()}<div class="page">${navhead(`${name}`,`${room} · Item ${n+1} of ${data.draft.selected.length}`,'rooms')}${stepper(3)}<div class="eyebrow">Step 03 · Capture condition</div><h2 style="font-size:20px;margin:7px 0 3px;letter-spacing:-.6px">What is the item's condition?</h2><p class="subhead">Choose an option, add photos or notes, and save.</p>
<section class="section-card"><h3>Condition <span style="color:var(--wine)">*</span></h3><div class="condition-grid">${['Good','Damaged','Unsure'].map(c=>`<label class="condition-choice ${d.condition===c?'selected':''}"><input type="radio" name="condition" value="${c}" ${d.condition===c?'checked':''} data-field="condition"><span>${c}</span></label>`).join('')}</div><label class="field-label condition-description-label" for="condition-description">Describe the condition (optional)</label><textarea class="textarea" id="condition-description" data-field="description" placeholder="e.g. Wardrobe door is loose and has two scratches">${escapeHtml(d.description||'')}</textarea><p class="small-meta">You can record the condition in writing even without a photograph.</p></section>
<section class="section-card"><h3 style="display:flex;justify-content:space-between;align-items:center">Photograph <span class="pill">Optional</span></h3><div class="photo-drop">${d.photo?`<button type="button" class="photo-preview-button" data-a="view-draft-photo" aria-label="Open full photograph with zoom"><img src="${d.photo}" alt="Captured condition of ${escapeHtml(name)}"><span class="preview-caption">${ico('search',14)} Tap to view full photo and zoom</span></button>`:`<span class="photo-icon">${ico('image',28)}</span><strong style="font-size:12px;color:#818b96">No photo selected</strong><span class="photo-hint">A visual record can help at move-out</span>`}</div><div class="photo-buttons"><button type="button" class="outline-btn" data-a="camera">${ico('camera',17)} ${d.photo?'Retake photo':'Take photo'}</button><button type="button" class="outline-btn" data-a="gallery">${ico('image',17)} Gallery</button></div>${d.photo?`<button class="outline-btn button-inline full" style="margin-top:8px" data-a="remove-photo">${ico('trash',15)} Remove photo</button>`:''}
${data.photoError?`<div class="notice error" role="alert">${ico('alert',19)}<div class="notice-body"><strong>Photo could not be added</strong><div>${escapeHtml(data.photoError)}</div><div class="notice-actions"><button type="button" class="outline-btn" data-a="camera">${ico('refresh',14)} Retry photo</button><button type="button" class="outline-btn" data-a="skip-photo">Continue without photo</button></div></div></div>`:d.skipPhoto&&!d.photo?`<div class="notice neutral">${ico('info',18)}<div class="notice-body">Continuing without a photo. If the item is damaged, you will be asked to acknowledge the missing photo during review.</div></div>`:''}</section>
<section class="section-card"><h3>Notes <span class="pill">Optional</span></h3><label class="field-label" for="condition-notes">Describe any visible marks or damage</label><textarea class="textarea" id="condition-notes" data-field="notes" placeholder="e.g. Small scratch on right door">${escapeHtml(d.notes)}</textarea><div class="help-row" style="margin-top:10px">${ico('clock',14)} Date & time saved when you save this item</div></section>
${footer(`<div class="row-actions"><button type="button" class="outline-btn" data-a="nav" data-v="${data.returnReview?'review':'rooms'}">Back</button><button type="button" class="action-btn" data-a="save-item">Save item ${ico('chevron',16)}</button></div>`)}</div>`}
function checkDraft(){const dr=data.draft;if(!dr)return {total:0,done:0,missing:[],incomplete:[],canFinish:false};const selected=dr.selected;const incomplete=selected.filter(k=>!dr.details[k]?.condition);const missing=selected.filter(k=>dr.details[k]?.condition==='Damaged'&&!dr.details[k]?.photo&&!dr.details[k]?.ack);return {total:selected.length,done:selected.length-incomplete.length,missing,incomplete,canFinish:selected.length>0&&!incomplete.length&&!missing.length}}
function statusFor(k){const d=data.draft.details[k];if(!d?.condition)return ['Incomplete','neutral','info'];if(d.condition==='Damaged'&&!d.photo&&!d.ack)return ['Missing photo','warning','alert'];if(d.condition==='Damaged'&&!d.photo&&d.ack)return ['Acknowledged','success','check'];return ['Complete','success','check']}
function review(){if(!data.draft){nav('dashboard');return ''}const c=checkDraft();const pct=Math.round(c.done/Math.max(1,c.total)*100);return `${header()}<div class="page">${navhead('Review inspection',`${propName(data.draft.propertyId)} · ${data.draft.type==='move-in'?'Move-in':'Move-out'}`,'rooms')}${stepper(4)}<div class="eyebrow">Step 04 · Check everything</div><h2 style="font-size:21px;letter-spacing:-.5px;margin:8px 0 7px">Ready to finish?</h2><p class="subhead">Resolve incomplete items and acknowledge any damaged item without a photo.</p>
<div class="progress-line"><div class="progress-track" role="progressbar" aria-valuenow="${c.done}" aria-valuemin="0" aria-valuemax="${c.total}"><div class="progress-bar" style="width:${pct}%"></div></div><span class="progress-label">${c.done} / ${c.total} recorded</span></div>
${ROOMS.filter(r=>data.draft.selected.some(k=>parseKey(k).room===r.name)).map(r=>{const keys=data.draft.selected.filter(k=>parseKey(k).room===r.name);const expanded=data.openedRoom===r.name;return `<section class="review-room"><button type="button" class="review-head" data-a="toggle-review-room" data-v="${escapeHtml(r.name)}" aria-expanded="${expanded}"><span style="color:var(--wine)">${ico(r.icon,18)}</span><strong>${escapeHtml(r.name)}</strong><span class="count">${keys.length} items</span>${ico(expanded?'up':'down',17)}</button>${expanded?`<div class="review-lines">${keys.map(k=>{const {name}=parseKey(k);const [label,tone,symbol]=statusFor(k);const d=data.draft.details[k];const needsPhoto=d?.condition==='Damaged'&&!d?.photo&&!d?.ack;return `<div><button type="button" class="review-item" data-a="edit-item" data-v="${escapeHtml(k)}"><span style="color:#87909b">${ico('file',16)}</span><span>${escapeHtml(name)}</span><span class="status ${tone}">${ico(symbol,14)} ${label}</span>${ico('chevron',14)}</button>${needsPhoto?`<div class="review-inline"><div class="notice" role="alert">${ico('alert',19)}<div class="notice-body"><strong>Missing-photo validation</strong><div>“${escapeHtml(name)}” is marked Damaged but has no photo. Add one or explicitly acknowledge the omission.</div><div class="notice-actions"><button type="button" class="outline-btn" data-a="edit-item" data-v="${escapeHtml(k)}">${ico('camera',14)} Add photo</button><button type="button" class="outline-btn" data-a="ack" data-v="${escapeHtml(k)}">${ico('check',14)} Acknowledge</button></div></div></div></div>`:d?.condition==='Damaged'&&!d?.photo&&d?.ack?`<div class="notice success" style="margin:7px 0 11px">${ico('check',17)} <span>Missing photograph explicitly acknowledged for this item.</span></div>`:''}</div>`}).join('')}</div>`:''}</section>`}).join('')}
${!c.canFinish?`<div class="notice neutral" role="status">${ico('lock',18)}<div class="notice-body"><strong>Finish inspection unavailable</strong>${c.incomplete.length?`${c.incomplete.length} item(s) need a condition. `:''}${c.missing.length?`${c.missing.length} damaged item(s) need a photo or acknowledgment.`:''}</div></div>`:`<div class="notice success">${ico('shield',18)}<div class="notice-body"><strong>Review complete</strong>All required conditions have been recorded and photo exceptions are resolved.</div></div>`}
${footer(`<div class="row-actions"><button type="button" class="outline-btn" data-a="save-draft">Save draft</button><button type="button" class="action-btn" data-a="finish" ${!c.canFinish?'disabled':''}>${ico('check',16)} Finish inspection</button></div>`)}</div>`}
function getKeysForProp(property){const keys=new Set(ROOMS.flatMap(r=>r.items.map(n=>itemKey(r.name,n))));data.records.filter(r=>r.propertyId===property).forEach(rec=>rec.items.forEach(it=>keys.add(it.key)));return [...keys].sort((a,b)=>a.localeCompare(b))}
function recordHtml(rec,item){const src=rec.items.find(it=>it.key===item);if(!src)return '';return `<article class="record-card"><div class="record-head"><h3>${rec.type==='move-in'?'Move-in':'Move-out'}</h3><small>${fmtDate(rec.date)} ${rec.demo?'· Demo':''}</small></div><div class="record-preview">${src.photo?`<button type="button" class="record-photo-button" data-a="view-photo" data-v="${escapeHtml(rec.id)}" data-k="${escapeHtml(item)}" aria-label="View complete saved photo and zoom"><img src="${src.photo}" alt="Saved condition photograph"><span class="preview-caption">${ico('search',14)} View full photo · zoom</span></button>`:`<div class="no-photo-label">${ico('image',28)}<span>No photo attached</span><small>Condition recorded in writing</small></div>`}</div><div class="record-pairs"><div><span>Condition</span><p><strong>${escapeHtml(src.condition||'Not recorded')}</strong></p></div><div><span>Condition description</span><p>${src.description?escapeHtml(src.description):'No description recorded'}</p></div><div><span>Notes</span><p>${src.notes?escapeHtml(src.notes):'No notes recorded'}</p></div>${src.ack?`<div><span>Evidence</span><p>No photo — explicitly acknowledged</p></div>`:''}</div></article>`}
function recordsProperties(){
 return `${header()}<div class="page">${navhead('Previous records','Select a property to browse its inspection history')}<div class="eyebrow">Inspection history</div><h2 class="flow-title">Choose a property</h2><p class="subhead">Your saved inspections are organised by apartment or villa. Select a property to continue.</p>
 <div class="history-property-list">${data.properties.map(p=>{const matching=data.records.filter(r=>r.propertyId===p.id);return `<button class="history-property" type="button" data-a="choose-record-property" data-v="${escapeHtml(p.id)}"><span class="item-badge">${ico('home',22)}</span><span class="grow"><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(propAddress(p.id)||'No address added')}</small><span class="history-count">${matching.length} saved inspection${matching.length===1?'':'s'}</span></span>${ico('chevron',20)}</button>`}).join('')}</div>
 <p class="footer-note">Only inspections you have actually completed appear in your history. Records are stored on this device.</p></div>`;
}
function recordsItems(){
 const property=data.recordsProperty;
 const keys=getKeysForProp(property);
 const roomNames=[...new Set([...ROOMS.map(r=>r.name),...keys.map(k=>parseKey(k).room)])];
 return `${header()}<div class="page">${navhead('Rooms & items',propName(property),'record-properties')}<div class="eyebrow">Inspection history</div><h2 class="flow-title">Choose a room and item</h2><p class="subhead">Open a room, then select the item whose records you want to see.</p><div class="history-context">${ico('home',17)}<div><strong>${escapeHtml(propName(property))}</strong><small>${escapeHtml(propAddress(property)||'No address added')}</small></div></div>
 ${roomNames.map(room=>{const opened=data.recordsRoom===room;const roomKeys=keys.filter(k=>parseKey(k).room===room);const savedCount=roomKeys.filter(k=>data.records.some(r=>r.propertyId===property&&r.items.some(it=>it.key===k))).length;const roomInfo=ROOMS.find(r=>r.name===room);return `<section class="room-card history-room"><button type="button" class="room-head" data-a="toggle-record-room" data-v="${escapeHtml(room)}" aria-expanded="${opened}"><span class="room-icon">${ico(roomInfo?.icon||'folder',19)}</span><strong>${escapeHtml(room)}</strong><small>${savedCount} item${savedCount===1?'':'s'} recorded</small>${ico(opened?'up':'down',17)}</button>${opened?`<div class="history-item-list">${roomKeys.map(k=>{const name=parseKey(k).name;const n=data.records.filter(r=>r.propertyId===property&&r.items.some(it=>it.key===k)).length;return `<button type="button" class="history-item" data-a="choose-record-item" data-v="${escapeHtml(k)}"><span>${escapeHtml(name)}</span><small>${n?`${n} record${n===1?'':'s'}`:'No record yet'}</small>${ico('chevron',16)}</button>`}).join('')||'<p class="small-meta">No items in this room.</p>'}</div>`:''}</section>`}).join('')}
 <button type="button" class="outline-btn full" style="margin-top:18px" data-a="nav" data-v="record-properties">${ico('arrow',17)} All properties</button></div>`;
}
function recordDetail(){
 const property=data.recordsProperty;
 const item=data.recordsItem;
 const {room,name}=parseKey(item||'::');
 const all=data.records.filter(r=>r.propertyId===property&&r.items.some(it=>it.key===item)).sort((a,b)=>new Date(b.date)-new Date(a.date));
 const moveIn=all.filter(r=>r.type==='move-in');
 const moveOut=all.filter(r=>r.type==='move-out');
 return `${header()}<div class="page">${navhead('Record history',`${room} · ${name}`,'record-items')}<div class="eyebrow">${escapeHtml(propName(property))}</div><h2 class="flow-title">${escapeHtml(name)} records</h2><p class="subhead">${escapeHtml(room)} · ${escapeHtml(propName(property))}</p>
 ${all.length?`<div class="history-summary">${ico('folder',18)} ${all.length} saved record${all.length===1?'':'s'} for this item</div>${moveIn.length&&moveOut.length?`<div class="notice success">${ico('check',17)} <span>Comparison available · Both move-in and move-out records found.</span></div>`:''}<div class="section-title">Move-in <small>${moveIn.length} record${moveIn.length===1?'':'s'}</small></div>${moveIn.length?moveIn.map(r=>recordHtml(r,item)).join(''):`<div class="notice neutral">${ico('info',17)} <span>No move-in record is available for this item yet.</span></div>`}<div class="section-title">Move-out <small>${moveOut.length} record${moveOut.length===1?'':'s'}</small></div>${moveOut.length?moveOut.map(r=>recordHtml(r,item)).join(''):`<div class="notice neutral">${ico('info',17)} <span>No move-out record is available for this item yet.</span></div>`}`:`<div class="card empty" style="margin-top:20px"><div class="empty-icon">${ico('folder',32)}</div><h3>No record available</h3><p>There is no saved inspection for <strong>${escapeHtml(name)}</strong> at this property.</p><button type="button" class="outline-btn" data-a="nav" data-v="record-items">${ico('arrow',16)} Choose another item</button></div>`}
 <button type="button" class="outline-btn full" style="margin-top:18px" data-a="nav" data-v="record-items">${ico('arrow',17)} Back to rooms & items</button><p class="footer-note">Photographs can be opened full-screen and zoomed. Saved records stay on this device.</p></div>`;
}
// Full-size photo viewer: fit whole photo first, then pinch/drag or use +/- controls.
const photoDialog=document.getElementById('photo-dialog');
const photoStage=document.getElementById('photo-stage');
const photoFull=document.getElementById('photo-full');
const photoZoomValue=document.getElementById('photo-zoom-value');
const photoPointers=new Map();
const photoState={scale:1,x:0,y:0,previousDistance:0,previousMid:null};
function updatePhotoTransform(){
 const maxX=Math.max(0,(photoStage.clientWidth*(photoState.scale-1))/2);
 const maxY=Math.max(0,(photoStage.clientHeight*(photoState.scale-1))/2);
 photoState.x=Math.max(-maxX,Math.min(maxX,photoState.x));
 photoState.y=Math.max(-maxY,Math.min(maxY,photoState.y));
 photoFull.style.transform=`translate(${photoState.x}px,${photoState.y}px) scale(${photoState.scale})`;
 photoZoomValue.textContent=`${Math.round(photoState.scale*100)}%`;
}
function zoomPhoto(scale){photoState.scale=Math.max(1,Math.min(5,scale));if(photoState.scale===1){photoState.x=0;photoState.y=0}updatePhotoTransform()}
function closePhoto(){if(photoDialog.open)photoDialog.close()}
function openPhoto(src,caption){
 if(!/^data:image\/(?:jpeg|png|webp);base64,/i.test(src||'')){toast('The saved photo could not be opened.');return}
 photoFull.src=src;
 document.getElementById('photo-caption').textContent=caption;
 photoPointers.clear();photoState.previousDistance=0;photoState.previousMid=null;
 photoState.scale=1;photoState.x=0;photoState.y=0;
 if(!photoDialog.open)photoDialog.showModal();
 updatePhotoTransform();
}
photoDialog.addEventListener('click',e=>{const action=e.target.closest('[data-photo]')?.dataset.photo;if(action==='close')closePhoto();if(action==='in')zoomPhoto(photoState.scale+.5);if(action==='out')zoomPhoto(photoState.scale-.5);if(action==='reset')zoomPhoto(1)});
photoDialog.addEventListener('close',()=>{photoFull.removeAttribute('src');photoPointers.clear()});
photoStage.addEventListener('wheel',e=>{e.preventDefault();zoomPhoto(photoState.scale+(e.deltaY<0?.25:-.25))},{passive:false});
const photoDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const photoMid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
photoStage.addEventListener('pointerdown',e=>{
 if(!photoDialog.open)return;
 photoStage.setPointerCapture(e.pointerId);
 photoPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 photoState.previousDistance=0;photoState.previousMid=null;
});
photoStage.addEventListener('pointermove',e=>{
 if(!photoPointers.has(e.pointerId))return;
 const old=photoPointers.get(e.pointerId);
 photoPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(photoPointers.size===1&&photoState.scale>1){photoState.x+=e.clientX-old.x;photoState.y+=e.clientY-old.y;updatePhotoTransform()}
 else if(photoPointers.size>=2){
  const [a,b]=[...photoPointers.values()].slice(0,2);
  const distance=photoDistance(a,b),mid=photoMid(a,b);
  if(photoState.previousDistance>0)photoState.scale=Math.min(5,Math.max(1,photoState.scale*distance/photoState.previousDistance));
  if(photoState.previousMid&&photoState.scale>1){photoState.x+=mid.x-photoState.previousMid.x;photoState.y+=mid.y-photoState.previousMid.y}
  if(photoState.scale===1){photoState.x=0;photoState.y=0}
  photoState.previousDistance=distance;photoState.previousMid=mid;updatePhotoTransform();
 }
});
const clearPhotoPointer=e=>{photoPointers.delete(e.pointerId);photoState.previousDistance=0;photoState.previousMid=null};
photoStage.addEventListener('pointerup',clearPhotoPointer);
photoStage.addEventListener('pointercancel',clearPhotoPointer);
photoStage.addEventListener('dblclick',()=>zoomPhoto(photoState.scale>1?1:2));
function render(){let contents='';if(data.page==='dashboard')contents=dashboard();else if(data.page==='rooms')contents=rooms();else if(data.page==='condition')contents=condition();else if(data.page==='review')contents=review();else if(data.page==='drafts')contents=draftsPage();else if(data.page==='learn-more')contents=learnMore();else if(data.page==='record-properties')contents=recordsProperties();else if(data.page==='record-items')contents=recordsItems();else if(data.page==='record-detail')contents=recordDetail();app.innerHTML=contents}
function selectNextItem(){const dr=data.draft;if(!dr)return;const idx=dr.selected.indexOf(data.selectedKey);const next=dr.selected.slice(idx+1).find(k=>!dr.details[k]?.condition);if(next){data.selectedKey=next;data.returnReview=false;nav('condition')}else{data.openedRoom=parseKey(data.selectedKey).room;nav('review')}}
function saveItem(){const d=detail();if(!d?.condition){toast('Choose Good, Damaged or Unsure before saving this item.');document.querySelector('input[name="condition"]')?.focus();return}d.timestamp=new Date().toISOString();if(d.photo)d.ack=false;data.draft.details[data.selectedKey]=d;persist();toast('Item condition saved');if(data.returnReview){data.returnReview=false;data.openedRoom=parseKey(data.selectedKey).room;nav('review')}else selectNextItem()}
function editItem(key){data.selectedKey=key;data.returnReview=true;nav('condition')}
function ack(key){const d=data.draft?.details[key];if(d?.condition!=='Damaged'||d.photo)return;d.ack=true;persist();toast('Missing photograph acknowledged');render()}
function finish(){const c=checkDraft();if(!c.canFinish){toast('Resolve outstanding items before finishing.');return}const dr=data.draft;const rec={id:id(),propertyId:dr.propertyId,type:dr.type,date:new Date().toISOString(),demo:false,items:dr.selected.map(k=>({key:k,...parseKey(k),...structuredClone(dr.details[k])}))};data.records.push(rec);data.drafts=data.drafts.filter(d=>d.id!==dr.id);data.draft=null;data.recordsProperty=rec.propertyId;data.recordsItem=rec.items[0].key;data.selectedKey=null;persist();nav('record-detail');toast('Inspection completed and saved on this device')}
function stopCamera(){if(data.cameraStream){for(const track of data.cameraStream.getTracks())track.stop();data.cameraStream=null}video.srcObject=null;if(dlg.open)dlg.close()}
async function openCamera(){data.photoError='';if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){data.photoError='Camera preview is not available on this device. Allow the Camera permission, update Android System WebView, or choose a gallery image.';render();return}try{if(!dlg.open)dlg.showModal();const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});if(!dlg.open){stream.getTracks().forEach(t=>t.stop());return}data.cameraStream=stream;video.srcObject=stream;try{await video.play()}catch{}document.getElementById('camera-hint').textContent='Position the item clearly in the frame.'}catch(err){stopCamera();const messages={NotAllowedError:'Camera permission was denied. Allow Camera permission in Android App settings or choose a gallery image.',NotFoundError:'No available camera was found on this device.',NotReadableError:'The camera is unavailable or being used by another application.',OverconstrainedError:'The requested camera configuration is unavailable.'};data.photoError=messages[err.name]||`Camera could not start (${err.name||'unknown error'}). Retry or continue without a photo.`;render()}}
function resizePhoto(src,maxWidth=1300,quality=.72){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{try{const factor=Math.min(1,maxWidth/Math.max(img.naturalWidth,img.naturalHeight));const w=Math.max(1,Math.round(img.naturalWidth*factor));const h=Math.max(1,Math.round(img.naturalHeight*factor));const cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(img,0,0,w,h);resolve(cv.toDataURL('image/jpeg',quality))}catch(e){reject(e)}};img.onerror=()=>reject(Error('Unable to read photo'));img.src=src})}
function capture(){if(!data.cameraStream||video.readyState<2){document.getElementById('camera-hint').textContent='Camera is still starting. Try again.';return}try{const cv=document.createElement('canvas');const srcW=video.videoWidth,srcH=video.videoHeight;if(!srcW||!srcH)throw Error('Camera did not provide a frame');const scale=Math.min(1,1300/Math.max(srcW,srcH));cv.width=Math.round(srcW*scale);cv.height=Math.round(srcH*scale);cv.getContext('2d').drawImage(video,0,0,cv.width,cv.height);const d=detail();d.photo=cv.toDataURL('image/jpeg',.7);d.skipPhoto=false;d.ack=false;stopCamera();data.photoError='';persist();render();toast('Photo captured from camera')}catch(e){stopCamera();data.photoError='Photo capture failed. Please retry.';render()}}
function pickGallery(){gallery.value='';gallery.click()}
gallery.addEventListener('change',async()=>{const file=gallery.files?.[0];if(!file)return;if(!file.type.startsWith('image/')){data.photoError='Selected file is not an image.';render();return}try{const raw=await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=()=>reject(Error('Unable to read gallery image'));fr.readAsDataURL(file)});const d=detail();d.photo=await resizePhoto(raw);d.skipPhoto=false;d.ack=false;data.photoError='';persist();render();toast('Photo added from gallery')}catch(err){data.photoError='Could not read or process the selected photo.';render()}});
dlg.addEventListener('click',e=>{const btn=e.target.closest('[data-camera]');if(!btn)return;if(btn.dataset.camera==='close')stopCamera();if(btn.dataset.camera==='capture')capture()});
dlg.addEventListener('close',()=>{if(data.cameraStream){for(const track of data.cameraStream.getTracks())track.stop();data.cameraStream=null}video.srcObject=null});
app.addEventListener('submit',e=>{
 if(e.target.id!=='property-form')return;
 e.preventDefault();
 const val=id=>document.getElementById(id)?.value.trim()||'';
 const type=val('property-type'),building=val('property-building'),street=val('property-street'),zone=val('property-zone'),unit=val('property-unit');
 if(!building||!street||!zone){toast('Building / Villa, Street and Zone are required.');return}
 if(!/^\d{1,10}$/.test(zone)||!/^\d{1,20}$/.test(street)){toast('Use numeric Zone and Street numbers.');return}
 const name=val('property-name')||`${type} ${building} · Zone ${zone}`;
 if(data.properties.some(p=>p.name.toLowerCase()===name.toLowerCase())){toast('Choose a different property name.');return}
 const newProp={id:id(),name,type,building,street,zone,unit};
 data.properties.push(newProp);
 const previous=data.propertyId;
 data.propertyId=newProp.id;
 if(!persist()) { data.properties.pop();data.propertyId=previous;return }
 data.showPropertyForm=false;render();toast('Property added and selected');
});
app.addEventListener('click',async(e)=>{const button=e.target.closest('[data-a]');if(!button)return;const action=button.dataset.a,v=button.dataset.v;
switch(action){
case 'nav':nav(v);break;
case 'toggle-property':data.showPropertyForm=!data.showPropertyForm;render();if(data.showPropertyForm)document.getElementById('property-type')?.focus();break;
case 'view-photo':{const rec=data.records.find(r=>r.id===v);const photo=rec?.items.find(i=>i.key===button.dataset.k)?.photo;if(photo)openPhoto(photo,`${propName(rec.propertyId)} · ${parseKey(button.dataset.k).name} · ${fmtDate(rec.date)}`);break}
case 'view-draft-photo':{const d=detail();if(d?.photo)openPhoto(d.photo,`${parseKey(data.selectedKey).name} · current inspection`);break}
case 'set-type':data.type=v;persist();render();break;
case 'new':startNew();break;
case 'drafts':nav('drafts');break;
case 'resume-draft':resumeDraft(v);break;
case 'delete-draft':deleteDraft(v);break;
case 'learn-more':nav('learn-more');break;
case 'records':data.recordsProperty=data.propertyId;data.recordsRoom='';nav('record-properties');break;
case 'last':{const last=lastRecord();if(last?.items?.length){data.recordsProperty=last.propertyId;data.recordsItem=last.items[0].key;data.recordsRoom=parseKey(data.recordsItem).room;nav('record-detail')}else nav('record-properties');break}
case 'choose-record-property':data.recordsProperty=v;data.recordsRoom='';nav('record-items');break;
case 'toggle-record-room':data.recordsRoom=data.recordsRoom===v?'':v;render();break;
case 'choose-record-item':data.recordsItem=v;nav('record-detail');break;
case 'toggle-room':data.openedRoom=data.openedRoom===v?'':v;data.customFormRoom=null;render();break;
case 'custom-open':data.customFormRoom=v;render();setTimeout(()=>document.getElementById('custom-name')?.focus(),0);break;
case 'custom-cancel':data.customFormRoom=null;render();break;
case 'custom-add':{const name=document.getElementById('custom-name')?.value.trim();if(!name){toast('Enter a name for the custom item.');return}if(allItems(data.openedRoom).some(x=>x.toLowerCase()===name.toLowerCase())){toast('That item already exists in this room.');return}const category=document.getElementById('custom-category')?.value||'';const notes=document.getElementById('custom-notes')?.value||'';const key=itemKey(data.openedRoom,name);data.draft.custom.push({room:data.openedRoom,name,category,notes});data.draft.selected.push(key);data.draft.details[key]={condition:'',notes,photo:null,ack:false,timestamp:null,skipPhoto:false};data.customFormRoom=null;persist();render();toast('Custom item added');break}
case 'rooms-next':if(!data.draft.selected.length){toast('Select at least one item first.');return}data.selectedKey=data.draft.selected.find(k=>!data.draft.details[k]?.condition)||data.draft.selected[0];data.returnReview=false;nav('condition');break;
case 'camera':await openCamera();break;
case 'gallery':pickGallery();break;
case 'skip-photo':data.photoError='';detail().skipPhoto=true;persist();render();break;
case 'remove-photo':detail().photo=null;detail().ack=false;persist();render();break;
case 'save-item':saveItem();break;
case 'edit-item':editItem(v);break;
case 'toggle-review-room':data.openedRoom=data.openedRoom===v?'':v;render();break;
case 'ack':ack(v);break;
case 'save-draft':if(data.draft){data.draft.updatedAt=new Date().toISOString();data.draft=null;data.selectedKey=null;persist()}nav('drafts');toast('Draft saved locally');break;
case 'finish':finish();break;

}});
app.addEventListener('change',e=>{const t=e.target;switch(t.dataset.field){
case 'property':data.propertyId=t.value;persist();render();break;
case 'item-check':{const key=t.value;if(t.checked&&!data.draft.selected.includes(key))data.draft.selected.push(key);else if(!t.checked)data.draft.selected=data.draft.selected.filter(k=>k!==key);persist();render();break}
case 'condition':detail().condition=t.value;persist();render();break;

}});
app.addEventListener('input',e=>{if(!data.draft)return;if(e.target.dataset.field==='notes'){detail().notes=e.target.value;persist()}if(e.target.dataset.field==='description'){detail().description=e.target.value;persist()}});
window.addEventListener('beforeunload',stopCamera);
// Clean up old fictional sample entries stored by the earlier Android app.
// This runs once on upgrade and saves the corrected history without resetting other data.
if ((Array.isArray(stored?.records) && stored.records.length !== data.records.length) || (stored?.draft && !Array.isArray(stored?.drafts))) persist();
render();
