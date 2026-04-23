const xlsx = require('xlsx');
const fs = require('fs');

const workbook = xlsx.readFile('Calendario_Marketing_30_Dias_Prompts_Detallados.xlsx');
const sheet_name_list = workbook.SheetNames;
console.log("Sheets:", sheet_name_list);

const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
console.log("Total rows:", data.length);
console.log("Headers:", Object.keys(data[0] || {}));
console.log("First 2 rows:", JSON.stringify(data.slice(0, 2), null, 2));
