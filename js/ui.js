function getProjArrow() {
  return innerWidth > 800 ? 'PROJECTS \u2192' : 'PROJECTS \u2191';
}

export function init() {
  const projBtn   = document.getElementById('proj-btn');
  const projPanel = document.querySelector('.projects');
  let panelOpen = false;

  projBtn.textContent = getProjArrow();

  const openDrawer = () => {
    panelOpen = true;
    projPanel.classList.add('open');
    projBtn.classList.add('open');
    projBtn.textContent = '\u2715';
    projBtn.setAttribute('aria-label', 'Close projects');
  };
  const closeDrawer = () => {
    panelOpen = false;
    projPanel.classList.remove('open');
    projBtn.classList.remove('open');
    projBtn.textContent = getProjArrow();
    projBtn.setAttribute('aria-label', 'Open projects');
  };

  projBtn.addEventListener('click', () => panelOpen ? closeDrawer() : openDrawer());

  const canvas = document.getElementById('c');
  canvas.addEventListener('click', closeDrawer);
  canvas.addEventListener('touchstart', e => {
    if (!projPanel.contains(e.target)) closeDrawer();
  }, { passive: true });

  document.getElementById('email-btn').addEventListener('click', () => {
    window.location.href = 'mailto:' + ['Vaibhav.heda799', 'gmail.com'].join('@');
  });

  const dragHint = document.getElementById('drag-hint');
  setTimeout(() => {
    dragHint.classList.add('gone');
    setTimeout(() => dragHint.remove(), 1000);
  }, 2500);
}
