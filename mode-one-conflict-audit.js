'use strict';

const core = require('./mode-one-spatial-core.js');
global.__modeOneTriadicEntailmentCore = core;
global.__modeOneSpatialCore = core;
const conflict = require('./mode-one-conflict-matrix-v20.js');

const iterations = Number(process.argv[2] || 500);
const result = conflict.runConflictAudit(iterations);
console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exit(1);
