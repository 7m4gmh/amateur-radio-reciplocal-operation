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
    const translations = (typeof window !== 'undefined' && window.TRANSLATIONS) ? (window.TRANSLATIONS[lang] || window.TRANSLATIONS['en']) : null;
    const t = (key, fallback) => {
      if(!translations) return (fallback || '');
      const parts = key.split('.');
      let cur = translations;
      for(let p of parts){ if(cur[p] === undefined) return (fallback || ''); cur = cur[p]; }
      return cur;
    };
    const nameOf = (c) => (c && c.name && (c.name[lang] || c.name.en)) || (c && c.id) || '';

    // Check explicit per-country rules first (if provided)
    if(typeof window.RULES !== 'undefined' && window.RULES.rules){
      const rules = window.RULES.rules;
      const rule = rules.find(r => r.home === homeId && r.target === targetId);
      if(rule){
        const allowed = rule.allowed_home_classes || [];
        const licenseOk = licenseClass && allowed.includes(licenseClass);
        if(licenseOk){
          const stationNote = (typeof rule.requires_station_license !== 'undefined') ? (rule.requires_station_license ? t('messages.station_required', ((lang === 'ja') ? '事前の無線局免許申請が必要です。' : 'Prior station license application is required.')) : t('messages.station_not_required', ((lang === 'ja') ? '事前の無線局免許申請は不要です。' : 'No prior station license application is required.'))) : '';
          const note = (rule.note && (rule.note[lang] || rule.note.en)) ? (rule.note[lang] || rule.note.en) : '';
          const links = rule.links || null;
          return { ok: true, text: (lang === 'ja') ? `${nameOf(target)}${t('messages.operation_allowed', 'での運用は選択された免許クラスで許可されています。')} ${stationNote} ${note}` : `${nameOf(target)}: ${t('messages.operation_allowed', 'operation allowed for selected license.')} ${stationNote} ${note}`, links };
        }
        // 明確なルールがあり許可されない場合はそれを返す
        const note = (rule.note && (rule.note[lang] || rule.note.en)) ? (rule.note[lang] || rule.note.en) : '';
        const stationNote = (typeof rule.requires_station_license !== 'undefined') ? (rule.requires_station_license ? t('messages.station_required', ((lang === 'ja') ? '事前の無線局免許申請が必要です。' : 'Prior station license application is required.')) : t('messages.station_not_required', ((lang === 'ja') ? '事前の無線局免許申請は不要です。' : 'No prior station license application is required.'))) : '';
        const links = rule.links || null;
        return { ok: false, text: (lang === 'ja') ? `${nameOf(target)}${t('messages.operation_not_permitted', 'では選択された免許クラスでは運用不可です。')} ${stationNote} ${note}` : `${nameOf(target)}: ${t('messages.operation_not_permitted', 'selected license not permitted.')} ${stationNote} ${note}`, links };
      }
    }

    if(homeId === targetId){
      return { ok: true, text: t('messages.result_heading', (lang === 'ja') ? '国内運用です。' : 'Domestic operation.') };
    }

    // 簡易: 共通の条約が一つでもあれば互換性の可能性あり
    const common = (home.treaties || []).filter(t => (target.treaties || []).includes(t));
    if(common.length > 0){
      const treaty = common[0];
      const info = matrix[treaty] || {};
      // If treaty defines conditions with requires_station_license, try to match by licenseClass
      let stationNote = '';
      if(info.conditions && licenseClass){
        const cond = info.conditions.find(c => (c.home_class && (c.home_class.toLowerCase().includes(licenseClass.toLowerCase()) || c.home_class.toLowerCase() === licenseClass.toLowerCase())));
        if(cond && typeof cond.requires_station_license !== 'undefined'){
          stationNote = cond.requires_station_license ? ((lang === 'ja') ? ' 事前の無線局免許申請が必要です。' : ' Prior station license application is required.') : ((lang === 'ja') ? ' 事前の無線局免許申請は不要です。' : ' No prior station license application is required.');
        }
      }
      const licensePart = licenseClass ? ((lang === 'ja') ? `（免許: ${licenseClass}）` : ` (license: ${licenseClass})`) : '';
      const consult = (lang === 'ja') ? 'での運用には' : ' - please consult';
      return { ok: true, text: `${nameOf(target)} ${consult} ${info.name || treaty}${licensePart}${stationNote}` };
    }

    const fallback = (lang === 'ja') ? `${nameOf(target)}での運用には、相互承認またはCEPT規定の確認が必要です。プリフィックスは ${target.prefix}/ です。` : `${nameOf(target)}: Reciprocity or CEPT rules should be checked. Prefix: ${target.prefix}/`;
    return { ok: false, text: t('messages.no_country_data', fallback) };
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
    const homeSchemesDiv = document.getElementById('home-schemes');
    const targetSchemesDiv = document.getElementById('target-schemes');
    const homeTreatiesDiv = document.getElementById('home-treaties');
    const targetTreatiesDiv = document.getElementById('target-treaties');
    const treatyResultsDiv = document.getElementById('treaty-results');
    // localization helpers for this wiring scope
    const lang = (typeof window !== 'undefined' && window.PAGE_LANG) ? window.PAGE_LANG : 'en';
    const translations = (typeof window !== 'undefined' && window.TRANSLATIONS) ? (window.TRANSLATIONS[lang] || window.TRANSLATIONS['en']) : null;
    const t = (key, fallback) => {
      if(!translations) return (fallback || '');
      const parts = key.split('.');
      let cur = translations;
      for(let p of parts){ if(cur[p] === undefined) return (fallback || ''); cur = cur[p]; }
      return cur;
    };

    function buildCountryMap(){
      const map = {};
      // Start with explicit COUNTRIES list if available
      if(Array.isArray(window.COUNTRIES)){
        window.COUNTRIES.forEach(c => { map[c.id] = c; });
      }
      // Merge HAREC mappings
      if(window.HAREC && Array.isArray(window.HAREC.mappings)){
        window.HAREC.mappings.forEach(m => {
          if(!m || !m.country) return;
          if(!map[m.country]) map[m.country] = { id: m.country, name: m.name || { en: m.country, ja: m.country }, treaties: [] };
        });
      }
      // Merge Japan agreements
      if(window.JAPAN_AGREEMENTS && Array.isArray(window.JAPAN_AGREEMENTS.agreements)){
        window.JAPAN_AGREEMENTS.agreements.forEach(a => {
          if(!a || !a.country) return;
          if(!map[a.country]) map[a.country] = { id: a.country, name: a.name || { en: a.country, ja: a.country }, treaties: [] };
        });
      }
      // Merge any countries referenced in MATRIX entries (treaty members)
      if(window.MATRIX){
        Object.keys(window.MATRIX).forEach(k => {
          const info = window.MATRIX[k];
          if(info && info.members && Array.isArray(info.members)){
            info.members.forEach(mid => { if(!map[mid]) map[mid] = { id: mid, name: { en: mid, ja: mid }, treaties: [] }; });
          }
        });
      }
      return map;
    }

    function renderSchemes(countryId, container){
      if(!container) return;
      const country = findCountry(countries, countryId);
      if(!country){ container.innerText = ''; return; }
      const lang = (typeof window !== 'undefined' && window.PAGE_LANG) ? window.PAGE_LANG : 'en';
      const tr = (typeof window !== 'undefined' && window.TRANSLATIONS) ? (window.TRANSLATIONS[lang] || window.TRANSLATIONS['en']) : null;
      const label = (key, fallback) => { if(!tr) return fallback; return tr['labels'] && tr['labels'][key] ? tr['labels'][key] : fallback; };
      const yes = (lang === 'ja') ? 'はい' : 'Yes';
      const no = (lang === 'ja') ? 'いいえ' : 'No';
      const lines = [];
      lines.push(`${label('scheme_cept', 'CEPT')}: ${country.cept ? yes : no}`);
      lines.push(`${label('scheme_cept_novice', 'CEPT Novice')}: ${country.cept_novice ? yes : no}`);
      lines.push(`${label('scheme_harec', 'HAREC')}: ${country.harec ? yes : no}`);
      container.innerText = lines.join(' | ');
    }

    function renderTreaties(countryId, container){
      if(!container) return;
      const country = findCountry(countries, countryId);
      if(!country){ container.innerText = ''; return; }
      const tkeys = country.treaties || [];
      if(tkeys.length === 0){ container.innerText = (t('messages.no_country_data','No treaty info')); return; }
      // show friendly names where possible from matrix
      const parts = tkeys.map(k => {
        const info = matrix[k] || {};
        return info.name ? `${info.name} (${k})` : k;
      });
      container.innerText = parts.join(' | ');
    }

    function renderTreatyResults(homeId, targetId, licenseClass){
      if(!treatyResultsDiv) return;
      treatyResultsDiv.innerHTML = '';
      const home = findCountry(countries, homeId);
      const target = findCountry(countries, targetId);
      if(!home || !target) return;
      const homeTreaties = home.treaties || [];
      const targetTreaties = target.treaties || [];
      // intersection
      const common = homeTreaties.filter(t => targetTreaties.includes(t));
      if(common.length === 0){
        treatyResultsDiv.innerText = (t('messages.no_country_data', (lang === 'ja') ? '共通の条約は見つかりませんでした。' : 'No common treaty found.'));
        return;
      }

      // Build an accessible table
      let html = '';
      html += `<div class="font-semibold mb-2">${(lang==='ja')? '共通の条約/協定' : 'Common treaties/agreements'}</div>`;
      html += '<div class="overflow-x-auto"><table class="treaty-table" style="border-collapse:collapse;width:100%;">';
      // header
      html += '<thead><tr style="background:#f3f4f6;">';
      html += `<th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">${(lang==='ja')? '条約名' : 'Treaty'}</th>`;
      html += `<th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">${(lang==='ja')? '注記' : 'Note'}</th>`;
      html += `<th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">${(lang==='ja')? '免許対応' : 'License mapping'}</th>`;
      html += `<th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">${(lang==='ja')? '事前無線局免許' : 'Prior station license'}</th>`;
      html += `<th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">${(lang==='ja')? '参照' : 'References'}</th>`;
      html += '</tr></thead>';

      html += '<tbody>';
      common.forEach(key => {
        const info = matrix[key] || {};
        const name = info.name || key;
        const note = info.note || '';

        // find condition best match
        let mapping = '';
        let stationReq = '';
        if(info.conditions && licenseClass){
          const cond = info.conditions.find(c => c.home_class && c.home_class.toLowerCase().includes(licenseClass.toLowerCase()));
          if(cond){
            mapping = cond.equivalent || cond.home_class || '';
            if(typeof cond.requires_station_license !== 'undefined'){
              stationReq = cond.requires_station_license ? ((lang==='ja')? '必要' : 'Required') : ((lang==='ja')? '不要' : 'Not required');
            }
          }
        }

        // links from matrix or fallback to rules' application_url
        const refs = [];
        if(info.links && Array.isArray(info.links)){
          info.links.forEach(l => { if(l.url) refs.push(`<a href="${l.url}" target="_blank" rel="noopener noreferrer">${(l.title? (l.title[lang]||l.title.en) : l.url)}</a>`); });
        }
        // fallback: check rules for explicit home->target application_url
        const rule = (window.RULES && window.RULES.rules) ? window.RULES.rules.find(r => r.home === homeId && r.target === targetId) : null;
        if(rule && rule.application_url) refs.push(`<a href="${rule.application_url}" target="_blank" rel="noopener noreferrer">${(lang==='ja')? '申請情報' : 'Application info'}</a>`);

        html += '<tr>';
        html += `<td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;">${name}</td>`;
        html += `<td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;">${note}</td>`;
        html += `<td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;">${mapping}</td>`;
        html += `<td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;">${stationReq}</td>`;
        html += `<td style="padding:8px;border:1px solid #e5e7eb;vertical-align:top;">${refs.join('<br/>')}</td>`;
        html += '</tr>';
      });
      html += '</tbody></table></div>';

      treatyResultsDiv.innerHTML = html;
    }

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
      // populate selects from union of data files
      const cmap = buildCountryMap();
      const allCountries = Object.keys(cmap).map(id => cmap[id]);
      // sort by localized name
      allCountries.sort((a,b)=>{
        const an = (a.name && (a.name[lang] || a.name.en)) || a.id;
        const bn = (b.name && (b.name[lang] || b.name.en)) || b.id;
        return an.localeCompare(bn);
      });
      // clear and fill home and target selects
      homeSelect.innerHTML = '';
      const targetSelectElem = document.getElementById('target-country');
      if(targetSelectElem) targetSelectElem.innerHTML = '';
      allCountries.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.text = (c.name && (c.name[lang] || c.name.en)) || c.id;
        homeSelect.appendChild(opt);
        if(targetSelectElem){
          const opt2 = document.createElement('option');
          opt2.value = c.id;
          opt2.text = (c.name && (c.name[lang] || c.name.en)) || c.id;
          targetSelectElem.appendChild(opt2);
        }
      });

      // choose sensible defaults if present
      if(allCountries.find(c=>c.id==='japan')) homeSelect.value = 'japan';
      if(allCountries.find(c=>c.id==='usa') && targetSelectElem) targetSelectElem.value = 'usa';

      populateLicenseOptions(homeSelect.value);
      homeSelect.addEventListener('change', (e)=> { populateLicenseOptions(e.target.value); renderSchemes(e.target.value, homeSchemesDiv); renderTreaties(e.target.value, homeTreatiesDiv); renderTreatyResults(e.target.value, (targetSelect?targetSelect.value:null), licenseSelect?licenseSelect.value:null); });
      // initial render
      renderSchemes(homeSelect.value, homeSchemesDiv);
      renderTreaties(homeSelect.value, homeTreatiesDiv);
    }

    const targetSelect = document.getElementById('target-country');
    if(targetSelect){
      targetSelect.addEventListener('change', (e)=> { renderSchemes(e.target.value, targetSchemesDiv); renderTreaties(e.target.value, targetTreatiesDiv); renderTreatyResults((homeSelect?homeSelect.value:null), e.target.value, licenseSelect?licenseSelect.value:null); });
      // initial render
      renderSchemes(targetSelect.value, targetSchemesDiv);
      renderTreaties(targetSelect.value, targetTreatiesDiv);
    }

    // update treaty results when license changes
    if(licenseSelect){
      licenseSelect.addEventListener('change', (e)=> renderTreatyResults((homeSelect?homeSelect.value:null), (targetSelect?targetSelect.value:null), e.target.value));
    }

    btn.addEventListener('click', ()=>{
      const home = document.getElementById('home-country').value;
      const target = document.getElementById('target-country').value;
      const license = licenseSelect ? licenseSelect.value : '';
      const res = checkCompatibility(home, target, license, countries, matrix);
      const resultDiv = document.getElementById('result');
      const resultText = document.getElementById('result-text');
      // render text and optional links
      if(res.links && Array.isArray(res.links) && res.links.length > 0){
        let html = '<div>' + (res.text || '') + '</div>';
        html += '<ul class="mt-2 text-sm text-blue-700">';
        res.links.forEach(link => {
          const title = (link.title && (link.title[lang] || link.title.en)) ? (link.title[lang] || link.title.en) : (link.url || 'link');
          html += `<li><a href="${link.url}" target="_blank" rel="noopener noreferrer">${title}</a></li>`;
        });
        html += '</ul>';
        resultText.innerHTML = html;
      } else {
        resultText.innerText = res.text || '';
      }
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
