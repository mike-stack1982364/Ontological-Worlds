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
      #matching-tutorial-btn{display:flex;align-items:center;justify-content:center;width:min(100%,620px);min-height:68px;margin:10px auto 6px;padding:14px 18px;border:2px solid #8a4b08;border-radius:14px;background:linear-gradient(135deg,#fff3b0 0%,#ffd166 52%,#ffb703 100%);color:#2f1a00;font-size:clamp(.86rem,1.2vw,1.06rem);font-weight:950;line-height:1.2;letter-spacing:.055em;text-transform:uppercase;box-shadow:0 6px 16px rgba(138,75,8,.27);cursor:pointer;touch-action:manipulation}
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
      .matching-tutorial-keys{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin:14px 0}
      .matching-tutorial-key{padding:12px;border-radius:12px;text-align:center;font-weight:850;border:2px solid transparent}
      .matching-tutorial-key.green{background:#D9F0FF;color:#08385F;border-color:#5AB5E6}
      .matching-tutorial-key.statement-purple{background:#123A6D;color:#FFFFFF;border-color:#082A52}
      .matching-tutorial-key.light-purple{background:#F1E4FF;color:#6818A5;border-color:#B96AF4}
      .matching-tutorial-key.icy-blue{background:#DDF7E8;color:#075A37;border-color:#58B883}
      .matching-tutorial-key.ocean-blue{background:#0B5D3B;color:#FFFFFF;border-color:#063B27}
      .matching-tutorial-key.dark-purple{background:#4C1D95;color:#FFFFFF;border-color:#2E1065}
      .matching-tutorial-example{margin:14px 0;padding:16px;border:1px solid #b7c6d8;border-radius:14px;background:#f7fafc}
      .matching-tutorial-example strong{color:#0a2e5c}
      .matching-tutorial-example code{display:block;margin:7px 0;padding:10px 12px;border-radius:9px;background:#e7eef6;color:#102f52;font:700 .95em/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:normal}
      .matching-tutorial-content details{margin:12px 0;border:1px solid #b7c6d8;border-radius:12px;background:#fff;overflow:hidden}
      .matching-tutorial-content summary{padding:12px 14px;background:#edf3f9;color:#123f6b;font-weight:900;cursor:pointer}
      .matching-tutorial-content details>div{padding:12px 14px}
      .matching-tutorial-bottom{display:block;width:min(100%,360px);min-height:46px;margin:24px auto 0;border:2px solid #0a2e5c;border-radius:12px;background:#174a8b;color:#fff;font-weight:900;font-size:1rem;cursor:pointer}
      .matching-tutorial-bottom:focus-visible{outline:4px solid #ffd166;outline-offset:3px}
      @media(max-width:760px){.response-stage{height:278px!important;flex-basis:278px!important}#matching-tutorial-btn{min-height:62px;margin-top:8px;padding:12px 16px;font-size:.78rem}.matching-tutorial-keys{grid-template-columns:1fr}.matching-tutorial-header{padding:12px}.matching-tutorial-content{padding:16px 14px 24px}}
      @media(min-width:761px){.response-stage{height:300px!important;flex-basis:300px!important}}
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
          <p>Each card has <strong>three equal-status relational statements</strong>. Every statement participates in the N-back comparison; none is a conclusion or has a special historical position. The existing matrix has five decisions: three N-back statement decisions, one separate current-card entailment check, and one complete-triad decision.</p>
          <div class="matching-tutorial-callout"><strong>Think of two little maps.</strong> The letters are name tags. A match is about whether the same directional structure can be found on both maps using one consistent key.</div>

          <h3>What does N-back mean?</h3>
          <p>N tells you exactly which older card to compare with the card on the screen.</p>
          <ul>
            <li><strong>1-back:</strong> compare with the card immediately before this one.</li>
            <li><strong>2-back:</strong> skip one card and compare with the card before that.</li>
            <li><strong>3-back:</strong> compare with the card three places earlier.</li>
          </ul>
          <p>During the first N setup cards there is no target card yet. On those setup cards, all four N-back answers are NO: use the dark-blue S, F and J buttons, plus the light-purple N button. You still solve the current-card logic question with light-green K for YES or dark-green L for NO.</p>

          <h3>What the colours and keys mean</h3>
          <div class="matching-tutorial-keys">
            <div class="matching-tutorial-key green"><strong>A · D · H</strong><br>LIGHT BLUE = THIS STATEMENT MATCHES</div>
            <div class="matching-tutorial-key statement-purple"><strong>S · F · J</strong><br>DARK BLUE = THIS STATEMENT DOES NOT MATCH</div>
            <div class="matching-tutorial-key light-purple"><strong>N</strong><br>LIGHT PURPLE = THE WHOLE TRIAD DOES NOT MATCH</div>
            <div class="matching-tutorial-key icy-blue"><strong>K</strong><br>LIGHT GREEN = STATEMENT 3 IS EXACTLY ENTAILED</div>
            <div class="matching-tutorial-key ocean-blue"><strong>L</strong><br>DARK GREEN = STATEMENT 3 IS NOT ENTAILED</div>
            <div class="matching-tutorial-key dark-purple"><strong>SPACEBAR</strong><br>DEEP PURPLE = THE WHOLE TRIAD MATCHES</div>
          </div>
          <p><strong>Each colour has one fixed job.</strong> Light-blue A/D/H and dark-blue S/F/J answer the three statement-match questions. Light-green K and dark-green L answer the current-card entailment question. Deep-purple SPACEBAR and light-purple N answer the complete-triad question.</p>
          <div class="matching-tutorial-callout"><strong>Do not use colour alone as a shortcut.</strong> YES has different colours for different questions: light blue for a statement match, light green for correct entailment, and dark purple for a complete-triad match.</div>

          <h3>The five exact questions</h3>
          <ol>
            <li><strong>A or S:</strong> Does current Statement 1 match any old statement under the shared alignment?</li>
            <li><strong>D or F:</strong> Does current Statement 2 match an unused old statement under that same alignment?</li>
            <li><strong>H or J:</strong> Does current Statement 3 match the remaining old statement under that same alignment?</li>
            <li><strong>K or L:</strong> Is current Statement 3 the exact end-to-end relation forced by current Statements 1 and 2?</li>
            <li><strong>SPACEBAR or N:</strong> Do all three current statements match the N-back card together?</li>
          </ol>
          <div class="matching-tutorial-warning"><strong>One comparison controls A/S, D/F and H/J.</strong> You may not use one letter key for Statement 1, a different key for Statement 2, and another key for Statement 3.</div>

          <h3>A match is the same relationship pattern</h3>
          <div class="matching-tutorial-rule"><strong>The letters do not have to be the same.</strong> A card using A, B and C can match a card using P, Q and R when one consistent renaming preserves the directional structure.</div>
          <div class="matching-tutorial-example">
            <strong>Old card</strong>
            <code>A is east of B; C is north of A; C is northeast of B.</code>
            <strong>Current card</strong>
            <code>P is east of Q; R is north of P; R is northeast of Q.</code>
            <p>Use one key: A→P, B→Q and C→R. All three statements match. The separate K/L check is also YES: current Statements 1 and 2 imply Statement 3 under the equal-step rule. Press <strong>A, D, H, K and SPACEBAR</strong>.</p>
          </div>

          <h3>The one-key, one-to-one rule</h3>
          <p>You must choose <strong>one letter mapping</strong> and keep it for all three statements. “One-to-one” means each old letter maps to one different current letter, and no two old letters are allowed to become the same current letter.</p>
          <p>You cannot say “A means P” for Statement 1 and then secretly make A mean R for Statement 2. That would be changing the rules halfway through.</p>
          <div class="matching-tutorial-warning"><strong>Important:</strong> three statements may each look similar by themselves but still fail as a group when they require incompatible letter mappings. The game scores the single best valid shared alignment, not three unrelated guesses.</div>

          <h3>All three statements may change places for N-back</h3>
          <p>Any current statement may match any old statement. For example, current Statement 1 may match old Statement 3, current Statement 2 old Statement 1, and current Statement 3 old Statement 2. Each old statement may be used only once, under one shared letter mapping.</p>
          <p><strong>K/L is a separate question:</strong> it still checks whether current Statements 1 and 2 entail current Statement 3. That inference role does not restrict N-back matching.</p>
          <div class="matching-tutorial-example">
            <strong>Old card</strong>
            <code>A is east of B; C is north of A; C is northeast of B.</code>
            <strong>Current card — all three positions changed (16-direction example)</strong>
            <code>R is northeast of Q; P is east of Q; R is north of P.</code>
            <p>With A→P, B→Q and C→R, the old third statement is now first, the old first is second, and the old second is third. All three N-back answers are YES. Press <strong>A, D, H and SPACEBAR</strong>. For the separate equal-step check on the current first two statements, choose <strong>L</strong>: they imply R north-northwest of P, not north. This does not cancel any N-back match.</p>
          </div>

          <h3>A sentence may be written backwards only when the direction flips</h3>
          <div class="matching-tutorial-example">
            <code>A is east of B.</code>
            <p>means exactly the same thing as:</p>
            <code>B is west of A.</code>
            <p>Under the fixed letter key A→A and B→B, these are equivalent. “B is east of A” is the opposite relation under that same key. A different global renaming may still align a whole card; judge it against every statement, not this sentence alone.</p>
          </div>
          <p>Directions must be exact. North is not northeast. At 16-direction resolution, north-northeast is not northeast. A nearby direction is still a different direction.</p>

          <h3>How to answer A/S, D/F and H/J</h3>
          <ol>
            <li>Find the card exactly N places back.</li>
            <li>Try one one-to-one letter key between the old card and the current card.</li>
            <li>Try all six one-to-one assignments of the three old statements to the three current statements.</li>
            <li>Use each old statement once. Current Statement 3 can match old Statement 1, 2 or 3, just like every other statement.</li>
            <li>Count reversed wording only when the letters swap and the compass direction becomes its exact opposite.</li>
            <li>Use the light-blue A, D or H button when that current statement matches under the shared alignment; use the dark-blue S, F or J button when it does not.</li>
          </ol>
          <p>The game checks all valid one-to-one letter mappings and all six statement assignments, then scores the single best valid shared alignment with the greatest number of matching statements. If equally good alignments give different answer sets, compare them from Statement 1 onward and prefer <strong>No at the first difference</strong>. For example, [No, Yes, Yes] wins over [Yes, No, Yes]. Apply the winning alignment to all three answers; this tie rule does not affect K/L.</p>

          <h3>The light-green K / dark-green L question: the separate current-card entailment check</h3>
          <p>K/L preserves the matrix’s existing additional logic question. It does not determine any N-back answer. For this check only, use current Statements 1 and 2 to evaluate Statement 3. Statements 1 and 2 must form one connected three-letter chain. Find the two end letters, combine the two equal-sized direction steps, and ask whether Statement 3 gives the exact direction from its object to its subject.</p>
          <div class="matching-tutorial-example">
            <code>P is east of Q; R is north of P; R is northeast of Q.</code>
            <p>Start at Q. Move east to P, then north to R. R ends northeast of Q. Statement 3 uses the two end letters and gives the exact relation, so press <strong>K</strong>.</p>
          </div>
          <div class="matching-tutorial-example">
            <code>H is east of M; H is west of E; M is north of E.</code>
            <p>Current Statements 1 and 2 place M west of H and H west of E. They do not place M north of E. Statement 3 gives the wrong direction, so press <strong>L</strong>.</p>
          </div>
          <div class="matching-tutorial-example">
            <code>A is east of B; C is north of A; C is north of A.</code>
            <p>Statement 3 repeats Statement 2, but it uses C and A rather than the two end letters C and B. The K/L check requires the composed end-to-end relation, so press <strong>L</strong>.</p>
          </div>
          <p>For K/L, the wrong endpoint pair, a reversal without the opposite direction, or even a neighbouring compass direction makes the answer L. If Statements 1 and 2 do not establish an exact end-to-end compass bearing—for example, their steps place both end letters at the same point—choose L. The N-back comparison still uses all three statements as written. This separate diagnostic does not privilege Statement 3 in the historical comparison.</p>

          <h3>Statement 3 matching and Statement 3 entailment are separate</h3>
          <div class="matching-tutorial-warning">
            <p><strong>H/J asks:</strong> “Does current Statement 3 match any old statement under the shared N-back alignment?”</p>
            <p><strong>K/L asks:</strong> “Does current Statement 3 give the exact end-to-end relation implied by current Statements 1 and 2 under the equal-step rule?”</p>
          </div>
          <p>H and L can both be correct: the current third statement can match any old statement while failing the separate current-card check. J and K can both be correct: current Statement 3 can pass that check while failing the best shared N-back alignment.</p>

          <h3>The complete-triad decision</h3>
          <p>Press the <strong>dark-purple SPACEBAR</strong> only when all three statement matches are YES under one consistent mapping and one one-to-one assignment of all three statements. Press the <strong>light-purple N</strong> when even one statement fails.</p>
          <div class="matching-tutorial-rule"><strong>Two out of three is still NO for the whole triad.</strong> The game deliberately creates close near-misses where exactly one relation changes.</div>
          <p>The light-green K / dark-green L pair does not decide the complete-triad answer. It checks the current card’s end-to-end logic. The dark-purple SPACEBAR / light-purple N pair checks whether the current three-statement structure matches the N-back card.</p>

          <h3>Do not use repeated letters as a shortcut</h3>
          <p>The game may keep letters from recent cards to create interference. A repeated letter does not prove a match, and a new letter does not prove a non-match. Always test the complete directional pattern using one shared alignment.</p>

          <h3>Worked near-miss</h3>
          <div class="matching-tutorial-example">
            <strong>Old card</strong>
            <code>A is east of B; C is north of A; C is northeast of B.</code>
            <strong>Current card</strong>
            <code>P is east of Q; R is north of P; R is east of Q.</code>
            <p>With A→P, B→Q and C→R, current Statements 1 and 2 match, but current Statement 3 does not: northeast changed to east. For the separate K/L check, current Statements 1 and 2 imply northeast, not east. Press <strong>A, D, J, L and N</strong>.</p>
          </div>

          <h3>A six-step recipe for every card</h3>
          <ol>
            <li><strong>Find the target:</strong> go back exactly N cards.</li>
            <li><strong>Build one key:</strong> map the three old letters one-to-one onto the three current letters.</li>
            <li><strong>Pair every statement:</strong> try all six assignments, including old Statement 3 in current position 1 or 2. Use each old statement once.</li>
            <li><strong>Select the best alignment:</strong> maximize matching statements, then use the No-first tie rule. Answer A/S, D/F and H/J from that one alignment.</li>
            <li><strong>Solve K/L:</strong> independently use current Statements 1 and 2 to check the end-to-end relation in Statement 3.</li>
            <li><strong>Judge the whole triad:</strong> SPACEBAR only if A, D and H are all the correct statement-match answers; otherwise N.</li>
          </ol>

          <h3>Quick practice</h3>
          <details>
            <summary>Practice 1: Same structure, different letters</summary>
            <div><p>Old: A north of B; C east of A; C northeast of B.</p><p>Current: P north of Q; R east of P; R northeast of Q.</p><p><strong>Answer:</strong> A, D, H, K and SPACEBAR.</p></div>
          </details>
          <details>
            <summary>Practice 2: Correct reversal</summary>
            <div><p>Old statement: A east of B.</p><p>Current statement: Q west of P.</p><p>With A→P and B→Q, these are the same relation written backwards. It is a match.</p></div>
          </details>
          <details>
            <summary>Practice 3: The old third statement may become first</summary>
            <div><p>Current Statements 1, 2 and 3 may match old Statements 3, 1 and 2 under one shared letter key. Choose A, D, H and SPACEBAR. Solve K/L separately from the current first two statements.</p></div>
          </details>
          <details>
            <summary>Practice 4: Two matches are not a complete match</summary>
            <div><p>If Statements 1 and 2 match but Statement 3 does not, choose A, D, J and N. Choose K or L separately by solving the current card’s end-to-end relation.</p></div>
          </details>
          <details>
            <summary>Practice 5: Matching is not the same as entailment</summary>
            <div><p>A third statement can match any old statement and still fail the separate current-card entailment check. In that case choose H for N-back matching and L for entailment.</p></div>
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
