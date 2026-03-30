const fs = require('fs');

const workspaces = [
  'd:/Godzilla Co/Godzilla Consulting/Página web/Vercel/godzilla-app/src/components/',
  'c:/Users/jesus/GodzillaConsulting/src/components/'
];

workspaces.forEach(ws => {
  let botsPath = ws + 'Bots.jsx';
  if (fs.existsSync(botsPath)) {
      let content = fs.readFileSync(botsPath, 'utf8');

      // 1. Fixing container padding completely natively so it doesn't clip on taller accordion variants
      content = content.replace(
          'className="w-full md:w-1/3 bg-[#CC0000] flex flex-col justify-center items-center py-16 md:py-0 px-8 lg:px-12"',
          'className="w-full md:w-1/3 bg-[#CC0000] flex flex-col justify-center items-center py-16 md:py-24 px-8 lg:px-12"'
      );

      // 2. Ensuring the text doesn't arbitrarily constrain itself so accordion buttons don't clip
      content = content.replace(
          'className="max-w-xs flex flex-col items-center text-center"',
          'className="w-full max-w-sm flex flex-col items-center text-center"'
      );

      fs.writeFileSync(botsPath, content, 'utf8');
      console.log('Successfully updated padding in ' + botsPath);
  }
});
