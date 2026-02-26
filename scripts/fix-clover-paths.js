import fs from 'fs';
import path from 'path';

const cloverPath = path.resolve(process.cwd(), 'coverage/clover.xml');

if (fs.existsSync(cloverPath)) {
    let content = fs.readFileSync(cloverPath, 'utf8');
    // Strip the absolute process.cwd() prefix to make paths relative in the xml
    const cwdPrefix = process.cwd() + '/';

    // Also handle windows backslashes just in case
    const cwdPrefixWin = process.cwd().replace(/\\/g, '/') + '/';

    content = content.split(cwdPrefix).join('');
    content = content.split(cwdPrefixWin).join('');

    fs.writeFileSync(cloverPath, content);
    console.log('Successfully stripped absolute paths from clover.xml');
} else {
    console.log('clover.xml not found, skipping path fix.');
}
