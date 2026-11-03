export const go = (path) => {
  window.location.hash = '#/' + path.replace(/^\//, '');
};

// Mesele din care am ieșit / care s-au terminat (în această sesiune) — nu mă mai „blochează” în joc
const LEFT_KEY = 'germana-left-games';
export function markLeft(id) {
  try {
    const a = JSON.parse(sessionStorage.getItem(LEFT_KEY) || '[]');
    if (!a.includes(id)) sessionStorage.setItem(LEFT_KEY, JSON.stringify([...a, id].slice(-30)));
  } catch {}
}
export function isLeft(id) {
  try {
    return JSON.parse(sessionStorage.getItem(LEFT_KEY) || '[]').includes(id);
  } catch {
    return false;
  }
}
