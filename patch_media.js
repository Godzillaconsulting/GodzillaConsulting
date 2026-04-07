import fs from 'fs';

let content = fs.readFileSync('server/routes/media.js', 'utf8');

// 1. Update fileFilter
content = content.replace(
    "if (file.mimetype.startsWith('video/')) cb(null, true);",
    "if (file.mimetype.startsWith('video/') || file.originalname.match(/\\.(pdf|doc|docx|xls|xlsx|ppt|pptx|csv)$/i)) cb(null, true);"
);
content = content.replace(
    "cb(new Error('Solo se aceptan videos en esta ruta.'));",
    "cb(new Error('Solo se aceptan videos o documentos.'));"
);

// 2. Update reading directory
content = content.replace(
    "const videoExts = /\\.(mp4|webm|mov|avi|mkv)$/i;",
    "const videoExts = /\\.(mp4|webm|mov|avi|mkv|pdf|doc|docx|xls|xlsx|ppt|pptx|csv)$/i;\n            const docExts = /\\.(pdf|doc|docx|xls|xlsx|ppt|pptx|csv)$/i;"
);

content = content.replace(
    "type: 'videos',",
    "type: docExts.test(f) ? 'document' : 'videos',"
);

// 3. Update return json list
content = content.replace(
    "res.json({\n            success: true,\n            files: [...images, ...videos]\n        });",
    `res.json({
            success: true,
            files: [...images, ...videos]
        });`
);

fs.writeFileSync('server/routes/media.js', content, 'utf8');
console.log('Patched media.js successfully!');
