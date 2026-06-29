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

    // Fix style={{ padding:"10px' }} -> style={{ padding: '10px' }}
    // The broken pattern is essentially any word followed by :" and ending with '
    // Or ? " ending with '
    // Or : " ending with '
    
    // Pattern 1: key:"value' -> key: 'value'
    content = content.replace(/([a-zA-Z]+):"([^"'\n]+)'/g, "$1: '$2'");
    
    // Pattern 2: ? "value' -> ? 'value'
    content = content.replace(/\? "([^"'\n]+)'/g, "? '$1'");
    
    // Pattern 3: : "value' -> : 'value'
    content = content.replace(/: "([^"'\n]+)'/g, ": '$1'");
    
    // Pattern 4: className="something' -> className="something" (if that happened)
    content = content.replace(/className="([^"'\n]+)'/g, 'className="$1"');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        changedFiles++;
        console.log(`Fixed ${path.basename(filePath)}`);
    }
});

console.log(`Successfully fixed ${changedFiles} files.`);
