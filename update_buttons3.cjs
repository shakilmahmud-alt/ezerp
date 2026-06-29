const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.jsx')) {
          arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const files = getAllFiles(srcDir);
let changedFiles = 0;

files.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    const buttonRegex = /<button([\s\S]*?)>([\s\S]*?)<\/button>/g;

    content = content.replace(buttonRegex, (match, attrs, text) => {
        let strippedText = text.replace(/<[^>]*>/g, '').trim().toLowerCase();
        let targetClass = '';

        // If it's already got btn-theme or btn-danger, leave it or let it be
        if (attrs.includes('btn-theme') || attrs.includes('btn-danger')) {
            // Already handled by previous script, but maybe we want to catch unhandled ones
            // Actually, previous script did some. Let's make sure ALL generic ones get btn-theme
            // Wait, what if it has btn-theme but we want it to be btn-danger?
        }

        // Catch words that mean danger
        if (['cancel', 'close', 'delete', 'remove', 'x', 'clear'].includes(strippedText) || strippedText.includes('cancel') || strippedText.includes('delete') || strippedText.includes('remove')) {
            targetClass = 'btn-danger';
        } else if (strippedText.length > 0 && !strippedText.includes('action') && !strippedText.includes('status') && strippedText !== 'x' && strippedText !== '«' && strippedText !== '»' && isNaN(strippedText)) {
            // If it's not empty, not action, not a pagination number, make it theme!
            targetClass = 'btn-theme';
        }

        if (targetClass) {
            if (/className=["']/.test(attrs)) {
                if (!attrs.includes(targetClass)) {
                   // if it has the OTHER class, remove it (e.g. changing theme to danger)
                   if (targetClass === 'btn-theme') attrs = attrs.replace('btn-danger', '');
                   if (targetClass === 'btn-danger') attrs = attrs.replace('btn-theme', '');
                   
                   attrs = attrs.replace(/className=["']([^"']*)["']/, `className="$1 ${targetClass}"`);
                }
            } else {
                attrs = ` className="${targetClass}"` + attrs;
            }
        }

        return `<button${attrs}>${text}</button>`;
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        changedFiles++;
        console.log(`Updated ${path.basename(filePath)}`);
    }
});

console.log(`Successfully updated ${changedFiles} files.`);
