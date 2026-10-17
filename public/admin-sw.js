self.addEventListener("push", event => {
  let data = { title: "SinDarealest", body: "Có hoạt động mới trong trang quản trị.", url: "/admin/" };
  try { data = { ...data, ...event.data.json() }; } catch {}

  event.waitUntil(self.registration.showNotification(
    String(data.title || "SinDarealest").slice(0, 120),
    {
      body: String(data.body || "Có hoạt động mới.").slice(0, 300),
      icon: "/images/brand-emblem.png",
      badge: "/images/brand-emblem.png",
      data: { url: safeNotificationUrl(data.url) },
    },
  ));
});

function safeNotificationUrl(value) {
  try {
    const target = new URL(String(value || "/admin/"), self.location.origin);
    if (target.origin !== self.location.origin) return "/admin/";
    if (!target.pathname.startsWith("/admin/")) return "/admin/";
    return target.pathname + target.search + target.hash;
  } catch {
    return "/admin/";
  }
}

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = safeNotificationUrl(event.notification.data?.url);
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const client of list) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        return client.navigate(new URL(target, self.location.origin).href).then(() => client.focus());
      }
    }
    return clients.openWindow(new URL(target, self.location.origin).href);
  }));
});
