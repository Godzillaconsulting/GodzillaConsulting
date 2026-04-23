fetch('https://godzillaconsulting.ai/admin')
  .then(r => r.text())
  .then(h => {
    const match = h.match(/src=\"(\/assets\/AdminStudio-[^\"]+\.js)\"/);
    if (match) {
      console.log('Found JS:', match[1]);
      fetch('https://godzillaconsulting.ai' + match[1])
        .then(r => r.text())
        .then(js => {
          console.log('Size:', js.length);
          const VIndex = js.indexOf('const V=');
          console.log('V is defined around:', js.substring(Math.max(0, VIndex - 50), VIndex + 50));
        });
    } else {
      console.log('No match');
    }
  });
