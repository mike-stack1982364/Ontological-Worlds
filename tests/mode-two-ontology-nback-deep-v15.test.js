'use strict';
const assert = require('assert');
const path = require('path');
const core = require(path.join(__dirname,'..','mode-one-spatial-core.js'));
const modeTwo = require(path.join(__dirname,'..','mode-two-ontology-nback-v14.js'));

function perms(values) {
  if (values.length < 2) return [values.slice()];
  return values.flatMap((v,i) => perms(values.slice(0,i).concat(values.slice(i+1))).map(rest => [v,...rest]));
}
function letters(trial) { return [...new Set([...trial.premises,trial.conclusion].flatMap(s => [s.subject,s.object]))]; }
function oracleStatement(s,map) {
  const direct = `${map[s.subject]}>${s.relation}>${map[s.object]}`;
  const inverse = `${map[s.object]}>${core.opposite(s.relation)}>${map[s.subject]}`;
  return direct < inverse ? direct : inverse;
}
function oracleSignature(trial) {
  const source = letters(trial);
  if (source.length !== 3) throw new Error('oracle expects three letters');
  return perms(['A','B','C']).map(labels => {
    const map = Object.fromEntries(source.map((letter,i) => [letter,labels[i]]));
    const premises = trial.premises.map(s => oracleStatement(s,map)).sort();
    return `${premises.join('&')}|${oracleStatement(trial.conclusion,map)}`;
  }).sort()[0];
}
function oracleCompare(target,current) { return oracleSignature(target) === oracleSignature(current); }

class Rng {
  constructor(seed) { this.s = seed >>> 0; }
  next() { let v = this.s += 1831565813; v = Math.imul(v ^ v >>> 15,1|v); v ^= v + Math.imul(v ^ v >>> 7,61|v); return ((v ^ v >>> 14) >>> 0) / 4294967296; }
  pick(values) { return values[Math.floor(this.next() * values.length)]; }
  shuffle(values) { const out=[...values]; for(let i=out.length-1;i>0;i--){const j=Math.floor(this.next()*(i+1));[out[i],out[j]]=[out[j],out[i]];} return out; }
}

let generatedChecks = 0;
let matchChecks = 0;
let lureChecks = 0;
let ontologyNeutralityChecks = 0;
let historyChecks = 0;

for (const level of modeTwo.LEVELS) {
  for (let seed = 1; seed <= 256; seed++) {
    const rng = new Rng(0x70000000 + level * 1000 + seed);
    const history = Array.from({length:level},() => modeTwo.generateTrial(rng,{matchProbability:rng.next()<0.5?1:0}));
    for (let index = 0; index < 128; index++) {
      const requestedMatch = index % 2 === 0;
      const target = history[history.length-level];
      const current = modeTwo.generateNBackTrial(rng,target,{match:requestedMatch,nBackLevel:level});
      const oracle = oracleCompare(target,current);
      assert.strictEqual(modeTwo.compare(target,current).isMatch,oracle);
      assert.strictEqual(oracle,requestedMatch);
      assert.strictEqual(modeTwo.relationalSignature(current).replace(/^MODE2-COMPLETE-RELATIONAL-NBACK-V3\|/,''),oracleSignature(current).replace('|','|'));
      generatedChecks++;
      requestedMatch ? matchChecks++ : lureChecks++;
      if (!requestedMatch) {
        assert.strictEqual(current.partialStatementCompatibility,2);
        assert.ok(current.interferenceSlot >= 1 && current.interferenceSlot <= 3);
      }
      const metadata = JSON.parse(JSON.stringify(current));
      metadata.ontologyCategories = ['All','Action','Division'];
      metadata.order = metadata.order === 'IO' ? 'OI' : 'IO';
      assert.strictEqual(oracleCompare(target,metadata),oracle);
      assert.strictEqual(modeTwo.compare(target,metadata).isMatch,oracle);
      ontologyNeutralityChecks++;
      history.push(current);
      const result = modeTwo.evaluateHistory(history,history.length-1,level);
      assert.strictEqual(result.targetIndex,history.length-1-level);
      assert.strictEqual(result.isMatch,requestedMatch);
      historyChecks++;
    }
  }
}

for (const trial of core.canonicalTrials()) {
  assert.strictEqual(modeTwo.evaluate(trial).isMatch,trial.expected);
}

const audit = modeTwo.runExhaustiveAudit(16384);
assert.strictEqual(audit.passed,true,JSON.stringify(audit.failures));
assert.strictEqual(audit.totalEvaluations,131072);
assert.strictEqual(audit.matches,65536);
assert.strictEqual(audit.nonMatches,65536);
assert.strictEqual(audit.partialLureChecks,65536);

console.log(JSON.stringify({
  passed:true,generatedChecks,matchChecks,lureChecks,ontologyNeutralityChecks,historyChecks,
  audit:{totalEvaluations:audit.totalEvaluations,matches:audit.matches,nonMatches:audit.nonMatches,partialLureChecks:audit.partialLureChecks}
},null,2));