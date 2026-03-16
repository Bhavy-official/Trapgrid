/**
 * transition.js — Mario World-Select Transition
 *
 * Call: playWorldTransition(icon, label, sub, callback)
 * Timeline:
 *   0ms   — curtains wipe in from both sides (380ms)
 *   350ms — world badge pops in center
 *   1400ms— curtains wipe out, badge fades
 *   1850ms— callback fires (show game screen)
 */

'use strict';

function playWorldTransition(icon, label, sub, callback) {
  const overlay = document.getElementById('transition-overlay');
  if (!overlay) { if (callback) callback(); return; }

  const wbIcon  = overlay.querySelector('.wb-icon');
  const wbLabel = overlay.querySelector('.wb-label');
  const wbSub   = overlay.querySelector('.wb-sub');

  if (wbIcon)  wbIcon.textContent  = icon;
  if (wbLabel) wbLabel.textContent = label;
  if (wbSub)   wbSub.textContent   = sub;

  overlay.className = '';
  overlay.style.display = 'block';

  void overlay.offsetWidth;

  overlay.classList.add('playing');

  setTimeout(() => {
    overlay.classList.add('show-badge');
  }, 320);

  setTimeout(() => {
    if (callback) callback();
  }, 980);

  setTimeout(() => {
    overlay.classList.add('exit');
  }, 1050);

  setTimeout(() => {
    overlay.style.display = 'none';
    overlay.className = '';
  }, 1500);
}


function startGameWithTransition(mode) {
  const isPvAI = mode === 'pvai';

  const icon  = isPvAI ? '🤖' : '👥';
  const label = isPvAI ? 'WORLD 2' : 'WORLD 1';
  const sub   = isPvAI ? 'VS AI'   : '2 PLAYERS';

  playWorldTransition(icon, label, sub, () => {
    startGame(mode);
  });
}