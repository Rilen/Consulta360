const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'body');

fs.readdirSync(dir).forEach(file => {
    if (!file.endsWith('.html')) return;
    let content = fs.readFileSync(path.join(dir, file), 'utf8');
    
    // We want to insert the OSTRASPREV option after "Pref. Municipal", "Prefeitura Municipal", or "PM RIO DAS OSTRAS"
    const regex = /(<option value="PM RIO DAS OSTRAS(- EFETIVOS E COMISSIONADOS|- CONTRATADOS|)?"[^>]*>.*?<\/option>)/g;
    
    // A function to prevent duplicate insertions if already exists
    const newContent = content.replace(regex, (match, p1) => {
        // If it's the "CONTRATADOS" one, we insert after it (so it stays grouped)
        if (match.includes("CONTRATADOS")) {
            return match + '\n              <option value="OSTRASPREV">OstrasPrev</option>';
        }
        // If it's "PM RIO DAS OSTRAS" exactly (without EFETIVOS), we insert after it
        if (!match.includes("EFETIVOS") && !match.includes("CONTRATADOS")) {
             return match + '\n              <option value="OSTRASPREV">OstrasPrev</option>';
        }
        return match;
    });

    if (content !== newContent) {
        fs.writeFileSync(path.join(dir, file), newContent);
        console.log('Updated ' + file);
    }
});
