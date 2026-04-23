fetch('https://godzillaconsulting.ai/admin').then(r=>r.text()).then(h=> { 
  const match = h.match(/\/assets\/index-[a-zA-Z0-9_-]+\.js/); 
  if (match) { 
    fetch('https://godzillaconsulting.ai' + match[0]).then(r=>r.text()).then(js => { 
      const m2 = js.match(/\"(\/assets\/AdminStudio-[a-zA-Z0-9_-]+\.js)\"/); 
      if(m2) { 
        console.log('Found AdminStudio:', m2[1]);
        fetch('https://godzillaconsulting.ai' + m2[1]).then(r=>r.text()).then(ajs => { 
          console.log('Has getIcons:', ajs.includes('getIcons')); 
          console.log('Has const ICONS:', ajs.includes('const ICONS')); 
        }); 
      } else {
        console.log('AdminStudio chunk not found in index'); 
      }
    }); 
  } 
})
