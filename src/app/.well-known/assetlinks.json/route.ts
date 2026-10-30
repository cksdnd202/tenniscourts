const ANDROID_PACKAGE_NAME = 'com.courtskorea.app';
const PLAY_APP_SIGNING_CERTIFICATE_FINGERPRINT = 'C2:E3:96:B9:18:FE:AD:F0:89:C5:8F:FE:66:B8:EB:21:C0:A3:11:8F:21:6B:C0:DA:F8:69:96:CE:96:F7:69:72';
// Retain the EAS upload certificate for directly distributed release builds.
// Additional certificate rotations can be supplied as a comma-separated env.
const UPLOAD_CERTIFICATE_FINGERPRINT = '8D:87:8B:CC:4F:55:64:34:33:11:1F:42:E4:78:66:20:62:03:19:CD:D6:0D:16:1F:82:66:81:EF:9B:63:89:6B';
const SHA256_FINGERPRINT_PATTERN = /^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/;

function getSigningFingerprints() {
  const configured = (process.env.ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS ?? '')
    .split(',')
    .map((fingerprint) => fingerprint.trim().toUpperCase())
    .filter((fingerprint) => SHA256_FINGERPRINT_PATTERN.test(fingerprint));
  return [...new Set([
    PLAY_APP_SIGNING_CERTIFICATE_FINGERPRINT,
    UPLOAD_CERTIFICATE_FINGERPRINT,
    ...configured,
  ])];
}

export async function GET() {
  const fingerprints = getSigningFingerprints();
  const statements = fingerprints.length > 0
    ? [
        {
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            package_name: ANDROID_PACKAGE_NAME,
            sha256_cert_fingerprints: fingerprints,
          },
        },
      ]
    : [];

  return Response.json(statements, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
