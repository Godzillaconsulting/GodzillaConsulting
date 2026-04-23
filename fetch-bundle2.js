fetch('https://godzillaconsulting.ai/admin').then(r=>r.text()).then(h=> { 
  const match = h.match(/\/assets\/index-[^\"]+\.js/); 
  const matchAdmin = h.match(/\/assets\/AdminStudio-[^\"]+\.js/);
  const bundle = matchAdmin ? matchAdmin[0] : (match ? match[0] : null);
  if (bundle) { 
    console.log('Fetching', bundle);
    fetch('https://godzillaconsulting.ai' + bundle).then(r=>r.text()).then(js => { 
      console.log('Has getIcons:', js.includes('getIcons')); 
      console.log('Has const ICONS:', js.includes('const ICONS')); 
    }); 
  } else {
    console.log('No bundle found in HTML', h.substring(0, 500));
  }
})
