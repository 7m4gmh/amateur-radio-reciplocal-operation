---
layout: default
lang: ja
title: 海外運用シミュレーター
---

<div class="max-w-2xl mx-auto p-8">
    <h2 class="text-2xl font-bold mb-6">運用条件をチェック</h2>

    <div class="space-y-4">
        <!-- 免許所持国 -->
        <label class="block">
            <span>あなたの免許発行国:</span>
            <select id="home-country" class="w-full border p-2 rounded">
                {% raw %}{% for country in site.data.countries %}
                <option value="{{ country.id }}">{{ country.name.ja }}</option>
                {% endfor %}{% endraw %}
            </select>
        ---
        layout: default
        lang: ja
        title: 海外運用シミュレーター
        ---

        <div class="max-w-2xl mx-auto p-8">
            <h2 class="text-2xl font-bold mb-6">運用条件をチェック</h2>

            <div class="space-y-4">
                <!-- 免許所持国 -->
                <label class="block">
                    <span>あなたの免許発行国:</span>
                    <select id="home-country" class="w-full border p-2 rounded">
                        {% for country in site.data.countries %}
                        <option value="{{ country.id }}">{{ country.name.ja }}</option>
                        {% endfor %}
                    </select>
                </label>

                <!-- 免許クラス -->
                <label class="block">
                    <span>免許クラス:</span>
                    <select id="license-class" class="w-full border p-2 rounded">
                        <option value="1st Class">第1級アマチュア無線技士</option>
                        <option value="2nd Class">第2級アマチュア無線技士</option>
                    </select>
                ---
                layout: default
                lang: ja
                title: 海外運用シミュレーター
                ---

                <div class="max-w-2xl mx-auto p-8">
                    <h2 class="text-2xl font-bold mb-6">運用条件をチェック</h2>

                    <div class="space-y-4">
                        <!-- 免許所持国 -->
                        <label class="block">
                            <span>あなたの免許発行国:</span>
                            <select id="home-country" class="w-full border p-2 rounded">
                                {% for country in site.data.countries %}
                                <option value="{{ country.id }}">{{ country.name.ja }}</option>
                                {% endfor %}
                            </select>
                        </label>

                        <!-- 免許クラス -->
                        <label class="block">
                            <span>免許クラス:</span>
                            <select id="license-class" class="w-full border p-2 rounded">
                                <option value="1st Class">第1級アマチュア無線技士</option>
                                <option value="2nd Class">第2級アマチュア無線技士</option>
                            </select>
                        </label>

                        <!-- 運用先 -->
                        <label class="block">
                            <span>運用希望国:</span>
                            <select id="target-country" class="w-full border p-2 rounded">
                                {% for country in site.data.countries %}
                                <option value="{{ country.id }}">{{ country.name.ja }}</option>
                                {% endfor %}
                            </select>
                        </label>

                        <button id="check-btn" class="bg-blue-600 text-white px-6 py-2 rounded shadow">判定する</button>
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
                </script>
                <script src="/assets/js/simulator.js"></script>

                <!-- コードは注意してご使用ください。 -->

