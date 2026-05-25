self.addEventListener("sync", (event) => {
  if (event.tag === "sync-pending") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "SYNC_PENDING" });
        });
      })
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "REGISTER_SYNC") {
    self.registration.sync.register("sync-pending").catch(console.error);
  }
});