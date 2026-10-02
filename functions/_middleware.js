// One canonical host: send www.groundapp.live and groundapp.pages.dev to groundapp.live.
// Preview deployments (<hash>.groundapp.pages.dev) are left alone.
const REDIRECT_HOSTS = new Set(['www.groundapp.live', 'groundapp.pages.dev']);

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (REDIRECT_HOSTS.has(url.hostname)) {
    return Response.redirect(`https://groundapp.live${url.pathname}${url.search}`, 301);
  }
  return next();
}
