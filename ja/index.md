---
layout: default
lang: ja
title: 海外運用シミュレーター
---

  <div class="max-w-2xl mx-auto p-8">
  <h2 class="text-2xl font-bold mb-6">{{ site.data.translations.ja.labels.home_country | default: "運用条件をチェック" }}</h2>

  <div class="space-y-4">
    <label class="block">
      <span>{{ site.data.translations.ja.labels.home_country }}</span>
      <select id="home-country" class="w-full border p-2 rounded">
        {% for country in site.data.countries %}
        <option value="{{ country.id }}">{{ country.name.ja }}</option>
        {% endfor %}
      </select>
    </label>

    <div id="home-schemes" class="text-sm text-gray-700 mt-2">
      <!-- populated by simulator.js: CEPT / CEPT Novice / HAREC applicability for home -->
    </div>

    <div id="home-treaties" class="text-sm text-gray-700 mt-1">
      <!-- list of treaties the home country is part of -->
    </div>

    <!-- 免許クラス -->
    <label class="block">
      <span>{{ site.data.translations.ja.labels.license_class }}</span>
      <select id="license-class" class="w-full border p-2 rounded">
        <!-- options populated dynamically by assets/js/simulator.js based on selected home country -->
      </select>
    </label>

    <!-- 運用先 -->
    <label class="block">
      <span>{{ site.data.translations.ja.labels.target_country }}</span>
      <select id="target-country" class="w-full border p-2 rounded">
        {% for country in site.data.countries %}
        <option value="{{ country.id }}">{{ country.name.ja }}</option>
        {% endfor %}
      </select>
    </label>

    <div id="target-schemes" class="text-sm text-gray-700 mt-2">
      <!-- populated by simulator.js: CEPT / CEPT Novice / HAREC applicability for target -->
    </div>

    <div id="target-treaties" class="text-sm text-gray-700 mt-1">
      <!-- list of treaties the target country is part of -->
    </div>

    <div id="treaty-results" class="mt-4 p-2 border rounded bg-gray-50 text-sm">
      <!-- applicable treaty lookup results will appear here -->
    </div>

  <button id="check-btn" class="bg-blue-600 text-white px-6 py-2 rounded shadow">{{ site.data.translations.ja.buttons.check }}</button>
  </div>

  <!-- 結果表示エリア -->
  <div id="result" class="mt-8 p-4 border rounded bg-white hidden">
    <h3 class="font-bold text-lg text-blue-700">判定結果</h3>
    <p id="result-text" class="mt-2"></p>
  </div>
</div>

<script>
// Jekyll のビルド時に site.data を JSON 化してグローバル変数に格納します
window.PAGE_LANG = 'ja';
window.COUNTRIES = {{ site.data.countries | jsonify }};
window.MATRIX = {{ site.data.matrix | jsonify }};
window.LICENSES = {{ site.data.licenses | jsonify }};
window.RULES = {{ site.data.rules | jsonify }};
</script>
<script src="/assets/js/simulator.js"></script>

<!-- コードは注意してご使用ください。 -->

