let cacheVersion = '20220402';
let cacheList = [
  './',
  './index.html',
  './icon/favicon.ico',
  './icon/icon-144.png',
  './icon/icon-256.png',
  './icon/icon-512.png',
  './icon/mac/icon-512.png',
  './css/base.css?version=' + cacheVersion,
  './js/init.js?version=' + cacheVersion,
  './js/plugins.js?version=' + cacheVersion
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(cacheVersion).then(function(cache) {
      return cache.addAll(cacheList);
    })
  );
});

// 监听 fetch 事件，安装完成后，进行文件缓存
self.addEventListener('fetch', function(e) {
  // console.log('fetch', e);
  e.respondWith(
    caches.match(e.request).then(function(cache) {
      // 如果有cache则直接返回，否则通过fetch请求
      return cache || fetch(e.request);
    }).catch(function(err) {
      console.log(err);
      return fetch(e.request);
    })
  );
});

// 监听 activate 事件，清除缓存
self.addEventListener('activate', function(e) {
  // console.log('activate', e);
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(key) {
        if (key !== cacheVersion) {
          return caches.delete(key);
        };
      }));
    })
  );
  return self.clients.claim();
});
