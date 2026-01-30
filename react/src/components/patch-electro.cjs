const fs = require('fs');
const path = 'TechnicienCompleteModal.tsx';
let s = fs.readFileSync(path, 'utf8');
// Match electromenager checkbox block (apostrophe can be ' or \u2019)
const oldRegex = /\{\s*showElectromenagerCheckbox\s*&&\s*\(\s*<label>\s*<input\s+type="checkbox"\s+checked=\{electromenagerFonctionnel\}\s+onChange=\{[^}]+\}\s*\/>\s*<span>L['\u2019]électroménager est fonctionnel\s*<\/span>\s*<\/label>\s*\)\s*\}/;
const replacement = `{showElectromenagerCheckbox && (
              <div className="radio-group">
                <span className="radio-group-label">L'électroménager est fonctionnel</span>
                <div className="radio-options">
                  <label>
                    <input
                      type="radio"
                      name="electromenager"
                      checked={electromenagerFonctionnel === true}
                      onChange={() => setElectromenagerFonctionnel(true)}
                    />
                    <span>Oui</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="electromenager"
                      checked={electromenagerFonctionnel === false}
                      onChange={() => setElectromenagerFonctionnel(false)}
                    />
                    <span>Non</span>
                  </label>
                </div>
              </div>
            )}`;
if (oldRegex.test(s)) {
  s = s.replace(oldRegex, replacement);
  fs.writeFileSync(path, s);
  console.log('Replaced electromenager block');
} else {
  console.log('Pattern not found. Checking content...');
  const idx = s.indexOf('électroménager');
  if (idx >= 0) {
    const slice = s.slice(idx - 5, idx + 30);
    console.log('Char codes:', [...slice].map(c => c.charCodeAt(0)).join(','));
  }
}
