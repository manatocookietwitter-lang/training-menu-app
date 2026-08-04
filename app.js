(()=>{
const STORAGE_KEY='training-menu-maker-v2', LEGACY_KEY='training-menu-maker-v1', HISTORY_KEY='training-menu-history-v1', HISTORY_DB='training-menu-history-db-v1', HISTORY_STORE='images', HISTORY_MIGRATED_KEY='training-menu-history-migrated-v1';
const defaultState={categories:[{id:'cat_basic',name:'基礎'},{id:'cat_knock',name:'ノック'},{id:'cat_footwork',name:'フットワーク'},{id:'cat_game',name:'ゲーム'},{id:'cat_core',name:'体幹'},{id:'cat_other',name:'その他'}],menus:[{id:'menu_1',name:'基礎打ち',categoryId:'cat_basic',seconds:300,requiresSets:true},{id:'menu_2',name:'スマッシュノック',categoryId:'cat_knock',seconds:120,requiresSets:true},{id:'menu_3',name:'フットワーク',categoryId:'cat_footwork',seconds:180,requiresSets:true},{id:'menu_4',name:'ゲーム練習',categoryId:'cat_game',seconds:480,requiresSets:true},{id:'menu_5',name:'体幹トレーニング',categoryId:'cat_core',seconds:600,requiresSets:false},{id:'menu_6',name:'休憩',categoryId:'cat_other',seconds:300,requiresSets:false}],history:[]};
const $=id=>document.getElementById(id);
let state=loadState();
let currentScreen='home';
let createCategory='all';
let listCategory='all';
let selectedMenuIds=[];
let selectedPeople=[4,5];
let currentSheetTitle='春練メニュー';
let setPlan=[];
let addCategoryId=state.categories[0]?.id||'';
let editingMenuId=null;
let deleteTargetId=null;
let reorderMode=false;
let historyObjectUrls=[];
let historyRenderToken=0;
let lastImageDataUrl='';
let lastHistoryDataUrl='';
let lastHistoryBlob=null;
let lastHistoryType='image/jpeg';
let lastImageTitle='';

migrateState();
function uid(p){return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`}
function clone(o){return JSON.parse(JSON.stringify(o))}
function loadLocalHistory(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY))||[]}catch(e){return[]}}
function openHistoryDB(){return new Promise((resolve,reject)=>{if(!('indexedDB' in window)){reject(new Error('IndexedDB unsupported'));return}const req=indexedDB.open(HISTORY_DB,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(HISTORY_STORE))db.createObjectStore(HISTORY_STORE,{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function txStore(db,mode='readonly'){return db.transaction(HISTORY_STORE,mode).objectStore(HISTORY_STORE)}
function dataURLToBlob(dataUrl){const parts=String(dataUrl).split(','),meta=parts[0]||'',bin=atob(parts[1]||''),mime=(meta.match(/data:(.*?);base64/)||[])[1]||'image/png',u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);return new Blob([u8],{type:mime})}
function blobToObjectUrl(blob){return URL.createObjectURL(blob)}function revokeHistoryObjectUrls(){historyObjectUrls.forEach(url=>URL.revokeObjectURL(url));historyObjectUrls=[]}
function historyExt(item){const type=item?.type||item?.blob?.type||String(item?.dataUrl||'').match(/^data:(.*?);/)?.[1]||'image/png';return type.includes('jpeg')||type.includes('jpg')?'jpg':'png'}
async function getHistoryRecords(){try{const db=await openHistoryDB();return await new Promise((resolve,reject)=>{const req=txStore(db).getAll();req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)));req.onerror=()=>reject(req.error)})}catch(e){console.warn('IndexedDB履歴を読めませんでした。localStorage履歴にフォールバックします。',e);return loadLocalHistory().map(item=>({...item,type:String(item.dataUrl||'').match(/^data:(.*?);/)?.[1]||'image/png',blob:null}))}}
async function putHistoryRecord(item){try{const db=await openHistoryDB();await new Promise((resolve,reject)=>{const req=txStore(db,'readwrite').put(item);req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error)});return true}catch(e){console.error(e);alert('履歴を保存できませんでした。ブラウザの保存容量・設定を確認してください。');return false}}
async function deleteHistoryRecord(id){try{const db=await openHistoryDB();await new Promise((resolve,reject)=>{const req=txStore(db,'readwrite').delete(id);req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error)});return true}catch(e){console.error(e);return false}}
async function migrateHistoryToIDB(){try{if(localStorage.getItem(HISTORY_MIGRATED_KEY)==='1')return;const old=loadLocalHistory();if(!old.length){localStorage.setItem(HISTORY_MIGRATED_KEY,'1');return}for(const item of old){if(item&&item.dataUrl){const saved=await putHistoryRecord({id:item.id||uid('hist'),title:item.title||'メニュー表',createdAt:item.createdAt||new Date().toISOString(),type:String(item.dataUrl).match(/^data:(.*?);/)?.[1]||'image/png',blob:dataURLToBlob(item.dataUrl)});if(!saved)return}}localStorage.setItem(HISTORY_MIGRATED_KEY,'1')}catch(e){console.warn('履歴移行に失敗しました',e)}}
function loadState(){try{const loaded=JSON.parse(localStorage.getItem(STORAGE_KEY))||JSON.parse(localStorage.getItem(LEGACY_KEY))||clone(defaultState);loaded.history=[];return loaded}catch(e){const st=clone(defaultState);st.history=[];return st}}
function saveState(){try{const copy={...state,history:[]};localStorage.setItem(STORAGE_KEY,JSON.stringify(copy));return true}catch(e){console.error(e);alert('メニュー情報を保存できませんでした。ブラウザの保存容量・設定を確認してから再試行してください。');return false}}
function mutateAndSave(mutator){
  const previous={categories:clone(state.categories),menus:clone(state.menus)};
  mutator();
  if(saveState())return true;
  state.categories=previous.categories;
  state.menus=previous.menus;
  return false;
}
function migrateState(){let changed=false;if(!Array.isArray(state.categories)){state.categories=clone(defaultState.categories);changed=true}if(!Array.isArray(state.menus)){state.menus=clone(defaultState.menus);changed=true}if(!Array.isArray(state.history)){state.history=[];changed=true}state.menus.forEach((m,i)=>{if(m.seconds===undefined){m.seconds=Number(m.minutes||0)*60;changed=true}delete m.minutes;if(m.requiresSets===undefined){m.requiresSets=true;changed=true}if(m.order===undefined){m.order=i;changed=true}});if(changed)saveState();migrateHistoryToIDB().then(renderHistoryScreen)}
function showScreen(name){const prev=currentScreen,dir=slideDirection(prev,name);currentScreen=name;if(name!=='history'){historyRenderToken+=1;revokeHistoryObjectUrls()}document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active','slide-forward','slide-back'));$(`screen-${name}`).classList.add('active',dir==='back'?'slide-back':'slide-forward');closeDropdowns();if(name==='create')renderCreateScreen();if(name==='sets')renderSetScreen();if(name==='add')renderAddScreen();if(name==='list')renderListScreen();if(name==='history')renderHistoryScreen();if(name==='categories')renderCategoryListScreen()}function slideDirection(from,to){const o={home:0,create:1,add:1,list:1,categories:1,history:1,sets:2};return(o[to]??0)<(o[from]??0)?'back':'forward'}function categoryName(id){return state.categories.find(c=>c.id===id)?.name||'未分類'}function findMenu(id){return state.menus.find(m=>m.id===id)}function categoryIndex(id){const i=state.categories.findIndex(c=>c.id===id);return i<0?999:i}function sortedMenus(menus){return menus.slice().sort((a,b)=>categoryIndex(a.categoryId)-categoryIndex(b.categoryId)||(a.order??0)-(b.order??0)||a.name.localeCompare(b.name,'ja'))}function escapeHTML(str){return String(str).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]))}function formatSeconds(sec){const t=Math.max(0,Math.round(Number(sec)||0)),m=Math.floor(t/60),s=t%60;return `${m}分 ${s}秒`}function closeDropdowns(){document.querySelectorAll('.drop-panel').forEach(p=>p.classList.remove('open'))}
function renderCategoryChips(el,selected,onPick,includeAll=false){el.innerHTML='';if(includeAll)addChip(el,'すべて',selected==='all',()=>onPick('all'));state.categories.forEach(c=>addChip(el,c.name,selected===c.id,()=>onPick(c.id)))}function addChip(el,text,active,fn){const b=document.createElement('button');b.className='chip'+(active?' active':'');b.textContent=text;b.addEventListener('click',fn);el.appendChild(b)}
function renderCategoryPanel(){
  const panel=$('addCategoryPanel');
  panel.innerHTML='';
  state.categories.forEach(category=>{
    const button=document.createElement('button');
    button.className='drop-item'+(addCategoryId===category.id?' active':'');
    button.innerHTML=`<span>${escapeHTML(category.name)}</span>${addCategoryId===category.id?'<span>✓</span>':''}`;
    button.addEventListener('click',()=>{
      addCategoryId=category.id;
      closeDropdowns();
      renderAddScreen();
    });
    panel.appendChild(button);
  });
  const addButton=document.createElement('button');
  addButton.className='drop-item add-new';
  addButton.textContent='＋新規追加';
  addButton.addEventListener('click',()=>{
    const name=prompt('新しい分類名を入力してください');
    if(!name?.trim())return;
    const category={id:uid('cat'),name:name.trim()};
    if(!mutateAndSave(()=>state.categories.push(category)))return;
    addCategoryId=category.id;
    closeDropdowns();
    renderAddScreen();
  });
  panel.appendChild(addButton);
}
function renderCreateScreen(){renderCategoryChips($('createCategoryChips'),createCategory,id=>{createCategory=id;renderCreateScreen()},true);const list=$('menuSelectList'),menus=sortedMenus(state.menus.filter(m=>createCategory==='all'||m.categoryId===createCategory));list.innerHTML='';if(!menus.length){list.innerHTML='<div class="empty">この分類にはメニューがありません</div>';return}menus.forEach(menu=>{const order=selectedMenuIds.indexOf(menu.id)+1,selected=order>0,row=document.createElement('button');row.className='menu-row';row.innerHTML=`<span class="select-mark ${selected?'selected':''}">${selected?order:''}</span><span><span class="row-name">${escapeHTML(menu.name)}</span><span class="row-meta">${categoryName(menu.categoryId)} / ${menu.seconds}秒 / ${menu.requiresSets?'1set・1人':'固定時間'}</span></span>${menu.requiresSets?'':'<span class="fixed-pill">セットなし</span>'}`;row.addEventListener('click',()=>toggleSelect(menu.id));list.appendChild(row)})}function toggleSelect(id){const i=selectedMenuIds.indexOf(id);i>=0?selectedMenuIds.splice(i,1):selectedMenuIds.push(id);renderCreateScreen()}
function startSetSelection(){if(!selectedMenuIds.length){alert('メニューを1つ以上選択してください');return}currentSheetTitle=$('sheetTitle').value.trim()||'メニュー表';setPlan=selectedMenuIds.map(id=>{const menu=findMenu(id),old=setPlan.find(r=>r.menuId===id),sets=old?.sets||{};return{menuId:id,sets:{1:sets[1]??old?.sets1??(menu.requiresSets?1:0),2:sets[2]??old?.sets2??(menu.requiresSets?1:0),3:sets[3]??old?.sets3??(menu.requiresSets?1:0),4:sets[4]??old?.sets4??(menu.requiresSets?1:0),5:sets[5]??old?.sets5??(menu.requiresSets?1:0)}}});showScreen('sets')}
function renderPeopleSelect(){const el=$('peopleSelect');el.innerHTML='';[1,2,3,4,5].forEach(p=>{const active=selectedPeople.includes(p),disabled=!active&&selectedPeople.length>=2,b=document.createElement('button');b.className='chip'+(active?' active':'')+(disabled?' disabled':'');b.textContent=`${p}人`;b.addEventListener('click',()=>{if(active){selectedPeople=selectedPeople.filter(x=>x!==p)}else{if(disabled)return;selectedPeople.push(p)}selectedPeople=selectedPeople.sort((a,b)=>a-b);renderSetScreen()});el.appendChild(b)})}
function renderSetScreen(){
  selectedPeople=selectedPeople.slice().sort((a,b)=>a-b);renderPeopleSelect();$('setSheetTitle').textContent=currentSheetTitle;
  $('setHead').innerHTML=`<tr><th>メニュー</th>${selectedPeople.map(p=>`<th>${p}人</th>`).join('')}</tr>`;
  const tbody=$('setRows');tbody.innerHTML='';
  setPlan.forEach((row,i)=>{const menu=findMenu(row.menuId);if(!menu)return;const tr=document.createElement('tr');if(menu.requiresSets){tr.innerHTML=`<td><div class="set-name">${i+1}. ${escapeHTML(menu.name)}<small>${menu.seconds}秒 / 1set・1人</small></div></td>`+selectedPeople.map(p=>`<td>${stepperHTML(i,p,getSets(row,p))}</td>`).join('')}else{tr.innerHTML=`<td><div class="set-name">${i+1}. ${escapeHTML(menu.name)}<small>固定時間 ${menu.seconds}秒</small></div></td>`+(selectedPeople.length?`<td colspan="${selectedPeople.length}"><span class="fixed-pill">セット数なし</span></td>`:'')}tbody.appendChild(tr)});
  tbody.querySelectorAll('[data-step]').forEach(btn=>btn.addEventListener('click',()=>{const i=Number(btn.dataset.index),p=btn.dataset.person,delta=Number(btn.dataset.step);setPlan[i].sets[p]=Math.max(0,getSets(setPlan[i],p)+delta);renderSetScreen()}));
  const t=calcTotals(),exportBtn=$('exportImageBtn');
  if(t.noPeople){$('setTotalsLine').innerHTML='<span>未選択</span>';$('totalTime').textContent='0分 0秒';$('totalNote').textContent='';$('statusBox').className='status ng';$('statusBox').textContent='選択されていません';if(exportBtn)exportBtn.disabled=true;return}
  if(exportBtn)exportBtn.disabled=false;
  $('setTotalsLine').innerHTML=selectedPeople.map(p=>`<span>${p}人：<b>${t.byPerson[p].peopleSets}</b> 人set</span>`).join('');
  $('totalTime').innerHTML=selectedPeople.map(p=>`<span>${p}人：<b>${formatSeconds(t.byPerson[p].seconds)}</b></span>`).join(' / ');
  const box=$('statusBox');
  if(t.mismatch){$('totalNote').textContent='人数パターンごとに、メニュー別の人setが一致していません。';box.className='status ng';box.textContent='注意：メニューごとの練習量が一致していません。'}else{$('totalNote').textContent='';box.className='status ok';box.textContent='出力可'}
}
function getSets(row,p){return Number(row.sets?.[p]??0)}
function stepperHTML(index,person,value){return `<span class="stepper"><button data-step="-1" data-index="${index}" data-person="${person}">−</button><span>${value} set</span><button data-step="1" data-index="${index}" data-person="${person}">＋</button></span>`}
function calculateTotals(people,plan,menus){
  if(!people.length)return{byPerson:{},mismatch:false,noPeople:true};
  const menuById=new Map(menus.map(menu=>[menu.id,menu]));
  const byPerson={},mismatchMenus=[];
  people.forEach(person=>byPerson[person]={rawSets:0,peopleSets:0,seconds:0});
  plan.forEach(row=>{
    const menu=menuById.get(row.menuId);
    if(!menu)return;
    if(menu.requiresSets){
      const peopleSets=people.map(person=>getSets(row,person)*person);
      if(peopleSets.some(value=>value!==peopleSets[0]))mismatchMenus.push(menu.name);
      people.forEach(person=>{
        const sets=getSets(row,person);
        byPerson[person].rawSets+=sets;
        byPerson[person].peopleSets+=sets*person;
        byPerson[person].seconds+=menu.seconds*sets*person;
      });
    }else{
      people.forEach(person=>byPerson[person].seconds+=menu.seconds);
    }
  });
  return{byPerson,mismatch:mismatchMenus.length>0,mismatchMenus,noPeople:false};
}
function calcTotals(){return calculateTotals(selectedPeople,setPlan,state.menus)}
function setFixedSwitch(on){$('fixedSwitch').classList.toggle('on',!!on)}
function fixedMode(){return $('fixedSwitch').classList.contains('on')}
function updateTimeLabel(){$('timeLabel').textContent=fixedMode()?'時間（秒・固定）':'時間（秒 / 1set・1人）'}
function resetAddForm(){
  editingMenuId=null;
  $('menuName').value='';
  $('menuSeconds').value='';
  addCategoryId=state.categories[0]?.id||'';
  setFixedSwitch(false);
  updateTimeLabel();
}
function renderAddScreen(){
  const editing=editingMenuId?findMenu(editingMenuId):null;
  $('addTitle').textContent=editing?'メニュー編集':'メニュー追加';
  if(editing){
    $('menuName').value=editing.name;
    $('menuSeconds').value=editing.seconds;
    addCategoryId=editing.categoryId;
    setFixedSwitch(!editing.requiresSets);
  }
  $('addCategoryText').textContent=categoryName(addCategoryId)||'分類を選択';
  renderCategoryPanel();
  updateTimeLabel();
}
function saveMenu(){
  const name=$('menuName').value.trim();
  const seconds=Number($('menuSeconds').value);
  if(!name)return alert('名前を入力してください');
  if(!addCategoryId)return alert('分類を選択してください');
  if(!Number.isFinite(seconds)||seconds<0)return alert('時間を秒で入力してください');
  const data={name,categoryId:addCategoryId,seconds,requiresSets:!fixedMode()};
  const menuId=editingMenuId;
  const editingMenu=menuId?findMenu(menuId):null;
  if(menuId&&!editingMenu)return alert('編集対象のメニューが見つかりません。画面を開き直してください。');
  const saved=mutateAndSave(()=>{
    if(editingMenu)Object.assign(editingMenu,data);
    else state.menus.push({id:uid('menu'),order:state.menus.length,...data});
  });
  if(!saved)return;
  resetAddForm();
  showScreen('list');
}
function renderCategoryListScreen(){
  const list=$('categoryList');
  list.innerHTML='';
  const addButton=document.createElement('button');
  addButton.className='list-card add-list-card';
  addButton.innerHTML='<div><h3>＋ 分類を追加</h3><p>新しい分類を一覧に追加します</p></div><div class="chevron">›</div>';
  addButton.addEventListener('click',addCategoryFromList);
  list.appendChild(addButton);
  state.categories.forEach(category=>{
    const used=state.menus.filter(menu=>menu.categoryId===category.id).length;
    const card=document.createElement('div');
    card.className='list-card';
    card.innerHTML=`<div><h3>${escapeHTML(category.name)}</h3><p>登録メニュー：${used}件</p></div><div class="list-actions"><button class="mini-btn" data-cat-edit="${category.id}">編集</button><button class="mini-btn delete" data-cat-delete="${category.id}">消去</button></div>`;
    list.appendChild(card);
  });
  list.querySelectorAll('[data-cat-edit]').forEach(button=>button.addEventListener('click',()=>editCategory(button.dataset.catEdit)));
  list.querySelectorAll('[data-cat-delete]').forEach(button=>button.addEventListener('click',()=>deleteCategory(button.dataset.catDelete)));
}
function addCategoryFromList(){
  const name=prompt('新しい分類名を入力してください');
  if(!name?.trim())return;
  const category={id:uid('cat'),name:name.trim()};
  if(!mutateAndSave(()=>state.categories.push(category)))return;
  addCategoryId=category.id;
  renderCategoryListScreen();
  renderCreateScreen();
  renderListScreen();
}
function editCategory(id){
  const category=state.categories.find(item=>item.id===id);
  if(!category)return;
  const name=prompt('分類名を編集してください',category.name);
  if(!name?.trim())return;
  if(!mutateAndSave(()=>{category.name=name.trim()}))return;
  renderCategoryListScreen();
  renderCreateScreen();
  renderListScreen();
}
function deleteCategory(id){
  const category=state.categories.find(item=>item.id===id);
  if(!category)return;
  const used=state.menus.filter(menu=>menu.categoryId===id).length;
  if(used>0){alert('この分類にはメニューが登録されているため消去できません。');return}
  if(!confirm(`「${category.name}」を消去しますか？`))return;
  if(!mutateAndSave(()=>{state.categories=state.categories.filter(item=>item.id!==id)}))return;
  if(addCategoryId===id)addCategoryId=state.categories[0]?.id||'';
  if(createCategory===id)createCategory='all';
  if(listCategory===id)listCategory='all';
  renderCategoryListScreen();
  renderCreateScreen();
  renderListScreen();
}
async function renderHistoryScreen(){const token=++historyRenderToken,list=$('historyList');if(!list)return;revokeHistoryObjectUrls();list.innerHTML='<div class="empty">読み込み中...</div>';const hist=await getHistoryRecords();if(token!==historyRenderToken)return;state.history=hist.map(({blob,...rest})=>rest);list.innerHTML='';if(!hist.length){list.innerHTML='<div class="empty">履歴がありません<br>画像出力後に「履歴に追加」を押してください</div>';return}hist.slice().reverse().forEach(item=>{const imgUrl=item.blob?blobToObjectUrl(item.blob):item.dataUrl;if(item.blob)historyObjectUrls.push(imgUrl);const card=document.createElement('div');card.className='history-card';card.innerHTML=`<img src="${imgUrl}" alt="${escapeHTML(item.title)}"><div><h3>${escapeHTML(item.title)}</h3><p>${new Date(item.createdAt).toLocaleString('ja-JP')}</p><div class="list-actions"><button class="mini-btn" data-history-save="${item.id}">保存</button><button class="mini-btn delete" data-history-delete="${item.id}">消去</button></div></div>`;list.appendChild(card)});list.querySelectorAll('[data-history-save]').forEach(b=>b.addEventListener('click',()=>downloadHistoryImage(b.dataset.historySave)));list.querySelectorAll('[data-history-delete]').forEach(b=>b.addEventListener('click',()=>deleteHistoryImage(b.dataset.historyDelete)))}
async function addHistoryImage(){if(!lastImageDataUrl)return;const blob=lastHistoryBlob||dataURLToBlob(lastHistoryDataUrl||lastImageDataUrl);const item={id:uid('hist'),title:lastImageTitle||currentSheetTitle||'メニュー表',createdAt:new Date().toISOString(),type:blob.type||lastHistoryType||'image/jpeg',blob};if(await putHistoryRecord(item)){await renderHistoryScreen();alert('履歴に追加しました')}}
async function downloadHistoryImage(id){const hist=await getHistoryRecords();const item=hist.find(h=>h.id===id);if(!item)return;const objectUrl=item.blob?blobToObjectUrl(item.blob):'',a=document.createElement('a');a.href=objectUrl||item.dataUrl;a.download=`${item.title||'training-menu'}.${historyExt(item)}`;a.click();if(objectUrl)setTimeout(()=>URL.revokeObjectURL(objectUrl),1000)}
async function deleteHistoryImage(id){if(!confirm('この履歴画像を消去しますか？'))return;await deleteHistoryRecord(id);await renderHistoryScreen()}
function renderListScreen(){
  renderCategoryChips($('categoryChips'),listCategory,id=>{listCategory=id;renderListScreen()},true);
  const toggle=$('reorderToggle');
  toggle.textContent=reorderMode?'完了':'並び替え';
  toggle.classList.toggle('active',reorderMode);
  const list=$('menuList');
  const menus=sortedMenus(state.menus.filter(menu=>listCategory==='all'||menu.categoryId===listCategory));
  list.innerHTML='';
  if(!menus.length){list.innerHTML='<div class="empty">メニューがありません</div>';return}
  menus.forEach(menu=>{
    const card=document.createElement('div');
    const mode=menu.requiresSets?`${menu.seconds}秒 / 1set・1人`:`${menu.seconds}秒 / 固定時間`;
    const siblings=sortedMenus(state.menus.filter(item=>item.categoryId===menu.categoryId));
    const position=siblings.findIndex(item=>item.id===menu.id);
    const actions=reorderMode
      ? `<button class="mini-btn move-btn" data-menu-move="${menu.id}" data-direction="-1" aria-label="上へ移動" ${position===0?'disabled':''}>↑</button><button class="mini-btn move-btn" data-menu-move="${menu.id}" data-direction="1" aria-label="下へ移動" ${position===siblings.length-1?'disabled':''}>↓</button>`
      : `<button class="mini-btn" data-edit="${menu.id}">編集</button><button class="mini-btn delete" data-delete="${menu.id}">消去</button>`;
    card.className='list-card';
    card.innerHTML=`<div><h3>${escapeHTML(menu.name)}</h3><p>${categoryName(menu.categoryId)} / ${mode}</p></div><div class="list-actions">${actions}</div>`;
    list.appendChild(card);
  });
  if(reorderMode){
    list.querySelectorAll('[data-menu-move]').forEach(button=>button.addEventListener('click',()=>moveMenu(button.dataset.menuMove,Number(button.dataset.direction))));
  }else{
    list.querySelectorAll('[data-edit]').forEach(button=>button.addEventListener('click',()=>{editingMenuId=button.dataset.edit;showScreen('add')}));
    list.querySelectorAll('[data-delete]').forEach(button=>button.addEventListener('click',()=>openDeleteModal(button.dataset.delete)));
  }
}
function moveMenu(menuId,direction){
  const menu=findMenu(menuId);
  if(!menu)return;
  const siblings=sortedMenus(state.menus.filter(item=>item.categoryId===menu.categoryId));
  const from=siblings.findIndex(item=>item.id===menuId);
  const to=from+direction;
  if(from<0||to<0||to>=siblings.length)return;
  const ids=siblings.map(item=>item.id);
  [ids[from],ids[to]]=[ids[to],ids[from]];
  if(!mutateAndSave(()=>ids.forEach((id,index)=>{findMenu(id).order=index})))return;
  renderListScreen();
}
function openDeleteModal(id){
  deleteTargetId=id;
  $('confirmText').textContent=`「${findMenu(id).name}」を消去します。`;
  $('confirmModal').classList.add('open');
}
function closeDeleteModal(){
  $('confirmModal').classList.remove('open');
  deleteTargetId=null;
}
function deleteMenu(){
  if(!deleteTargetId)return;
  const id=deleteTargetId;
  if(!mutateAndSave(()=>{state.menus=state.menus.filter(menu=>menu.id!==id)}))return;
  selectedMenuIds=selectedMenuIds.filter(menuId=>menuId!==id);
  setPlan=setPlan.filter(row=>row.menuId!==id);
  closeDeleteModal();
  renderListScreen();
}
function exportImage(){const t=calcTotals();if(t.noPeople){alert('人数パターンが選択されていません');return}const rows=setPlan.map(r=>({row:r,menu:findMenu(r.menuId)})).filter(x=>x.menu),w=1080,rowH=72,tableY=t.mismatch?350:305,h=Math.max(860,tableY+rows.length*rowH+100),c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d'),peopleSummary=selectedPeople.map(p=>`${p}人：${t.byPerson[p].peopleSets}人set`).join('　'),timeSummary=selectedPeople.map(p=>`${p}人：${formatSeconds(t.byPerson[p].seconds)}`).join('　');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);drawText(ctx,'#17823b','800 34px sans-serif','練習メニュー表',60,70,960);drawText(ctx,'#16201a','900 54px sans-serif',currentSheetTitle,60,145,960);drawText(ctx,'#6a756f','800 24px sans-serif',`合計人set　${peopleSummary}`,60,195,960);drawText(ctx,'#6a756f','800 24px sans-serif',`所要時間　${timeSummary}`,60,235,960);if(t.mismatch)drawText(ctx,'#d94141','900 24px sans-serif','注意：人数パターンごとに、メニュー別の人setが一致していません。',60,285,960);let y=tableY;drawText(ctx,'#6a756f','800 24px sans-serif','No.',60,y);drawText(ctx,'#6a756f','800 24px sans-serif','メニュー',145,y);const colXs=selectedPeople.length===1?[820]:[720,880];selectedPeople.forEach((p,idx)=>drawText(ctx,'#6a756f','800 24px sans-serif',`${p}人`,colXs[idx],y,120));y+=26;ctx.strokeStyle='#dce6df';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(60,y);ctx.lineTo(1020,y);ctx.stroke();y+=48;rows.forEach((x,i)=>{const{row,menu}=x;ctx.fillStyle=i%2?'#f7faf8':'#fff';ctx.fillRect(50,y-36,980,rowH);drawText(ctx,'#17823b','900 28px sans-serif',String(i+1),70,y+10,50);drawText(ctx,'#16201a','900 30px sans-serif',menu.name,145,y+10,selectedPeople.length===1?620:520);if(menu.requiresSets)selectedPeople.forEach((p,idx)=>drawText(ctx,'#16201a','900 30px sans-serif',`${getSets(row,p)} set`,colXs[idx],y+10,120));else drawText(ctx,'#6a756f','800 26px sans-serif',`固定 ${formatSeconds(menu.seconds)}`,colXs[0],y+10,selectedPeople.length===1?180:250);y+=rowH});lastImageDataUrl=c.toDataURL('image/png');lastHistoryDataUrl=c.toDataURL('image/jpeg',0.82);lastHistoryBlob=dataURLToBlob(lastHistoryDataUrl);lastHistoryType='image/jpeg';lastImageTitle=currentSheetTitle;$('previewImg').src=lastImageDataUrl;$('previewWrap').classList.add('open')}
function fitText(ctx,text,maxWidth){const value=String(text);if(!maxWidth||ctx.measureText(value).width<=maxWidth)return value;let end=value.length;while(end>0&&ctx.measureText(`${value.slice(0,end)}…`).width>maxWidth)end-=1;return `${value.slice(0,end)}…`}function drawText(ctx,color,font,text,x,y,maxWidth){ctx.fillStyle=color;ctx.font=font;ctx.fillText(fitText(ctx,text,maxWidth),x,y)}function downloadImage(){if(!lastImageDataUrl)return;const a=document.createElement('a');a.href=lastImageDataUrl;a.download=`${currentSheetTitle||'training-menu'}.png`;a.click()}
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.go==='add')resetAddForm();showScreen(b.dataset.go)}));$('addCategoryBtn').addEventListener('click',e=>{e.stopPropagation();$('addCategoryPanel').classList.toggle('open')});document.addEventListener('click',e=>{if(!e.target.closest('.field-block'))closeDropdowns()});$('startSetBtn').addEventListener('click',startSetSelection);$('fixedToggle').addEventListener('click',()=>{$('fixedSwitch').classList.toggle('on');updateTimeLabel()});$('saveMenuBtn').addEventListener('click',saveMenu);$('exportImageBtn').addEventListener('click',exportImage);$('cancelDelete').addEventListener('click',closeDeleteModal);$('confirmDelete').addEventListener('click',deleteMenu);$('closePreview').addEventListener('click',()=>$('previewWrap').classList.remove('open'));$('downloadImage').addEventListener('click',downloadImage);$('addHistoryBtn').addEventListener('click',addHistoryImage);$('reorderToggle').addEventListener('click',()=>{reorderMode=!reorderMode;renderListScreen()});$('menuAddTopBtn').addEventListener('click',()=>{resetAddForm();showScreen('add')});if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(error=>console.warn('Service Worker の登録に失敗しました',error)));renderCreateScreen();renderAddScreen();renderListScreen();renderCategoryListScreen();renderHistoryScreen();
})();
