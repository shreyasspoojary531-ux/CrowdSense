const fs = require('fs');

let content = fs.readFileSync('src/index.css', 'utf8');

// Replace static blue/purple/cyan rgba colors with orange #FF7A00 equivalent -> rgba(255, 122, 0, alpha)
content = content.replace(/rgba\(79,\s*124,\s*255/g, 'rgba(255, 122, 0');
content = content.replace(/rgba\(98,\s*90,\s*255/g, 'rgba(255, 122, 0');
content = content.replace(/rgba\(61,\s*217,\s*255/g, 'rgba(255, 122, 0');
content = content.replace(/rgba\(107,\s*114,\s*255/g, 'rgba(255, 122, 0');
content = content.replace(/rgba\(124,\s*92,\s*255/g, 'rgba(255, 122, 0');
content = content.replace(/rgba\(92,\s*122,\s*215/g, 'rgba(255, 122, 0');

fs.writeFileSync('src/index.css', content);
console.log('Colors replaced successfully.');
