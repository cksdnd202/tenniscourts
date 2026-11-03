const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, context, dependencies = {}) {
 const exports = {};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText, {...context, exports, require: name => {
  if (!(name in dependencies)) throw new Error(`Unexpected module ${name}`);
  return dependencies[name];
 }});
 return exports;
}
function environment(mode, host, native = false) {
 const captures = [], tags = [], timers = [];
 const location = {hostname:host,origin:`https://${host}`,pathname:'/courts/test-court',search:''};
 const window = {location};
 const document = {documentElement:{dataset:{}},querySelector:()=>null,createElement:()=>({}),head:{appendChild:tag=>tags.push(tag)}};
 const context = {process:{env:{NODE_ENV:mode,NEXT_PUBLIC_POSTHOG_KEY:'test-key'}},window,document,location,navigator:{userAgent:'Android'},URLSearchParams,URL,Date,setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout:()=>{}};
 const module = load('src/lib/appPromotionAnalytics.ts',context,{'posthog-js':{__esModule:true,default:{capture:(...args)=>captures.push(args)}},'./posthogClient':{isAppWebView:()=>native}});
 return {module,captures,tags,timers,window,context};
}
(async () => {
 for (const [mode,host,native] of [['development','courtskorea.com',false],['production','127.0.0.1',false],['production','preview.vercel.app',false],['production','courtskorea.com',true]]) {
  const env = environment(mode,host,native);
  await env.module.trackAppPromotion('app_qr_opened','launch_popup');
  assert.equal(env.captures.length,0); assert.equal(env.tags.length,0);
 }
 const env = environment('production','courtskorea.com');
 const pending = env.module.trackAppPromotion('app_qr_opened','launch_popup',{origin_path:'/courts/example'});
 assert.equal(env.captures.length,1);
 assert.equal(env.captures[0][0],'app_qr_opened');
 assert.equal(env.captures[0][1].source,'launch_popup');
 assert.equal(env.captures[0][2].transport,'sendBeacon');
 const event = env.window.dataLayer.find(item=>item[0]==='event');
 assert.equal(event[2].send_to,'G-P5WNNV82W4');
 event[2].event_callback(); await pending;
 assert.equal(env.tags.length,1);
 const timeout = env.module.trackAppPromotion('app_promo_clicked','detail_card');
 env.timers.at(-1)(); await timeout;
 assert.equal(env.tags.length,1,'Google loader should not be injected twice');
 const launch = load('src/lib/appLaunch.ts',env.context);
 const qr = new URL(launch.getAppQrUrl('header_qr','/courts/test-court'));
 assert.equal(qr.origin,'https://courtskorea.com');
 assert.equal(qr.pathname,'/app-download');
 assert.equal(qr.searchParams.get('source'),'header_qr');
 assert.equal(qr.searchParams.get('path'),'/courts/test-court');
 const hostile = new URL(launch.getAppQrUrl('launch_popup','https://evil.example/'));
 assert.equal(hostile.searchParams.get('path'),'/');
 const store = new URL(launch.getAttributedPlayUrl('header_qr'));
 assert.equal(store.origin,'https://play.google.com');
 assert.equal(new URLSearchParams(store.searchParams.get('referrer')).get('utm_content'),'header_qr');
 console.log('App promotion analytics: environment exclusions, dual delivery, timeout, attribution and destination validation passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
