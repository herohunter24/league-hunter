export function getAnalyticsSessionId() {
  try {
    let id = sessionStorage.getItem('analytics_session_id');
    if (!id) {
      id = 'session_' + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('analytics_session_id', id);
    }
    return id;
  } catch {
    return 'session_' + Math.random().toString(36).substring(2, 15);
  }
}
