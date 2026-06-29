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

    // A brute force fix for 'Add New' buttons that got missed.
    // They usually look like: className="btn btn-primary" ...> <Plus ... /> Add New
    
    // Replace `btn btn-primary` with `btn btn-primary btn-theme` IF the button has Add New
    // Since regex is hard across newlines, we can just do a simpler search:
    // If the file contains `Add New`, we just indiscriminately add btn-theme to all `btn btn-primary` 
    // EXCEPT we don't want to double add if it's already there.
    
    // Actually, btn-primary IS meant to be the primary button, so it SHOULD always have btn-theme!
    content = content.replace(/className="btn btn-primary"/g, 'className="btn btn-primary btn-theme"');
    content = content.replace(/className="btn btn-primary "/g, 'className="btn btn-primary btn-theme "');
    
    // And for Export List, it was already handled, but let's make sure
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        changedFiles++;
        console.log(`Updated ${path.basename(filePath)}`);
    }
});

console.log(`Successfully updated ${changedFiles} files.`);
