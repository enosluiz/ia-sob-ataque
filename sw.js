/* Service worker do RiskCards: IA sob Ataque (gerado na publicação) */
const VERSION = 'rc-93f7a1cb82';
const CORE = ["./", "index.html", "manifest.webmanifest", "js/data.js", "js/main.js", "vendor/three/build/three.module.js", "vendor/three/examples/jsm/loaders/GLTFLoader.js", "vendor/three/examples/jsm/postprocessing/EffectComposer.js", "vendor/three/examples/jsm/postprocessing/MaskPass.js", "vendor/three/examples/jsm/postprocessing/OutputPass.js", "vendor/three/examples/jsm/postprocessing/Pass.js", "vendor/three/examples/jsm/postprocessing/RenderPass.js", "vendor/three/examples/jsm/postprocessing/ShaderPass.js", "vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js", "vendor/three/examples/jsm/shaders/CopyShader.js", "vendor/three/examples/jsm/shaders/LuminosityHighPassShader.js", "vendor/three/examples/jsm/shaders/OutputShader.js", "vendor/three/examples/jsm/utils/BufferGeometryUtils.js", "icons/apple-180.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "assets/balanca.gltf.json", "assets/barril.gltf.json", "assets/boato.gltf.json", "assets/cadeado.gltf.json", "assets/caixa.gltf.json", "assets/chave.gltf.json", "assets/invasor.gltf.json", "assets/ladrao.gltf.json", "assets/nucleo.gltf.json", "assets/robo.gltf.json", "assets/logo.png", "assets/rc/coringa2_f.jpg", "assets/rc/coringa_f.jpg", "assets/rc/i01f.jpg", "assets/rc/i02f.jpg", "assets/rc/i03f.jpg", "assets/rc/i04f.jpg", "assets/rc/i05f.jpg", "assets/rc/i06f.jpg", "assets/rc/i07f.jpg", "assets/rc/i08f.jpg", "assets/rc/i09f.jpg", "assets/rc/i10f.jpg", "assets/rc/i11f.jpg", "assets/rc/i12f.jpg", "assets/rc/r01f.jpg", "assets/rc/r02f.jpg", "assets/rc/r03f.jpg", "assets/rc/r04f.jpg", "assets/rc/r05f.jpg", "assets/rc/r06f.jpg", "assets/rc/r07f.jpg", "assets/rc/r08f.jpg", "assets/rc/r09f.jpg", "assets/rc/r10f.jpg", "assets/rc/r11f.jpg", "assets/rc/r12f.jpg", "assets/rc/r13f.jpg", "assets/rc/r14f.jpg", "assets/rc/r15f.jpg", "assets/rc/r16f.jpg", "assets/rc/r17f.jpg", "assets/rc/r18f.jpg", "assets/rc/r19f.jpg", "assets/rc/r20f.jpg", "assets/rc/r21f.jpg", "assets/rc/r22f.jpg", "assets/rc/r23f.jpg", "assets/rc/r24f.jpg", "assets/rc/r25f.jpg", "assets/rc/r26f.jpg", "assets/rc/r27f.jpg", "assets/rc/r28f.jpg", "assets/rc/r29f.jpg", "assets/rc/r30f.jpg"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== 'rc-runtime').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put('index.html', cp)); return r; }).catch(() => caches.match('index.html')));
    return;
  }
  // fontes do Google e versos das cartas: guarda na primeira vez que forem usados
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(url.origin === location.origin ? VERSION : 'rc-runtime').then(c => c.put(req, cp)); }
    return r;
  })));
});
