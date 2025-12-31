// simulator.js — core判定ロジックのスタブ
(function(global){
  function findCountry(countries, id){
    return countries.find(c => c.id === id);
  }

  function checkCompatibility(homeId, targetId, licenseClass, countries, matrix){
    const home = findCountry(countries, homeId);
    const target = findCountry(countries, targetId);
    if(!home || !target) return { ok: false, text: 'Country data missing' };
    const lang = (typeof window !== 'undefined' && window.PAGE_LANG) ? window.PAGE_LANG : 'en';
    const nameOf = (c) => (c && c.name && (c.name[lang] || c.name.en)) || (c && c.id) || '';

    if(homeId === targetId){
      return { ok: true, text: (lang === 'ja') ? '国内運用です。' : 'Domestic operation.' };
    }

    // 簡易: 共通の条約が一つでもあれば互換性の可能性あり
    const common = (home.treaties || []).filter(t => (target.treaties || []).includes(t));
    if(common.length > 0){
      const treaty = common[0];
      const info = matrix[treaty] || {};
      const licensePart = licenseClass ? ((lang === 'ja') ? `（免許: ${licenseClass}）` : ` (license: ${licenseClass})`) : '';
      return { ok: true, text: `${nameOf(target)} ${((lang === 'ja') ? 'での運用には' : ' - please consult')} ${info.name || treaty}${licensePart}` };
    }

    return { ok: false, text: (lang === 'ja') ? `${nameOf(target)}での運用には、相互承認またはCEPT規定の確認が必要です。プリフィックスは ${target.prefix}/ です。` : `${nameOf(target)}: Reciprocity or CEPT rules should be checked. Prefix: ${target.prefix}/` };
  }

  // DOM helper to wire up page elements (if the page provides countries/matrix)
  function wireDom(){
    if(typeof window.COUNTRIES === 'undefined' || typeof window.MATRIX === 'undefined') return;
    const countries = window.COUNTRIES;
    const matrix = window.MATRIX;
    const licenses = (typeof window.LICENSES !== 'undefined') ? window.LICENSES : null;

    const btn = document.getElementById('check-btn');
    if(!btn) return;

    const licenseSelect = document.getElementById('license-class');

    function getLicenseListForCountry(countryId){
      if(!licenses) return [];
      const rec = licenses.find(l => l.id === countryId);
      return rec && rec.classes ? rec.classes : [];
    }

    function populateLicenseOptions(countryId){
      if(!licenseSelect) return;
      // clear
      licenseSelect.innerHTML = '';
      const list = getLicenseListForCountry(countryId);
      const lang = (typeof window !== 'undefined' && window.PAGE_LANG) ? window.PAGE_LANG : 'en';
      if(list.length === 0){
        // fallback: add a generic option
        const opt = document.createElement('option');
        opt.value = '';
        opt.text = (lang === 'ja') ? '（免許情報なし）' : '(no license info)';
        licenseSelect.appendChild(opt);
        return;
      }
      list.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.text = (c.name && (c.name[lang] || c.name.en)) || c.id;
        licenseSelect.appendChild(opt);
      });
    }

    // initial populate based on current home-country value (if exists)
    const homeSelect = document.getElementById('home-country');
    if(homeSelect){
      populateLicenseOptions(homeSelect.value);
      homeSelect.addEventListener('change', (e)=> populateLicenseOptions(e.target.value));
    }

    btn.addEventListener('click', ()=>{
      const home = document.getElementById('home-country').value;
      const target = document.getElementById('target-country').value;
      const license = licenseSelect ? licenseSelect.value : '';
      const res = checkCompatibility(home, target, license, countries, matrix);
      const resultDiv = document.getElementById('result');
      const resultText = document.getElementById('result-text');
      resultText.innerText = res.text;
      resultDiv.classList.remove('hidden');
    });
  }

  global.Simulator = {
    checkCompatibility,
    wireDom
  };

  // Auto-wire on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', wireDom);
})(window);
