// ==UserScript==
// @name         Veyra Helper Widget
// @namespace    http://tampermonkey.net/
// @version      1.42
// @description  Collect specific amount of stamina with auto-detection
// @author       You
// @match        https://demonicscans.org/*
// @grant        none
// @noframes
// ==/UserScript==

/*

*/


(function() {
    'use strict';

    if (window.top !== window.self) {
        return;
    }

    if(localStorage.getItem('game.styles') == null){
        localStorage.setItem('game.styles', '.header,.howto-info-header h2{font-size:22px;text-align:center}.events-header,.gate-card,.header,h1{text-align:center}.event-cta,.event-title,.events-header,.gate-card-name,.header{font-weight:700}.container{margin:auto;padding:20px}h1{margin-bottom:20px;color:#fff}.section{margin-bottom:30px}.header{margin-bottom:10px;color:#ddd}.events-grid,.gates-flex{display:flex;flex-wrap:wrap;gap:20px;justify-content:center}.gate-card{background:#1e1e1e;border-radius:10px;overflow:hidden;transition:transform .2s;cursor:pointer;width:250px;box-shadow:0 2px 6px rgba(0,0,0,.4)}.howto-info,.panel{background:#1a1b25}.gate-card:hover{transform:scale(1.03)}.gate-card img{width:100%;aspect-ratio:1/1;object-fit:cover;display:block}.gate-card-name{padding:12px;font-size:16px;color:#f1f1f1}a.gate-link{text-decoration:none;color:inherit}.panel{border:1px solid #232437;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,.35);padding:16px;margin:20px auto}.howto-info{max-width:900px;margin:0 auto 24px;border:1px solid #232437;border-radius:14px;box-shadow:0 8px 20px rgba(0,0,0,.35);overflow:hidden}.howto-info-header{padding:14px 18px;border-bottom:1px solid #232437;background:#191a24}.howto-info-header h2{margin:0;color:#ffd369}.howto-info-scroll{max-height:360px;overflow:auto}.howto-info-body{padding:16px;font-size:15px;line-height:1.7;color:#ddd}.howto-info-body ul{margin:8px 0 8px 20px;padding:0;list-style:disc}.howto-info-scroll::-webkit-scrollbar{width:10px}.howto-info-scroll::-webkit-scrollbar-thumb{background:#2b2d44;border-radius:10px}.howto-info-scroll::-webkit-scrollbar-track{background:#1a1b25}.events-section{margin:0 auto 28px}.events-header{font-size:22px;color:#ffd369;margin:0 0 14px}.event-card{position:relative;width:340px;background:#10131a;border:1px solid #232437;border-radius:16px;overflow:hidden;cursor:pointer;box-shadow:0 10px 24px rgba(0,0,0,.45);transition:transform .2s,box-shadow .2s}.event-card:hover{transform:translateY(-4px);box-shadow:0 16px 32px rgba(0,0,0,.55)}.event-media{position:relative;width:100%;aspect-ratio:1/1;background:#0e0f17}.event-media img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}.event-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.55) 15%,rgba(0,0,0,0) 55%);pointer-events:none}.event-body{padding:14px 14px 16px}.event-title{font-size:18px;color:#f1f1f1;margin:0 0 10px;line-height:1.25;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.event-cta{display:inline-flex;align-items:center;gap:8px;font-size:14px;padding:10px 14px;border-radius:10px;background:#2b2d44;color:#eaeaea;border:1px solid #393b58;text-decoration:none;transition:background .2s,transform .2s}.event-cta:hover{background:#33365a;transform:translateY(-1px)}.event-badge{position:absolute;top:10px;left:10px;background:#e24a4a;color:#fff;font-size:12px;font-weight:800;letter-spacing:.3px;padding:6px 10px;border-radius:999px;box-shadow:0 6px 16px rgba(0,0,0,.35);text-transform:uppercase}@media (max-width:600px){.gate-card{width:90%;margin:auto}.event-card{width:100%;max-width:520px}}');
    }
    // Load saved values or use defaults
    let autoStatTarget = (localStorage.getItem('autoStatTarget') || 'ATTACK').toUpperCase();
    let autoStatEnabled = localStorage.getItem('autoStatEnabled') === 'true';
    let autoFinishQuestEnabled = localStorage.getItem('autoFinishQuestEnabled') !== 'false';
    let autoMobFarmEnabled = localStorage.getItem('autoMobFarmEnabled') === 'true';
    let autoMobFarmDamage = localStorage.getItem('autoMobFarmDamage') || '1000000';
    let autoMobFarmWaveTarget = localStorage.getItem('autoMobFarmWaveTarget') || 'current';
    let autoMobFarmLastGate = localStorage.getItem('autoMobFarmLastGate') || '';
    let targetStamina = localStorage.getItem('staminaTarget') || '80';
    let minChap = localStorage.getItem('staminaMinChap') || '1';
    let dailyLimit = 1000;
    if(localStorage.getItem('dailyStamina') == null){
        localStorage.setItem('dailyStamina', 0);
    }

    let dailyStamina = parseInt(localStorage.getItem('dailyStamina'));
    var t; // Timer/Interval ID

    const LOOTING_BLACKLIST_SET = new Set([
        'drakzareth the cataclysmic half dragon king',
        'general skarn the radiant bastion',
        'general vessir the sunfang duelist',
        'general hrazz the dawnflame oathkeeper',
        'vessir, the solar inferna empress',
        'drakzareth the tyrant lizard king',
        'hrazz the dawnflame seraph',
        'skarn, the molten general',
        'oceanus the water titan',
        'poseidon, the sea emperor'
    ]);

    function getCookieByName(name) {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + '=')) {
                return cookie.substring(name.length + 1);
            }
        }
        return null;
    }

    function ensureUserUidCookie() {
        let uid = getCookieByName('useruid');
        if (uid) {
            return uid;
        }

        uid = 'uid-' + Math.random().toString(36).slice(2, 18) + Date.now();
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1);
        document.cookie = `useruid=${uid}; expires=${expires.toUTCString()}; path=/`;
        return uid;
    }

    let url = document.location.href;
    const currentUrl = new URL(url);
    const currentPath = currentUrl.pathname;

    const allowedPaths = [
        '/game_dash.php',
        '/pvparena.php',
        '/active_wave.php',
        '/battle.php',
        '/adventurers_guild.php',
        '/inventory.php',
        '/pets.php',
        '/stats.php',
        '/blacksmith.php',
        '/player.php',
        '/chat.php',
        '/weekly.php',
        '/event_goblin_feast.php',
        '/guide.php',
        '/achievements.php',
        '/merchant.php'
    ];


    function updateChat() {
        const logEl = document.getElementById("chatLog");
        const wasNearBottom = (logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight) < 120;
        let xmlhttp;
        if (window.XMLHttpRequest) {
            // code for IE7+, Firefox, Chrome, Opera, Safari
            xmlhttp=new XMLHttpRequest();
        } else {
            // code for IE6, IE5
            xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
        }
        xmlhttp.onreadystatechange=function() {
            if (this.readyState==4 && this.status==200) {
                document.getElementById("chatLog").innerHTML=this.responseText;
                if (wasNearBottom) {
                    logEl.scrollTop = logEl.scrollHeight; // auto-scroll if user was near bottom
                }
            }
        }
        xmlhttp.open("POST","updatechat.php",true);
        xmlhttp.send();
    }

    function parsePositiveInt(value, fallback = 0) {
        const parsed = parseInt(String(value || '').replace(/[^0-9]/g, ''), 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, (ch) => {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] || ch;
        });
    }

    function dedupeLootItems(items) {
        const map = new Map();

        (items || []).forEach((item) => {
            const id = String((item && (item.ITEM_ID || item.id || item.NAME || item.name)) || Math.random());
            const existing = map.get(id);
            if (!existing) {
                map.set(id, {
                    ITEM_ID: item && item.ITEM_ID,
                    NAME: (item && (item.NAME || item.name)) || 'Unknown Item',
                    IMAGE_URL: (item && (item.IMAGE_URL || item.image_url || item.image || '')) || '',
                    TIER: (item && (item.TIER || item.tier || '')) || '',
                    QUANTITY_DROPPED: parsePositiveInt(item && (item.QUANTITY_DROPPED || item.quantity || 1), 1)
                });
            } else {
                existing.QUANTITY_DROPPED += parsePositiveInt(item && (item.QUANTITY_DROPPED || item.quantity || 1), 1);
            }
        });

        return Array.from(map.values());
    }

    function ensureFastLootModal() {
        let modal = document.getElementById('fastLootModal');
        if (modal) {
            return modal;
        }

        const styleId = 'fastLootModalStyle';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = [
                '#fastLootModal{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:2147483646;display:none;align-items:center;justify-content:center;}',
                '#fastLootModal .flm-content{background:#2a2a3d;border-radius:12px;padding:20px;max-width:90%;width:560px;text-align:center;color:#fff;overflow-y:auto;max-height:80%;box-shadow:0 16px 44px rgba(0,0,0,.6);}',
                '#fastLootModal h2{margin:0 0 12px 0;font-size:20px;color:#fff;}',
                '#flmSummary{margin:0 0 10px 0;display:flex;flex-wrap:wrap;gap:6px;justify-content:center;}',
                '#flmNote{margin:0 0 10px 0;color:#d1d5db;font-size:12px;line-height:1.4;}',
                '#flmItems{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;}',
                '.flm-chip{background:#212439;color:#cdd1ea;border:1px solid #2b2e49;border-radius:999px;padding:3px 10px;font-size:12px;}',
                '.flm-item{background:#1e1e2f;border:1px solid #2b2d44;border-radius:10px;width:92px;padding:8px;text-align:center;position:relative;}',
                '.flm-item img{width:64px;height:64px;object-fit:cover;border-radius:8px;display:block;margin:0 auto 6px;}',
                '.flm-item small{display:block;line-height:1.2;color:#fff;}',
                '.flm-item-qty{position:absolute;top:4px;right:4px;background:#111827;color:#fff;font-size:11px;font-weight:600;padding:2px 6px;border-radius:999px;border:1px solid #2b2d44;line-height:1;}',
                '#flmCloseBtn{margin-top:12px;background:#333;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;}'
            ].join('');
            document.head.appendChild(style);
        }

        modal = document.createElement('div');
        modal.id = 'fastLootModal';
        modal.innerHTML = [
            '<div class="flm-content">',
            '<h2>Loot Gained</h2>',
            '<div id="flmSummary"></div>',
            '<div id="flmNote"></div>',
            '<div id="flmItems"></div>',
            '<button id="flmCloseBtn" type="button">Close</button>',
            '</div>'
        ].join('');

        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        const closeBtn = modal.querySelector('#flmCloseBtn');
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });

        document.body.appendChild(modal);
        return modal;
    }

    function openFastLootModal(summary, items, notes) {
        const modal = ensureFastLootModal();
        const summaryEl = modal.querySelector('#flmSummary');
        const noteEl = modal.querySelector('#flmNote');
        const itemsEl = modal.querySelector('#flmItems');

        summaryEl.innerHTML = [
            `<span class="flm-chip">Processed: ${escapeHtml(summary.processed)}</span>`,
            `<span class="flm-chip">Success: ${escapeHtml(summary.success)}</span>`,
            `<span class="flm-chip">Fail: ${escapeHtml(summary.fail)}</span>`,
            `<span class="flm-chip">EXP: ${Number(summary.exp || 0).toLocaleString()}</span>`,
            `<span class="flm-chip">Gold: ${Number(summary.gold || 0).toLocaleString()}</span>`,
            `<span class="flm-chip">Damage: ${Number(summary.dmg || 0).toLocaleString()}</span>`,
            `<span class="flm-chip">Items: ${Number((items || []).length).toLocaleString()}</span>`
        ].join('');

        const filteredNotes = Array.from(new Set((notes || []).filter(Boolean)));
        if (filteredNotes.length > 0) {
            noteEl.style.display = 'block';
            noteEl.textContent = filteredNotes.join(' ');
        } else {
            noteEl.style.display = 'none';
            noteEl.textContent = '';
        }

        const deduped = dedupeLootItems(items);
        if (deduped.length === 0) {
            itemsEl.innerHTML = '<div style="padding:6px 0;color:#d1d5db;">No items this time.</div>';
        } else {
            itemsEl.innerHTML = deduped.map((item) => {
                const qty = parsePositiveInt(item.QUANTITY_DROPPED, 1);
                const name = escapeHtml(item.NAME || 'Unknown Item');
                const tier = item.TIER ? `<small style="color:#d1d5db;">${escapeHtml(item.TIER)}</small>` : '';
                const img = item.IMAGE_URL ? `<img src="${escapeHtml(item.IMAGE_URL)}" alt="${name}">` : '<div style="width:64px;height:64px;border-radius:8px;background:#111827;margin:0 auto 6px;"></div>';
                return [
                    '<div class="flm-item">',
                    `<div class="flm-item-qty">x${qty}</div>`,
                    img,
                    `<small>${name}</small>`,
                    tier,
                    '</div>'
                ].join('');
            }).join('');
        }

        modal.style.display = 'flex';
    }

    function findLootCountInput(btnLootX) {
        const exactMatch = document.querySelector('#lootCount, #lootXCount, input[name="loot_count"], input[name="loot_x"]');
        if (exactMatch) {
            return exactMatch;
        }

        const nearby = btnLootX && btnLootX.parentElement
            ? btnLootX.parentElement.querySelector('input[type="number"], input[type="text"]')
            : null;
        if (nearby) {
            return nearby;
        }

        return document.querySelector('input[type="number"], input[type="text"]');
    }

    function resolveLootUserId() {
        const fromGlobals = window.VHC_USER_ID || window.USER_ID;
        if (fromGlobals) {
            return String(fromGlobals);
        }

        const fromInput = document.querySelector('input[name="user_id"]');
        if (fromInput && fromInput.value) {
            return String(fromInput.value);
        }

        const bodyText = (document.body && document.body.innerHTML) ? document.body.innerHTML : '';
        const match = bodyText.match(/\b(?:USER_ID|VHC_USER_ID)\s*=\s*['\"]?(\d+)['\"]?/i);
        return match ? String(match[1]) : '';
    }

    function getEligibleDeadMonsterIdsFromDoc(doc, ignoreBosses = true) {
        const nodes = Array.from(doc.querySelectorAll('.monster-card[data-eligible="1"]'));
        return nodes
            .filter((el) => {
                if (!ignoreBosses) {
                    return true;
                }

                const name = (el.dataset.name || '').toLowerCase().trim();
                return !LOOTING_BLACKLIST_SET.has(name);
            })
            .map((el) => parsePositiveInt(el.dataset.monsterId, 0))
            .filter((id) => id > 0);
    }

    function getUnclaimedKillCount() {
        const pill = Array.from(document.querySelectorAll('.unclaimed-pill')).find((el) => {
            return /unclaimed\s+kills/i.test((el.textContent || '').trim());
        });

        if (!pill) {
            return 0;
        }

        const countEl = pill.querySelector('.count');
        return parsePositiveInt(countEl ? countEl.textContent : pill.textContent, 0);
    }

    async function fetchWaveDeadPageDoc(pageNumber) {
        const url = new URL(window.location.href);
        url.searchParams.set('dead_page', String(pageNumber));

        const response = await fetch(url.toString(), {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store'
        });

        const html = await response.text();
        const parser = new DOMParser();
        return parser.parseFromString(html, 'text/html');
    }

    async function lootMonsterFast(monsterId, userId) {
        const payload = new URLSearchParams();
        payload.set('user_id', String(userId));
        payload.set('monster_id', String(monsterId));
        payload.set('dgmid', String(monsterId));
        payload.set('instance_id', '0');

        const response = await fetch('loot.php', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            referrer: `https://demonicscans.org/battle.php?id=${monsterId}`,
            body: payload.toString()
        });

        let data = null;
        try {
            data = await response.json();
        } catch (_err) {
            data = null;
        }

        if (!response.ok || !data || data.status !== 'success') {
            const note = (data && (data.message || data.note || data.error)) || `HTTP ${response.status}`;
            return { ok: false, note, items: [], rewards: { exp: 0, gold: 0, damage_dealt: 0 } };
        }

        return {
            ok: true,
            note: data.note || '',
            items: Array.isArray(data.items) ? data.items : [],
            rewards: data.rewards || { exp: 0, gold: 0, damage_dealt: 0 }
        };
    }

    function injectFastLootXControl() {
        if (currentPath !== '/active_wave.php') {
            return;
        }

        const btnLootX = document.getElementById('btnLootX');
        const lootStatus = document.getElementById('lootStatus');
        if (!btnLootX || !lootStatus) {
            return;
        }

        if (document.getElementById('btnCustomLootFast')) {
            return;
        }

        const customBtn = document.createElement('button');
        customBtn.id = 'btnCustomLootFast';
        customBtn.type = 'button';
        customBtn.textContent = 'Loot X monsters (super fast)';
        customBtn.style.background = '#333';
        customBtn.style.border = 'none';
        customBtn.style.borderRadius = '8px';
        customBtn.style.padding = '8px 12px';
        customBtn.style.fontSize = '13px';
        customBtn.style.lineHeight = '1.2';
        customBtn.style.color = '#fff';
        customBtn.style.cursor = 'pointer';
        customBtn.style.boxShadow = '0 6px 18px rgba(0, 0, 0, .6)';
        customBtn.style.border = '1px solid #2b2d44';
        customBtn.style.whiteSpace = 'nowrap';
        customBtn.style.marginLeft = '6px';

        btnLootX.insertAdjacentElement('afterend', customBtn);

        const originalLabel = btnLootX.textContent || 'Loot X monsters';
        btnLootX.textContent = `${originalLabel.replace(/\s*\(.*?\)\s*$/, '')} (vanilla)`;

        let isRunning = false;
        customBtn.addEventListener('click', async function() {
            if (isRunning) {
                return;
            }

            isRunning = true;
            customBtn.textContent = 'Working...';

            try {
                const userId = resolveLootUserId();
                if (!userId) {
                    lootStatus.textContent = 'Fast loot failed: missing user id on page.';
                    return;
                }

                const countInput = findLootCountInput(btnLootX);
                const requested = Math.max(1, parsePositiveInt(countInput ? countInput.value : '1', 1));
                const unclaimed = getUnclaimedKillCount();
                const targetTotal = unclaimed > 0 ? Math.min(requested, unclaimed) : requested;

                const pageSize = 200;
                const pages = unclaimed > 0 ? Math.ceil(unclaimed / pageSize) : 1;
                const targetIds = new Set(getEligibleDeadMonsterIdsFromDoc(document, true));

                lootStatus.textContent = `Gathering page 1, collected ${targetIds.size}/${targetTotal}...`;

                for (let i = 2; i <= pages && targetIds.size < targetTotal; i += 1) {
                    lootStatus.textContent = `Gathering page ${i}, collected ${targetIds.size}/${targetTotal}...`;
                    try {
                        const doc = await fetchWaveDeadPageDoc(i);
                        const ids = getEligibleDeadMonsterIdsFromDoc(doc, true);
                        ids.forEach((id) => targetIds.add(id));
                    } catch (error) {
                        console.error(`Fast loot page fetch failed for dead_page=${i}:`, error);
                        lootStatus.textContent = `Failed reading page ${i}. Continuing...`;
                        await new Promise((resolve) => setTimeout(resolve, 250));
                    }
                }

                const targets = Array.from(targetIds).slice(0, targetTotal);
                if (targets.length === 0) {
                    lootStatus.textContent = 'No eligible dead monsters found to loot.';
                    return;
                }

                const batchSize = 200;
                let ok = 0;
                let fail = 0;
                let totalExp = 0;
                let totalGold = 0;
                let totalDmg = 0;
                const allItems = [];
                const allNotes = [];

                for (let start = 0; start < targets.length; start += batchSize) {
                    const batch = targets.slice(start, start + batchSize);
                    lootStatus.textContent = `Looting ${start + 1}-${start + batch.length}/${targets.length}... (success: ${ok}, fail: ${fail})`;

                    const results = await Promise.all(batch.map((monsterId) => lootMonsterFast(monsterId, userId)));
                    results.forEach((res, index) => {
                        const monsterId = batch[index];
                        if (res.ok) {
                            ok += 1;
                            totalExp += parsePositiveInt(res.rewards && res.rewards.exp, 0);
                            totalGold += parsePositiveInt(res.rewards && res.rewards.gold, 0);
                            totalDmg += parsePositiveInt(res.rewards && res.rewards.damage_dealt, 0);
                            if (Array.isArray(res.items) && res.items.length > 0) {
                                allItems.push(...res.items);
                            } else if (res.note) {
                                allNotes.push(res.note);
                            }

                            const card = document.querySelector(`.monster-card[data-monster-id="${monsterId}"]`);
                            if (card) {
                                card.setAttribute('data-eligible', '0');
                            }
                        } else {
                            fail += 1;
                            if (res.note) {
                                allNotes.push(res.note);
                            }
                        }
                    });
                }

                lootStatus.textContent = `Fast loot done. Looted ${ok}, failed ${fail}. EXP ${totalExp.toLocaleString()}, Gold ${totalGold.toLocaleString()}, Damage ${totalDmg.toLocaleString()}.`;
                openFastLootModal({
                    processed: `${ok + fail}/${targets.length}`,
                    success: ok,
                    fail,
                    exp: totalExp,
                    gold: totalGold,
                    dmg: totalDmg
                }, allItems, allNotes);
            } finally {
                isRunning = false;
                customBtn.textContent = 'Loot X monsters (super fast)';
            }
        });
    }

    if (allowedPaths.includes(currentPath)) {
        window.addEventListener('load', async function() {
            if (document.getElementById('stamina-container')) {
                return;
            }

            // Auto-accept confirmations for automation actions.
            if (!window.__veyraConfirmPatched) {
                const nativeConfirm = window.confirm.bind(window);
                window.confirm = function(message) {
                    const text = String(message || '');
                    const statConfirm = /spend\s+\d+\s+stat\s+points/i.test(text);
                    const guildTurnInConfirm = /turn\s+in\s+this\s+quest\s+at\s+the\s+adventurer'?s\s+guild/i.test(text);

                    if (autoStatEnabled && statConfirm) {
                        return true;
                    }
                    if (autoFinishQuestEnabled && guildTurnInConfirm) {
                        return true;
                    }

                    return nativeConfirm(message);
                };
                window.__veyraConfirmPatched = true;
            }

            let remoteAutoStatBusy = false;
            let remoteStatsFrame = null;
            let remoteAutoQuestBusy = false;
            let remoteGuildFrame = null;
            let remoteQuestLastClick = 0;
            let remoteQuestLastRefresh = 0;

            function remoteParsePlusValue(text) {
                const match = String(text || '').match(/\+(\d+)/);
                return match ? parseInt(match[1], 10) : NaN;
            }

            function remoteParseUnspentPoints(doc) {
                const labelEl = Array.from(doc.querySelectorAll('div, span, td, strong, p, label'))
                    .find((el) => (el.textContent || '').trim().toUpperCase() === 'UNSPENT POINTS');

                if (labelEl) {
                    const sibling = labelEl.nextElementSibling;
                    const siblingValue = sibling ? parseInt((sibling.textContent || '').replace(/[^0-9]/g, ''), 10) : NaN;
                    if (!isNaN(siblingValue)) {
                        return siblingValue;
                    }

                    const parentText = labelEl.parentElement ? labelEl.parentElement.textContent : '';
                    const parentMatch = (parentText || '').match(/Unspent\s+Points\s*([0-9]+)/i);
                    if (parentMatch) {
                        return parseInt(parentMatch[1], 10);
                    }
                }

                const globalMatch = (doc.body.innerText || '').match(/Unspent\s+Points\s*([0-9]+)/i);
                return globalMatch ? parseInt(globalMatch[1], 10) : 0;
            }

            function remoteGetBestStatButton(doc, statName, points) {
                const labels = Array.from(doc.querySelectorAll('div, span, td, strong, p, label'))
                    .filter((el) => (el.textContent || '').trim().toUpperCase() === statName);

                for (const label of labels) {
                    const nodes = [
                        label.closest('tr'),
                        label.parentElement,
                        label.parentElement ? label.parentElement.parentElement : null,
                        label.parentElement && label.parentElement.parentElement ? label.parentElement.parentElement.parentElement : null
                    ].filter(Boolean);

                    for (const node of nodes) {
                        const buttons = Array.from(node.querySelectorAll('button, input[type="button"], input[type="submit"], a'))
                            .map((el) => {
                                const text = (el.textContent || el.value || '').trim();
                                const value = remoteParsePlusValue(text);
                                return isNaN(value) || value <= 0 ? null : { el, value };
                            })
                            .filter(Boolean)
                            .sort((a, b) => b.value - a.value);

                        const best = buttons.find((entry) => entry.value <= points);
                        if (best) {
                            return best.el;
                        }
                    }
                }

                return null;
            }

            function ensureRemoteStatsFrame() {
                if (remoteStatsFrame && document.body.contains(remoteStatsFrame)) {
                    return remoteStatsFrame;
                }

                remoteStatsFrame = document.createElement('iframe');
                remoteStatsFrame.style.position = 'fixed';
                remoteStatsFrame.style.width = '1px';
                remoteStatsFrame.style.height = '1px';
                remoteStatsFrame.style.left = '-9999px';
                remoteStatsFrame.style.top = '-9999px';
                remoteStatsFrame.style.opacity = '0';
                remoteStatsFrame.style.pointerEvents = 'none';
                remoteStatsFrame.src = `https://demonicscans.org/stats.php?_tm=${Date.now()}`;
                document.body.appendChild(remoteStatsFrame);
                return remoteStatsFrame;
            }

            function ensureRemoteGuildFrame() {
                if (remoteGuildFrame && document.body.contains(remoteGuildFrame)) {
                    return remoteGuildFrame;
                }

                remoteGuildFrame = document.createElement('iframe');
                remoteGuildFrame.style.position = 'fixed';
                remoteGuildFrame.style.width = '1px';
                remoteGuildFrame.style.height = '1px';
                remoteGuildFrame.style.left = '-9999px';
                remoteGuildFrame.style.top = '-9999px';
                remoteGuildFrame.style.opacity = '0';
                remoteGuildFrame.style.pointerEvents = 'none';
                remoteGuildFrame.src = `https://demonicscans.org/adventurers_guild.php?_tm=${Date.now()}`;
                document.body.appendChild(remoteGuildFrame);
                return remoteGuildFrame;
            }

            function findFinishQuestButtonInDoc(doc) {
                const nodes = Array.from(doc.querySelectorAll('button, input[type="button"], input[type="submit"], a'));
                return nodes.find((el) => {
                    const text = (el.textContent || el.value || '').trim().toUpperCase();
                    if (!(text === 'FINISH QUEST' || text.includes('FINISH QUEST'))) {
                        return false;
                    }

                    if (el.disabled) {
                        return false;
                    }

                    const style = doc.defaultView ? doc.defaultView.getComputedStyle(el) : null;
                    if (style && (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none')) {
                        return false;
                    }

                    const rect = el.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                }) || null;
            }

            function hasCompletedQuestInDoc(doc) {
                const text = (doc.body && doc.body.innerText) ? doc.body.innerText : '';
                const progressMatches = Array.from(text.matchAll(/Progress\s*:\s*(\d+)\s*\/\s*(\d+)/gi));
                return progressMatches.some((m) => {
                    const current = parseInt(m[1], 10);
                    const needed = parseInt(m[2], 10);
                    return !isNaN(current) && !isNaN(needed) && needed > 0 && current >= needed;
                });
            }

            async function waitForFrameLoad(frame, timeoutMs = 6000) {
                return new Promise((resolve) => {
                    let done = false;
                    const onDone = (result) => {
                        if (done) {
                            return;
                        }
                        done = true;
                        frame.removeEventListener('load', onLoad);
                        clearTimeout(timer);
                        resolve(result);
                    };
                    const onLoad = () => onDone(true);

                    const timer = setTimeout(() => onDone(false), timeoutMs);
                    frame.addEventListener('load', onLoad);

                    try {
                        if (frame.contentDocument && frame.contentDocument.readyState === 'complete') {
                            onDone(true);
                        }
                    } catch (_err) {
                        // Ignore access timing issues and wait for load.
                    }
                });
            }

            async function tickRemoteAutoStat() {
                if (!autoStatEnabled || remoteAutoStatBusy || currentPath === '/stats.php') {
                    return;
                }

                remoteAutoStatBusy = true;
                try {
                    const frame = ensureRemoteStatsFrame();
                    const loaded = await waitForFrameLoad(frame, 5000);
                    if (!loaded) {
                        return;
                    }

                    const frameWindow = frame.contentWindow;
                    const frameDoc = frame.contentDocument;
                    if (!frameWindow || !frameDoc) {
                        return;
                    }

                    frameWindow.confirm = () => true;

                    const points = remoteParseUnspentPoints(frameDoc);
                    if (points <= 0) {
                        frame.src = `https://demonicscans.org/stats.php?_tm=${Date.now()}`;
                        return;
                    }

                    const button = remoteGetBestStatButton(frameDoc, autoStatTarget, points);
                    if (!button) {
                        frame.src = `https://demonicscans.org/stats.php?_tm=${Date.now()}`;
                        return;
                    }

                    button.click();
                    frame.src = `https://demonicscans.org/stats.php?_tm=${Date.now()}`;
                } catch (error) {
                    console.error('Remote auto stat failed:', error);
                } finally {
                    remoteAutoStatBusy = false;
                }
            }

            async function tickRemoteAutoFinishQuest() {
                if (!autoFinishQuestEnabled || remoteAutoQuestBusy || currentPath === '/adventurers_guild.php') {
                    return;
                }

                remoteAutoQuestBusy = true;
                try {
                    const frame = ensureRemoteGuildFrame();
                    const loaded = await waitForFrameLoad(frame, 5000);
                    if (!loaded) {
                        return;
                    }

                    const frameWindow = frame.contentWindow;
                    const frameDoc = frame.contentDocument;
                    if (!frameWindow || !frameDoc) {
                        return;
                    }

                    frameWindow.confirm = () => true;

                    const btn = findFinishQuestButtonInDoc(frameDoc);
                    if (!btn) {
                        // Reload periodically so we can detect newly completed quests.
                        const now = Date.now();
                        const shouldRefresh = hasCompletedQuestInDoc(frameDoc) || (now - remoteQuestLastRefresh > 7000);
                        if (shouldRefresh) {
                            remoteQuestLastRefresh = now;
                            frame.src = `https://demonicscans.org/adventurers_guild.php?_tm=${Date.now()}`;
                        }
                        return;
                    }

                    const now = Date.now();
                    if (now - remoteQuestLastClick < 1500) {
                        return;
                    }

                    remoteQuestLastClick = now;
                    btn.click();
                    frame.src = `https://demonicscans.org/adventurers_guild.php?_tm=${Date.now()}`;
                } catch (error) {
                    console.error('Remote auto finish quest failed:', error);
                } finally {
                    remoteAutoQuestBusy = false;
                }
            }

            setInterval(tickRemoteAutoStat, 2500);
            tickRemoteAutoStat();
            setInterval(tickRemoteAutoFinishQuest, 2500);
            tickRemoteAutoFinishQuest();

            if (document.location.href == ("https://demonicscans.org/pvparena.php")) {
                // Reserved for future PvP helpers.
            }
            const staminaElement = document.querySelector('.gtb-value');

            // Create the UI container
            const container = document.createElement('div');
            container.id = 'stamina-container';
            const savedPosition = JSON.parse(localStorage.getItem('staminaContainerPosition') || '{"top": "100px", "right": "50px"}');
            container.style.position = 'fixed';
            container.style.top = savedPosition.top;
            container.style.left = savedPosition.left || 'calc(100% - 230px)';
            container.style.right = 'auto';
            container.style.zIndex = '2147483647';
            container.style.backgroundColor = 'rgb(167 137 202 / 80%)';
            container.style.padding = '10px';
            container.style.borderRadius = '8px';
            container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.5)';
            container.style.color = 'black';
            container.style.fontFamily = 'Arial, sans-serif';
            container.style.maxWidth = '180px';
            container.style.cursor = 'move';

            let isDragging = false;
            let dragOffsetX, dragOffsetY;

            container.addEventListener('mousedown', function(e) {
                const interactiveTarget = e.target.closest('input, button, select, option, textarea, a, label');
                if (interactiveTarget) {
                    return;
                }

                if (e.button !== 0) {
                    return;
                }

                isDragging = true;
                const rect = container.getBoundingClientRect();
                dragOffsetX = e.clientX - rect.left;
                dragOffsetY = e.clientY - rect.top;
                container.style.cursor = 'grabbing';
                e.preventDefault();
            });

            document.addEventListener('mousemove', function(e) {
                if (!isDragging) return;

                const x = e.clientX - dragOffsetX;
                const y = e.clientY - dragOffsetY;

                // Keep within viewport bounds
                const maxX = window.innerWidth - container.offsetWidth;
                const maxY = window.innerHeight - container.offsetHeight;

                const boundedX = Math.max(0, Math.min(x, maxX));
                const boundedY = Math.max(0, Math.min(y, maxY));

                container.style.top = boundedY + 'px';
                container.style.left = boundedX + 'px';
                container.style.right = 'auto';
                e.preventDefault();
            });

            document.addEventListener('mouseup', function() {
                if (!isDragging) return;

                isDragging = false;
                container.style.cursor = 'move';

                // Save position to localStorage
                const position = {
                    top: container.style.top,
                    left: container.style.left,
                    // top: rect.top + 'px',
                    // right: (window.innerWidth - rect.right) + 'px'
                };
                console.log(JSON.stringify(position));
                localStorage.setItem('staminaContainerPosition', JSON.stringify(position));
            });


            // Create title
            const title = document.createElement('h3');
            title.textContent = 'Veyra Helper Widget';
            title.style.margin = '0 0 10px 0';
            title.style.fontSize = '14px';
            title.style.color = 'black';
            container.appendChild(title);

            let autoFinishQuestBusy = false;
            let autoFinishQuestLastClick = 0;

            function findFinishQuestButton() {
                const candidates = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a'));
                return candidates.find((el) => {
                    const text = (el.textContent || el.value || '').trim().toUpperCase();
                    const looksLikeFinish = text === 'FINISH QUEST' || text.includes('FINISH QUEST');
                    if (!looksLikeFinish) {
                        return false;
                    }

                    if (el.disabled) {
                        return false;
                    }

                    const style = window.getComputedStyle(el);
                    if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') {
                        return false;
                    }

                    const rect = el.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                }) || null;
            }

            function isQuestCompletedByProgress() {
                const progressNode = Array.from(document.querySelectorAll('div, span, p, li, td, strong'))
                    .find((el) => /Progress\s*:\s*\d+\s*\/\s*\d+/i.test((el.textContent || '').trim()));

                if (!progressNode) {
                    return false;
                }

                const match = (progressNode.textContent || '').match(/Progress\s*:\s*(\d+)\s*\/\s*(\d+)/i);
                if (!match) {
                    return false;
                }

                const current = parseInt(match[1], 10);
                const needed = parseInt(match[2], 10);
                return !isNaN(current) && !isNaN(needed) && needed > 0 && current >= needed;
            }

            function parseQueryParamsFromHref(href) {
                try {
                    const u = new URL(href, window.location.origin);
                    const gate = u.searchParams.get('gate') || '';
                    const wave = u.searchParams.get('wave') || '';
                    return { gate, wave };
                } catch (_err) {
                    return { gate: '', wave: '' };
                }
            }

            function extractBattleIdFromHref(href) {
                try {
                    const u = new URL(href, window.location.origin);
                    return u.searchParams.get('id') || '';
                } catch (_err) {
                    return '';
                }
            }

            function extractBattleIdFromElement(el) {
                const hrefId = extractBattleIdFromHref(el.getAttribute('href') || '');
                if (hrefId) {
                    return hrefId;
                }

                const attrs = [
                    el.getAttribute('onclick') || '',
                    el.getAttribute('data-battle-id') || '',
                    el.getAttribute('data-id') || ''
                ].join(' ');

                const idMatch = attrs.match(/(?:battle\.php\?id=|\bid\s*[=:]\s*|\bbattle[_-]?id\s*[=:]\s*)(\d+)/i);
                return idMatch ? idMatch[1] : '';
            }

            function findJoinBattleControl(doc, blockedBattleIds) {
                const controls = Array.from(doc.querySelectorAll('a, button, input[type="button"], input[type="submit"]'));
                const matches = controls.filter((el) => {
                    const text = (el.textContent || el.value || '').trim().toUpperCase();
                    const isJoin = text.includes('JOIN BATTLE');
                    const isContinue = text.includes('CONTINUE THE BATTLE') || text.includes('CONTINUE BATTLE');

                    // Strictly target Join Battle to avoid re-entering the same fight via Continue/View links.
                    const looksLikeJoin = isJoin && !isContinue;

                    if (!looksLikeJoin || el.disabled) {
                        return false;
                    }

                    const style = doc.defaultView ? doc.defaultView.getComputedStyle(el) : null;
                    if (style && (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none')) {
                        return false;
                    }

                    const rect = el.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                });

                if (!blockedBattleIds || blockedBattleIds.size === 0) {
                    return matches[0] || null;
                }

                const notBlocked = matches.find((el) => {
                    const battleId = extractBattleIdFromElement(el);
                    return !battleId || !blockedBattleIds.has(battleId);
                });

                return notBlocked || null;
            }

            function findDamageInput(doc) {
                const named = doc.querySelector('input[name="damage"], input[name="dmg"], input[name="attack_damage"]');
                if (named) {
                    return named;
                }

                const numeric = Array.from(doc.querySelectorAll('input[type="number"], input[type="text"]')).find((el) => {
                    const name = (el.getAttribute('name') || '').toLowerCase();
                    const id = (el.id || '').toLowerCase();
                    const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
                    return name.includes('damage') || name === 'dmg' || id.includes('damage') || placeholder.includes('damage');
                });

                return numeric || null;
            }

            function findAttackControl(doc) {
                const controls = Array.from(doc.querySelectorAll('button, input[type="submit"], input[type="button"], a'));
                return controls.find((el) => {
                    const text = (el.textContent || el.value || '').trim().toUpperCase();
                    const looksLikeAttack = text.includes('ATTACK') || text.includes('DEAL DAMAGE') || text === 'HIT';

                    if (!looksLikeAttack || el.disabled) {
                        return false;
                    }

                    const style = doc.defaultView ? doc.defaultView.getComputedStyle(el) : null;
                    if (style && (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none')) {
                        return false;
                    }

                    const rect = el.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                }) || null;
            }

            function findSlashControl(doc) {
                const controls = Array.from(doc.querySelectorAll('button, input[type="submit"], input[type="button"], a'));

                const pickVisibleEnabled = (predicate) => controls.find((el) => {
                    const text = (el.textContent || el.value || '').trim().toUpperCase();
                    if (!predicate(text) || el.disabled) {
                        return false;
                    }

                    const style = doc.defaultView ? doc.defaultView.getComputedStyle(el) : null;
                    if (style && (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none')) {
                        return false;
                    }

                    const rect = el.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                }) || null;

                // Prefer normal Slash to avoid spending stamina unless it is unavailable.
                return pickVisibleEnabled((t) => t === 'SLASH') || pickVisibleEnabled((t) => t.includes('POWER SLASH'));
            }

            function parseCurrentBattleDamage(doc) {
                const text = ((doc.body && doc.body.innerText) || '');
                const match = text.match(/DMG\s*:\s*([\d,]+)/i);
                if (!match) {
                    return null;
                }
                const value = parseInt((match[1] || '').replace(/,/g, ''), 10);
                return isNaN(value) ? null : value;
            }

            function battleLooksFinished(doc) {
                const text = ((doc.body && doc.body.innerText) || '').toLowerCase();

                // Hard fallback: if the page already shows slain/loot state, treat battle as finished.
                const hasClaimLoot = Array.from(doc.querySelectorAll('button, input[type="submit"], input[type="button"], a'))
                    .some((el) => /claim\s+loot/i.test((el.textContent || el.value || '').trim()));
                const hasSlainText = /(monster\s+has\s+been\s+slain|monster\s+is\s+dead|monster\s+defeated|you\s+won\s+the\s+battle|victory!)/i.test(text);
                if (hasClaimLoot || hasSlainText) {
                    return true;
                }

                // If attack controls are still available, battle is active.
                if (findSlashControl(doc) || findAttackControl(doc)) {
                    return false;
                }

                return /\b(battle ended|battle is over|monster defeated|you were defeated|you are defeated|you won the battle|victory!)\b/.test(text);
            }

            function findBackToWaveControl(doc) {
                const controls = Array.from(doc.querySelectorAll('a, button, input[type="button"], input[type="submit"]'));
                return controls.find((el) => {
                    const text = (el.textContent || el.value || '').trim().toUpperCase();
                    const href = (el.getAttribute('href') || '').toLowerCase();
                    return text.includes('BACK TO WAVE') || href.includes('/active_wave.php');
                }) || null;
            }

            function addAutoMobFarmControls() {
                if (container.querySelector('#auto-mob-farm-wrap')) {
                    return;
                }

                const wrap = document.createElement('div');
                wrap.id = 'auto-mob-farm-wrap';
                wrap.style.marginTop = '10px';
                wrap.style.paddingTop = '10px';
                wrap.style.borderTop = '1px solid rgba(0,0,0,0.2)';

                const heading = document.createElement('label');
                heading.textContent = 'Auto Mob Farm';
                heading.style.display = 'block';
                heading.style.marginBottom = '5px';
                heading.style.fontWeight = 'bold';
                heading.style.color = 'black';
                wrap.appendChild(heading);

                const damageInput = document.createElement('input');
                damageInput.type = 'number';
                damageInput.min = '1';
                damageInput.step = '1';
                damageInput.value = String(Math.max(1, parseInt(autoMobFarmDamage, 10) || 1));
                damageInput.style.width = '100%';
                damageInput.style.padding = '8px';
                damageInput.style.border = '1px solid #aaa';
                damageInput.style.borderRadius = '4px';
                damageInput.style.boxSizing = 'border-box';
                damageInput.style.marginBottom = '8px';
                damageInput.style.color = 'black';
                wrap.appendChild(damageInput);

                const waveLabel = document.createElement('label');
                waveLabel.textContent = 'Target Wave:';
                waveLabel.style.display = 'block';
                waveLabel.style.marginBottom = '5px';
                waveLabel.style.fontWeight = 'bold';
                waveLabel.style.color = 'black';
                wrap.appendChild(waveLabel);

                const waveSelect = document.createElement('select');
                waveSelect.style.width = '100%';
                waveSelect.style.padding = '8px';
                waveSelect.style.border = '1px solid #aaa';
                waveSelect.style.borderRadius = '4px';
                waveSelect.style.boxSizing = 'border-box';
                waveSelect.style.marginBottom = '8px';
                waveSelect.style.color = 'black';
                [
                    { value: 'current', label: 'Current Wave' },
                    { value: '1', label: 'Wave 1' },
                    { value: '2', label: 'Wave 2' },
                    { value: '3', label: 'Wave 3' }
                ].forEach((opt) => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.label;
                    option.style.color = 'black';
                    option.style.backgroundColor = 'white';
                    waveSelect.appendChild(option);
                });
                waveSelect.value = ['current', '1', '2', '3'].includes(autoMobFarmWaveTarget) ? autoMobFarmWaveTarget : 'current';
                wrap.appendChild(waveSelect);

                const toggleBtn = document.createElement('button');
                toggleBtn.style.width = '100%';
                toggleBtn.style.padding = '8px 12px';
                toggleBtn.style.border = 'none';
                toggleBtn.style.borderRadius = '4px';
                toggleBtn.style.color = 'black';
                toggleBtn.style.cursor = 'pointer';
                toggleBtn.style.marginBottom = '8px';
                wrap.appendChild(toggleBtn);

                const status = document.createElement('div');
                status.style.fontSize = '11px';
                status.style.lineHeight = '1.4';
                status.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
                status.style.borderRadius = '4px';
                status.style.padding = '8px';
                status.style.wordBreak = 'break-word';
                status.style.color = 'black';
                wrap.appendChild(status);

                container.appendChild(wrap);

                let farmActionBusy = false;
                let lastBattleAttackAt = 0;
                let lastWaitingRefreshAt = parseInt(localStorage.getItem('autoMobFarmLastWaitingRefreshAt') || '0', 10);

                function updateToggle() {
                    toggleBtn.textContent = autoMobFarmEnabled ? 'Auto Mob Farm: ON' : 'Auto Mob Farm: OFF';
                    toggleBtn.style.backgroundColor = autoMobFarmEnabled ? '#2E7D32' : '#616161';
                }

                function getConfiguredDamage() {
                    const value = Math.max(1, parseInt(damageInput.value, 10) || 1);
                    damageInput.value = String(value);
                    autoMobFarmDamage = String(value);
                    localStorage.setItem('autoMobFarmDamage', autoMobFarmDamage);
                    return value;
                }

                function getConfiguredWaveTarget() {
                    autoMobFarmWaveTarget = waveSelect.value;
                    localStorage.setItem('autoMobFarmWaveTarget', autoMobFarmWaveTarget);
                    return autoMobFarmWaveTarget;
                }

                function loadRecentBattles() {
                    try {
                        const raw = localStorage.getItem('autoMobFarmRecentBattles') || '{}';
                        const parsed = JSON.parse(raw);
                        return parsed && typeof parsed === 'object' ? parsed : {};
                    } catch (_err) {
                        return {};
                    }
                }

                function saveRecentBattles(map) {
                    localStorage.setItem('autoMobFarmRecentBattles', JSON.stringify(map));
                }

                function pruneRecentBattles(map) {
                    const now = Date.now();
                    const ttlMs = 15 * 60 * 1000;
                    Object.keys(map).forEach((battleId) => {
                        if (now - Number(map[battleId] || 0) > ttlMs) {
                            delete map[battleId];
                        }
                    });
                    return map;
                }

                function markBattleHandled(battleId) {
                    if (!battleId) {
                        return;
                    }
                    const map = pruneRecentBattles(loadRecentBattles());
                    map[battleId] = Date.now();
                    saveRecentBattles(map);
                }

                function getTargetWaveUrl(targetWave) {
                    const savedWaveUrl = localStorage.getItem('autoMobFarmLastWaveUrl') || '';
                    const savedParams = parseQueryParamsFromHref(savedWaveUrl);
                    const currentParams = parseQueryParamsFromHref(window.location.href);

                    let gate = currentParams.gate || savedParams.gate || autoMobFarmLastGate || '';
                    if (gate) {
                        autoMobFarmLastGate = gate;
                        localStorage.setItem('autoMobFarmLastGate', autoMobFarmLastGate);
                    }

                    if (!gate) {
                        return savedWaveUrl.includes('/active_wave.php') ? savedWaveUrl : '';
                    }

                    let wave = targetWave;
                    if (wave === 'current') {
                        wave = currentPath === '/active_wave.php'
                            ? (currentParams.wave || savedParams.wave || '1')
                            : (savedParams.wave || '1');
                    }

                    return `https://demonicscans.org/active_wave.php?gate=${gate}&wave=${wave}`;
                }

                function returnToWaveWithFallback(statusMessage, preferredWaveUrl) {
                    status.textContent = statusMessage;
                    markBattleHandled(localStorage.getItem('autoMobFarmCurrentBattleId') || '');

                    farmActionBusy = true;
                    setTimeout(() => {
                        farmActionBusy = false;
                    }, 3000);

                    if (preferredWaveUrl && preferredWaveUrl.includes('/active_wave.php')) {
                        window.location.href = preferredWaveUrl;
                        return;
                    }

                    const lastWaveUrl = localStorage.getItem('autoMobFarmLastWaveUrl') || '';
                    if (lastWaveUrl.includes('/active_wave.php')) {
                        window.location.href = lastWaveUrl;
                        return;
                    }

                    const backToWaveControl = findBackToWaveControl(document);
                    if (backToWaveControl) {
                        backToWaveControl.click();
                        return;
                    }

                    window.location.href = 'https://demonicscans.org/active_wave.php';
                }

                damageInput.addEventListener('change', function() {
                    getConfiguredDamage();
                    status.textContent = `Damage set to ${autoMobFarmDamage}.`;
                });

                waveSelect.addEventListener('change', function() {
                    const targetWave = getConfiguredWaveTarget();
                    status.textContent = targetWave === 'current'
                        ? 'Wave target set to current wave.'
                        : `Wave target set to wave ${targetWave}.`;
                });

                toggleBtn.addEventListener('click', function() {
                    autoMobFarmEnabled = !autoMobFarmEnabled;
                    localStorage.setItem('autoMobFarmEnabled', String(autoMobFarmEnabled));
                    updateToggle();
                    status.textContent = autoMobFarmEnabled
                        ? 'Auto mob farm enabled.'
                        : 'Auto mob farm disabled.';
                });

                const farmLoop = async () => {
                    if (!autoMobFarmEnabled || farmActionBusy) {
                        return;
                    }

                    const damage = getConfiguredDamage();
                    const waveTarget = getConfiguredWaveTarget();
                    const targetWaveUrl = getTargetWaveUrl(waveTarget);

                    if (currentPath === '/active_wave.php') {
                        const currentParams = parseQueryParamsFromHref(window.location.href);
                        if (currentParams.gate) {
                            autoMobFarmLastGate = currentParams.gate;
                            localStorage.setItem('autoMobFarmLastGate', autoMobFarmLastGate);
                        }

                        if (targetWaveUrl.includes('/active_wave.php')) {
                            const targetParams = parseQueryParamsFromHref(targetWaveUrl);
                            if (targetParams.wave && currentParams.wave !== targetParams.wave) {
                                status.textContent = `Switching to wave ${targetParams.wave}...`;
                                farmActionBusy = true;
                                setTimeout(() => {
                                    farmActionBusy = false;
                                }, 3000);
                                window.location.href = targetWaveUrl;
                                return;
                            }
                        }

                        localStorage.setItem('autoMobFarmLastWaveUrl', window.location.href);

                        const recentMap = pruneRecentBattles(loadRecentBattles());
                        saveRecentBattles(recentMap);
                        const blockedIds = new Set(Object.keys(recentMap));

                        const joinControl = findJoinBattleControl(document, blockedIds);
                        if (!joinControl) {
                            const now = Date.now();
                            status.textContent = blockedIds.size > 0
                                ? 'All visible monsters were recently handled. Waiting for new targets...'
                                : 'No joinable monster found in target wave.';

                            if (now - lastWaitingRefreshAt >= 10 * 1000) {
                                lastWaitingRefreshAt = now;
                                localStorage.setItem('autoMobFarmLastWaitingRefreshAt', String(now));
                                status.textContent = 'Waiting for new targets... refreshing page.';
                                farmActionBusy = true;
                                setTimeout(() => {
                                    farmActionBusy = false;
                                }, 3000);
                                window.location.reload();
                            }
                            return;
                        }

                        const href = joinControl.getAttribute('href') || '';
                        const battleId = extractBattleIdFromElement(joinControl) || extractBattleIdFromHref(href);
                        if (battleId) {
                            localStorage.setItem('autoMobFarmCurrentBattleId', battleId);
                        }

                        status.textContent = `Joining next monster (wave ${waveTarget === 'current' ? currentParams.wave || 'current' : waveTarget}). Damage per hit: ${damage}.`;
                        farmActionBusy = true;
                        setTimeout(() => {
                            farmActionBusy = false;
                        }, 3000);
                        joinControl.click();
                        return;
                    }

                    if (currentPath === '/battle.php') {
                        const idFromUrl = new URL(window.location.href).searchParams.get('id') || '';
                        const trackedBattleId = idFromUrl || localStorage.getItem('autoMobFarmCurrentBattleId') || '';

                        if (battleLooksFinished(document)) {
                            markBattleHandled(trackedBattleId);
                            returnToWaveWithFallback('Battle finished. Returning to active wave...', targetWaveUrl);
                            return;
                        }

                        const dmgInput = findDamageInput(document);
                        const attackControl = findAttackControl(document);
                        const slashControl = findSlashControl(document);

                        const currentDamage = parseCurrentBattleDamage(document);
                        if (currentDamage !== null && currentDamage >= damage) {
                            markBattleHandled(trackedBattleId);
                            status.textContent = `Target damage reached (${currentDamage}/${damage}). Moving to next monster...`;
                            farmActionBusy = true;
                            setTimeout(() => {
                                farmActionBusy = false;
                            }, 3000);
                            if (targetWaveUrl.includes('/active_wave.php')) {
                                window.location.href = targetWaveUrl;
                            }
                            return;
                        }

                        if ((!dmgInput || !attackControl) && !slashControl) {
                            const fromRef = document.referrer || '';
                            const params = parseQueryParamsFromHref(fromRef);
                            if (fromRef.includes('/active_wave.php') && params.gate && params.wave) {
                                localStorage.setItem('autoMobFarmLastWaveUrl', `https://demonicscans.org/active_wave.php?gate=${params.gate}&wave=${params.wave}`);
                                autoMobFarmLastGate = params.gate;
                                localStorage.setItem('autoMobFarmLastGate', autoMobFarmLastGate);
                            }

                            if (battleLooksFinished(document)) {
                                markBattleHandled(trackedBattleId);
                                returnToWaveWithFallback('Battle has ended. Fallback returning to wave...', targetWaveUrl);
                                return;
                            }

                            status.textContent = 'Waiting for battle controls...';
                            return;
                        }

                        const now = Date.now();
                        if (now - lastBattleAttackAt < 900) {
                            status.textContent = currentDamage === null
                                ? 'Waiting for damage update...'
                                : `Current damage ${currentDamage}/${damage}.`;
                            return;
                        }

                        if (dmgInput && attackControl) {
                            dmgInput.value = String(damage);
                            dmgInput.dispatchEvent(new Event('input', { bubbles: true }));
                            dmgInput.dispatchEvent(new Event('change', { bubbles: true }));
                        }

                        if (slashControl) {
                            status.textContent = currentDamage === null
                                ? 'Using Slash...'
                                : `Using Slash. Current damage ${currentDamage}/${damage}.`;
                            lastBattleAttackAt = now;
                            slashControl.click();
                            return;
                        }

                        status.textContent = currentDamage === null
                            ? `Attacking with ${damage} damage.`
                            : `Attacking. Current damage ${currentDamage}/${damage}.`;
                        lastBattleAttackAt = now;
                        attackControl.click();
                        return;
                    }

                    status.textContent = 'Open active_wave.php or battle.php for auto mob farm.';
                };

                updateToggle();
                status.textContent = autoMobFarmEnabled ? 'Auto mob farm enabled.' : 'Auto mob farm disabled.';

                setInterval(farmLoop, 1300);
                farmLoop();
            }

            let containerAppended = false;

            function appendContainerIfNeeded() {
                if (!containerAppended) {
                    document.body.appendChild(container);
                    containerAppended = true;

                    // Recover if saved position is outside visible viewport.
                    requestAnimationFrame(() => {
                        const rect = container.getBoundingClientRect();
                        const outsideX = rect.right < 0 || rect.left > window.innerWidth;
                        const outsideY = rect.bottom < 0 || rect.top > window.innerHeight;

                        if (outsideX || outsideY) {
                            container.style.left = '20px';
                            container.style.top = '20px';
                            localStorage.setItem('staminaContainerPosition', JSON.stringify({ top: '20px', left: '20px' }));
                        }
                    });
                }
            }

            console.log(this.document.location.href);
            if (document.location.href == "https://demonicscans.org/chat.php"){
                clearInterval(t);
                t=setInterval(updateChat,1000 * 2);
            } else if (document.location.href == "https://demonicscans.org/game_dash.php"){
                let pvpArena = document.createElement('a');
                pvpArena.href='pvparena.php';
                pvpArena.classList='gate-link';

                let pvpArena_div = document.createElement('div');
                pvpArena_div.classList="gate-card";

                let pvpArena_img = document.createElement('img');
                pvpArena_img.src = "/images/events/goblin_fest/compressed_goblin_feast.webp";
                pvpArena_img.alt = "Fight Players";
                pvpArena_div.appendChild(pvpArena_img);
                pvpArena_div.innerHTML += `<div class="gate-card-name">PvP Arena</div>`;

                pvpArena.appendChild(pvpArena_div);
                document.querySelectorAll('div.gates-flex')[0].appendChild(pvpArena);

            } else if (document.location.href == ("https://demonicscans.org/pvparena.php")) {
                alert(document.location.href);
                alert("HEHEHE");
                console.log('herrou');
            } else if (document.location.href.includes("https://demonicscans.org/adventurers_guild.php")) {
                const questWrap = document.createElement('div');
                questWrap.style.marginBottom = '10px';

                const questToggle = document.createElement('button');
                questToggle.style.padding = '8px 12px';
                questToggle.style.backgroundColor = '#2E7D32';
                questToggle.style.color = 'black';
                questToggle.style.border = 'none';
                questToggle.style.borderRadius = '4px';
                questToggle.style.cursor = 'pointer';
                questToggle.style.fontSize = '12px';
                questToggle.style.width = '100%';
                questWrap.appendChild(questToggle);

                const questStatus = document.createElement('div');
                questStatus.style.fontSize = '11px';
                questStatus.style.lineHeight = '1.4';
                questStatus.style.backgroundColor = 'rgba(0, 0, 0, 0.25)';
                questStatus.style.borderRadius = '4px';
                questStatus.style.padding = '8px';
                questStatus.style.marginTop = '8px';
                questStatus.style.wordBreak = 'break-word';
                questStatus.style.color = 'black';
                questWrap.appendChild(questStatus);

                container.appendChild(questWrap);

                function updateQuestToggleText() {
                    questToggle.textContent = autoFinishQuestEnabled ? 'Auto Finish Quest: ON' : 'Auto Finish Quest: OFF';
                    questToggle.style.backgroundColor = autoFinishQuestEnabled ? '#2E7D32' : '#616161';
                }

                function tickAutoFinishQuest() {
                    if (!autoFinishQuestEnabled || autoFinishQuestBusy) {
                        return;
                    }

                    const btn = findFinishQuestButton();
                    if (!btn) {
                        if (isQuestCompletedByProgress()) {
                            questStatus.textContent = 'Quest objective is complete, waiting for Finish Quest button...';
                        } else {
                            questStatus.textContent = 'No completed quest ready to finish.';
                        }
                        return;
                    }

                    const now = Date.now();
                    if (now - autoFinishQuestLastClick < 1500) {
                        return;
                    }

                    autoFinishQuestBusy = true;
                    autoFinishQuestLastClick = now;
                    questStatus.textContent = 'Completed quest found. Clicking Finish Quest...';

                    btn.click();

                    setTimeout(() => {
                        autoFinishQuestBusy = false;
                    }, 1200);
                }

                questToggle.addEventListener('click', function() {
                    autoFinishQuestEnabled = !autoFinishQuestEnabled;
                    localStorage.setItem('autoFinishQuestEnabled', String(autoFinishQuestEnabled));
                    updateQuestToggleText();
                    questStatus.textContent = autoFinishQuestEnabled
                        ? 'Auto finish enabled. Monitoring quests...'
                        : 'Auto finish disabled.';
                });

                updateQuestToggleText();
                questStatus.textContent = autoFinishQuestEnabled
                    ? 'Auto finish enabled. Monitoring quests...'
                    : 'Auto finish disabled.';

                setInterval(tickAutoFinishQuest, 1000);
                tickAutoFinishQuest();

                appendContainerIfNeeded();
            } else if (
                document.location.href.includes("https://demonicscans.org/stats.php") ||
                document.location.href.includes("https://demonicscans.org/active_wave.php") ||
                document.location.href.includes("https://demonicscans.org/battle.php")
            ) {
                const autoStatDIV = document.createElement('div');
                autoStatDIV.style.marginBottom = '10px';

                const autoStatLabel = document.createElement('label');
                autoStatLabel.textContent = 'Auto Stat Target:';
                autoStatLabel.style.display = 'block';
                autoStatLabel.style.marginBottom = '5px';
                autoStatLabel.style.fontWeight = 'bold';
                autoStatLabel.style.color = 'black';
                autoStatDIV.appendChild(autoStatLabel);

                const autoStatSelect = document.createElement('select');
                autoStatSelect.style.width = '100%';
                autoStatSelect.style.padding = '8px';
                autoStatSelect.style.border = '1px solid #ccc';
                autoStatSelect.style.borderRadius = '4px';
                autoStatSelect.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                autoStatSelect.style.color = 'black';
                [
                    { value: 'ATTACK', label: 'Attack' },
                    { value: 'DEFENSE', label: 'Defense' },
                    { value: 'STAMINA', label: 'Stamina' }
                ].forEach((statOption) => {
                    const option = document.createElement('option');
                    option.value = statOption.value;
                    option.textContent = statOption.label;
                    option.style.color = 'black';
                    option.style.backgroundColor = 'white';
                    autoStatSelect.appendChild(option);
                });
                autoStatSelect.value = ['ATTACK', 'DEFENSE', 'STAMINA'].includes(autoStatTarget) ? autoStatTarget : 'ATTACK';
                autoStatDIV.appendChild(autoStatSelect);
                container.appendChild(autoStatDIV);

                const autoStatToggleDIV = document.createElement('div');
                autoStatToggleDIV.style.marginBottom = '10px';

                const autoStatToggle = document.createElement('button');
                autoStatToggle.style.padding = '8px 12px';
                autoStatToggle.style.backgroundColor = '#2E7D32';
                autoStatToggle.style.color = 'black';
                autoStatToggle.style.border = 'none';
                autoStatToggle.style.borderRadius = '4px';
                autoStatToggle.style.cursor = 'pointer';
                autoStatToggle.style.fontSize = '12px';
                autoStatToggle.style.width = '100%';
                autoStatToggleDIV.appendChild(autoStatToggle);
                container.appendChild(autoStatToggleDIV);

                const autoStatStatus = document.createElement('div');
                autoStatStatus.style.fontSize = '11px';
                autoStatStatus.style.lineHeight = '1.4';
                autoStatStatus.style.backgroundColor = 'rgba(0, 0, 0, 0.25)';
                autoStatStatus.style.borderRadius = '4px';
                autoStatStatus.style.padding = '8px';
                autoStatStatus.style.marginBottom = '8px';
                autoStatStatus.style.wordBreak = 'break-word';
                autoStatStatus.style.color = 'black';
                container.appendChild(autoStatStatus);

                const parseButtonValue = (text) => {
                    const match = (text || '').match(/\+(\d+)/);
                    return match ? parseInt(match[1]) : NaN;
                };

                function getUnspentPoints() {
                    const labelEl = Array.from(document.querySelectorAll('div, span, td, strong, p, label'))
                        .find((el) => (el.textContent || '').trim().toUpperCase() === 'UNSPENT POINTS');

                    if (labelEl) {
                        const sibling = labelEl.nextElementSibling;
                        const siblingValue = sibling ? parseInt((sibling.textContent || '').replace(/[^0-9]/g, ''), 10) : NaN;
                        if (!isNaN(siblingValue)) {
                            return siblingValue;
                        }

                        const parentText = labelEl.parentElement ? labelEl.parentElement.textContent : '';
                        const parentMatch = (parentText || '').match(/Unspent\s+Points\s*([0-9]+)/i);
                        if (parentMatch) {
                            return parseInt(parentMatch[1], 10);
                        }
                    }

                    const globalMatch = (document.body.innerText || '').match(/Unspent\s+Points\s*([0-9]+)/i);
                    return globalMatch ? parseInt(globalMatch[1], 10) : 0;
                }

                function getStatButtons(statName) {
                    const labels = Array.from(document.querySelectorAll('div, span, td, strong, p, label'))
                        .filter((el) => (el.textContent || '').trim().toUpperCase() === statName);

                    for (const label of labels) {
                        const candidates = [
                            label.closest('tr'),
                            label.parentElement,
                            label.parentElement ? label.parentElement.parentElement : null,
                            label.parentElement && label.parentElement.parentElement ? label.parentElement.parentElement.parentElement : null
                        ].filter(Boolean);

                        for (const node of candidates) {
                            const buttons = Array.from(node.querySelectorAll('button, input[type="button"], a'))
                                .filter((btn) => /^\s*\+\d+\s*$/.test((btn.textContent || btn.value || '').trim()));
                            if (buttons.length > 0) {
                                return buttons;
                            }
                        }
                    }

                    return [];
                }

                function getBestStatButton(points, statName) {
                    const buttons = getStatButtons(statName)
                        .map((btn) => ({
                            element: btn,
                            value: parseButtonValue((btn.textContent || btn.value || '').trim())
                        }))
                        .filter((entry) => !isNaN(entry.value) && entry.value > 0 && entry.element.offsetParent !== null && !entry.element.disabled)
                        .sort((a, b) => b.value - a.value);

                    return buttons.find((entry) => entry.value <= points) || null;
                }

                let autoStatLoopTimer = null;
                let autoStatPending = false;

                function updateAutoStatButtonText() {
                    autoStatToggle.textContent = autoStatEnabled ? 'Auto Stat: ON' : 'Auto Stat: OFF';
                    autoStatToggle.style.backgroundColor = autoStatEnabled ? '#2E7D32' : '#616161';
                }

                function tickAutoStat() {
                    if (!autoStatEnabled || autoStatPending) {
                        return;
                    }

                    const points = getUnspentPoints();
                    const selectedStat = autoStatSelect.value;

                    if (points <= 0) {
                        autoStatStatus.textContent = `No unspent points. Target: ${selectedStat}.`;
                        return;
                    }

                    const buttonToClick = getBestStatButton(points, selectedStat);
                    if (!buttonToClick) {
                        autoStatStatus.textContent = `Unspent: ${points}. Waiting for ${selectedStat} buttons...`;
                        return;
                    }

                    autoStatPending = true;
                    autoStatStatus.textContent = `Allocating ${buttonToClick.value} point(s) to ${selectedStat}. Remaining before click: ${points}.`;
                    buttonToClick.element.click();

                    // Give the page time to update points before the next action.
                    setTimeout(() => {
                        autoStatPending = false;
                    }, 900);
                }

                function startAutoStatLoop() {
                    if (autoStatLoopTimer) {
                        clearInterval(autoStatLoopTimer);
                    }
                    autoStatLoopTimer = setInterval(tickAutoStat, 700);
                    tickAutoStat();
                }

                function stopAutoStatLoop() {
                    if (autoStatLoopTimer) {
                        clearInterval(autoStatLoopTimer);
                        autoStatLoopTimer = null;
                    }
                    autoStatPending = false;
                }

                autoStatSelect.addEventListener('change', function() {
                    autoStatTarget = this.value;
                    localStorage.setItem('autoStatTarget', autoStatTarget);
                    autoStatStatus.textContent = `Target changed to ${autoStatTarget}.`;
                    if (autoStatEnabled) {
                        tickAutoStat();
                    }
                });

                autoStatToggle.addEventListener('click', function() {
                    autoStatEnabled = !autoStatEnabled;
                    localStorage.setItem('autoStatEnabled', String(autoStatEnabled));
                    updateAutoStatButtonText();

                    if (autoStatEnabled) {
                        startAutoStatLoop();
                    } else {
                        stopAutoStatLoop();
                        autoStatStatus.textContent = `Auto stat is off. Target: ${autoStatSelect.value}.`;
                    }
                });

                updateAutoStatButtonText();
                autoStatStatus.textContent = `Auto stat is ${autoStatEnabled ? 'on' : 'off'}. Target: ${autoStatSelect.value}.`;

                injectFastLootXControl();

                const collectorWrap = document.createElement('div');
                collectorWrap.style.marginTop = '10px';
                collectorWrap.style.paddingTop = '10px';
                collectorWrap.style.borderTop = '1px solid rgba(0,0,0,0.2)';

                const collectorLabel = document.createElement('label');
                collectorLabel.textContent = 'Stamina To Gain:';
                collectorLabel.style.display = 'block';
                collectorLabel.style.marginBottom = '5px';
                collectorLabel.style.fontWeight = 'bold';
                collectorLabel.style.color = 'black';
                collectorWrap.appendChild(collectorLabel);

                const targetInput = document.createElement('input');
                targetInput.type = 'number';
                targetInput.min = '2';
                targetInput.step = '2';
                targetInput.value = targetStamina;
                targetInput.style.width = '100%';
                targetInput.style.padding = '8px';
                targetInput.style.border = '1px solid #aaa';
                targetInput.style.borderRadius = '4px';
                targetInput.style.boxSizing = 'border-box';
                targetInput.style.marginBottom = '8px';
                targetInput.style.color = 'black';
                collectorWrap.appendChild(targetInput);

                const startLabel = document.createElement('label');
                startLabel.textContent = 'Start Chapter:';
                startLabel.style.display = 'block';
                startLabel.style.marginBottom = '5px';
                startLabel.style.fontWeight = 'bold';
                startLabel.style.color = 'black';
                collectorWrap.appendChild(startLabel);

                const startInput = document.createElement('input');
                startInput.type = 'number';
                startInput.min = '1';
                startInput.value = minChap;
                startInput.style.width = '100%';
                startInput.style.padding = '8px';
                startInput.style.border = '1px solid #aaa';
                startInput.style.borderRadius = '4px';
                startInput.style.boxSizing = 'border-box';
                startInput.style.marginBottom = '8px';
                startInput.style.color = 'black';
                collectorWrap.appendChild(startInput);

                const autoDetectBtn = document.createElement('button');
                autoDetectBtn.textContent = 'Auto-Detect Max';
                autoDetectBtn.style.width = '100%';
                autoDetectBtn.style.padding = '8px 12px';
                autoDetectBtn.style.border = 'none';
                autoDetectBtn.style.borderRadius = '4px';
                autoDetectBtn.style.backgroundColor = '#4a89dc';
                autoDetectBtn.style.color = 'black';
                autoDetectBtn.style.marginBottom = '8px';
                autoDetectBtn.style.cursor = 'pointer';
                collectorWrap.appendChild(autoDetectBtn);

                const collectBtn = document.createElement('button');
                collectBtn.textContent = 'Collect Stamina';
                collectBtn.style.width = '100%';
                collectBtn.style.padding = '8px 12px';
                collectBtn.style.border = 'none';
                collectBtn.style.borderRadius = '4px';
                collectBtn.style.backgroundColor = '#66bb6a';
                collectBtn.style.color = 'black';
                collectBtn.style.cursor = 'pointer';
                collectorWrap.appendChild(collectBtn);

                const collectorStatus = document.createElement('div');
                collectorStatus.style.fontSize = '11px';
                collectorStatus.style.lineHeight = '1.4';
                collectorStatus.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
                collectorStatus.style.borderRadius = '4px';
                collectorStatus.style.padding = '8px';
                collectorStatus.style.marginTop = '8px';
                collectorStatus.style.wordBreak = 'break-word';
                collectorStatus.style.color = 'black';
                collectorStatus.textContent = `Daily stamina used: ${dailyStamina}/${dailyLimit}.`;
                collectorWrap.appendChild(collectorStatus);

                container.appendChild(collectorWrap);

                if (currentPath === '/active_wave.php' || currentPath === '/battle.php') {
                    addAutoMobFarmControls();
                }

                targetInput.addEventListener('change', function() {
                    const value = parseInt(this.value, 10);
                    if (!isNaN(value) && value >= 2) {
                        const evenValue = value % 2 === 0 ? value : value - 1;
                        this.value = String(Math.max(2, evenValue));
                        localStorage.setItem('staminaTarget', this.value);
                    }
                });

                startInput.addEventListener('change', function() {
                    const value = parseInt(this.value, 10);
                    if (!isNaN(value) && value >= 1) {
                        this.value = String(value);
                        localStorage.setItem('staminaMinChap', this.value);
                    }
                });

                function parseStaminaValues() {
                    const staminaText = ((document.querySelector('.gtb-value') || {}).textContent || '').trim();
                    const parts = staminaText.split('/').map((p) => parseInt((p || '').replace(/[^0-9]/g, ''), 10));
                    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) {
                        return null;
                    }
                    return { current: parts[0], max: parts[1] };
                }

                function sleep(ms) {
                    return new Promise((resolve) => setTimeout(resolve, ms));
                }

                function randomDelay(minMs, maxMs) {
                    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
                }

                let collectorReactionFrame = null;
                let latestChapterLinksCache = [];
                let latestChapterLinksFetchedAt = 0;
                let backgroundCollectorEnabled = localStorage.getItem('backgroundCollectorEnabled') === 'true';
                let backgroundCollectorBusy = false;
                let backgroundCollectorTimer = null;
                let backgroundCollectorGained = 0;
                let backgroundCollectorAutoCapMode = false;
                let collectorSlashAssistLastClickAt = 0;

                function ensureCollectorReactionFrame() {
                    if (collectorReactionFrame && document.body.contains(collectorReactionFrame)) {
                        return collectorReactionFrame;
                    }

                    collectorReactionFrame = document.createElement('iframe');
                    collectorReactionFrame.style.position = 'fixed';
                    collectorReactionFrame.style.width = '1px';
                    collectorReactionFrame.style.height = '1px';
                    collectorReactionFrame.style.left = '-9999px';
                    collectorReactionFrame.style.top = '-9999px';
                    collectorReactionFrame.style.opacity = '0';
                    collectorReactionFrame.style.pointerEvents = 'none';
                    collectorReactionFrame.src = 'about:blank';
                    document.body.appendChild(collectorReactionFrame);
                    return collectorReactionFrame;
                }

                async function getLatestChapterLinks(forceRefresh = false) {
                    const now = Date.now();
                    if (!forceRefresh && latestChapterLinksCache.length > 0 && (now - latestChapterLinksFetchedAt) < 5 * 60 * 1000) {
                        return latestChapterLinksCache;
                    }

                    try {
                        const response = await fetch('https://demonicscans.org/', {
                            method: 'GET',
                            credentials: 'include',
                            cache: 'no-store'
                        });
                        const html = await response.text();
                        const matches = Array.from(html.matchAll(/chaptered\.php\?manga=\d+&chapter=[0-9.]+/gi))
                            .map((m) => `https://demonicscans.org/${m[0]}`);
                        const unique = Array.from(new Set(matches));
                        latestChapterLinksCache = unique;
                        latestChapterLinksFetchedAt = now;
                    } catch (error) {
                        console.error('Failed to fetch chapter links:', error);
                    }

                    return latestChapterLinksCache;
                }

                function parseChapteredParamsFromUrl(url) {
                    try {
                        const u = new URL(url, window.location.origin);
                        return {
                            manga: u.searchParams.get('manga') || '',
                            chapter: u.searchParams.get('chapter') || ''
                        };
                    } catch (_err) {
                        return { manga: '', chapter: '' };
                    }
                }

                async function resolveChapterTarget(chapterIndex) {
                    const links = await getLatestChapterLinks();
                    if (links.length === 0) {
                        return {
                            index: chapterIndex,
                            source: 'id',
                            chapterId: String(chapterIndex),
                            url: ''
                        };
                    }

                    const idx = Math.max(0, chapterIndex - 1) % links.length;
                    const url = links[idx];
                    const params = parseChapteredParamsFromUrl(url);

                    return {
                        index: chapterIndex,
                        source: 'chaptered',
                        chapterId: String(chapterIndex),
                        url,
                        manga: params.manga,
                        chapter: params.chapter
                    };
                }

                function extractHiddenFields(doc) {
                    const out = {};
                    const hiddenInputs = Array.from(doc.querySelectorAll('input[type="hidden"][name]'));
                    hiddenInputs.forEach((el) => {
                        const name = (el.getAttribute('name') || '').trim();
                        const value = (el.getAttribute('value') || '').trim();
                        if (name && value && value.length <= 128) {
                            out[name] = value;
                        }
                    });
                    return out;
                }

                function extractInternalChapterIdFromDoc(doc) {
                    const html = doc.documentElement ? doc.documentElement.innerHTML : '';

                    // Try 1: Look for reacted_chap_ pattern
                    const byCookie = html.match(/reacted_chap_(\d+)/i);
                    if (byCookie && byCookie[1]) {
                        console.log(`[EXTRACT] Found internal ID via reacted_chap: ${byCookie[1]}`);
                        return byCookie[1];
                    }

                    // Try 2: Look for FormData.append('chapterid', '...')
                    const byFormData = html.match(/formData\.append\(\s*['\"]chapterid['\"]\s*,\s*['\"]?(\d+)['\"]?\s*\)/i);
                    if (byFormData && byFormData[1]) {
                        console.log(`[EXTRACT] Found internal ID via FormData: ${byFormData[1]}`);
                        return byFormData[1];
                    }

                    // Try 3: Look for chapter_id in script tags
                    const scripts = Array.from(doc.querySelectorAll('script'));
                    for (const script of scripts) {
                        const text = script.textContent || '';
                        const match = text.match(/['\"]?chapterid['\"]?\s*[:=]\s*['\"]?(\d+)['\"]?/i);
                        if (match && match[1]) {
                            console.log(`[EXTRACT] Found internal ID via script: ${match[1]}`);
                            return match[1];
                        }
                    }

                    // Try 4: Look for data attributes
                    const els = doc.querySelectorAll('[data-chapterid], [data-chapter-id], [data-id]');
                    for (const el of els) {
                        const id = el.getAttribute('data-chapterid') || el.getAttribute('data-chapter-id') || el.getAttribute('data-id');
                        if (id && /^\d+$/.test(id)) {
                            console.log(`[EXTRACT] Found internal ID via data attribute: ${id}`);
                            return id;
                        }
                    }

                    console.log('[EXTRACT] No internal chapter ID found, will use display chapter number');
                    return '';
                }

                async function loadChapterInReactionFrame(chapterTarget) {
                    const frame = ensureCollectorReactionFrame();
                    const chapterId = chapterTarget && chapterTarget.chapterId ? chapterTarget.chapterId : '';
                    const urls = [];

                    if (chapterTarget && chapterTarget.url) {
                        urls.push(chapterTarget.url);
                    }

                    if (chapterTarget && chapterTarget.manga && chapterTarget.chapter) {
                        urls.push(`https://demonicscans.org/chaptered.php?manga=${chapterTarget.manga}&chapter=${chapterTarget.chapter}`);
                    }

                    if (chapterId) {
                        urls.push(
                            `https://demonicscans.org/chapter.php?chapterid=${chapterId}`,
                            `https://demonicscans.org/chapter.php?chapter_id=${chapterId}`,
                            `https://demonicscans.org/chapter.php?id=${chapterId}`,
                            `https://demonicscans.org/chapter/${chapterId}`
                        );
                    }

                    for (const url of urls) {
                        frame.src = `${url}${url.includes('?') ? '&' : '?'}_tm=${Date.now()}`;
                        const loaded = await waitForFrameLoad(frame, 7000);
                        if (!loaded) {
                            continue;
                        }

                        const doc = frame.contentDocument;
                        const win = frame.contentWindow;
                        if (!doc || !win || !doc.body) {
                            continue;
                        }

                        const bodyText = (doc.body.innerText || '').toLowerCase();
                        if (bodyText.includes('404') || bodyText.includes('page not found')) {
                            continue;
                        }

                        return { frame, doc, win, url };
                    }

                    return null;
                }

                function findReactionControlInDoc(doc, reactionValue) {
                    const controls = Array.from(doc.querySelectorAll('button, a, input[type="button"], input[type="submit"], span, div'));
                    const target = String(reactionValue);

                    const visible = (el) => {
                        const style = doc.defaultView ? doc.defaultView.getComputedStyle(el) : null;
                        if (style && (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none')) {
                            return false;
                        }
                        const rect = el.getBoundingClientRect();
                        return rect.width > 0 && rect.height > 0;
                    };

                    const byDataset = controls.find((el) => {
                        const dataReaction = (el.getAttribute('data-reaction') || el.getAttribute('data-reaction-id') || el.getAttribute('data-id') || '').trim();
                        return dataReaction === target && visible(el);
                    });
                    if (byDataset) {
                        return byDataset;
                    }

                    const emojiOrder = ['👍', '❤️', '😡', '😨', '😂'];
                    const emoji = emojiOrder[reactionValue - 1] || '';
                    if (emoji) {
                        const byEmoji = controls.find((el) => (el.textContent || '').includes(emoji) && visible(el));
                        if (byEmoji) {
                            return byEmoji;
                        }
                    }

                    const generic = controls.find((el) => {
                        const cls = `${el.className || ''}`.toLowerCase();
                        const id = `${el.id || ''}`.toLowerCase();
                        return visible(el) && (cls.includes('reaction') || cls.includes('emoji') || id.includes('reaction'));
                    });

                    return generic || null;
                }

                function extractTokenFromDoc(doc) {
                    const tokenInput = doc.querySelector('input[name="token"], input[name="csrf_token"], input[name="csrf"], meta[name="csrf-token"]');
                    if (!tokenInput) {
                        return '';
                    }
                    return (tokenInput.getAttribute('value') || tokenInput.getAttribute('content') || '').trim();
                }

                async function collectFromChapter(chapterTarget, reactID, demonId, demonTemp) {
                    const reaction = Math.floor(Math.random() * 5) + 1;
                    const chapterId = chapterTarget && chapterTarget.chapterId ? chapterTarget.chapterId : '';
                    const chapteredManga = chapterTarget && chapterTarget.manga ? chapterTarget.manga : '';
                    const chapteredChapter = chapterTarget && chapterTarget.chapter ? chapterTarget.chapter : '';

                    const chapterContext = await loadChapterInReactionFrame(chapterTarget);
                    let chapterUrl = '';
                    let csrfToken = '';
                    let hiddenFields = {};
                    let internalChapterId = '';

                    if (chapterContext) {
                        chapterUrl = chapterContext.url;
                        csrfToken = extractTokenFromDoc(chapterContext.doc);
                        hiddenFields = extractHiddenFields(chapterContext.doc);
                        internalChapterId = extractInternalChapterIdFromDoc(chapterContext.doc);
                        
                        console.log(`[COLLECTOR] Loaded chapter ${chapterId}. Internal ID: ${internalChapterId || 'NOT FOUND'}`);

                        try {
                            chapterContext.win.scrollTo(0, chapterContext.doc.body.scrollHeight);
                        } catch (_err) {
                            // Ignore scrolling issues.
                        }

                        await sleep(350);
                        const reactionControl = findReactionControlInDoc(chapterContext.doc, reaction);
                        if (reactionControl) {
                            console.log(`[COLLECTOR] Found reaction button for chapter ${chapterId}, clicking...`);
                            reactionControl.click();
                            await sleep(900);

                            const bodyTextAfterClick = ((chapterContext.doc.body && chapterContext.doc.body.innerText) || '').toLowerCase();
                            if (bodyTextAfterClick.includes('updated')) {
                                return { added: false, updated: true, raw: 'updated' };
                            }
                            if (bodyTextAfterClick.includes('added') || bodyTextAfterClick.includes('thank you')) {
                                return { added: true, updated: false, raw: 'added' };
                            }
                        } else {
                            console.log(`[COLLECTOR] No reaction button found in iframe for chapter ${chapterId}. Will use POST.`);
                        }
                    } else {
                        console.log(`[COLLECTOR] Failed to load chapter ${chapterId} in iframe. Will try POST variants.`);
                    }

                    // Use useruid as primary identifier (as per site's own JS code)
                    // Fallback to demon or reactID
                    const userUid = reactID || demonId || '';
                    
                    console.log(`[COLLECTOR] Using UUIDs: reactID=${reactID}, demonId=${demonId}, fallback=${userUid}`);
                    
                    // Try requests from the chapter iframe window so referrer/origin match chapter page context.
                    const payloadVariants = [
                        { useruid: userUid, chapterid: internalChapterId || chapterId, reaction },
                        { useruid: userUid, chapterid: internalChapterId || chapterId, reaction, demontemp: demonTemp },
                        { useruid: userUid, chapter_id: internalChapterId || chapterId, reaction },
                        { useruid: userUid, chapterid: chapterId, reaction },
                        { useruid: userUid, manga: chapteredManga, chapter: chapteredChapter, reaction },
                        { user_id: demonId, chapterid: internalChapterId || chapterId, reaction }
                    ];

                    let lastRaw = '';
                    let lastStatus = 0;
                    let attemptCount = 0;
                    
                    for (const payload of payloadVariants) {
                        attemptCount++;
                        const body = new URLSearchParams();
                        
                        // Only add non-empty values
                        Object.entries(payload).forEach(([k, v]) => {
                            if (v !== undefined && v !== null && String(v).length > 0) {
                                body.append(k, String(v));
                            }
                        });

                        const payloadLog = `chapterid=${payload.chapterid || payload.chapter_id || 'N/A'}, reaction=${payload.reaction}, useruid=${payload.useruid || 'N/A'}, user_id=${payload.user_id || 'N/A'}`;
                        console.log(`[COLLECTOR] Ch${chapterId} POST ${attemptCount}: ${payloadLog}`);

                        try {
                            let response;
                            if (chapterContext && chapterContext.win && chapterContext.win.fetch) {
                                const frameBody = new chapterContext.win.URLSearchParams();
                                Object.entries(payload).forEach(([k, v]) => {
                                    if (v !== undefined && v !== null && String(v).length > 0) {
                                        frameBody.append(k, String(v));
                                    }
                                });

                                response = await chapterContext.win.fetch('https://demonicscans.org/postreaction.php', {
                                    method: 'POST',
                                    credentials: 'include',
                                    headers: {
                                        'Content-Type': 'application/x-www-form-urlencoded',
                                        'X-Requested-With': 'XMLHttpRequest'
                                    },
                                    body: frameBody.toString()
                                });
                            } else {
                                response = await fetch('https://demonicscans.org/postreaction.php', {
                                    method: 'POST',
                                    credentials: 'include',
                                    headers: {
                                        'Content-Type': 'application/x-www-form-urlencoded',
                                        'X-Requested-With': 'XMLHttpRequest'
                                    },
                                    body: body.toString()
                                });
                            }

                            lastStatus = response.status;
                            const text = await response.text();
                            lastRaw = text;
                            
                            console.log(`[COLLECTOR] Ch${chapterId} resp ${attemptCount}: ${response.status} - ${text.slice(0, 80)}`);

                            // Check for success on any 2xx response OR specific keywords
                            if (response.ok) {
                                const lowered = String(text || '').toLowerCase();
                                let json = null;
                                try {
                                    json = JSON.parse(text);
                                } catch (_err) {}

                                const jsonText = json ? JSON.stringify(json).toLowerCase() : '';
                                const looksAdded = lowered.includes('added') || lowered.includes('add success') || jsonText.includes('added') || lowered.includes('success');
                                const looksUpdated = lowered.includes('updated') || lowered.includes('already') || jsonText.includes('updated');

                                if (looksAdded || looksUpdated) {
                                    console.log(`[COLLECTOR] Ch${chapterId} SUCCESS on attempt ${attemptCount}`);
                                    return {
                                        added: looksAdded,
                                        updated: !looksAdded && looksUpdated,
                                        raw: text
                                    };
                                }
                            }
                        } catch (fetchErr) {
                            console.log(`[COLLECTOR] Ch${chapterId} fetch error ${attemptCount}: ${fetchErr.message}`);
                            lastRaw = String(fetchErr.message);
                        }

                        await sleep(150);
                    }

                    return {
                        added: false,
                        updated: false,
                        raw: `All attempts failed (last status: ${lastStatus}). Response: ${(lastRaw || '').slice(0, 100)}`
                    };
                }

                function loadHandledChapters() {
                    const raw = localStorage.getItem('collectorHandledChapters') || '{}';
                    try {
                        return JSON.parse(raw);
                    } catch {
                        return {};
                    }
                }

                function saveHandledChapters(map) {
                    localStorage.setItem('collectorHandledChapters', JSON.stringify(map));
                }

                function isChapterHandled(chapterId) {
                    const handled = loadHandledChapters();
                    const entry = handled[String(chapterId)];
                    if (!entry) return false;
                    const ttl = 24 * 60 * 60 * 1000; // 24 hours
                    return (Date.now() - entry.at) < ttl;
                }

                function markChapterHandled(chapterId, success) {
                    const handled = loadHandledChapters();
                    handled[String(chapterId)] = { at: Date.now(), success };
                    saveHandledChapters(handled);
                }

                function updateCollectorStatus(msg) {
                    collectorStatus.textContent = msg;
                }

                function getCollectorModeLabel() {
                    return backgroundCollectorAutoCapMode ? 'Daily Cap Mode' : 'Target Mode';
                }

                function startBackgroundCollector(mode = 'target', reasonText = '') {
                    if (backgroundCollectorEnabled) {
                        return;
                    }

                    backgroundCollectorEnabled = true;
                    backgroundCollectorAutoCapMode = mode === 'dailyCap';
                    localStorage.setItem('backgroundCollectorEnabled', 'true');

                    if (backgroundCollectorTimer) {
                        clearInterval(backgroundCollectorTimer);
                        backgroundCollectorTimer = null;
                    }

                    if (!backgroundCollectorAutoCapMode) {
                        backgroundCollectorGained = 0;
                    }

                    collectBtn.textContent = 'Stop Collecting';
                    collectBtn.style.backgroundColor = '#e74c3c';
                    const modeLabel = getCollectorModeLabel();
                    const baseText = reasonText || 'Background collector started. Processing chapters...';
                    updateCollectorStatus(`[${modeLabel}] ${baseText}`);
                    backgroundCollectorTimer = setInterval(backgroundCollectorLoop, 2200);
                    backgroundCollectorLoop();
                }

                function stopBackgroundCollector(reasonText = 'Background collector stopped.') {
                    backgroundCollectorEnabled = false;
                    backgroundCollectorAutoCapMode = false;
                    localStorage.setItem('backgroundCollectorEnabled', 'false');

                    if (backgroundCollectorTimer) {
                        clearInterval(backgroundCollectorTimer);
                        backgroundCollectorTimer = null;
                    }

                    collectBtn.textContent = 'Collect Stamina';
                    collectBtn.style.backgroundColor = '#66bb6a';
                    updateCollectorStatus(`[Stopped] ${reasonText}`);
                }

                function maybeAutoCollectWhenStaminaZero() {
                    const mobFarmEnabledNow = autoMobFarmEnabled || localStorage.getItem('autoMobFarmEnabled') === 'true';
                    if (!mobFarmEnabledNow) {
                        return;
                    }

                    // Recover from stale persisted state after reload.
                    if (backgroundCollectorEnabled && !backgroundCollectorTimer) {
                        backgroundCollectorEnabled = false;
                        localStorage.setItem('backgroundCollectorEnabled', 'false');
                    }

                    if (backgroundCollectorEnabled) {
                        return;
                    }

                    const parseStaminaForAutoCollect = () => {
                        // First, prefer topbar sections that explicitly contain "Stamina".
                        const labeledCandidates = Array.from(document.querySelectorAll('.gtb-item, .game-topbar *, .gtb-left *'));
                        for (const el of labeledCandidates) {
                            const text = (el.textContent || '').trim();
                            if (!text || !/stamina/i.test(text)) {
                                continue;
                            }

                            const ratio = text.match(/(\d[\d,]*)\s*\/\s*(\d[\d,]*)/);
                            if (ratio) {
                                const current = parseInt((ratio[1] || '').replace(/,/g, ''), 10);
                                const max = parseInt((ratio[2] || '').replace(/,/g, ''), 10);
                                if (!isNaN(current) && !isNaN(max)) {
                                    return { current, max };
                                }
                            }
                        }

                        // Fallback to existing parser behavior.
                        return parseStaminaValues();
                    };

                    const stamina = parseStaminaForAutoCollect();
                    if (!stamina) {
                        return;
                    }

                    if (stamina.current <= 0) {
                        startBackgroundCollector(
                            'dailyCap',
                            'Auto Mob Farm detected stamina at 0. Auto collecting until daily cap is reached.'
                        );
                    }
                }

                function tickCollectorSlashAssist() {
                    if (!backgroundCollectorEnabled || !autoMobFarmEnabled) {
                        return;
                    }

                    if (window.location.pathname !== '/battle.php') {
                        return;
                    }

                    const now = Date.now();
                    if (now - collectorSlashAssistLastClickAt < 900) {
                        return;
                    }

                    const stamina = parseStaminaValues();
                    if (!stamina || stamina.current <= 0) {
                        return;
                    }

                    const slashControl = findSlashControl(document);
                    if (!slashControl) {
                        return;
                    }

                    collectorSlashAssistLastClickAt = now;
                    slashControl.click();
                }

                async function backgroundCollectorLoop() {
                    if (!backgroundCollectorEnabled || backgroundCollectorBusy) {
                        updateCollectorStatus(`Status: ${backgroundCollectorEnabled ? 'Running...' : 'Disabled'}`);
                        return;
                    }

                    backgroundCollectorBusy = true;

                    // Get user identifiers
                    const demonId = getCookieByName('demon');
                    const demonTemp = getCookieByName('demontemp');
                    let userUid = getCookieByName('useruid');
                    
                    // Ensure useruid exists
                    if (!userUid) {
                        userUid = ensureUserUidCookie();
                    }

                    console.log(`[COLLECTOR] Got IDs: demon=${demonId}, demontemp=${demonTemp}, useruid=${userUid}`);

                    if (!userUid && !demonId && !demonTemp) {
                        updateCollectorStatus('Cannot collect: missing all user cookies (demon, demontemp, useruid)');
                        backgroundCollectorBusy = false;
                        return;
                    }

                    const target = parseInt(targetInput.value, 10) || 80;
                    let startChapter = parseInt(startInput.value, 10) || 1;

                    if (!backgroundCollectorAutoCapMode && backgroundCollectorGained >= target) {
                        stopBackgroundCollector(`Target reached in background (${backgroundCollectorGained}/${target}).`);
                        backgroundCollectorBusy = false;
                        return;
                    }

                    const dailyRemaining = Math.max(0, dailyLimit - dailyStamina);
                    if (dailyRemaining < 2) {
                        stopBackgroundCollector(`Daily cap reached (${dailyStamina}/${dailyLimit}).`);
                        backgroundCollectorBusy = false;
                        return;
                    }

                    let chapter = startChapter;
                    let maxSkips = 20;
                    let skipped = 0;

                    while (skipped < maxSkips && isChapterHandled(chapter)) {
                        chapter += 1;
                        skipped += 1;
                    }

                    const chapterTarget = await resolveChapterTarget(chapter);

                    try {
                        const result = await collectFromChapter(chapterTarget, userUid, demonId, demonTemp);

                        if (result.added) {
                            dailyStamina += 2;
                            backgroundCollectorGained += 2;
                            localStorage.setItem('dailyStamina', String(dailyStamina));
                            markChapterHandled(chapter, true);
                            updateCollectorStatus(`[${getCollectorModeLabel()}] ✓ Chapter ${chapter} reacted (Gained: ${dailyStamina}/${dailyLimit})`);
                        } else if (result.updated) {
                            markChapterHandled(chapter, true);
                            updateCollectorStatus(`[${getCollectorModeLabel()}] Chapter ${chapter} already reacted (Gained: ${dailyStamina}/${dailyLimit})`);
                        } else {
                            const shortErr = (result.raw || '').slice(0, 60);
                            updateCollectorStatus(`[${getCollectorModeLabel()}] ✗ Chapter ${chapter} failed: ${shortErr}`);
                        }
                    } catch (error) {
                        updateCollectorStatus(`[${getCollectorModeLabel()}] ✗ Chapter ${chapter} error: ${String(error).slice(0, 50)}`);
                    }

                    const nextChapter = chapter + 1;
                    startInput.value = String(nextChapter);
                    localStorage.setItem('staminaMinChap', String(nextChapter));

                    backgroundCollectorBusy = false;
                }

                autoDetectBtn.addEventListener('click', function() {
                    const stamina = parseStaminaValues();
                    if (!stamina) {
                        collectorStatus.textContent = 'Could not read stamina values from top bar.';
                        return;
                    }

                    const maxByBar = Math.max(0, stamina.max - stamina.current);
                    const maxByDaily = Math.max(0, dailyLimit - dailyStamina);
                    const detected = Math.floor(Math.min(maxByBar, maxByDaily) / 2) * 2;

                    if (detected < 2) {
                        collectorStatus.textContent = `No collectible stamina right now. Daily: ${dailyStamina}/${dailyLimit}.`;
                        return;
                    }

                    targetInput.value = String(detected);
                    localStorage.setItem('staminaTarget', targetInput.value);
                    collectorStatus.textContent = `Auto-detected ${detected} stamina (${detected / 2} chapters).`;
                });

                collectBtn.addEventListener('click', async function() {
                    if (backgroundCollectorEnabled) {
                        stopBackgroundCollector('Background collector stopped.');
                    } else {
                        startBackgroundCollector('target', 'Background collector started. Processing chapters...');
                    }
                });

                setInterval(maybeAutoCollectWhenStaminaZero, 1200);
                maybeAutoCollectWhenStaminaZero();
                setInterval(tickCollectorSlashAssist, 900);
                tickCollectorSlashAssist();

                appendContainerIfNeeded();

                if (autoStatEnabled) {
                    startAutoStatLoop();
                }
            } else if (document.location.href.includes("https://demonicscans.org/weekly.php") ||
                       document.location.href.includes("https://demonicscans.org/event_goblin_feast.php")){
                let findMe = document.querySelector('a[href="player.php?pid=73553"]').parentElement.parentElement;
                findMe.style.background = "rgb(76 113 151)";

                const findMeDIV = document.createElement('div');
                findMeDIV.style.marginBottom = '10px';

                const findMeLabel = document.createElement('label');
                findMeLabel.textContent = 'Find me in Leadership:';
                findMeLabel.style.display = 'block';
                findMeLabel.style.marginBottom = '5px';
                findMeLabel.style.fontWeight = 'bold';
                findMeLabel.style.color = 'black';
                findMeDIV.appendChild(findMeLabel);

                const findMeInput = document.createElement('input');
                findMeInput.type = 'button';
                findMeInput.id = 'find-me';
                findMeInput.value = 'Scroll';
                findMeInput.style.width = 'auto';
                findMeInput.style.padding = '8px';
                findMeInput.style.border = '1px solid #ccc';
                findMeInput.style.borderRadius = '4px';
                findMeInput.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                findMeInput.style.color = 'black';
                findMeDIV.appendChild(findMeInput);

                // Add validation to target input
                findMeInput.addEventListener('click', function(el) {
                    findMe.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center', // or 'start', 'end', 'nearest'
                        inline: 'nearest'
                    });
                });

                container.appendChild(findMeDIV);

                appendContainerIfNeeded();
            }

            appendContainerIfNeeded();
        });
    }
})();
