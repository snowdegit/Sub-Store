# Native Surge TCP VLESS/Reality

This fork adds native TCP/RAW VLESS output for Surge iOS 6.0+ and Mac 6.12+. It preserves existing non-VLESS producers, parsers, filters, requests and storage. Unsupported transports still fail explicitly. No external mihomo process is needed.

## Single Core script

Set the existing Sub-Store Core script-path to:

```
https://raw.githubusercontent.com/snowdegit/Sub-Store/master/scripts/sub-store-1.min.js
```

The artifact is built from this fork. It is not a redirect to the upstream release. The Core serves a configured fakeSub=true download endpoint without creating local subscription records or installing a separate Simple/UI script. Keep the local sub.store interception, Host mapping, and required Surge feature switches. Do not commit credentials or personal configurations into this public repository.

## Changes

Only the Surge producer gains a vless dispatch case and nativeVless output helper, matching the previously tested local compatibility patch. It maps UUID, SNI, flow, Reality public key and short-id to Surge native parameters. Selected common options and TCP TLS are also supported. WS/gRPC/XHTTP are outside this patch.

## Test and rebuild

Use the Node version in .node-version and pnpm version in backend/package.json:

```
cd backend
pnpm install --frozen-lockfile
pnpm exec mocha 'src/test/proxy-producers/*.spec.js' --require @babel/register
pnpm bundle:esbuild
```

After reviewing source changes, copy backend/dist/sub-store-1.min.js to scripts/sub-store-1.min.js and retain a modification notice and upstream copyright notices. The checked-in script is a build snapshot; syncing upstream does not rebuild it automatically. Its SHA-256 and upstream base are recorded in scripts/surge-native-vless-build.json.

The conversion tests include a Base64 subscription containing one SS and five Reality nodes and require all six to remain in the Surge output. Conversion tests do not establish live node connectivity.
