const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

let changedFiles = 0;

files.forEach(file => {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Helper to replace button tags
    // We match <button ...>Text</button>
    // Text can be Add, Save, Cancel, Close, Delete, Select Product
    const buttonRegex = /<button([^>]*)>([^<]*)<\/button>/g;

    content = content.replace(buttonRegex, (match, attrs, text) => {
        let trimmedText = text.trim();
        let targetClass = '';

        if (['Add', 'Save', 'Select Product', 'Submit'].includes(trimmedText)) {
            targetClass = 'btn-theme';
        } else if (['Cancel', 'Close', 'Delete', 'Remove'].includes(trimmedText)) {
            targetClass = 'btn-danger';
        }

        if (targetClass) {
            // Check if className already exists
            if (/className=["']/.test(attrs)) {
                // Append to existing className
                attrs = attrs.replace(/className=["']([^"']*)["']/, `className="$1 ${targetClass}"`);
            } else {
                // Add className
                attrs += ` className="${targetClass}"`;
            }
        }

        return `<button${attrs}>${text}</button>`;
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        changedFiles++;
        console.log(`Updated ${file}`);
    }
});

console.log(`Successfully updated ${changedFiles} files.`);
