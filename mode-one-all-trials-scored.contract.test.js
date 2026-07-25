'use strict';
const fs=require('fs');
const source=fs.readFileSync('mode-one-conflict-matrix-v20.js','utf8');
const required=[
  'nBackWarmup:true,scored:true',
  'conflictResponseVector:[false,false,false,entailment.isEntailed,false]',
  'this.awaiting=true',
  'if(responses[index]!==null)return',
  'showButtonFeedback(button,responses[index]===expected)'
];
for(const token of required){ if(!source.includes(token)) throw new Error(`Missing contract: ${token}`); }
if(source.includes('nBackWarmup:true,scored:false')) throw new Error('Warm-up trials still disabled.');
if(source.includes('this.awaiting=Boolean(trial.scored)')) throw new Error('Awaiting still gated by scored flag.');
console.log('All Mode 1 trials expose five independently scored decisions.');
