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

        if (strippedText.includes('edit') || strippedText.includes('action') || strippedText.includes('status') || strippedText === '«' || strippedText === '»' || strippedText === '' || (!isNaN(strippedText) && strippedText !== '')) {
            targetClass = 'REMOVE_ALL';
        } else if (['hold', 'reset', 'cancel', 'close', 'delete', 'remove', 'x', 'clear'].includes(strippedText) || strippedText.includes('cancel') || strippedText.includes('delete') || strippedText.includes('remove') || strippedText.includes('hold') || strippedText.includes('reset')) {
            targetClass = 'btn-danger';
        } else if (strippedText.includes('preview')) {
            targetClass = 'btn-info';
        } else if (strippedText.includes('clear temp')) {
            targetClass = 'btn-secondary';
        } else {
            targetClass = 'btn-theme';
        }

        if (targetClass === 'REMOVE_ALL') {
            if (/className=["']/.test(attrs)) {
                attrs = attrs.replace(' btn-theme', '').replace('btn-theme', '')
                             .replace(' btn-danger', '').replace('btn-danger', '')
                             .replace(' btn-info', '').replace('btn-info', '')
                             .replace(' btn-secondary', '').replace('btn-secondary', '');
                attrs = attrs.replace(/className=["']\s+/, 'className="').replace(/\s+["']/, '"').replace(/className=["']["']/, '');
            }
        } else if (targetClass) {
            attrs = attrs.replace(' btn-theme', '').replace('btn-theme', '')
                         .replace(' btn-danger', '').replace('btn-danger', '')
                         .replace(' btn-info', '').replace('btn-info', '')
                         .replace(' btn-secondary', '').replace('btn-secondary', '');
            
            if (/className=["']/.test(attrs)) {
                attrs = attrs.replace(/className=["']([^"']*)["']/, `className="$1 ${targetClass}"`);
            } else {
                attrs = ` className="${targetClass}"` + attrs;
            }
            
            attrs = attrs.replace(/className=["']\s+/, 'className="').replace(/\s+["']/, '"');
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
