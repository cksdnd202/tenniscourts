const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, modules={}) {
 const exports = {};
 const js = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(js,{exports,require:name=>modules[name],Date,Math,Promise,setTimeout,clearTimeout});
 return exports;
}
const routing = load('src/lib/authRouting.ts');
const completed={hasSession:true,legalConsentCompleted:true,onboardingCompleted:true,notificationIntroCompleted:true,locationIntroCompleted:false};
test('new and existing accounts skip retired location onboarding',()=>{
 assert.equal(routing.getAuthRedirect('/',completed),null);
 assert.equal(routing.getAuthRedirect('/map',completed),null);
 assert.equal(routing.getAuthRedirect('/location-permission',completed),'/');
 assert.equal(routing.getAuthRedirect('/auth/callback',completed),'/');
});
test('login, consent, onboarding and notification gates are preserved',()=>{
 assert.equal(routing.getAuthRedirect('/',{...completed,hasSession:false}),'/login');
 assert.equal(routing.getAuthRedirect('/',{...completed,legalConsentCompleted:false}),'/terms-consent');
 assert.equal(routing.getAuthRedirect('/',{...completed,onboardingCompleted:false}),'/onboarding');
 assert.equal(routing.getAuthRedirect('/',{...completed,notificationIntroCompleted:false}),'/notification-permission');
});
test('Android session fine grant works even without broad coarse grant and expires',async()=>{
 let scope='fine';
 const api=load('src/lib/currentLocation.ts',{
  'react-native':{Platform:{OS:'android'}},
  'expo-modules-core':{requireNativeModule:()=>({getPermissionScope:()=>scope})},
  'expo-location':{PermissionStatus:{GRANTED:'granted'},getForegroundPermissionsAsync:async()=>({granted:false,status:'denied',canAskAgain:true})},
 });
 assert.equal((await api.getForegroundLocationPermissionsAsync()).granted,true);
 assert.equal((await api.getForegroundLocationPermissionsAsync()).android.accuracy,'fine');
 scope='coarse';assert.equal((await api.getForegroundLocationPermissionsAsync()).granted,true);
 scope='none';assert.equal((await api.getForegroundLocationPermissionsAsync()).granted,false);
});
test('map bridge tracks the existing control without moving it and clears removed controls',()=>{
 const source=fs.readFileSync('src/components/WebTabScreen.tsx','utf8');
 const script=source.match(/const locationButtonProbeScript = useMemo\(\(\) => `([\s\S]*?)`, \[\]\);/)[1];
 for (const width of [360,390,412]) {
  const messages=[];let observer;let button={style:{},getBoundingClientRect:()=>({x:width-60,y:400,top:400,width:44,height:44,bottom:444})};
  const context={window:{innerHeight:720,ReactNativeWebView:{postMessage:s=>messages.push(JSON.parse(s))},addEventListener(){}},document:{documentElement:{},querySelector:()=>button},requestAnimationFrame:f=>f(),MutationObserver:class{constructor(f){observer=f}observe(){}}};
  vm.runInNewContext(script,context);
  assert.equal(button.style.visibility,'hidden');
  assert.equal(messages[0].rect.x,width-60);
  assert.equal(messages[0].rect.width,44);
  observer();assert.equal(messages.length,1);
  button=null;observer();assert.equal(messages.at(-1).rect,null);
 }
});
