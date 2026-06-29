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

        if (['add', 'save', 'select product', 'submit', '+ add new'].includes(strippedText) || strippedText.includes('add') || strippedText.includes('save') || strippedText.includes('select product')) {
            targetClass = 'btn-theme';
        } 
        
        if (['cancel', 'close', 'delete', 'remove', 'x'].includes(strippedText) || strippedText.includes('cancel') || strippedText.includes('delete')) {
            targetClass = 'btn-danger';
        }

        // Handle specific case for "Action" button - don't style as theme/danger
        if (strippedText.includes('action')) {
            targetClass = '';
        }

        if (targetClass) {
            if (/className=["']/.test(attrs)) {
                if (!attrs.includes(targetClass)) {
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
