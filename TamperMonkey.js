// ==UserScript==
// @name         Veyra Helper Widget
// @namespace    http://tampermonkey.net/
// @version      1.31
// @description  Collect specific amount of stamina with auto-detection and auto stat
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
    let targetStamina = localStorage.getItem('staminaTarget') || '80';
    let minChap = localStorage.getItem('staminaMinChap') || '1';
    let dailyLimit = 1000;
    if(localStorage.getItem('dailyStamina') == null){
        localStorage.setItem('dailyStamina', 0);
    }

    let dailyStamina = parseInt(localStorage.getItem('dailyStamina'));
    var t; // Timer/Interval ID

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

    let url = document.location.href;
    const currentUrl = new URL(url);
    const currentPath = currentUrl.pathname;

    const allowedPaths = [
        '/game_dash.php',
        '/pvparena.php',
        '/active_wave.php',
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
    if (allowedPaths.includes(currentPath)) {
        window.addEventListener('load', async function() {
            if (document.getElementById('stamina-container')) {
                return;
            }

            // Auto-accept stat confirmation popups while auto-stat is enabled.
            if (currentPath === '/stats.php' && !window.__veyraConfirmPatched) {
                const nativeConfirm = window.confirm.bind(window);
                window.confirm = function(message) {
                    const text = String(message || '');
                    const statConfirm = /spend\s+\d+\s+stat\s+points/i.test(text);

                    if (autoStatEnabled && statConfirm) {
                        return true;
                    }

                    return nativeConfirm(message);
                };
                window.__veyraConfirmPatched = true;
            }

            let remoteAutoStatBusy = false;
            let remoteStatsFrame = null;

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

            setInterval(tickRemoteAutoStat, 2500);
            tickRemoteAutoStat();

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
            } else if (
                document.location.href.includes("https://demonicscans.org/stats.php") ||
                document.location.href.includes("https://demonicscans.org/active_wave.php")
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

                async function collectFromChapter(chapterId, reactID, demonId, demonTemp) {
                    const reaction = Math.floor(Math.random() * 5) + 1;
                    const uid = reactID || '';
                    const did = demonId || reactID || '';

                    const payloadVariants = [
                        { useruid: uid, user_id: did, chapterid: chapterId, reaction },
                        { useruid: uid, user_id: did, chapter_id: chapterId, reaction },
                        { uid: uid, user_id: did, chapterid: chapterId, reaction },
                        { uid: uid, user_id: did, chapter_id: chapterId, reaction }
                    ];

                    if (demonTemp) {
                        payloadVariants.forEach((p) => {
                            p.demontemp = demonTemp;
                        });
                    }

                    let lastRaw = '';
                    for (const payload of payloadVariants) {
                        const body = new URLSearchParams();
                        Object.entries(payload).forEach(([k, v]) => {
                            if (v !== undefined && v !== null && String(v).length > 0) {
                                body.append(k, String(v));
                            }
                        });

                        const response = await fetch('https://demonicscans.org/postreaction.php', {
                            method: 'POST',
                            credentials: 'include',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'X-Requested-With': 'XMLHttpRequest'
                            },
                            body: body.toString()
                        });

                        const text = await response.text();
                        lastRaw = text;

                        if (text.includes('added') || text.includes('updated')) {
                            return {
                                added: text.includes('added'),
                                updated: text.includes('updated'),
                                raw: text
                            };
                        }
                    }

                    return {
                        added: false,
                        updated: false,
                        raw: lastRaw || 'Empty response from postreaction.php'
                    };
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
                    const demonId = getCookieByName('demon');
                    const demonTemp = getCookieByName('demontemp');
                    const reactID = getCookieByName('useruid') || getCookieByName('demontemp') || demonId;
                    if (!reactID) {
                        collectorStatus.textContent = 'Missing user cookie (useruid/demontemp/demon), cannot collect stamina.';
                        return;
                    }

                    let target = parseInt(targetInput.value, 10);
                    let startChapter = parseInt(startInput.value, 10);

                    if (isNaN(target) || target < 2) {
                        collectorStatus.textContent = 'Enter a valid stamina target (minimum 2).';
                        return;
                    }
                    if (target % 2 !== 0) {
                        target = target - 1;
                        targetInput.value = String(target);
                    }
                    if (isNaN(startChapter) || startChapter < 1) {
                        collectorStatus.textContent = 'Enter a valid start chapter (minimum 1).';
                        return;
                    }

                    const dailyRemaining = Math.max(0, dailyLimit - dailyStamina);
                    if (dailyRemaining < 2) {
                        collectorStatus.textContent = `Daily limit reached (${dailyStamina}/${dailyLimit}).`;
                        return;
                    }

                    const stamina = parseStaminaValues();
                    const barRemaining = stamina ? Math.max(0, stamina.max - stamina.current) : target;
                    const effectiveTarget = Math.floor(Math.min(target, dailyRemaining, barRemaining) / 2) * 2;

                    if (effectiveTarget < 2) {
                        collectorStatus.textContent = 'No effective target after daily/max-stamina limits.';
                        return;
                    }

                    const targetGain = effectiveTarget;
                    const nominalChapters = Math.max(1, targetGain / 2);
                    const maxAttempts = Math.max(nominalChapters * 50, 500);
                    let processed = 0;
                    let gained = 0;
                    let alreadyReacted = 0;
                    let failed = 0;
                    let lastFailure = '';
                    let chapter = startChapter;

                    collectBtn.disabled = true;
                    collectBtn.style.backgroundColor = '#9e9e9e';
                    collectBtn.style.cursor = 'not-allowed';

                    localStorage.setItem('staminaTarget', String(target));

                    while (gained < targetGain && dailyStamina < dailyLimit && processed < maxAttempts) {

                        try {
                            const result = await collectFromChapter(chapter, reactID, demonId, demonTemp);
                            if (result.added) {
                                gained += 2;
                                dailyStamina += 2;
                                localStorage.setItem('dailyStamina', String(dailyStamina));
                            } else if (result.updated) {
                                alreadyReacted += 1;
                            } else {
                                failed += 1;
                                lastFailure = (result.raw || '').replace(/\s+/g, ' ').trim().slice(0, 120);
                            }
                        } catch (error) {
                            console.error('Stamina collector error on chapter', chapter, error);
                            failed += 1;
                            lastFailure = String(error.message || error);
                        }

                        processed += 1;
                        collectorStatus.textContent = `Collecting... Attempt ${processed}/${maxAttempts}. Gained: ${gained}/${targetGain}, Already reacted: ${alreadyReacted}, Failed: ${failed}.`;
                        await sleep(randomDelay(700, 1600));
                        chapter += 1;
                    }

                    const nextChapter = chapter;
                    startInput.value = String(nextChapter);
                    localStorage.setItem('staminaMinChap', String(nextChapter));

                    collectBtn.disabled = false;
                    collectBtn.style.backgroundColor = '#66bb6a';
                    collectBtn.style.cursor = 'pointer';
                    if (gained >= targetGain) {
                        collectorStatus.textContent = `Done. Target reached: ${gained}/${targetGain}. Attempts: ${processed}. Daily: ${dailyStamina}/${dailyLimit}.`;
                    } else {
                        let reason = 'stopped early.';
                        if (dailyStamina >= dailyLimit) {
                            reason = 'daily limit reached.';
                        } else if (processed >= maxAttempts) {
                            reason = `max attempts reached (${maxAttempts}).`;
                        }
                        const extra = lastFailure ? ` Last response: ${lastFailure}` : '';
                        collectorStatus.textContent = `Done, ${reason} Gained: ${gained}/${targetGain}. Already reacted: ${alreadyReacted}, Failed: ${failed}.${extra}`;
                    }
                });

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
