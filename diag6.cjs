const fs = require('fs');
let content = fs.readFileSync('src/components/AutomationFlow.jsx', 'utf8');
const lines = content.split('\n');

// Line 1473 (0-indexed: 1472) has an extra )}
// Context: this is the end of the NEW WA block, followed immediately by Email Worker
// The block structure in the file now has:
//   line 1432: {... && (    <- NEW block opens
//   line 1471:   )}         <- inner schedule block closes  
//   line 1472: </div>       <- container div closes
//   line 1473: )}           <- NEW block closes <-- THIS IS THE PROBLEM LINE, 1 extra }
// Then Email Worker starts at 1475

// Let's check: is there actually a preceding {  that opened this outer block?
// Print lines 1425-1435
console.log('Lines 1425-1435:');
lines.slice(1424, 1435).forEach((l, i) => console.log(1425+i, ':', l));
console.log('\nLines 1470-1478:');
lines.slice(1469, 1478).forEach((l, i) => console.log(1470+i, ':', l));
