const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.jsx') || file.endsWith('.tsx')) results.push(file);
        }
    });
    return results;
}

const files = walk('./src');
const components = ['Avatar', 'Badge', 'Button', 'Input', 'Skeleton', 'Tabs'];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    components.forEach(comp => {
        const CustomComp = `Custom${comp}`;

        // Replace relative paths or any substring that ends in "ui/Button" in imports.
        // e.g., '../ui/Button', '../../components/ui/Button', '@/components/ui/Button'
        // where Button is exact case match.

        // Regex 1: string replacement for imports like '../ui/Button' or '../components/ui/Button'
        // We look for 'ui/Button' or "ui/Button"
        const rePath = new RegExp(`(['"])(.*?\\/?)ui[\\/\\\\]${comp}\\1`, 'g');
        if (rePath.test(content)) {
            content = content.replace(rePath, `$1$2ui/Custom${comp}$1`);
            changed = true;
        }

        // Regex 2: JSX tags <Button> or <Button variant="...">
        const reTagOpen = new RegExp(`<${comp}(\\s|>)`, 'g');
        if (reTagOpen.test(content)) {
            content = content.replace(reTagOpen, `<Custom${comp}$1`);
            changed = true;
        }

        // Regex 3: closing JSX tags </Button>
        const reTagClose = new RegExp(`<\\/${comp}>`, 'g');
        if (reTagClose.test(content)) {
            content = content.replace(reTagClose, `</Custom${comp}>`);
            changed = true;
        }

        // Regex 4: import declarations: import Button from ...
        const reImport = new RegExp(`import ${comp} from`, 'g');
        if (reImport.test(content)) {
            content = content.replace(reImport, `import Custom${comp} from`);
            changed = true;
        }
    });

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated ' + file);
    }
});
