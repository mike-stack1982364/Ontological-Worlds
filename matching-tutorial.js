'use strict';

(function installMatchingTutorial(root) {
  if (!root || root.__matchingTutorialInstalled) return;

  const initialise = () => {
    if (root.__matchingTutorialInstalled) return;

    const documentObject = root.document;
    const conflictMatrix = documentObject?.getElementById('conflict-matrix');
    const conflictSubmit = documentObject?.getElementById('conflict-submit');
    if (!documentObject || !conflictMatrix || !conflictSubmit) return;

    const style = documentObject.createElement('style');
    style.id = 'matching-tutorial-style';
    style.textContent = `
      body.matching-tutorial-open{overflow:hidden!important}
      #matching-tutorial-btn{display:block;width:min(100%,620px);min-height:46px;margin:10px auto 6px;padding:9px 18px;border:2px solid #8a4b08;border-radius:12px;background:linear-gradient(135deg,#fff3b0 0%,#ffd166 52%,#ffb703 100%);color:#2f1a00;font-size:clamp(.78rem,1.1vw,1rem);font-weight:950;letter-spacing:.055em;text-transform:uppercase;box-shadow:0 5px 14px rgba(138,75,8,.24);cursor:pointer;touch-action:manipulation}
      #matching-tutorial-btn:hover{filter:brightness(1.035);transform:translateY(-1px)}
      #matching-tutorial-btn:active{transform:translateY(1px)}
      #matching-tutorial-btn:focus-visible{outline:4px solid rgba(255,183,3,.45);outline-offset:3px}
      #matching-tutorial-dialog[hidden]{display:none!important}
      #matching-tutorial-dialog{position:fixed;inset:0;z-index:50000;display:flex;align-items:flex-start;justify-content:center;padding:18px;background:rgba(7,21,37,.78);overflow:auto;overscroll-behavior:contain}
      .matching-tutorial-panel{position:relative;width:min(960px,100%);margin:auto;background:#fff;border:2px solid #174a8b;border-radius:20px;box-shadow:0 24px 70px rgba(7,21,37,.38);color:#102033;overflow:hidden}
      .matching-tutorial-header{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 18px;background:linear-gradient(135deg,#0a2e5c,#174a8b);color:#fff}
      .matching-tutorial-header h2{margin:0;color:#fff;font-size:clamp(1.25rem,3vw,2rem);letter-spacing:.035em}
      .matching-tutorial-close{flex:0 0 auto;width:48px;height:48px;border:2px solid rgba(255,255,255,.8);border-radius:12px;background:#fff;color:#0a2e5c;font-size:1.7rem;font-weight:900;line-height:1;cursor:pointer}
      .matching-tutorial-close:focus-visible{outline:4px solid #ffd166;outline-offset:2px}
      .matching-tutorial-content{padding:20px clamp(16px,4vw,34px) 28px;font-size:clamp(.96rem,1.7vw,1.08rem);line-height:1.65}
      .matching-tutorial-content h3{margin:1.5em 0 .55em;color:#123f6b;font-size:clamp(1.08rem,2vw,1.35rem)}
      .matching-tutorial-content h3:first-child{margin-top:0}
      .matching-tutorial-content p{margin:.65em 0}
      .matching-tutorial-content ul,.matching-tutorial-content ol{padding-left:1.35em;margin:.65em 0}
      .matching-tutorial-content li{margin:.38em 0}
      .matching-tutorial-callout{margin:14px 0;padding:14px 16px;border-left:6px solid #ffb703;border-radius:12px;background:#fff8d8}
      .matching-tutorial-rule{margin:14px 0;padding:14px 16px;border:2px solid #8eb5df;border-radius:14px;background:#eef6ff}
      .matching-tutorial-warning{margin:14px 0;padding:14px 16px;border:2px solid #c084fc;border-radius:14px;background:#f6edff}
      .matching-tutorial-keys{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0}
      .matching-tutorial-key{padding:12px;border-radius:12px;text-align:center;font-weight:850;border:2px solid transparent}
      .matching-tutorial-key.green{background:#e9f8ef;color:#086b3a;border-color:#55a879}
      .matching-tutorial-key.purple{background:#f1e4ff;color:#6818a5;border-color:#b96af4}
      .matching-tutorial-key.blue{background:#174a8b;color:#fff;border-color:#0a2e5c}
      .matching-tutorial-example{margin:14px 0;padding:16px;border:1px solid #b7c6d8;border-radius:14px;background:#f7fafc}
      .matching-tutorial-example strong{color:#0a2e5c}
      .matching-tutorial-example code{display:block;margin:7px 0;padding:10px 12px;border-radius:9px;background:#e7eef6;color:#102f52;font:700 .95em/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:normal}
      .matching-tutorial-content details{margin:12px 0;border:1px solid #b7c6d8;border-radius:12px;background:#fff;overflow:hidden}
      .matching-tutorial-content summary{padding:12px 14px;background:#edf3f9;color:#123f6b;font-weight:900;cursor:pointer}
      .matching-tutorial-content details>div{padding:12px 14px}
      .matching-tutorial-bottom{display:block;width:min(100%,360px);min-height:46px;margin:24px auto 0;border:2px solid #0a2e5c;border-radius:12px;background:#174a8b;color:#fff;font-weight:900;font-size:1rem;cursor:pointer}
      .matching-tutorial-bottom:focus-visible{outline:4px solid #ffd166;outline-offset:3px}
      @media(max-width:760px){.response-stage{height:250px!important;flex-basis:250px!important}#matching-tutorial-btn{min-height:42px;margin-top:8px;font-size:.72rem}.matching-tutorial-keys{grid-template-columns:1fr}.matching-tutorial-header{padding:12px}.matching-tutorial-content{padding:16px 14px 24px}}
      @media(min-width:761px){.response-stage{height:272px!important;flex-basis:272px!important}}
    `;
    documentObject.head.appendChild(style);

    const launchButton = documentObject.createElement('button');
    launchButton.id = 'matching-tutorial-btn';
    launchButton.type = 'button';
    launchButton.textContent = 'Matching Tutorial';
    launchButton.setAttribute('aria-haspopup', 'dialog');
    launchButton.setAttribute('aria-controls', 'matching-tutorial-dialog');
    launchButton.setAttribute('aria-expanded', 'false');
    conflictMatrix.insertBefore(launchButton, conflictSubmit);

    const dialog = documentObject.createElement('section');
    dialog.id = 'matching-tutorial-dialog';
    dialog.hidden = true;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'matching-tutorial-title');
    dialog.innerHTML = `
      <article class="matching-tutorial-panel">
        <header class="matching-tutorial-header">
          <h2 id="matching-tutorial-title">Matching Tutorial</h2>
          <button class="matching-tutorial-close" type="button" aria-label="Close Matching Tutorial">×</button>
        </header>
        <div class="matching-tutorial-content">
          <h3>The big idea</h3>
          <p>Each card has <strong>three sentences</strong>. The first two are clues. The third is a claim that may be right or wrong. On every card you make five decisions: three old-card matching decisions, one logic decision, and one whole-card matching decision.</p>
          <div class="matching-tutorial-callout"><strong>Think of it like comparing two little maps.</strong> The letters are name tags. The important thing is the pattern of directions connecting those name tags.</div>

          <h3>What does N-back mean?</h3>
          <p>N tells you which older card to compare with the card you see now.</p>
          <ul>
            <li><strong>1-back:</strong> compare with the card immediately before this one.</li>
            <li><strong>2-back:</strong> skip one card and compare with the card before that.</li>
            <li><strong>3-back:</strong> compare with the card three places earlier.</li>
          </ul>
          <p>During the first N setup cards there is not yet an old target card. For those setup cards, the N-back answers are NO: use S, F, J and N. You still solve the blue K/L logic question.</p>

          <h3>What the colours and keys mean</h3>
          <div class="matching-tutorial-keys">
            <div class="matching-tutorial-key green">GREEN = YES, IT MATCHES<br>A · D · H · SPACEBAR</div>
            <div class="matching-tutorial-key purple">PURPLE = NO, IT DOES NOT MATCH<br>S · F · J · N</div>
            <div class="matching-tutorial-key blue">BLUE = IS STATEMENT 3 LOGICALLY TRUE?<br>K = YES · L = NO</div>
          </div>
          <p>The green and purple buttons compare the current card with the N-back card. The blue buttons ask a different question about the current card only.</p>

          <h3>A match is the same relationship pattern</h3>
          <div class="matching-tutorial-rule">
            <strong>The letters do not have to be the same.</strong> A card using A, B and C can match a card using P, Q and R when one consistent renaming makes the direction pattern the same.
          </div>
          <div class="matching-tutorial-example">
            <strong>Old card</strong>
            <code>A is east of B; C is north of A; C is northeast of B.</code>
            <strong>Current card</strong>
            <code>P is east of Q; R is north of P; R is northeast of Q.</code>
            <p>Use one key: A becomes P, B becomes Q, and C becomes R. Every relationship is preserved, so Statement 1, Statement 2 and Statement 3 all match. Press A, D, H and SPACEBAR.</p>
          </div>

          <h3>The one-key rule: never rename letters differently for different sentences</h3>
          <p>You must choose <strong>one letter mapping</strong> and keep it for all three sentences. You cannot say “A means P” for Statement 1 and then secretly make A mean R for Statement 2. That would be changing the rules halfway through.</p>
          <div class="matching-tutorial-warning"><strong>Important:</strong> three sentences that each look similar on their own may still fail as a group when they require different letter mappings. The game uses one globally consistent, one-to-one mapping.</div>

          <h3>The first two clues may swap places</h3>
          <p>Statement 1 and Statement 2 are both premises, so their order may be exchanged. A current first clue can match the old second clue, while the current second clue matches the old first clue. But each old clue may be used only once.</p>
          <p><strong>Statement 3 is special:</strong> it is the conclusion. A premise cannot trade places with the conclusion.</p>

          <h3>A sentence may be written backwards only when the direction flips</h3>
          <div class="matching-tutorial-example">
            <code>A is east of B.</code>
            <p>means exactly the same thing as:</p>
            <code>B is west of A.</code>
            <p>So those can match. But “B is east of A” is the opposite relationship and does not match.</p>
          </div>
          <p>Directions must be exact. North is not northeast. At 16-direction resolution, north-northeast is not northeast. A close direction is still a different direction.</p>

          <h3>How to answer the three statement-matching pairs</h3>
          <ol>
            <li>Find the correct N-back card.</li>
            <li>Try one consistent letter key between the old card and the current card.</li>
            <li>Allow the first two clues to swap, but do not swap either clue with Statement 3.</li>
            <li>Count a reversed sentence only when its direction is also reversed correctly.</li>
            <li>Press the green key when that statement matches under the shared key; press the purple key when it does not.</li>
          </ol>
          <p>The computer chooses the best valid shared mapping. Your job is to reason as though all three statement decisions must belong to one coherent comparison, not three unrelated guesses.</p>

          <h3>The blue K/L question: is Statement 3 entailed?</h3>
          <p>For this question, forget the old N-back card. Use only the current card’s first two clues. Imagine every direction as one equal-sized step on a map, join the two steps, and ask whether the third sentence gives the exact direction between the two end letters.</p>
          <div class="matching-tutorial-example">
            <code>P is east of Q; R is north of P; R is northeast of Q.</code>
            <p>Start at Q. Move east to P, then north to R. R ends northeast of Q. Statement 3 is forced by the clues, so press <strong>K</strong>.</p>
          </div>
          <div class="matching-tutorial-example">
            <code>H is east of M; H is west of E; M is north of E.</code>
            <p>The first two clues put M to the west, H in the middle, and E to the east. They do not put M north of E. Statement 3 is not forced, so press <strong>L</strong>.</p>
          </div>
          <p>The conclusion must describe the two end letters of the three-letter chain. A wrong pair of letters, a reversed direction, or even a neighbouring compass direction makes the answer L.</p>

          <h3>Statement 3 matching and Statement 3 truth are separate</h3>
          <div class="matching-tutorial-warning">
            <p><strong>H/J asks:</strong> “Does the current third sentence match the old third sentence?”</p>
            <p><strong>K/L asks:</strong> “Is the current third sentence logically proved by the current first two clues?”</p>
          </div>
          <p>This means H and L can both be correct: the current third sentence may perfectly match an old false third sentence. J and K can also both be correct: the current conclusion may be logically true but different from the old conclusion.</p>

          <h3>The complete-triad decision</h3>
          <p>Press <strong>SPACEBAR</strong> only when all three statements match the N-back card under one consistent mapping. Press <strong>N</strong> when even one statement fails.</p>
          <div class="matching-tutorial-rule"><strong>Two out of three is still NO for the whole triad.</strong> The game deliberately creates near-misses where two statements match and only one tiny relation changes.</div>
          <p>The blue K/L answer does not itself decide the whole-triad match. K/L checks truth inside the current card; SPACEBAR/N checks whether the current three-statement structure matches the old card.</p>

          <h3>Do not use repeated letters as a shortcut</h3>
          <p>The game may keep letters from recent cards to create interference. A repeated letter does not prove a match, and a new letter does not prove a non-match. Always inspect the complete relation pattern.</p>

          <h3>Worked near-miss</h3>
          <div class="matching-tutorial-example">
            <strong>Old card</strong>
            <code>A is east of B; C is north of A; C is northeast of B.</code>
            <strong>Current card</strong>
            <code>P is east of Q; R is north of P; R is east of Q.</code>
            <p>With A→P, B→Q and C→R, the first two statements match. The third does not: northeast changed to east. Answer A, D, J and N. The current clues prove that R is northeast of Q, not east, so answer L for the blue question.</p>
          </div>

          <h3>A six-step recipe for every card</h3>
          <ol>
            <li><strong>Find the target:</strong> go back exactly N cards.</li>
            <li><strong>Build one letter key:</strong> map the three old letters to the three current letters.</li>
            <li><strong>Check the two premises:</strong> allow them to swap and allow correct reversed wording.</li>
            <li><strong>Check Statement 3:</strong> keep the same letter key and keep it in the conclusion role.</li>
            <li><strong>Solve the current logic:</strong> use the two current clues to choose K or L.</li>
            <li><strong>Judge the whole triad:</strong> SPACEBAR only if all three statement matches are yes; otherwise N.</li>
          </ol>

          <h3>Quick practice</h3>
          <details>
            <summary>Practice 1: Same structure, different letters</summary>
            <div><p>Old: A north of B; C east of A; C northeast of B.</p><p>Current: P north of Q; R east of P; R northeast of Q.</p><p><strong>Answer:</strong> all three statements match and the complete triad matches. The current conclusion is also entailed. Use A, D, H, K and SPACEBAR.</p></div>
          </details>
          <details>
            <summary>Practice 2: Correct reversal</summary>
            <div><p>Old Statement: A east of B.</p><p>Current Statement: Q west of P.</p><p>With A→P and B→Q, these are the same relation written backwards. It is a match.</p></div>
          </details>
          <details>
            <summary>Practice 3: Two matches are not a complete match</summary>
            <div><p>If Statement 1 and Statement 2 match but Statement 3 does not, choose the two green premise keys, choose J for Statement 3, and choose N for the complete triad.</p></div>
          </details>
          <details>
            <summary>Practice 4: Matching is not the same as truth</summary>
            <div><p>A third statement can match the old third statement and still be logically false in both cards. In that case choose H for the N-back match and L for entailment.</p></div>
          </details>

          <button class="matching-tutorial-bottom" type="button">Close Matching Tutorial</button>
        </div>
      </article>
    `;
    documentObject.body.appendChild(dialog);

    const closeButtons = dialog.querySelectorAll('.matching-tutorial-close,.matching-tutorial-bottom');
    let previousFocus = null;

    const focusable = () => [...dialog.querySelectorAll('button:not([disabled]),summary,[href],[tabindex]:not([tabindex="-1"])')]
      .filter(element => !element.hidden && element.offsetParent !== null);

    const openTutorial = () => {
      previousFocus = documentObject.activeElement;
      dialog.hidden = false;
      documentObject.body.classList.add('matching-tutorial-open');
      launchButton.setAttribute('aria-expanded', 'true');
      root.requestAnimationFrame(() => dialog.querySelector('.matching-tutorial-close')?.focus());
    };

    const closeTutorial = () => {
      if (dialog.hidden) return;
      dialog.hidden = true;
      documentObject.body.classList.remove('matching-tutorial-open');
      launchButton.setAttribute('aria-expanded', 'false');
      if (previousFocus && documentObject.contains(previousFocus)) previousFocus.focus();
      else launchButton.focus();
    };

    launchButton.addEventListener('click', openTutorial);
    launchButton.addEventListener('keydown', event => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        event.stopImmediatePropagation();
        openTutorial();
      }
    }, true);
    closeButtons.forEach(button => button.addEventListener('click', closeTutorial));
    dialog.addEventListener('click', event => {
      if (event.target === dialog) closeTutorial();
    });

    documentObject.addEventListener('keydown', event => {
    if (dialog.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeTutorial();
      return;
    }
    if (event.key === 'Tab') {
      event.stopImmediatePropagation();
      const elements = focusable();
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && documentObject.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && documentObject.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if ((event.key === ' ' || event.key === 'Enter') && dialog.contains(event.target)) {
      const interactive = event.target.closest?.('button,summary');
      if (interactive) {
        event.preventDefault();
        event.stopImmediatePropagation();
        interactive.click();
        return;
      }
    }
    const gameKeys = new Set(['a','s','d','f','h','j','k','l','n','p',' ']);
    if (gameKeys.has(event.key.toLowerCase())) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  root.openMatchingTutorial = openTutorial;
    root.closeMatchingTutorial = closeTutorial;
    root.__matchingTutorialInstalled = true;
  };

  if (root.document?.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', initialise, { once: true });
  else initialise();
})(typeof window !== 'undefined' ? window : globalThis);
