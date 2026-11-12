import { expect } from 'chai';
import { Base64 } from 'js-base64';
import { describe, it } from 'mocha';
import { ProxyUtils } from '@/core/proxy-utils';
import SurgeProducer, {
    SurgeUnsupportedProxyError,
} from '@/core/proxy-utils/producers/surge';
import { produceExternal, UUID } from './helpers';

const key = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
function reality(overrides = {}) {
    return {
        type: 'vless',
        name: 'Reality',
        server: '192.0.2.1',
        port: 443,
        uuid: UUID,
        network: 'tcp',
        tls: true,
        sni: 'example.org',
        flow: 'xtls-rprx-vision',
        'reality-opts': { 'public-key': key, 'short-id': '0011' },
        ...overrides,
    };
}

describe('Surge native TCP VLESS compatibility', function () {
    it('exports Reality and Vision with native Surge parameter names', function () {
        const output = produceExternal('Surge', reality());
        expect(output).to.equal(
            `Reality=vless,192.0.2.1,443,username="${UUID}",flow=xtls-rprx-vision,sni="example.org",reality-public-key="${key}",reality-short-id="0011"`,
        );
        expect(output).not.to.include('external');
        expect(output).not.to.include('skip-cert-verify');
    });
    it('retains every node in a Base64 subscription with one SS and five Reality URIs', function () {
        const ss = `ss://${Base64.encode(
            'aes-256-gcm:fixture-secret',
        )}@192.0.2.2:8388#SS`;
        const vless = Array.from(
            { length: 5 },
            (_, i) =>
                `vless://${UUID}@192.0.2.1:443?encryption=none&security=reality&type=tcp&sni=example.org&flow=xtls-rprx-vision&pbk=${key}&sid=0011#Reality-${i}`,
        );
        const proxies = ProxyUtils.parse(
            Base64.encode([ss, ...vless].join('\n')),
        );
        expect(proxies).to.have.length(6);
        const output = produceExternal('Surge', proxies);
        const lines = output.split('\n').filter(Boolean);
        expect(lines).to.have.length(6);
        expect(lines.filter((line) => line.includes('=vless,'))).to.have.length(
            5,
        );
        expect(lines.filter((line) => line.includes('=ss,'))).to.have.length(1);
    });
    it('preserves the existing Shadowsocks output', function () {
        expect(
            produceExternal('Surge', {
                type: 'ss',
                name: 'SS',
                server: '192.0.2.2',
                port: 8388,
                cipher: 'aes-256-gcm',
                password: 'fixture-secret',
            }),
        ).to.equal(
            'SS=ss,192.0.2.2,8388,encrypt-method=aes-256-gcm,password="fixture-secret"',
        );
    });
    it('brackets IPv6 addresses and preserves selected common options', function () {
        const output = produceExternal(
            'Surge',
            reality({
                server: '2001:db8::1',
                tfo: true,
                'block-quic': 'on',
                'test-timeout': 3,
            }),
        );
        expect(output).to.include('vless,[2001:db8::1],443');
        expect(output).to.include(',tfo=true,block-quic=on,test-timeout=3');
    });
    it('allows an empty Reality short-id', function () {
        expect(
            produceExternal(
                'Surge',
                reality({
                    'reality-opts': { 'public-key': key, 'short-id': '' },
                }),
            ),
        ).to.include('reality-short-id=""');
    });
    it('exports TCP TLS without Reality', function () {
        const output = produceExternal(
            'Surge',
            reality({
                'reality-opts': undefined,
                alpn: ['h2', 'http/1.1'],
                'skip-cert-verify': false,
            }),
        );
        expect(output).to.include(
            ',tls=true,sni="example.org",skip-cert-verify=false,alpn="h2,http/1.1"',
        );
        expect(output).not.to.include('reality-public-key');
    });
    for (const [label, overrides] of [
        ['unsupported transport', { network: 'xhttp' }],
        ['unsupported flow', { flow: 'unsupported' }],
        ['unsupported encryption', { encryption: 'unsupported' }],
        ['missing Reality key', { 'reality-opts': {} }],
        ['invalid port', { port: 70000 }],
        ['Vision without TLS', { 'reality-opts': undefined, tls: false }],
    ]) {
        it(`continues to reject ${label}`, function () {
            expect(() =>
                SurgeProducer().produce(reality(overrides), 'external'),
            ).to.throw(SurgeUnsupportedProxyError);
        });
    }
});
