import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';

const projectRoot = process.cwd();
const mobileRoot = `${projectRoot}/apps/mobile`;
const port = process.env.COURTS_KOREA_WEB_PORT ?? '3000';

function isPrivateIpv4(address) {
  return (
    address.startsWith('10.') ||
    address.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(address)
  );
}

function findLanAddress() {
  if (process.env.COURTS_KOREA_LAN_IP) return process.env.COURTS_KOREA_LAN_IP;

  const candidates = Object.entries(networkInterfaces()).flatMap(([name, addresses]) =>
    (addresses ?? [])
      .filter((item) => item.family === 'IPv4' && !item.internal)
      .map((item) => ({ name, address: item.address }))
  );
  const preferred = candidates.find(
    ({ name, address }) => /^(en|eth|wlan)/.test(name) && isPrivateIpv4(address)
  );
  return preferred?.address ?? candidates.find(({ address }) => isPrivateIpv4(address))?.address;
}

const lanAddress = findLanAddress();
if (!lanAddress) {
  console.error('\n로컬 네트워크 주소를 찾지 못했습니다.');
  console.error('Wi-Fi 연결을 확인하거나 아래처럼 주소를 직접 지정해 주세요.');
  console.error('COURTS_KOREA_LAN_IP=192.168.x.x npm run dev:mobile\n');
  process.exit(1);
}

const webUrl = `http://${lanAddress}:${port}`;
const children = [];
let shuttingDown = false;

function start(command, args, cwd, env = process.env) {
  const child = spawn(command, args, { cwd, env, stdio: 'inherit' });
  children.push(child);
  return child;
}

function stop(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(exitCode), 250);
}

console.log('\nCourts Korea 휴대폰 미리보기를 시작합니다.');
console.log(`- 로컬 웹 주소: ${webUrl}`);
console.log('- 휴대폰과 컴퓨터를 같은 Wi-Fi에 연결해 주세요.');
console.log('- 개발용 Courts Korea 앱에서 표시되는 개발 서버를 선택하세요.\n');

const web = start('npm', ['run', 'dev:lan'], projectRoot, { ...process.env, PORT: port });
const mobile = start('npm', ['run', 'dev'], mobileRoot, {
  ...process.env,
  EXPO_PUBLIC_USE_LOCAL_WEB: 'true',
  EXPO_PUBLIC_WEB_URL: webUrl,
});

web.on('exit', (code, signal) => {
  if (!shuttingDown) {
    console.error(`웹 개발 서버가 종료되었습니다. (${signal ?? code ?? 'unknown'})`);
    stop(code ?? 1);
  }
});
mobile.on('exit', (code, signal) => {
  if (!shuttingDown) {
    console.error(`Expo 개발 서버가 종료되었습니다. (${signal ?? code ?? 'unknown'})`);
    stop(code ?? 1);
  }
});

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
