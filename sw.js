const CACHE_NAME = 'flower-bloom-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  // Google Fonts (optional)
  'https://fonts.googleapis.com/css2?family=Noto+Color+Emoji'
];

// インストール時にファイルをキャッシュ
self.addEventListener('install', (event) => {
  console.log('Service Worker: インストール中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: ファイルをキャッシュ中...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: キャッシュ完了');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.log('Service Worker: キャッシュエラー:', error);
      })
  );
});

// アクティベート時に古いキャッシュをクリア
self.addEventListener('activate', (event) => {
  console.log('Service Worker: アクティベート中...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: 古いキャッシュを削除:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: アクティベート完了');
      return self.clients.claim();
    })
  );
});

// ネットワークリクエストをインターセプト
self.addEventListener('fetch', (event) => {
  // HTMLファイルのリクエストの場合
  if (event.request.destination === 'document') {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // キャッシュにある場合はそれを返す
          if (response) {
            console.log('Service Worker: キャッシュから返却:', event.request.url);
            return response;
          }
          
          // ネットワークから取得を試みる
          return fetch(event.request)
            .then((response) => {
              // レスポンスが有効な場合はキャッシュに保存
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            })
            .catch(() => {
              // ネットワークエラーの場合、キャッシュされたindex.htmlを返す
              return caches.match('/index.html');
            });
        })
    );
  }
  // その他のリソース（CSS、JS、画像など）
  else {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // キャッシュにある場合はそれを返す
          if (response) {
            return response;
          }
          
          // ネットワークから取得
          return fetch(event.request)
            .then((response) => {
              // レスポンスが有効でない場合はそのまま返す
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // キャッシュ可能なリソースの場合はキャッシュに保存
              if (event.request.method === 'GET') {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseToCache);
                  });
              }
              
              return response;
            })
            .catch((error) => {
              console.log('Service Worker: ネットワークエラー:', error);
              // 必要に応じてフォールバック画像やページを返す
              return new Response('オフラインです。インターネット接続を確認してください。', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'text/plain; charset=utf-8'
                })
              });
            });
        })
    );
  }
});

// バックグラウンド同期（ゲームスコア同期用）
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-score') {
    console.log('Service Worker: バックグラウンド同期中...');
    event.waitUntil(syncGameScore());
  }
});

// スコア同期処理（将来的にサーバーとの同期に使用可能）
async function syncGameScore() {
  try {
    // IndexedDBからスコアを読み取り、サーバーに送信
    // 現在はローカルストレージのみなので実装は簡略化
    console.log('Service Worker: スコア同期完了');
  } catch (error) {
    console.log('Service Worker: スコア同期エラー:', error);
  }
}

// プッシュ通知（将来的な機能拡張用）
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : '新しい花が咲きました！',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'play',
        title: 'ゲームを開く',
        icon: '/icon-play.png'
      },
      {
        action: 'close',
        title: '閉じる',
        icon: '/icon-close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('花咲きゲーム', options)
  );
});

// 通知クリック処理
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'play') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// メッセージ処理（メインアプリとの通信用）
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// エラーハンドリング
self.addEventListener('error', (event) => {
  console.error('Service Worker エラー:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker 未処理のPromise拒否:', event.reason);
});

console.log('Service Worker: 登録完了');
