// Offline test harness for the existing five-screen JS logic. No Android hardware is simulated.
const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'app/src/main/assets/app.js'),'utf8');
const outputs=[];
const elements={};
function el(id){if(!elements[id])elements[id]={innerHTML:'',textContent:'',value:'',open:false,classList:{add(){},remove(){}},handlers:{},addEventListener(type,handler){this.handlers[type]=handler},focus(){},showModal(){this.open=true},close(){this.open=false},getContext(){return {drawImage(){}}},toDataURL(){return 'data:image/jpeg;base64,ZmFrZQ=='},play:async()=>{}};return elements[id]}
const storage=new Map();
const doc={getElementById:el,createElement:(tag)=>el('created-'+tag),querySelector:()=>el('query'),addEventListener(){}};
const ctx={document:doc,window:{isSecureContext:true,scrollTo(){},addEventListener(){},navigator:null},navigator:{},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},crypto:require('node:crypto').webcrypto,structuredClone,Date,Math,JSON,String,console,clearTimeout,setTimeout,confirm:()=>true};
ctx.globalThis=ctx;
const sandbox=vm.createContext(ctx);
vm.runInContext(code,sandbox,{filename:'app.js'});
function test(name, f){try {f(); outputs.push({test:name,status:'PASS'})}catch(e){outputs.push({test:name,status:'FAIL',error:String(e)});process.exitCode=1}}
const run=(code)=>vm.runInContext(code,sandbox);
const click=async(action,v='',k='')=>el('app').handlers.click({target:{closest(){return {dataset:{a:action,v,k}}}}});
test('Dashboard renders',()=>assert.match(el('app').innerHTML,/New inspection/));
test('New installs start with no fictional inspections',()=>assert.equal(run('data.records.length'),0));
test('All eight views are wired',()=>{for(const x of ['dashboard','rooms','condition','review','drafts','learn-more','record-properties','record-items','record-detail']){run(`data.page='${x}'; if(data.page==='condition'||data.page==='rooms'||data.page==='review')data.draft=data.draft||{id:'t',propertyId:'al-sadd',type:'move-in',selected:['Bedroom::Wardrobe'],custom:[],details:{}};render();`);assert.ok(el('app').innerHTML.length>100)}});
test('Add-apartment form offers required Qatar address fields',()=>{
 run("data.page='dashboard';data.showPropertyForm=true;render()");
 const html=el('app').innerHTML;
 for(const id of ['property-type','property-building','property-street','property-zone','property-unit'])assert.match(html,new RegExp('id="'+id+'"'));
});
test('Custom apartment is available in selector and saved locally',()=>{
 run("data.properties.push({id:'tester-villa',name:'Tester villa',type:'Villa',building:'21',street:'300',zone:'56',unit:''});data.propertyId='tester-villa';persist();render()");
 assert.match(el('app').innerHTML,/Tester villa/);
 assert.match(el('app').innerHTML,/Zone 56/);
 assert.match(storage.get('moveproof-qatar-prototype-v1'),/tester-villa/);
 run("data.propertyId='al-sadd';data.showPropertyForm=false;render()");
});
test('Full-photo viewer and uncropped records are wired',()=>{
 const html=fs.readFileSync(path.join(__dirname,'app/src/main/assets/index.html'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'app/src/main/assets/styles.css'),'utf8');
 assert.match(html,/id="photo-dialog"/);
 assert.match(css,/\.record-preview img\{height:100%;width:100%;object-fit:contain\}/);
});
test('New inspection creates draft',()=>{run("data.drafts=[];data.draft=null;data.type='move-in';startNew()");assert.equal(run('data.page'),'rooms');assert.equal(run('data.draft.selected.length'),1);assert.equal(run('data.drafts.length'),1)});
test('Starting another inspection preserves previous draft',()=>{
 const firstId=run('data.draft.id');
 run("data.type='move-out';startNew()");
 assert.equal(run('data.drafts.length'),2);
 assert.ok(run('data.draft.id')!==firstId);
 assert.ok(run('data.drafts').some(d=>d.id===firstId));
});
test('Drafts page lists two resumable and individually deletable drafts',()=>{
 run("nav('drafts')");const html=el('app').innerHTML;
 assert.equal((html.match(/data-a="resume-draft"/g)||[]).length,2);
 assert.equal((html.match(/data-a="delete-draft"/g)||[]).length,2);
});
test('Resuming first draft does not remove second',()=>{
 const first=run('data.drafts[0].id');
 run(`resumeDraft('${first}')`);
 assert.equal(run('data.draft.id'),first);
 assert.equal(run('data.drafts.length'),2);
});
test('Draft deletion requires explicit in-app confirmation, with Cancel as the default',()=>{
 const second=run('data.drafts[1].id');
 run(`deleteDraft('${second}')`);
 assert.equal(el('confirm-dialog').open,true);
 assert.match(el('confirm-description').textContent,/cannot be undone/);
 assert.equal(run('data.drafts.length'),2);
 el('confirm-cancel').handlers.click();
 assert.equal(el('confirm-dialog').open,false);
 assert.equal(run('data.drafts.length'),2);
 run(`deleteDraft('${second}')`);
 el('confirm-accept').handlers.click();
 assert.equal(run('data.drafts.length'),1);
 assert.notEqual(run('data.drafts[0].id'),second);
});
test('Dashboard simplifies heading and provides Learn More',()=>{
 run("nav('dashboard')");const html=el('app').innerHTML;
 assert.match(html,/Your inspection workspace/);
 assert.match(html,/data-a="learn-more"/);
 assert.doesNotMatch(html,/Protect the details that matter|PROPERTY CONDITION LOG/);
});
test('Learn More explains operation and local storage',()=>{run("nav('learn-more')");assert.match(el('app').innerHTML,/Inspect rooms and items/);assert.match(el('app').innerHTML,/does not provide cloud backup/)});

test('Condition required for finishing',()=>assert.equal(run('checkDraft().canFinish'),false));
test('Condition description field remains after editing',()=>{run("data.selectedKey='Bedroom::Wardrobe';data.draft.details['Bedroom::Wardrobe']={condition:'',description:'Loose door',notes:'',photo:null};nav('condition')");assert.match(el('app').innerHTML,/Loose door/)});
test('Damaged without photo is blocked',()=>{run("data.selectedKey='Bedroom::Wardrobe';detail().condition='Damaged';detail().photo=null;detail().ack=false;");assert.equal(run('checkDraft().missing.length'),1);assert.equal(run('checkDraft().canFinish'),false)});
test('Missing photo acknowledgment unblocks',()=>{run("ack('Bedroom::Wardrobe')");assert.equal(run('checkDraft().canFinish'),true);assert.equal(run('data.draft.details["Bedroom::Wardrobe"].ack'),true)});
test('Filling incomplete custom item blocks',()=>{run("data.draft.selected.push('Bedroom::Mirror')");assert.equal(run('checkDraft().canFinish'),false)});
test('Completing all selected items unblocks',()=>{run("data.draft.details['Bedroom::Mirror']={condition:'Good',notes:'',photo:null,ack:false}");assert.equal(run('checkDraft().canFinish'),true)});
test('Save draft persists to local storage',()=>{run('persist()');assert.ok(storage.has('moveproof-qatar-prototype-v1'))});
test('Finishing creates a new inspection record',()=>{const before=run('data.records.length');run('finish()');assert.equal(run('data.records.length'),before+1);assert.equal(run('data.draft'),null)});
test('Condition description is stored on a completed record',()=>{const r=run('data.records[data.records.length-1]');assert.ok(r.items.some(x=>x.description!==undefined))});
test('One genuine record does not claim a comparison',()=>{run("data.recordsProperty='al-sadd';data.recordsItem='Bedroom::Wardrobe';nav('record-detail')");assert.doesNotMatch(el('app').innerHTML,/Comparison available/);assert.match(el('app').innerHTML,/No move-out record/);assert.match(el('app').innerHTML,/No photo attached/)});
test('Unlinked legacy move-out never creates an unverified comparison',()=>{run("data.records.push({id:'real-out',propertyId:'al-sadd',type:'move-out',date:new Date().toISOString(),items:[{key:'Bedroom::Wardrobe',room:'Bedroom',name:'Wardrobe',condition:'Good',photo:null}]});nav('record-detail')");assert.doesNotMatch(el('app').innerHTML,/Comparison available/);assert.match(el('app').innerHTML,/rental periods are not confirmed/) });
test('No-record state appears',()=>{run("data.recordsItem='Bedroom::AC';nav('record-detail')");assert.match(el('app').innerHTML,/No record available/)});
test('Property-first history and item navigation are rendered separately',()=>{
 run("data.recordsProperty='al-sadd';nav('record-properties')");
 assert.match(el('app').innerHTML,/Choose a property/);
 assert.doesNotMatch(el('app').innerHTML,/id="rec-item"/);
 run("data.recordsRoom='Bedroom';nav('record-items')");
 assert.match(el('app').innerHTML,/Choose a room and item/);
 assert.match(el('app').innerHTML,/Wardrobe/);
 assert.match(el('app').innerHTML,/data-a="choose-record-item"/);
});
test('Every recorded version remains visible, not just latest',()=>{
 run("data.records.push({id:'older-in',propertyId:'al-sadd',type:'move-in',date:'2026-09-01T12:00:00Z',items:[{key:'Bedroom::Wardrobe',room:'Bedroom',name:'Wardrobe',condition:'Unsure'}]});data.recordsItem='Bedroom::Wardrobe';nav('record-detail')");
 assert.match(el('app').innerHTML,/01 Sept 2026/);
 assert.match(el('app').innerHTML,/Unsure/);
 assert.match(el('app').innerHTML,/rental periods are not confirmed/);
});
// Regression tests: Previous Records must contain only completed, recorded evidence.
function withHistory(records, fn){
 const existing=run('data.records');
 ctx.historyFixture=records;
 try{run('data.records=historyFixture');fn()}
 finally{ctx.historyFixture=existing;run('data.records=historyFixture');delete ctx.historyFixture}
}
const makeRecord=(id,propertyId,items,type='move-in')=>({id,propertyId,type,date:'2026-11-01T12:00:00Z',demo:false,items});
const makeItem=(key,condition='Good')=>({key,condition,photo:null,description:'Test condition'});
test('Previous Records shows a helpful empty state when no inspections are saved',()=>withHistory([],()=>{
 run("nav('record-properties')");const html=el('app').innerHTML;
 assert.match(html,/No saved inspections yet/);
 assert.doesNotMatch(html,/data-a="choose-record-property"|0 saved inspections/);
}));
test('Only properties with a genuinely recorded item appear in Previous Records',()=>withHistory([
 makeRecord('one','al-sadd',[makeItem('Bedroom::Wardrobe')]),
 makeRecord('unrecorded','west-bay',[]),
 makeRecord('condition-empty','tester-villa',[makeItem('Kitchen::Wall','')]),
],()=>{
 run("nav('record-properties')");const html=el('app').innerHTML;
 assert.match(html,/Al Sadd Apartment/);
 assert.doesNotMatch(html,/West Bay Apartment|Tester villa|0 saved inspections/);
 assert.equal((html.match(/data-a="choose-record-property"/g)||[]).length,1);
 assert.match(html,/1 saved inspection/);
}));
test('Only recorded rooms and items are shown, retaining expandable room controls',()=>withHistory([
 makeRecord('one','al-sadd',[makeItem('Bedroom::Wardrobe')]),
 makeRecord('two','al-sadd',[makeItem('Bedroom::Wardrobe'),makeItem('Bedroom::AC','')],'move-out'),
 makeRecord('other-property','west-bay',[makeItem('Kitchen::Countertop')]),
],()=>{
 run("data.recordsProperty='al-sadd';data.recordsRoom='';nav('record-items')");
 let html=el('app').innerHTML;
 assert.match(html,/Bedroom/);
 assert.match(html,/1 awaiting move-out/);
 assert.equal((html.match(/data-a="toggle-record-room"/g)||[]).length,1);
 assert.doesNotMatch(html,/(<strong>Kitchen<\/strong>|<strong>Living Room<\/strong>|0 items recorded)/);
 run("data.recordsRoom='Bedroom';render()");html=el('app').innerHTML;
 assert.match(html,/data-a="choose-record-item" data-v="Bedroom::Wardrobe"/);
 assert.doesNotMatch(html,/data-v="Bedroom::AC"|data-v="Bedroom::Wall"|No record yet/);
 assert.equal((html.match(/data-a="choose-record-item"/g)||[]).length,1);
 assert.match(html,/2 records/);
}));
test('Recorded custom items and custom rooms remain accessible',()=>withHistory([
 makeRecord('custom','al-sadd',[makeItem('Balcony::Railing'),makeItem('Bedroom::Custom shelf')]),
],()=>{
 run("data.recordsProperty='al-sadd';data.recordsRoom='Balcony';nav('record-items')");let html=el('app').innerHTML;
 assert.match(html,/Balcony/);
 assert.match(html,/Railing/);
 assert.doesNotMatch(html,/0 item/);
 run("data.recordsRoom='Bedroom';render()");html=el('app').innerHTML;
 assert.match(html,/Custom shelf/);
 assert.doesNotMatch(html,/Wardrobe|Bedroom::AC/);
}));
test('Direct navigation to an unrecorded property or item still gives an empty state',()=>withHistory([
 makeRecord('one','al-sadd',[makeItem('Bedroom::Wardrobe')]),
],()=>{
 run("data.recordsProperty='west-bay';nav('record-items')");assert.match(el('app').innerHTML,/No recorded items available/);
 run("data.recordsProperty='al-sadd';data.recordsItem='Bedroom::AC';nav('record-detail')");assert.match(el('app').innerHTML,/No record available/);
}));
test('Legacy single draft migrates into collection on reload',()=>{
 const existing={properties:[{id:'al-sadd',name:'Al Sadd Apartment'}],draft:{id:'legacy-draft',propertyId:'al-sadd',type:'move-in',startedAt:'2026-10-01',selected:['Bedroom::Wardrobe'],custom:[],details:{'Bedroom::Wardrobe':{condition:'Good',description:'Still intact'}}},records:[]};
 const migrationStorage=new Map([['moveproof-qatar-prototype-v1',JSON.stringify(existing)]]);
 const legacyCtx={...ctx,window:{...ctx.window},localStorage:{getItem:k=>migrationStorage.get(k)||null,setItem:(k,v)=>migrationStorage.set(k,v)}};
 legacyCtx.globalThis=legacyCtx;
 vm.runInContext(code,vm.createContext(legacyCtx));
 const persisted=JSON.parse(migrationStorage.get('moveproof-qatar-prototype-v1'));
 assert.equal(persisted.drafts.length,1);
 assert.equal(persisted.drafts[0].details['Bedroom::Wardrobe'].description,'Still intact');
});
test('Legacy 2025 demo records are removed on upgrade without deleting real inspections',()=>{
 const legacy={properties:[{id:'al-sadd',name:'Al Sadd Apartment'}],propertyId:'al-sadd',records:[
  {id:'sample-in',demo:true,propertyId:'al-sadd',type:'move-in',date:'2025-03-12',items:[]},
  {id:'sample-out',demo:true,propertyId:'al-sadd',type:'move-out',date:'2025-08-15',items:[]},
  {id:'my-real-2026',demo:false,propertyId:'al-sadd',type:'move-in',date:'2026-10-31',items:[{key:'Bedroom::Wardrobe',room:'Bedroom',name:'Wardrobe',condition:'Good',photo:null}]}
 ]};
 const migrationStorage=new Map([['moveproof-qatar-prototype-v1',JSON.stringify(legacy)]]);
 const legacyCtx={...ctx,window:{...ctx.window},localStorage:{getItem:k=>migrationStorage.get(k)||null,setItem:(k,v)=>migrationStorage.set(k,v)}};
 legacyCtx.globalThis=legacyCtx;
 const legacyVM=vm.createContext(legacyCtx);
 vm.runInContext(code,legacyVM);
 const clean=JSON.parse(migrationStorage.get('moveproof-qatar-prototype-v1'));
 assert.equal(clean.records.length,1);
 assert.equal(clean.records[0].id,'my-real-2026');
 assert.equal(vm.runInContext('data.records.length',legacyVM),1);
 assert.doesNotMatch(el('app').innerHTML,/Comparison available|2025/);
});
// Migration tests instantiate a second VM with the mock DOM. Restore the primary
// VM's modal handlers before interacting with the original app instance.
el('confirm-accept').handlers.click=()=>run('executeDeletion()');
el('confirm-cancel').handlers.click=()=>run('confirmDialog.close()');
// v0.6 regression tests: home navigation, linked move-outs, native Gallery video.
test('Every secondary screen has immediate Main Menu access',()=>{
 for(const page of ['rooms','condition','review','drafts','learn-more','record-properties','record-items','record-detail','completed']){
   if(['rooms','condition','review'].includes(page)&&!run('data.draft'))run("data.propertyId='al-sadd';data.type='move-in';startNew()");
   run(`data.page='${page}';render()`);
   assert.match(el('app').innerHTML,/aria-label="Go directly to main menu"/,`Home not available on ${page}`);
 }
});
test('Finishing an inspection opens a success screen with direct home',()=>{
 run("data.drafts=[];data.draft=null;data.propertyId='west-bay';data.type='move-in';startNew();data.selectedKey='Bedroom::Wardrobe';detail().condition='Good';finish()");
 assert.equal(run('data.page'),'completed');
 assert.match(el('app').innerHTML,/Inspection saved successfully/);
 assert.match(el('app').innerHTML,/Return to Main Menu/);
 assert.match(el('app').innerHTML,/View saved inspection/);
});
test('Leaving an unfinished inspection via Home preserves the draft',()=>{
 run("data.drafts=[];data.draft=null;data.propertyId='al-sadd';data.type='move-in';startNew();detail().condition='Good';nav('dashboard')");
 assert.equal(run('data.drafts.length'),1);
 assert.equal(run('data.draft.details["Bedroom::Wardrobe"].condition'),'Good');
 assert.ok(JSON.parse(storage.get('moveproof-qatar-prototype-v1')).drafts.length===1);
});
test('Move-out progress uses latest move-in and does not count unrelated older move-outs',()=>withHistory([
 {...makeRecord('old-in','al-sadd',[makeItem('Bedroom::Wardrobe')]),date:'2026-01-01T12:00:00Z',rentalPeriodId:'old-period'},
 {...makeRecord('old-out','al-sadd',[makeItem('Bedroom::Wardrobe')],'move-out'),date:'2026-02-01T12:00:00Z',rentalPeriodId:'old-period'},
 {...makeRecord('new-in','al-sadd',[makeItem('Bedroom::Wardrobe'),makeItem('Kitchen::Countertop')]),date:'2026-11-01T12:00:00Z',rentalPeriodId:'new-period'},
],()=>{
 assert.equal(run("moveOutState('al-sadd').missing.length"),2);
 run("data.recordsProperty='al-sadd';nav('record-items')");
 assert.match(el('app').innerHTML,/0\/2/);
 assert.match(el('app').innerHTML,/Document remaining 2 items/);
}));
test('Move-out batch preselects outstanding baseline items including custom items',()=>withHistory([
 {...makeRecord('new-in','al-sadd',[makeItem('Bedroom::Wardrobe'),makeItem('Balcony::Railing')]),rentalPeriodId:'batch-period'},
],()=>{
 run("startMoveOutFromHistory('al-sadd',moveOutState('al-sadd').missing)");
 assert.equal(run('data.page'),'rooms');
 assert.equal(run('data.type'),'move-out');
 assert.equal(run('data.draft.rentalPeriodId'),'batch-period');
 assert.equal(run('data.draft.selected.length'),2);
 assert.ok(run("data.draft.custom.some(it=>it.room==='Balcony'&&it.name==='Railing')"));
 assert.match(el('app').innerHTML,/Balcony/);
}));
test('Single-item move-out opens condition screen with original reference',()=>withHistory([
 {...makeRecord('new-in','al-sadd',[makeItem('Bedroom::Wardrobe','Damaged')]),rentalPeriodId:'one-period'},
],()=>{
 run("data.drafts=[];data.draft=null;startMoveOutFromHistory('al-sadd',['Bedroom::Wardrobe'])");
 assert.equal(run('data.page'),'condition');
 assert.match(el('app').innerHTML,/Recorded at move-in/);
 assert.match(el('app').innerHTML,/Test condition/);
 assert.equal(run('data.draft.type'),'move-out');
}));
test('Finishing linked move-out updates the checklist and comparison state',()=>withHistory([
 {...makeRecord('baseline','al-sadd',[makeItem('Bedroom::Wardrobe'),makeItem('Kitchen::Countertop')]),rentalPeriodId:'lease-123'},
],()=>{
 run("data.drafts=[];data.draft=null;startMoveOutFromHistory('al-sadd',['Bedroom::Wardrobe']);detail().condition='Good';finish()");
 assert.equal(run("moveOutState('al-sadd').done.length"),1);
 assert.equal(run("moveOutState('al-sadd').missing.length"),1);
 assert.equal(run('data.page'),'completed');
 run("data.recordsProperty='al-sadd';data.recordsItem='Bedroom::Wardrobe';nav('record-detail')");
 assert.match(el('app').innerHTML,/Comparison available/);
 assert.doesNotMatch(el('app').innerHTML,/Record move-out condition/);
}));
test('Video evidence attaches as Gallery URI and does not insert video bytes into local storage',()=>{
 run("data.drafts=[];data.draft=null;data.propertyId='al-sadd';data.type='move-in';startNew()");
 run("nav('condition')");
 const draftId=run('data.draft.id');const item='Bedroom::Wardrobe';
 run(`window.moveProofVideoSaved('${draftId}','${item}','content://media/external/video/media/12345')`);
 assert.equal(run('data.draft.details["Bedroom::Wardrobe"].videoUri'),'content://media/external/video/media/12345');
 assert.match(el('app').innerHTML,/Play video/);
 assert.ok(storage.get('moveproof-qatar-prototype-v1').includes('content://media/'));
});
test('Damaged item with saved video counts as visual evidence',()=>{
 run("data.selectedKey='Bedroom::Wardrobe';detail().condition='Damaged';detail().photo=null;detail().videoUri='content://media/external/video/media/123';detail().ack=false");
 assert.equal(run('checkDraft().canFinish'),true);
});
test('Record Video sends the draft and item identifiers to native Android',()=>{
 run("data.drafts=[];data.draft=null;data.propertyId='al-sadd';data.type='move-in';startNew()");
 const calls=[];ctx.window.MoveProofVideo={recordVideo:(draftId,key,autoStart)=>calls.push({draftId,key,autoStart}),openVideo:()=>{}};
 run('launchNativeVideo()');
 assert.equal(calls.length,1);
 assert.equal(calls[0].draftId,run('data.draft.id'));
 assert.equal(calls[0].key,'Bedroom::Wardrobe');
 assert.equal(calls[0].autoStart,false);
 delete ctx.window.MoveProofVideo;
});
test('Long press initiates in-app recorder with immediate recording',()=>{
 const calls=[];ctx.window.MoveProofVideo={recordVideo:(draftId,key,autoStart)=>calls.push({draftId,key,autoStart})};
 run("data.drafts=[];data.draft=null;startNew();launchNativeVideo(true)");
 assert.equal(calls.length,1);
 assert.equal(calls[0].autoStart,true);
 delete ctx.window.MoveProofVideo;
});
test('Unlinking video keeps the original Gallery file untouched',()=>{
 run("data.selectedKey='Bedroom::Wardrobe';nav('condition');detail().videoUri='content://media/external/video/media/555'");
 const bridge={openVideo:()=>{throw Error('Should not delete a video')},recordVideo:()=>{}};
 ctx.window.MoveProofVideo=bridge;
 run("detail().videoUri=null;persist();render()");
 assert.equal(run('detail().videoUri'),null);
 assert.match(el('app').innerHTML,/Record video/);
 delete ctx.window.MoveProofVideo;
});
test('Saved-record card shows a delete button scoped to its own item',()=>withHistory([
 makeRecord('group-in','al-sadd',[makeItem('Bedroom::Wardrobe'),makeItem('Bedroom::AC')]),
],()=>{
 run("data.recordsProperty='al-sadd';data.recordsItem='Bedroom::Wardrobe';nav('record-detail')");
 assert.match(el('app').innerHTML,/data-a="delete-record" data-v="group-in" data-k="Bedroom::Wardrobe"/);
 assert.match(el('app').innerHTML,/Delete this move-in record/);
}));
test('Record deletion prompts and Cancel leaves every saved item untouched',()=>withHistory([
 makeRecord('group-in','al-sadd',[makeItem('Bedroom::Wardrobe'),makeItem('Bedroom::AC')]),
],()=>{
 run("data.recordsProperty='al-sadd';data.recordsItem='Bedroom::Wardrobe';nav('record-detail')");
 run("deleteRecord('group-in','Bedroom::Wardrobe')");
 assert.equal(el('confirm-dialog').open,true);
 assert.match(el('confirm-description').textContent,/Other items in the inspection will remain/);
 assert.equal(run('data.records[0].items.length'),2);
 el('confirm-cancel').handlers.click();
 assert.equal(el('confirm-dialog').open,false);
 assert.equal(run('data.records[0].items.length'),2);
}));
test('Confirmed record deletion removes only chosen entry and keeps others',()=>withHistory([
 makeRecord('group-in','al-sadd',[makeItem('Bedroom::Wardrobe'),makeItem('Bedroom::AC')]),
],()=>{
 run("data.recordsProperty='al-sadd';data.recordsItem='Bedroom::Wardrobe';nav('record-detail')");
 run("deleteRecord('group-in','Bedroom::Wardrobe')");
 el('confirm-accept').handlers.click();
 assert.equal(run('data.records.length'),1);
 assert.equal(run('data.records[0].items.length'),1);
 assert.equal(run("data.records[0].items[0].key"),'Bedroom::AC');
 assert.equal(run('data.page'),'record-items');
 assert.match(storage.get('moveproof-qatar-prototype-v1'),/Bedroom::AC/);
}));
test('Confirmed deletion of final recorded item removes empty inspection and its listing',()=>withHistory([
 makeRecord('only-in','al-sadd',[makeItem('Bedroom::Wardrobe')]),
],()=>{
 run("data.recordsProperty='al-sadd';data.recordsItem='Bedroom::Wardrobe';nav('record-detail')");
 run("deleteRecord('only-in','Bedroom::Wardrobe')");
 el('confirm-accept').handlers.click();
 assert.equal(run('data.records.length'),0);
 run("nav('record-properties')");
 assert.match(el('app').innerHTML,/No saved inspections yet/);
}));
test('Both delete types use a confirmation dialog rather than JS confirm()',()=>{
 const html=fs.readFileSync(path.join(__dirname,'app/src/main/assets/index.html'),'utf8');
 assert.match(html,/id="confirm-dialog"/);
 assert.match(html,/id="confirm-cancel"/);
 assert.match(html,/id="confirm-accept"/);
 assert.doesNotMatch(code,/\bif\(!confirm\(/);
});
test('Video recording is first-party CameraX, saving MP4 to phone Gallery',()=>{
 const java=fs.readFileSync(path.join(__dirname,'app/src/main/java/qa/moveproof/inspection/MainActivity.java'),'utf8');
 const recorder=fs.readFileSync(path.join(__dirname,'app/src/main/java/qa/moveproof/inspection/VideoCaptureActivity.java'),'utf8');
 const manifest=fs.readFileSync(path.join(__dirname,'app/src/main/AndroidManifest.xml'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'app/src/main/assets/index.html'),'utf8');
 const gradle=fs.readFileSync(path.join(__dirname,'app/build.gradle'),'utf8');
 assert.match(java,/new Intent\(this, VideoCaptureActivity\.class\)/);
 assert.doesNotMatch(java,/MediaStore\.ACTION_VIDEO_CAPTURE/);
 assert.match(recorder,/VideoCapture\.withOutput\(recorder\)/);
 assert.match(recorder,/MediaStoreOutputOptions\.Builder/);
 assert.match(recorder,/Environment\.DIRECTORY_MOVIES \+ "\/MoveProof Qatar"/);
 assert.match(recorder,/\.setDurationLimitMillis\(30_000\)/);
 assert.match(manifest,/android:name="\.VideoCaptureActivity" android:exported="false"/);
 assert.match(gradle,/androidx\.camera:camera-video/);
 assert.match(java,/@JavascriptInterface/);
 assert.match(html,/Hold to start video/);
 assert.match(html,/id="camera-shutter"/);
});
test('Uppercase UI labels no longer use excessive letter spacing',()=>{
 const css=fs.readFileSync(path.join(__dirname,'app/src/main/assets/styles.css'),'utf8');
 assert.doesNotMatch(css,/letter-spacing:1\.[3-9]px|letter-spacing:2px/);
});
test('Static camera permission and gallery controls exist',()=>{const main=fs.readFileSync(path.join(__dirname,'app/src/main/java/qa/moveproof/inspection/MainActivity.java'),'utf8');assert.match(main,/RESOURCE_VIDEO_CAPTURE/);assert.match(main,/onShowFileChooser/);assert.match(main,/onRequestPermissionsResult/)});
test('Android targets API 36 with CAMERA permission',()=>{assert.match(fs.readFileSync(path.join(__dirname,'app/build.gradle'),'utf8'),/targetSdk 36/);assert.match(fs.readFileSync(path.join(__dirname,'app/src/main/AndroidManifest.xml'),'utf8'),/android\.permission\.CAMERA/)});
(async()=>{
  try {
    run("startNew();data.selectedKey='Bedroom::Wardrobe';nav('condition')");
    ctx.navigator.mediaDevices={getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})};
    el('camera-video').readyState=4;
    el('camera-video').videoWidth=640;
    el('camera-video').videoHeight=480;
    await run('openCamera()');
    assert.ok(el('camera-dialog').open);
    run('capture()');
    assert.equal(run("data.draft.details['Bedroom::Wardrobe'].photo"),'data:image/jpeg;base64,ZmFrZQ==');
    assert.equal(el('camera-dialog').open,false);
    outputs.push({test:'Simulated JS camera open and photo capture',status:'PASS'});
  } catch (e) { outputs.push({test:'Simulated JS camera open and photo capture',status:'FAIL',error:String(e)}); process.exitCode=1; }
  console.log(outputs.map(x=>`${x.status}: ${x.test}${x.error?' — '+x.error:''}`).join('\n'));
  fs.writeFileSync(path.join(__dirname,'test_results.json'),JSON.stringify({tests:outputs,passed:outputs.filter(x=>x.status==='PASS').length,total:outputs.length,notes:'Source-level and simulated-camera tests, NOT a compiled APK or real Android device test.'},null,2));
})();
