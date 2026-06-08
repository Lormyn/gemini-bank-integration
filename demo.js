// State Management for the Simulated Gemini Mortgage Flow
let flowState = 0; 
/*
  0  = Awaiting initial prompt → qualifying questions
  1  = Qualifying answers → rate comparison (Gemini capability)
  2  = Rate comparison shown → user picks Swedish Bank → A2A → BankID
  3  = BankID done → UC Credit Report (instant)
  4  = UC Credit shown → salary docs request
  5  = Salary upload zone shown
  6  = KALP assessment → personalized rates (variable + fixed)
  7  = Add-ons helkund confirm
  8  = Signing (name + BankID)
  9  = Done / finalized
*/

// Dynamic financial variables (customizable by user's initial prompt)
let currentRate = 4.15;
let loanAmount = 2800000;
let propertyValue = 0;
let address = "";
let employer = "Ericsson";
let salary = 57000;
let userSSN = "19931008-XXXX";
let userName = "Erik Wallström";
let originalRate = 4.15; // Preserve the user's starting rate for savings calculations
let selectedBindingPeriod = 'variable'; // Default to variable rate

// DOM Elements
const welcomeScreen = document.getElementById('welcomeScreen');
const chatFeed = document.getElementById('chatFeed');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const chatContainer = document.getElementById('chatContainer');
const menuToggleBtn = document.getElementById('menuToggleBtn');
const menuToggleMainBtn = document.getElementById('menuToggleMainBtn');
const sidebar = document.getElementById('sidebar');
const newChatBtn = document.getElementById('newChatBtn');

// Dynamically adjust welcome screen transform to push it up when chat input grows taller
function adjustWelcomeScreenPosition() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    const mainContent = document.querySelector('.main-content');
    const chatInput = document.getElementById('chatInput');
    
    if (!welcomeScreen || !mainContent || !chatInput || !mainContent.classList.contains('welcome-state')) {
        if (welcomeScreen) {
            welcomeScreen.style.transform = '';
        }
        return;
    }
    
    // Default base height of chat input is around 44px
    const currentHeight = chatInput.offsetHeight;
    const diff = Math.max(0, currentHeight - 44);
    
    // Shift the welcome screen upwards by the difference to avoid overlap
    welcomeScreen.style.transform = `translateY(calc(-80px - ${diff}px))`;
}

// Auto-grow textarea height
chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = (chatInput.scrollHeight) + 'px';
    sendBtn.disabled = chatInput.value.trim() === "";
    adjustWelcomeScreenPosition();
});

// Toggle Sidebar
function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
    // Toggle mobile main hamburger button visibility
    if (sidebar.classList.contains('collapsed')) {
        menuToggleMainBtn.style.display = 'flex';
    } else {
        menuToggleMainBtn.style.display = 'none';
    }
}
menuToggleBtn.addEventListener('click', toggleSidebar);
menuToggleMainBtn.addEventListener('click', toggleSidebar);

// New Chat Reset
newChatBtn.addEventListener('click', () => {
    flowState = 0;
    loanAmount = 2800000;
    currentRate = 4.15;
    originalRate = 4.15;
    propertyValue = 0;
    address = "";
    document.querySelector('.main-content').classList.add('welcome-state');
    chatFeed.innerHTML = "";
    chatFeed.style.display = "none";
    welcomeScreen.style.display = "flex";
    chatInput.value = "";
    chatInput.style.height = "44px";
    sendBtn.disabled = true;
    adjustWelcomeScreenPosition();
});

// Prefill and Send from quick cards
function prefillAndSend(text) {
    chatInput.value = text;
    chatInput.style.height = 'auto';
    chatInput.style.height = (chatInput.scrollHeight) + 'px';
    sendBtn.disabled = false;
    handleSend();
}

// Format number utility
function fmtNum(n) {
    if (n === undefined || n === null || isNaN(n)) return '0';
    return Number(n).toLocaleString('en-US');
}

// Sleep helper
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Auto-format SSN input (YYYYMMDD-XXXX)
function formatSSN(input) {
    let val = input.value.replace(/\D/g, '');
    if (val.length > 8) {
        input.value = val.slice(0, 8) + '-' + val.slice(8, 12);
    } else {
        input.value = val;
    }
}

// Append User Message to feed
function appendUserMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message user-message';
    msgDiv.innerHTML = `
        <div class="message-avatar">E</div>
        <div class="message-content">
            <div class="message-bubble">${escapeHtml(text)}</div>
        </div>
    `;
    chatFeed.appendChild(msgDiv);
    scrollToBottom();
}

// Append Tool Call indicators to feed
function appendToolCall(toolName, actionText) {
    const toolDiv = document.createElement('div');
    toolDiv.className = 'tool-indicator';
    toolDiv.id = 'current-tool-call';
    toolDiv.innerHTML = `
        <div class="tool-spinner"></div>
        <div class="tool-text">Calling tool: <strong>${toolName}</strong> - ${actionText}</div>
    `;
    chatFeed.appendChild(toolDiv);
    scrollToBottom();
    return toolDiv;
}

// Resolve/Remove Tool Call indicator
function resolveToolCall(toolDiv, successMessage) {
    if (toolDiv) {
        toolDiv.style.animation = 'none';
        toolDiv.style.borderColor = 'rgba(16, 185, 129, 0.2)';
        toolDiv.style.backgroundColor = 'rgba(16, 185, 129, 0.03)';
        toolDiv.querySelector('.tool-spinner').style.display = 'none';
        
        // Add checkmark svg
        const check = document.createElement('span');
        check.style.color = '#10b981';
        check.style.marginRight = '8px';
        check.innerHTML = '✓ ';
        toolDiv.insertBefore(check, toolDiv.firstChild);
        
        toolDiv.querySelector('.tool-text').innerHTML = successMessage;
    }
}

const IC={
  shield:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L3 7v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z"/></svg>`,
  check:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>`,
  chart:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 20h18M6 16v4M10 12v8M14 8v12M18 4v16"/></svg>`,
  doc:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>`,
  house:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l9-9 9 9"/><path d="M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10"/></svg>`,
  tag:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1" fill="currentColor"/></svg>`,
  bank:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>`,
  pin:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  clip:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>`,
};

// Markdown formatter to convert **bold** into <strong>bold</strong> and ### into headers
function formatMarkdown(text) {
    if (typeof text !== 'string') return text;
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/### (.*?)(?:<br>|$)/g, '<h3>$1</h3>')
        .replace(/## (.*?)(?:<br>|$)/g, '<h2>$1</h2>')
        .replace(/\b(UCP|A2A|AP2)\b/g, (match) => {
            const cls = match.toLowerCase();
            return `<span class="protocol-badge ${cls}">${match}</span>`;
        });
}

// Append Gemini Thinking Process widget dynamically step-by-step
async function appendThinkingProcess(steps) {
    const thinkingId = 'thinking-' + Date.now() + Math.floor(Math.random() * 1000);
    
    // Parse protocol tags from step text: [A2A], [UCP], [AP2]
    function parseProtocolTags(text) {
        const protocols = [];
        const cleaned = text.replace(/\[(A2A|UCP|AP2)\]/gi, (match, tag) => {
            protocols.push(tag.toUpperCase());
            return '';
        }).trim();
        return { text: cleaned, protocols };
    }

    const widgetHtml = `
        <div class="thinking-container processing" id="${thinkingId}">
            <div class="thinking-header" onclick="document.getElementById('${thinkingId}').classList.toggle('collapsed')">
                <div class="thinking-title-area">
                    <span class="thinking-spinner"></span>
                    <span class="thinking-title-text" style="font-weight: 600;">Thinking...</span>
                </div>
                <svg class="thinking-caret" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M7 10l5 5 5-5z"/>
                </svg>
            </div>
            <div class="thinking-body" id="${thinkingId}-body">
            </div>
        </div>
    `;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message gemini-message';
    msgDiv.innerHTML = `
        <div class="message-avatar">
            <img src="gemini-logo.png" alt="Gemini" class="message-avatar-img">
        </div>
        <div class="message-content">
            <div class="message-bubble thinking-bubble">
                <div class="message-text">
                    ${widgetHtml}
                </div>
            </div>
        </div>
    `;
    chatFeed.appendChild(msgDiv);
    scrollToBottom();
    await sleep(700);

    const thinkingBody = document.getElementById(`${thinkingId}-body`);

    // Generate each step dynamically as it becomes active
    for (let i = 0; i < steps.length; i++) {
        const { text, protocols } = parseProtocolTags(steps[i]);
        const badgeHtml = protocols.map(p => 
            `<span class="protocol-badge ${p.toLowerCase()}" style="opacity:0;transform:translateY(4px) scale(0.9);">${p}</span>`
        ).join('');
        
        // Create and append the step element
        const stepEl = document.createElement('div');
        stepEl.className = 'thinking-step active';
        stepEl.id = `${thinkingId}-step-${i}`;
        stepEl.setAttribute('data-fulltext', text);
        stepEl.innerHTML = `
            <div class="thinking-step-indicator"></div>
            <div class="thinking-step-content">
                ${badgeHtml}<span class="thinking-step-text"></span>
            </div>
        `;
        thinkingBody.appendChild(stepEl);
        scrollToBottom();
        
        // Animate badges in
        const badges = stepEl.querySelectorAll('.protocol-badge');
        badges.forEach((badge, bIdx) => {
            setTimeout(() => {
                badge.style.transition = 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
                badge.style.opacity = '1';
                badge.style.transform = 'translateY(0) scale(1)';
            }, 200 + bIdx * 180);
        });
        
        // Typewriter effect for step text
        const textEl = stepEl.querySelector('.thinking-step-text');
        if (textEl && text) {
            let charIdx = 0;
            const typeSpeed = 12 + Math.random() * 6;
            while (charIdx < text.length) {
                textEl.textContent = text.substring(0, charIdx + 1);
                charIdx++;
                await sleep(typeSpeed);
            }
        }
        scrollToBottom();
        
        // Hold step visible before completing
        await sleep(1200 + Math.random() * 800);
        
        // Set completed
        stepEl.className = 'thinking-step completed';
        const indicator = stepEl.querySelector('.thinking-step-indicator');
        if (indicator) {
            indicator.innerHTML = `
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;
        }
    }

    // All steps done: change header state
    const container = document.getElementById(thinkingId);
    if (container) {
        container.classList.remove('processing');
        const titleText = container.querySelector('.thinking-title-text');
        if (titleText) {
            titleText.textContent = 'Thought process';
        }
        const headerSpinner = container.querySelector('.thinking-spinner');
        if (headerSpinner) {
            headerSpinner.outerHTML = `
                <span class="thinking-icon" style="color: var(--sb-green); margin-right: 8px;">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </span>
            `;
        }
        
        // Always show thought processes even when finished
        await sleep(100);
    }
}

// Append Gemini response with typewriter effect inside a chat bubble
async function appendGeminiResponse(htmlContent, quickReplies = [], extraHtml = "") {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message gemini-message';
    msgDiv.innerHTML = `
        <div class="message-avatar">
            <img src="gemini-logo.png" alt="Gemini" class="message-avatar-img">
        </div>
        <div class="message-content">
            <div class="message-bubble">
                <div class="message-text"></div>
            </div>
        </div>
    `;
    
    chatFeed.appendChild(msgDiv);
    scrollToBottom();
    
    const textContainer = msgDiv.querySelector('.message-bubble .message-text');
    const bubbleContainer = msgDiv.querySelector('.message-bubble');
    
    // Simulate streaming text
    const processedHtml = formatMarkdown(htmlContent);
    await streamHTML(textContainer, processedHtml);
    
    // Append extra HTML components inside the bubble if provided
    if (extraHtml) {
        const extraDiv = document.createElement('div');
        extraDiv.innerHTML = extraHtml;
        extraDiv.style.opacity = 0;
        extraDiv.style.transition = 'opacity 0.5s ease-out';
        bubbleContainer.appendChild(extraDiv);
        scrollToBottom();
        extraDiv.offsetHeight; // trigger reflow
        extraDiv.style.opacity = 1;
        scrollToBottom();
    }
    
    // Add quick replies if any
    if (quickReplies.length > 0) {
        const qrContainer = document.createElement('div');
        qrContainer.className = 'quick-replies';
        quickReplies.forEach(qr => {
            const chip = document.createElement('button');
            chip.className = `qr-chip ${qr.primary ? 'primary' : ''}`;
            chip.textContent = qr.label;
            chip.onclick = () => {
                if (qr.customAction) {
                    qr.customAction();
                } else {
                    prefillAndSend(qr.value);
                }
            };
            qrContainer.appendChild(chip);
        });
        const contentContainer = msgDiv.querySelector('.message-content');
        if (contentContainer) {
            contentContainer.appendChild(qrContainer);
        } else {
            textContainer.appendChild(qrContainer);
        }
    }
    
    scrollToBottom();
    return msgDiv;
}

// Append Interactive Widget to feed (inside the last Gemini message's content area)
function appendWidget(widgetHtml, extraClass = "", quickReplies = []) {
    const messages = chatFeed.querySelectorAll('.chat-message.gemini-message');
    let parentContainer = chatFeed;
    if (messages.length > 0) {
        const contentContainer = messages[messages.length - 1].querySelector('.message-content');
        if (contentContainer) {
            parentContainer = contentContainer;
        }
    }
    
    const widgetWrapper = document.createElement('div');
    widgetWrapper.className = 'widget-card' + (extraClass ? ' ' + extraClass : '');
    widgetWrapper.innerHTML = widgetHtml;
    parentContainer.appendChild(widgetWrapper);
    
    // Add quick replies under the widget card if any
    if (quickReplies && quickReplies.length > 0) {
        const qrContainer = document.createElement('div');
        qrContainer.className = 'quick-replies centered';
        quickReplies.forEach(qr => {
            const chip = document.createElement('button');
            chip.className = `qr-chip ${qr.primary ? 'primary' : ''}`;
            chip.textContent = qr.label;
            chip.onclick = () => {
                qrContainer.querySelectorAll('button').forEach(btn => btn.disabled = true);
                if (qr.customAction) {
                    qr.customAction();
                } else {
                    prefillAndSend(qr.value);
                }
            };
            qrContainer.appendChild(chip);
        });
        parentContainer.appendChild(qrContainer);
    }
    
    scrollToBottom();
    return widgetWrapper;
}

// Stream HTML content character-by-character
async function streamHTML(element, html) {
    let i = 0;
    let isTag = false;
    let currentText = "";
    
    while (i < html.length) {
        const char = html[i];
        if (char === '<') isTag = true;
        
        currentText += char;
        
        if (char === '>') isTag = false;
        
        if (!isTag) {
            element.innerHTML = currentText;
            scrollToBottom();
            await sleep(8); // deliberate streaming pace for demo
        }
        i++;
    }
    element.innerHTML = html; // Ensure final output is fully written
    scrollToBottom();
}

// Escape HTML helper
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Scroll to bottom of chat container
function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Send Button event listener
sendBtn.addEventListener('click', handleSend);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});

// Primary Handlers for user prompts
async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    // Clear and reset textarea
    chatInput.value = "";
    chatInput.style.height = "44px";
    sendBtn.disabled = true;
    
    // Hide welcome screen and show feed
    document.querySelector('.main-content').classList.remove('welcome-state');
    welcomeScreen.style.display = 'none';
    chatFeed.style.display = 'flex';
    
    // Append User Message
    appendUserMessage(text);
    
    await sleep(800);
    
    // Conversational Intent Matching depending on flowState
    const cleanText = text.toLowerCase();
    
    // Funny Easter Eggs
    if (cleanText.includes('code working')) {
        await appendThinkingProcess([
            "Analyzing cosmic alignment...",
            "Checking for temporary compiler miracles...",
            "Consulting software development superstition databases..."
        ]);
        await sleep(1200);
        await appendGeminiResponse(
            "According to my calculations, your code is currently working due to a rare alignment of the planets, coupled with a temporary suspension of Murphy's Law.<br><br>" +
            "**Recommendation:** Do not touch it. Do not look at it. Do not even breathe near the keyboard. Just commit, push, and go grab a coffee before the compiler realizes what happened. ☕"
        );
        return;
    }
    
    if (cleanText.includes('bribe my cat')) {
        await appendThinkingProcess([
            "Retrieving feline negotiation protocols...",
            "Analyzing treat-to-cooperation exchange rates...",
            "Evaluating high-frequency purr harmonics..."
        ]);
        await sleep(1200);
        await appendGeminiResponse(
            "Bribing a cat requires a strategic multi-phase negotiation strategy:<br><br>" +
            "1. **Phase 1 (The Currency):** Liquid treat tubes are currently trading at an all-time high value. Present one with slow blinks.<br>" +
            "2. **Phase 2 (The Box):** Empty any cardboard box and place it on the floor. Feline compliance rates increase by 87% within 30 seconds.<br>" +
            "3. **Phase 3 (The Tribute):** Yield 90% of your bed and 100% of your keyboard.<br><br>" +
            "If negotiations fail, remember: *Dogs have owners; cats have staff.* 🐱"
        );
        return;
    }
    if (cleanText.includes('monopoly')) {
        await appendThinkingProcess([
            "Evaluating board game currency conversions...",
            "Checking Swedish Central Bank (Riksbanken) board game tender policy...",
            "Consulting mortgage clearing house payoff guidelines..."
        ]);
        await sleep(1200);
        await appendGeminiResponse(
            "While Swedish Bank highly appreciates the vibrant pastel colors of the pink 500 Monopoly bills, our clearing protocols currently require actual Swedish Krona (SEK).<br><br>" +
            "**Recommendation:** Instead of trading Park Place, let's use UCP and A2A protocols to switch your mortgage to Swedish Bank. We can lower your interest rate and save you thousands of *real* SEK annually! 💸"
        );
        return;
    }
    
    // Allow restarting the flow if finished
    if (flowState === 9 || cleanText.includes('restart') || cleanText.includes('start over') || cleanText.includes('new mortgage')) {
        flowState = 0;
        address = "";
        propertyValue = 0;
        loanAmount = 2800000;
        currentRate = 4.15;
        originalRate = 4.15;
    }
    
    // ── STATE MACHINE ──────────────────────────────────────
    
    if (flowState === 0) {
        // Initial prompt → parse details → ask qualifying questions
        parseInitialPrompt(cleanText);
        flowState = 1;
        await runQualifyingQuestions();
    }
    else if (flowState === 1) {
        // Qualifying answers → parse property value → ask binding period
        parseQualifyingAnswers(cleanText);
        await askBindingPeriod(false);
    }
    else if (flowState === 'binding') {
        // Binding period answer → acknowledge → show rates
        handleBindingPeriodFromText(cleanText);
        flowState = 2;
        await acknowledgeBindingPeriod();
        await runRateSearch();
    }
    else if (flowState === 2) {
        // Rate comparison shown — user picks Swedish Bank
        if (cleanText.includes('swedish') || cleanText.includes('initiate') || cleanText.includes('yes') || cleanText.includes('start') || cleanText.includes('go') || cleanText.includes('proceed')) {
            await startWithSwedishBank();
        } else {
            await appendGeminiResponse(
                "Would you like to initiate the mortgage transfer with **Swedish Bank** at **3.89%**? Click the Swedish Bank card above to proceed."
            );
        }
    }
    else if (flowState === 4) {
        // Salary upload state — user might type "skip" or "yes"
        if (cleanText.includes('yes') || cleanText.includes('upload') || cleanText.includes('have')) {
            await runSalaryDocUpload();
        } else if (cleanText.includes('skip') || cleanText.includes('no')) {
            await runCreditReport();
        } else {
            await appendGeminiResponse(
                "Please click the upload zone above to submit your salary documents, or say **skip** to continue."
            );
        }
    }
    else if (flowState === 6) {
        // Add-ons question
        if (cleanText.includes('yes') || cleanText.includes('sure') || cleanText.includes('tell') || cleanText.includes('more') || cleanText.includes('look')) {
            await runAddonsQuestion(true);
        } else {
            await runAddonsQuestion(false);
        }
    }
    else if (flowState === 7) {
        // Add-ons confirm
        if (cleanText.includes('yes') || cleanText.includes('switch') || cleanText.includes('transfer') || cleanText.includes('confirm') || cleanText.includes('go')) {
            await runAddonsConfirm(true);
        } else {
            await runAddonsConfirm(false);
        }
    }

    else if (flowState === 8) {
        // Signing — user might type their name
        if (cleanText.includes('erik') || cleanText.includes('approve') || cleanText.includes('yes') || cleanText.includes('sign') || cleanText.includes('confirm')) {
            const signInput = document.getElementById('sig-input');
            if (signInput) {
                signInput.value = userName;
                document.getElementById('sig-confirm-btn').disabled = false;
                document.getElementById('sig-confirm-btn').click();
            } else {
                await simulateSigning();
            }
        } else {
            const finalRate = currentRate;
            await appendGeminiResponse(
                `To finalize the mortgage transfer at **${finalRate.toFixed(2)}%**, please type your name **${userName}** in the signature field above and click **Sign Agreement**.`
            );
        }
    }
}

// ══════════════════════════════════════════════════════════
//  Regex parser to read rate, loan, address, salary, employer
// ══════════════════════════════════════════════════════════

function parseInitialPrompt(text) {
    // Look for loan amount (e.g. 2.8M or 2800000)
    let loanMatch = text.match(/(lån|loan|left|remainder|remainder of|belopp|beloppet)\s*(is|på|of)?\s*([0-9\.\,]+)\s*(m|miljon|miljoner|sek|kr)?/i);
    if (loanMatch) {
        let val = parseFloat(loanMatch[3].replace(',', '.'));
        if (!isNaN(val)) {
            if (val < 100) {
                loanAmount = val * 1000000;
            } else {
                loanAmount = val;
            }
        }
    }
    
    // Look for current rate (e.g. 4.15% or 4,15%)
    let rateMatch = text.match(/([0-9\.\,]+)\s*%/);
    if (rateMatch) {
        let val = parseFloat(rateMatch[1].replace(',', '.'));
        if (!isNaN(val)) { currentRate = val; originalRate = val; }
    }
    
    // Look for address with Swedish street suffix
    let addrMatch = text.match(/(hantverkargatan\s*\d+|storgatan\s*\d+|[a-zåäöé]+(gatan|vägen|gränd|torg|gata|allé)\s*\d+)/i);
    if (addrMatch) {
        let matched = addrMatch[1].trim();
        address = matched.charAt(0).toUpperCase() + matched.slice(1) + ", Stockholm";
    }

    // Look for employer (e.g. working at Ericsson, jobbar hos Google)
    let empMatch = text.match(/(working|jobbar|anställd)\s+(at|for|hos|på|vid)\s+([a-zåäöé\d]+)/i);
    if (empMatch && !["swedish", "swedbank", "the", "my", "a", "better", "lower", "new"].includes(empMatch[3].toLowerCase())) {
        employer = empMatch[3].charAt(0).toUpperCase() + empMatch[3].slice(1);
    }

    // Look for income/salary (e.g. earn 57K/month, earn 57000)
    let salMatch = text.match(/(earn|earning|tjänar|lön|inkomst)\s*(of|på)?\s*([0-9\.\,]+)\s*(k|tusen)?/i);
    if (salMatch) {
        let val = parseFloat(salMatch[3].replace(',', '.'));
        if (val < 1000) {
            salary = val * 1000;
        } else {
            salary = val;
        }
    }
}


// ══════════════════════════════════════════════════════════
//  BLOCK 0: Qualifying Questions + Rate Comparison
// ══════════════════════════════════════════════════════════

async function runQualifyingQuestions() {
    await appendThinkingProcess([
        "Analyzing mortgage requirements from query...",
        "Identifying information needed for accurate rate comparison..."
    ]);

    await sleep(1200);
    
    const ltv = propertyValue ? ((loanAmount / propertyValue) * 100).toFixed(0) : null;
    
    let msg = `I'd be happy to help you compare mortgage rates! I've noted your current rate of **${currentRate.toFixed(2)}%** on a loan of **${fmtNum(loanAmount)} SEK**.`;
    
    if (propertyValue) {
        msg += `<br><br>With a property value of **${fmtNum(propertyValue)} SEK**, your Loan-to-Value (LTV) is **${ltv}%**.`;
        await appendGeminiResponse(msg);
        await sleep(800);
        await askBindingPeriod(true);
        return;
    }
    
    msg += `<br><br>To find the most competitive rates, I need a bit more information:`;
    msg += `<br>- What is the **estimated value** of your property?`;
    
    await appendGeminiResponse(msg);
}

function parseQualifyingAnswers(text) {
    let clean = text.toLowerCase();
    // Parse property value (e.g. 5.2M, 5200000, 5.2 million, 5200 tkr)
    let pvMatch = clean.match(/([0-9][0-9\.,]*)\s*(m|miljon|miljoner|million|msek)/i);
    if (pvMatch) {
        let val = parseFloat(pvMatch[1].replace(',', '.'));
        propertyValue = val < 100 ? val * 1000000 : val;
    } else {
        let numMatch = clean.match(/([0-9][0-9\.,]+)/i);
        if (numMatch) {
            let val = parseFloat(numMatch[1].replace(',', '.'));
            if (val > 100000) propertyValue = val;
            else if (val >= 1 && val < 100) propertyValue = val * 1000000;
        }
    }
    if (!propertyValue) propertyValue = 5200000;
}

async function askBindingPeriod(alreadyAcknowledged) {
    await sleep(600);
    let msg;
    if (alreadyAcknowledged) {
        msg = "What type of rate are you looking for?";
    } else {
        const ltv = ((loanAmount / propertyValue) * 100).toFixed(0);
        msg = `Got it — a property valued at **${fmtNum(propertyValue)} SEK**, giving you a Loan-to-Value of **${ltv}%**. That's a solid position.<br><br>What type of rate are you looking for?`;
    }
    await appendGeminiResponse(msg);
    flowState = 'binding';
}

function handleBindingPeriodFromText(text) {
    const clean = text.toLowerCase();
    if (clean.includes('variable') || clean.includes('rörlig') || clean.includes('3 month')) {
        selectedBindingPeriod = 'variable';
    } else if (clean.includes('5') || clean.includes('fem')) {
        selectedBindingPeriod = '5y';
    } else if (clean.includes('3') || clean.includes('tre')) {
        selectedBindingPeriod = '3y';
    } else if (clean.includes('1') || clean.includes('ett') || clean.includes('year') || clean.includes('år')) {
        selectedBindingPeriod = '1y';
    } else {
        selectedBindingPeriod = 'variable';
    }
}

async function selectBindingPeriod(period) {
    selectedBindingPeriod = period;
    const labels = { 'variable': '3 Months', '1y': '1 Year Fixed', '3y': '3 Years Fixed', '5y': '5 Years Fixed' };
    appendUserMessage(labels[period] || '3 Months');
    await sleep(600);
    flowState = 2;
    await acknowledgeBindingPeriod();
    await runRateSearch();
}

async function acknowledgeBindingPeriod() {
    const labels = { 'variable': '3-month variable', '1y': '1-year fixed', '3y': '3-year fixed', '5y': '5-year fixed' };
    const periodLabel = labels[selectedBindingPeriod] || '3-month variable';
    let msg;
    if (selectedBindingPeriod === 'variable') {
        msg = `Smart choice — a variable rate gives you flexibility and no break costs if you want to renegotiate down the road. Let me search for the best ${periodLabel} rates across Swedish banks now.`;
    } else {
        msg = `Good thinking — locking in a ${periodLabel} rate gives you predictable monthly costs regardless of market movements. Let me search for the best ${periodLabel} rates now.`;
    }
    await appendGeminiResponse(msg);
    await sleep(600);
}

async function runRateSearch() {
    await sleep(800);

    await appendThinkingProcess([
        "Calculating Loan-to-Value (LTV) ratio...",
        "[UCP] Querying public Swedish lending inventories via Universal Commerce Protocol...",
        "[UCP] Finding and comparing current rates from major providers...",
        "Evaluating potential savings based on LTV and loan profile..."
    ]);

    await sleep(2000);
    
    const ltv = ((loanAmount / propertyValue) * 100).toFixed(1);
    const ratesByPeriod = {
        'variable': { seb: 4.05, nordea: 4.02, handelsbanken: 3.99, swedish: 3.89, label: '3 Months' },
        '1y': { seb: 3.79, nordea: 3.75, handelsbanken: 3.72, swedish: 3.65, label: '1 Year Fixed' },
        '3y': { seb: 3.49, nordea: 3.45, handelsbanken: 3.39, swedish: 3.29, label: '3 Years Fixed' },
        '5y': { seb: 3.39, nordea: 3.35, handelsbanken: 3.29, swedish: 3.15, label: '5 Years Fixed' }
    };
    const rates = ratesByPeriod[selectedBindingPeriod] || ratesByPeriod['variable'];
    const sebRate = rates.seb;
    const nordeaRate = rates.nordea;
    const handelsbankenRate = rates.handelsbanken;
    const baseOfferedRate = rates.swedish;
    
    const monthlyCostCurrent = Math.round((loanAmount * (currentRate / 100)) / 12);
    const monthlyCostBase = Math.round((loanAmount * (baseOfferedRate / 100)) / 12);
    const annualSavingsBase = (monthlyCostCurrent - monthlyCostBase) * 12;

    const compCardsHtml = `
        <div style="display:flex; align-items:center; justify-content:flex-end; gap:6px; margin-bottom:8px; padding:0 2px;">
            <span style="font-size:10px; font-weight:600; color:var(--sb-gray-500); text-transform:uppercase; letter-spacing:0.05em;">Live rates via</span>
            <span class="comp-ucp">UCP</span>
        </div>
        <div class="comparison-grid">
            <div class="comparison-card" onclick="this.classList.add('selected')">
                <div class="comp-provider">SEB</div>
                <div class="comp-period">${rates.label}</div>
                <div class="comp-rate">${sebRate.toFixed(2)}%</div>
                <div class="comp-cost">${fmtNum(Math.round((loanAmount * (sebRate/100))/12))} SEK/mo</div>
            </div>
            <div class="comparison-card" onclick="this.classList.add('selected')">
                <div class="comp-provider">Nordea</div>
                <div class="comp-period">${rates.label}</div>
                <div class="comp-rate">${nordeaRate.toFixed(2)}%</div>
                <div class="comp-cost">${fmtNum(Math.round((loanAmount * (nordeaRate/100))/12))} SEK/mo</div>
            </div>
            <div class="comparison-card" onclick="this.classList.add('selected')">
                <div class="comp-provider">Handelsbanken</div>
                <div class="comp-period">${rates.label}</div>
                <div class="comp-rate">${handelsbankenRate.toFixed(2)}%</div>
                <div class="comp-cost">${fmtNum(Math.round((loanAmount * (handelsbankenRate/100))/12))} SEK/mo</div>
            </div>
            <div class="comparison-card highlighted" onclick="startWithSwedishBank()">
                <div class="comp-provider">Swedish Bank</div>
                <div class="comp-period">${rates.label}</div>
                <div class="comp-rate">${baseOfferedRate.toFixed(2)}%</div>
                <div class="comp-cost">${fmtNum(monthlyCostBase)} SEK/mo</div>
                <div class="comp-badge">Best Match</div>
            </div>
        </div>
    `;

    await appendGeminiResponse(
        `Based on your loan of **${fmtNum(loanAmount)} SEK** and a property valued at **${fmtNum(propertyValue)} SEK** (LTV: **${ltv}%**), here are the best **${rates.label}** rates across Swedish banks:<br><br>` +
        `**Swedish Bank** offers the most competitive rate at **${baseOfferedRate.toFixed(2)}%**, which would save you **${fmtNum(annualSavingsBase)} SEK** annually compared to your current ${currentRate.toFixed(2)}%.<br><br>` +
        `Do any of these interest you?`,
        [],
        compCardsHtml
    );
}

async function startWithSwedishBank() {
    flowState = 3;
    await appendGeminiResponse(
        "Great choice! Let me establish a connection with Swedish Bank's agent..."
    );
    await sleep(800);
    await runBankID();
}


// ══════════════════════════════════════════════════════════
//  BLOCK 1: BankID Identity Verification (via A2A)
// ══════════════════════════════════════════════════════════

async function runBankID() {
    await appendThinkingProcess([
        "[A2A] Communicating with Swedish Bank using Agent-to-Agent protocol...",
        "[A2A] Initiating Banksy agent handshake and secure session...",
        "Connection established — transferring context to Banksy..."
    ]);

    await sleep(1500);
    
    await appendGeminiResponse(
        "A2A connection established. Swedish Bank's AI agent **Banksy** is now connected and has received your mortgage details."
    );

    await sleep(800);

    await appendGeminiResponse(
        "Hi there! I'm **Banksy**, Swedish Bank's mortgage assistant. I understand you're interested in transferring your mortgage to us at a rate of **3.89%**.<br><br>" +
        "I'd love to help you get started. Shall we initiate the loan process? I'll need to verify your identity with BankID first.",
        [{label: "Yes, verify with BankID", primary: true, customAction: () => showBankIDWidget()}]
    );
}

async function showBankIDWidget() {
    appendUserMessage("Verify with BankID");
    await sleep(600);
    
    const widgetHtml = `
        <div class="widget-header h-blue">
            <span class="widget-icon blue">${IC.shield}</span>
            <span>BankID</span>
        </div>
        <div class="widget-body" id="bankid-widget-body">
            <div class="bankid-widget">
                <div class="bankid-visual pending">
                    <div class="bankid-spinner"></div>
                    <img src="bankid_logo.png" class="bankid-official-logo" alt="BankID">
                </div>
                <div class="bankid-label">Open the BankID app on your device</div>
            </div>
        </div>
    `;
    
    const widgetWrapper = document.createElement('div');
    widgetWrapper.className = 'widget-card bankid-card';
    widgetWrapper.innerHTML = widgetHtml;
    chatFeed.appendChild(widgetWrapper);
    scrollToBottom();
    
    // Automatically verify after 2.5s
    setTimeout(simulateBankIDVerification, 5000);
}

// Simulated BankID Verification → instant UC credit check
async function simulateBankIDVerification() {
    const widgetBody = document.getElementById('bankid-widget-body');
    if (widgetBody) {
        widgetBody.innerHTML = `
            <div class="bankid-widget">
                <div class="bankid-visual verified">
                    <span class="bankid-logo" style="font-size:32px;color:var(--sb-green)">✓</span>
                </div>
                <div class="bankid-label" style="color:var(--sb-green);font-weight:600;font-size:16px">${userName}</div>
                <div class="bankid-sublabel" style="font-size:13px">${userSSN}</div>
            </div>
        `;
        const widgetCard = widgetBody.closest('.widget-card');
        if (widgetCard) {
            const header = widgetCard.querySelector('.widget-header');
            if (header) {
                header.className = 'widget-header h-green';
                header.innerHTML = `<span class="widget-icon green">${IC.check}</span><span>Identity Confirmed</span>`;
            }
        }
    }
    
    // After BankID → instant UC credit check
    await sleep(1000);
    await runCreditReport();
}


// ══════════════════════════════════════════════════════════
//  BLOCK 2: UC Credit Report (instant after BankID)
// ══════════════════════════════════════════════════════════

async function runCreditReport() {
    flowState = 4;

    await appendThinkingProcess([
        "[A2A] Connecting to UC (Upplysningscentralen) credit registry...",
        "[A2A] Retrieving credit history and existing obligations...",
        "[A2A] Verifying active credit accounts & payment remarks...",
        "[A2A] Generating automated credit assessment score..."
    ]);

    await sleep(1500);

    const ltv = ((loanAmount / propertyValue) * 100).toFixed(1);

    await appendGeminiResponse(
        `Identity verified, **${userName}**! I've pulled your UC credit report — your credit rating is excellent:`
    );

    const creditWidgetHtml = `
        <div class="widget-header h-green">
            <span class="widget-icon green">${IC.check}</span>
            <span>UC Credit Report</span>
        </div>
        <div class="widget-body">
            <div class="credit-hero">
                <div class="credit-ring">
                    <div class="credit-ring-circle">
                        <div class="credit-ring-inner">
                            <div class="credit-ring-grade" style="font-size:18px;">0.4%</div>

                        </div>
                    </div>
                    <div class="credit-ring-info">
                        <div class="credit-ring-title">Very Low Risk</div>
                    </div>
                </div>
                <div class="credit-score-bar">
                    <div class="credit-score-track">
                        <div class="credit-score-fill" style="width: 87%;"></div>
                        <div class="credit-score-marker" style="left: 87%;"></div>
                    </div>
                    <div class="credit-score-labels">
                        <span>Poor</span>
                        <span>Fair</span>
                        <span>Good</span>
                        <span>Excellent</span>
                    </div>
                </div>
            </div>
            <div class="widget-row">
                <span class="widget-row-label">Taxed Income (UC)</span>
                <span class="widget-row-value">${fmtNum(salary * 12)} SEK / Year</span>
            </div>
            <div class="widget-row">
                <span class="widget-row-label">Existing Loans</span>
                <span class="widget-row-value">2 active (Bolån, CSN)</span>
            </div>
            <div class="widget-row">
                <span class="widget-row-label">Debt-to-Income Ratio</span>
                <span class="widget-row-value">${((loanAmount / (salary * 12)) * 100).toFixed(1)}%</span>
            </div>
        </div>
    `;
    appendWidget(creditWidgetHtml);
    await sleep(1200);

    await appendGeminiResponse(
        "To complete the KALP (affordability) assessment, I need your **three most recent salary slips** to verify your income. Do you have those available?",
        [
            {label: "Yes, upload salary documents", primary: true, customAction: () => runSalaryDocUpload()},
            {label: "Skip for now", customAction: () => runCreditAssessment()}
        ]
    );
}


// ══════════════════════════════════════════════════════════
//  BLOCK 3: Salary Document Upload
// ══════════════════════════════════════════════════════════

async function runSalaryDocUpload() {
    flowState = 4;
    appendUserMessage("Provide Salary Documents");
    await sleep(800);

    await appendGeminiResponse(
        "Great — you can upload them here. Select or drag & drop below:"
    );

    const uploadWidgetHtml = `
        <div class="widget-header h-dark">
            <span class="widget-icon dark">${IC.doc}</span>
            <span>Salary documents (3 months)</span>
        </div>
        <div class="widget-body">
            <div class="upload-zone-mini" id="upload-zone-salary" onclick="triggerSalarySelect()">
                <div class="upload-pending-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                </div>
                <div class="upload-mini-text" id="upload-text-salary">Select or drag & drop 3 salary slips here</div>
                <input type="file" class="file-input" id="file-selector-salary" style="display:none;" multiple accept=".pdf,.png,.jpg,.jpeg" onchange="simulateSalaryUpload(event)">
            </div>
            <div id="upload-file-list-salary" style="display:none;"></div>
        </div>
    `;
    
    appendWidget(uploadWidgetHtml);
}

function triggerSalarySelect() {
    const input = document.getElementById('file-selector-salary');
    if (input) input.click();
}

async function simulateSalaryUpload(event) {
    const files = event.target.files;
    const fileNames = files.length > 0 
        ? Array.from(files).map(f => f.name)
        : ["lönespec_mars_2026.pdf", "lönespec_april_2026.pdf", "lönespec_maj_2026.pdf"];
    
    const uploadZone = document.getElementById('upload-zone-salary');
    const fileListContainer = document.getElementById('upload-file-list-salary');
    
    if (uploadZone && fileListContainer) {
        uploadZone.style.display = 'none';
        fileListContainer.style.display = 'block';
        
        // Create progress rows for each file
        fileListContainer.innerHTML = fileNames.map((name, i) => `
            <div class="upload-file-row" id="upload-row-${i}" style="display:flex; align-items:center; gap:10px; padding:10px 0; ${i < fileNames.length - 1 ? 'border-bottom:1px solid var(--sb-gray-200);' : ''}">
                <div class="upload-file-icon" style="width:32px; height:32px; border-radius:8px; background:var(--sb-gray-100); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--sb-gray-500)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                </div>
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span style="font-size:13px; font-weight:600; color:var(--sb-gray-800); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${name}</span>
                        <span id="progress-pct-${i}" style="font-size:12px; color:var(--sb-gray-500); flex-shrink:0; margin-left:8px;">0%</span>
                    </div>
                    <div style="height:4px; background:var(--sb-gray-200); border-radius:2px; overflow:hidden;">
                        <div id="progress-fill-${i}" style="height:100%; background:var(--sb-accent); width:0%; transition:width 0.15s ease; border-radius:2px;"></div>
                    </div>
                </div>
            </div>
        `).join('');

        // Animate each file upload sequentially
        for (let i = 0; i < fileNames.length; i++) {
            const pct = document.getElementById(`progress-pct-${i}`);
            const fill = document.getElementById(`progress-fill-${i}`);
            const icon = document.querySelector(`#upload-row-${i} .upload-file-icon`);
            
            let progress = 0;
            while (progress <= 100) {
                if (pct) pct.textContent = `${progress}%`;
                if (fill) fill.style.width = `${progress}%`;
                progress += 10;
                await sleep(80 + Math.random() * 60);
            }
            
            // Mark done
            if (pct) { pct.textContent = '✓'; pct.style.color = 'var(--sb-green)'; pct.style.fontWeight = '700'; }
            if (fill) fill.style.background = 'var(--sb-green)';
            if (icon) { icon.style.background = 'rgba(16, 185, 129, 0.1)'; icon.querySelector('svg').style.stroke = 'var(--sb-green)'; }
            
            await sleep(300);
        }
        
        await sleep(400);
        

        await appendGeminiResponse(
            "Salary documents verified successfully. Income verified against tax records. Running KALP affordability assessment now..."
        );
        await sleep(1200);
        
        await runCreditAssessment();
    }
}


// ══════════════════════════════════════════════════════════
//  BLOCK 4: KALP Assessment + Personalized Rates
// ══════════════════════════════════════════════════════════

async function runCreditAssessment() {
    await appendThinkingProcess([
        "Running KALP (Left-To-Live-On) calculation...",
        "Checking regulatory amortization requirements from Finansinspektionen...",
        "Analyzing debt-to-income (DTI) and interest-to-income ratios...",
        "[A2A] Generating automated underwriting decision via Swedish Bank..."
    ]);

    await sleep(1500);

    const maxLoanAmt = Math.round(propertyValue * 0.90);
    const ltv = ((loanAmount / propertyValue) * 100).toFixed(1);

    await appendGeminiResponse(
        "Excellent news! Swedish Bank's underwriting system has fully approved your KALP affordability assessment:"
    );

    const creditApprovedWidgetHtml = `
        <div class="widget-header h-green">
            <span class="widget-icon green">${IC.check}</span>
            <span>KALP Affordability Assessment</span>
        </div>
        <div class="widget-body">
            <div class="widget-hero">
                <div class="widget-hero-value green">Approved</div>
                <div class="widget-hero-label">Underwriting Decision</div>
            </div>
            <div class="widget-row">
                <span class="widget-row-label">Loan-to-Value (LTV)</span>
                <span class="widget-row-value">${ltv}%</span>
            </div>
            <div class="widget-row">
                <span class="widget-row-label">Amortization Rate</span>
                <span class="widget-row-value">${parseFloat(ltv) > 70 ? '2' : parseFloat(ltv) > 50 ? '1' : '0'}% per year</span>
            </div>
            <div class="widget-row">
                <span class="widget-row-label">Max Loan Amount</span>
                <span class="widget-row-value">${fmtNum(maxLoanAmt)} SEK</span>
            </div>
        </div>
    `;
    appendWidget(creditApprovedWidgetHtml);
    await sleep(1200);

    // Show personalized rates — all terms in one view
    await runPersonalizedRates();
}


// ══════════════════════════════════════════════════════════
//  BLOCK 4: Personalized Rates (Variable + Fixed in one view)
// ══════════════════════════════════════════════════════════

async function runPersonalizedRates() {
    flowState = 6;

    await appendThinkingProcess([
        "[A2A] Querying Swedish Bank pricing engine via Agent-to-Agent...",
        "[UCP] Fetching personalized rate based on credit profile and LTV...",
        "Applying credit score and margin reductions...",
        "Generating personalized rate offer..."
    ]);

    await sleep(1500);
    
    const offeredRate = 3.89;
    const monthlyCostCurrent = Math.round((loanAmount * (currentRate / 100)) / 12);
    const monthlyCostOurs = Math.round((loanAmount * (offeredRate / 100)) / 12);
    const annualSavings = (monthlyCostCurrent - monthlyCostOurs) * 12;

    await appendGeminiResponse(
        `Based on your low credit risk and favorable LTV, Swedish Bank is offering you a personalized rate. The rate of **${offeredRate.toFixed(2)}%** saves you **${fmtNum(annualSavings)} SEK** annually:`
    );

    await sleep(500);

    // Combined offer widget: current bank comparison + all rate options
    const amortPct = parseFloat(((loanAmount / propertyValue) * 100).toFixed(1)) > 70 ? 2 : parseFloat(((loanAmount / propertyValue) * 100).toFixed(1)) > 50 ? 1 : 0;
    const monthlyAmort = Math.round((loanAmount * (amortPct / 100)) / 12);
    const totalMonthlyCost = monthlyCostOurs + monthlyAmort;

    const rateWidgetHtml = `
        <div class="widget-header h-orange">
            <span class="widget-icon orange">${IC.tag}</span>
            <span>Your Personalized Rate Offer</span>
        </div>
        <div class="widget-body">
            <div style="text-align:center; padding:10px 0 12px;">
                <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:var(--sb-gray-500); font-weight:600; margin-bottom:6px;">Your New Rate</div>
                <div style="font-size:48px; font-weight:800; color:var(--sb-green); font-family:'Outfit',sans-serif; line-height:1;">${offeredRate.toFixed(2)}%</div>
                <div style="font-size:13px; color:var(--sb-gray-400); margin-top:8px;">
                    down from <span style="text-decoration:line-through; color:var(--sb-gray-400);">${currentRate.toFixed(2)}%</span> at your current bank
                </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
                <div style="background:var(--sb-gray-100); border-radius:10px; padding:14px; text-align:center;">
                    <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.05em; color:var(--sb-gray-500); font-weight:600; margin-bottom:4px;">Monthly Cost</div>
                    <div style="font-size:20px; font-weight:800; color:var(--sb-black); font-family:'Outfit',sans-serif;">${fmtNum(totalMonthlyCost)} <span style="font-size:12px; font-weight:600; color:var(--sb-gray-500);">SEK</span></div>
                    <div style="font-size:11px; color:var(--sb-gray-400); margin-top:2px;">Interest + Amortization</div>
                </div>
                <div style="background:var(--sb-gray-100); border-radius:10px; padding:14px; text-align:center;">
                    <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.05em; color:var(--sb-gray-500); font-weight:600; margin-bottom:4px;">You Save</div>
                    <div style="font-size:20px; font-weight:800; color:var(--sb-green); font-family:'Outfit',sans-serif;">${fmtNum(monthlyCostCurrent - monthlyCostOurs)} <span style="font-size:12px; font-weight:600; color:var(--sb-gray-500);">SEK/mo</span></div>
                    <div style="font-size:11px; color:var(--sb-gray-400); margin-top:2px;">On interest payments</div>
                </div>
            </div>
            
            <div class="savings-banner">
                <span class="savings-title">Estimated Annual Savings</span>
                <span class="savings-amount">${fmtNum(annualSavings)} <span class="unit">SEK / Year</span></span>
            </div>
        </div>
    `;
    appendWidget(rateWidgetHtml);
    currentRate = 3.89;
    await sleep(1000);

    await appendGeminiResponse(
        "Would you like to look into what other offers Swedish Bank has that could help you lower your rate even further?"
    );
}


// ══════════════════════════════════════════════════════════
//  BLOCK 5: Add-ons (Helkund Package)
// ══════════════════════════════════════════════════════════

async function runAddonsQuestion(wantsAddons) {
    if (wantsAddons) {
        await sleep(800);
        flowState = 7;
        
        await appendGeminiResponse(
            "By moving your home insurance, salary account, and savings to Swedish Bank, you qualify for our **full customer discount** of an additional **0.20 percentage points** off your mortgage rate."
        );
        
        // Helkund rate is 3.69% (3.89% - 0.20%)
        const helkundRate = 3.69;
        const monthlyCostOurs = Math.round((loanAmount * (3.89 / 100)) / 12);
        const monthlyCostHelkund = Math.round((loanAmount * (helkundRate / 100)) / 12);
        const helkundAnnualSavings = Math.round(loanAmount * ( (currentRate - helkundRate) / 100 ));
        const extraMonthlySavings = monthlyCostOurs - monthlyCostHelkund;
        
        const helkundWidgetHtml = `
            <div class="widget-header h-green">
                <span class="widget-icon green">${IC.bank}</span>
                <span>Updated Offer</span>
            </div>
            <div class="widget-body">
                <div style="font-size:14px; color:var(--sb-gray-700); margin-bottom:14px; line-height:1.6; text-align:left;">
                    Consolidate your banking services with us and we will lower your rate by <strong style="color:var(--sb-green)">0.20 percentage points</strong>.
                </div>
                <div class="widget-row emphasized green-bg" style="background:var(--sb-green-light); padding:10px; border-radius:8px; margin-bottom:12px;">
                    <span class="widget-row-label">Consolidated Rate</span>
                    <span class="widget-row-value green" style="font-size:18px; font-weight:700; color:var(--sb-green);">${helkundRate.toFixed(2)}%</span>
                </div>
                <div>
                    <div class="widget-row">
                        <span class="widget-row-label">✦ Home Insurance</span>
                        <span class="widget-row-value">Transfer to us</span>
                    </div>
                    <div class="widget-row">
                        <span class="widget-row-label">✦ Salary Account</span>
                        <span class="widget-row-value">Switch primary bank</span>
                    </div>
                    <div class="widget-row">
                        <span class="widget-row-label">✦ Savings</span>
                        <span class="widget-row-value">Transfer ISK/funds</span>
                    </div>
                </div>
                <div class="savings-banner">
                    <span class="savings-title">Total Annual Savings</span>
                    <span class="savings-amount">${fmtNum(helkundAnnualSavings)} <span class="unit">SEK / Year</span></span>
                    <span class="savings-detail">
                        Reduces monthly cost by another <strong>${fmtNum(extraMonthlySavings)} SEK/mo</strong> (total savings of ${fmtNum(Math.round(helkundAnnualSavings/12))} SEK/mo)
                    </span>
                </div>
            </div>
        `;
        appendWidget(helkundWidgetHtml);
        await sleep(1200);
        
        await appendGeminiResponse(
            "Would you like to add the full customer everyday banking discount package to your mortgage transfer and lower your rate to **3.69%**?"
        );
    } else {
        await sleep(800);
        
        await appendGeminiResponse(
            "No problem. We will keep your variable rate offer at **3.89%** and proceed with the transfer. You can always consolidate and add services later."
        );
        currentRate = 3.89;
        await sleep(1200);
        flowState = 8;
        
        await runSigning();
    }
}

async function runAddonsConfirm(confirmHelkund) {
    if (confirmHelkund) {
        await sleep(800);
        
        currentRate = 3.69;
        await appendGeminiResponse(
            `Excellent! Your new mortgage interest rate is locked at **3.69% variable** (total annual savings of ${fmtNum(Math.round(loanAmount * (currentRate - 3.69) / 100))} SEK). We will coordinate the transfer of your everyday banking services automatically after the mortgage transfer is completed.`
        );
    } else {
        await sleep(800);
        
        currentRate = 3.89;
        await appendGeminiResponse(
            "Understood. Your rate is locked at **3.89% variable**."
        );
    }
    await sleep(1200);
    flowState = 8;
    await runSigning();
}


// ══════════════════════════════════════════════════════════
//  BLOCK 6: Digital Signing + BankID Confirmation + Finalize
// ══════════════════════════════════════════════════════════

async function runSigning() {
    await appendThinkingProcess([
        "[A2A] Generating transfer agreement document inside Swedish Bank secure vault...",
        "[AP2] Preparing cryptographic payment authorization via Agent Payments Protocol...",
        "[AP2] Registering clearing instruction for debt transfer between banks..."
    ]);

    await sleep(1500);
    
    const finalRate = currentRate;
    
    await appendGeminiResponse(
        `We have generated the final **Mortgage Transfer & Rate Agreement**.<br><br>By signing below, you authorize Swedish Bank to transfer the **${fmtNum(loanAmount)} SEK** debt from your current bank to Swedish Bank at the locked rate of **${finalRate.toFixed(2)}% variable**.`
    );
    
    const signatureWidgetHtml = `
        <div class="widget-header h-orange">
            <span class="widget-icon orange">${IC.clip}</span>
            <span>Rate Agreement & Signing</span>
        </div>
        <div class="widget-body" id="signing-widget-body">
            <div class="signing-card" id="signing-card" style="position: relative;">
                <svg class="document-seal" viewBox="0 0 100 100" style="position: absolute; right: 10px; top: -10px; width: 80px; height: 80px; fill: none; stroke: var(--sb-accent); stroke-width: 2; opacity: 0.06; pointer-events: none; user-select: none; transform: rotate(-15deg);">
                    <circle cx="50" cy="50" r="45" stroke-dasharray="3 3"/>
                    <circle cx="50" cy="50" r="38"/>
                    <path d="M50 20 L58 40 L80 40 L62 52 L70 72 L50 60 L30 72 L38 52 L20 40 L42 40 Z"/>
                    <text x="50" y="90" font-size="8" font-family="Outfit" font-weight="700" text-anchor="middle" fill="var(--sb-accent)" stroke="none">VERIFIED</text>
                </svg>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
                    <div style="background:var(--sb-gray-100); border-radius:8px; padding:10px 12px;">
                        <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.05em; color:var(--sb-gray-500); font-weight:600; margin-bottom:4px;">Loan Amount</div>
                        <div style="font-size:15px; font-weight:700; color:var(--sb-black);">${fmtNum(loanAmount)} SEK</div>
                    </div>
                    <div style="background:var(--sb-gray-100); border-radius:8px; padding:10px 12px;">
                        <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.05em; color:var(--sb-gray-500); font-weight:600; margin-bottom:4px;">Locked Rate</div>
                        <div style="font-size:15px; font-weight:700; color:var(--sb-green);">${finalRate.toFixed(2)}% variable</div>
                    </div>
                    <div style="background:var(--sb-gray-100); border-radius:8px; padding:10px 12px;">
                        <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.05em; color:var(--sb-gray-500); font-weight:600; margin-bottom:4px;">Borrower</div>
                        <div style="font-size:15px; font-weight:700; color:var(--sb-black);">${userName}</div>
                    </div>
                    <div style="background:var(--sb-gray-100); border-radius:8px; padding:10px 12px;">
                        <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.05em; color:var(--sb-gray-500); font-weight:600; margin-bottom:4px;">Bank</div>
                        <div style="font-size:15px; font-weight:700; color:var(--sb-black);">Swedish Bank AB</div>
                    </div>
                </div>

                <div class="signing-clause" style="font-family: 'Inter', sans-serif; font-size: 12px; line-height: 18px; border-left: 3px solid var(--sb-accent); padding-left: 12px; background: var(--sb-gray-100); margin-bottom: 16px; padding-top: 8px; padding-bottom: 8px; border-radius: 0 8px 8px 0; color: var(--sb-gray-600);">
                    <strong style="color:var(--sb-black);">KREDITAVTAL — BOLÅNEÖVERFLYTT</strong><br>
                    Pursuant to Konsumentkreditlagen (2010:1846), the borrower hereby authorizes Swedish Bank AB to clear the outstanding debt of <strong>${fmtNum(loanAmount)} SEK</strong> with their current bank at a variable rate of <strong>${finalRate.toFixed(2)}%</strong>.
                </div>
                <div class="signing-input-area" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px;">
                    <input type="text" class="signature-input" id="sig-input" placeholder="Type your full name to sign" oninput="toggleSignBtn(this)" style="padding: 12px 14px; border: 1.5px solid var(--sb-gray-300); border-radius: 10px; font-size: 14px; width: 100%; outline: none; background: white; color: var(--sb-black); transition: border-color 0.2s;">
                    <button class="sign-btn" id="sig-confirm-btn" onclick="simulateSigning()" disabled style="padding: 14px; background: linear-gradient(135deg, var(--sb-accent), #e65100); color: white; border: none; border-radius: 24px; font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.3s; width: 100%; letter-spacing: 0.3px;">Sign Agreement</button>
                </div>
                <div class="ssn-label" style="text-align:center; font-size: 12px; color: var(--sb-gray-500);">Type <strong>${userName}</strong> to sign securely via BankID</div>
            </div>
        </div>
    `;
    
    appendWidget(signatureWidgetHtml);
}

// Toggle sign button based on text match
function toggleSignBtn(input) {
    const btn = document.getElementById('sig-confirm-btn');
    if (btn) {
        btn.disabled = input.value.trim().toLowerCase() !== userName.toLowerCase();
    }
}

// Simulate digital signing completion → BankID → Finalize
async function simulateSigning() {
    const card = document.getElementById('signing-card');
    if (card) {
        card.innerHTML = `
            <div class="bankid-widget">
                <div class="bankid-visual verified">
                    <span class="bankid-logo" style="font-size:32px;color:var(--sb-green)">✓</span>
                </div>
                <div class="bankid-label" style="color:var(--sb-green);font-weight:600;font-size:16px;">Agreement Signed Digitally</div>
                <div class="bankid-sublabel" style="font-size:12px; margin-bottom: 12px;">AP2 signature created</div>
                <div style="font-size: 12px; color: var(--sb-gray-600); line-height: 1.6; max-width: 320px; margin: 0 auto; text-align: left;">
                    <strong>Signee:</strong> ${userName}<br>
                    <strong>Timestamp:</strong> ${new Date().toISOString()}<br>
                    <strong>Status:</strong> Awaiting BankID confirmation
                </div>
            </div>
        `;
        const widgetCard = card.closest('.widget-card');
        if (widgetCard) {
            const header = widgetCard.querySelector('.widget-header');
            if (header) {
                header.className = 'widget-header h-green';
                header.innerHTML = `<span class="widget-icon green">${IC.check}</span><span>Agreement Signed</span>`;
            }
        }
    }
    
    await sleep(1200);
    
    // BankID verification for extra security
    await appendGeminiResponse(
        "Agreement signed! For additional security, Swedish Bank requires a final BankID verification to authorize the transfer:"
    );
    
    const bankidWidgetHtml = `
        <div class="widget-header h-blue">
            <span class="widget-icon blue">${IC.shield}</span>
            <span>Final BankID Authorization</span>
        </div>
        <div class="widget-body" id="final-bankid-body">
            <div class="bankid-widget">
                <div class="bankid-visual pending">
                    <div class="bankid-spinner"></div>
                    <img src="bankid_logo.png" class="bankid-official-logo" alt="BankID">
                </div>
                <div class="bankid-label">Authorize transfer in your BankID app</div>
            </div>
        </div>
    `;
    
    appendWidget(bankidWidgetHtml, " bankid-card");
    
    // Auto-verify after 2.5s → finalize
    setTimeout(simulateFinalBankID, 5000);
}

async function simulateFinalBankID() {
    const widgetBody = document.getElementById('final-bankid-body');
    if (widgetBody) {
        widgetBody.innerHTML = `
            <div class="bankid-widget">
                <div class="bankid-visual verified">
                    <span class="bankid-logo" style="font-size:32px;color:var(--sb-green)">✓</span>
                </div>
                <div class="bankid-label" style="color:var(--sb-green);font-weight:600;font-size:16px">Transfer Authorized</div>
                <div class="bankid-sublabel" style="font-size:13px">${userName} — ${userSSN}</div>
            </div>
        `;
        const widgetCard = widgetBody.closest('.widget-card');
        if (widgetCard) {
            const header = widgetCard.querySelector('.widget-header');
            if (header) {
                header.className = 'widget-header h-green';
                header.innerHTML = `<span class="widget-icon green">${IC.check}</span><span>Authorization Confirmed</span>`;
            }
        }
    }
    
    flowState = 9;
    await runFinalize();
}

// Append Completion Card to feed
function appendCompletionCard(widgetHtml) {
    const messages = chatFeed.querySelectorAll('.chat-message.gemini-message');
    let parentContainer = chatFeed;
    if (messages.length > 0) {
        const contentContainer = messages[messages.length - 1].querySelector('.message-content');
        if (contentContainer) {
            parentContainer = contentContainer;
        }
    }
    const widgetWrapper = document.createElement('div');
    widgetWrapper.className = 'completion-card';
    widgetWrapper.innerHTML = widgetHtml;
    parentContainer.appendChild(widgetWrapper);
    scrollToBottom();
    return widgetWrapper;
}

// FINALIZE: Success with Timeline
async function runFinalize() {
    await appendThinkingProcess([
        "[AP2] Verifying cryptographic signature via Agent Payments Protocol...",
        "[AP2] Initiating clearing house transaction between banks via AP2...",
        "[AP2] Settlement instruction registered — awaiting interbank confirmation...",
        "[A2A] Creating transfer ledger entries inside Swedish Bank core systems..."
    ]);

    await sleep(2000);
    
    const finalRate = currentRate;
    const monthlyCostOriginal = Math.round((loanAmount * (originalRate / 100)) / 12);
    const monthlyCostOurs = Math.round((loanAmount * (finalRate / 100)) / 12);
    const annualSavings = (monthlyCostOriginal - monthlyCostOurs) * 12;
    const ref = `SB-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    const finalizeWidgetHtml = `
        <div class="completion-header">
            <div class="completion-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round">
                    <path d="M5 13l4 4L19 7"/>
                </svg>
            </div>
            <div class="completion-title">Mortgage Transfer Initiated</div>
            <div class="completion-ref">Case Number: ${ref}</div>
            <div class="completion-summary">
                <div class="completion-summary-item">
                    <div class="completion-summary-value">${finalRate.toFixed(2)}%</div>
                    <div class="completion-summary-label">Approved Rate</div>
                </div>
                <div class="completion-summary-item">
                    <div class="completion-summary-value">${fmtNum(annualSavings)} SEK</div>
                    <div class="completion-summary-label">Savings/year</div>
                </div>
                <div class="completion-summary-item">
                    <div class="completion-summary-value">${fmtNum(monthlyCostOurs)} SEK</div>
                    <div class="completion-summary-label">New Monthly Cost</div>
                </div>
            </div>
        </div>
        <div class="completion-body">
            <div class="completion-body-title">Next Steps in the Process</div>
            <div class="completion-timeline">
                <div class="completion-timeline-item auto">
                    <div class="timeline-left">
                        <div class="timeline-node">1</div>
                        <div class="timeline-line"></div>
                    </div>
                    <div class="timeline-right">
                        <div class="step-card">
                            <div class="step-card-meta">
                                <span class="step-status-badge auto">Completed</span>
                            </div>
                            <h4 class="step-card-title">Sign mortgage deed via BankID</h4>
                            <p class="step-card-text">We will send the mortgage deed digitally — you sign easily in your BankID app.</p>
                        </div>
                    </div>
                </div>
                <div class="completion-timeline-item active-action">
                    <div class="timeline-left">
                        <div class="timeline-node">2</div>
                        <div class="timeline-line"></div>
                    </div>
                    <div class="timeline-right">
                        <div class="step-card">
                            <div class="step-card-meta">
                                <span class="step-status-badge action">Active</span>
                            </div>
                            <h4 class="step-card-title">AP2 clearing initiated — payoff of current loan</h4>
                            <p class="step-card-text">AP2 handles the interbank debt transfer and settlement with your current bank automatically.</p>
                        </div>
                    </div>
                </div>
                <div class="completion-timeline-item upcoming">
                    <div class="timeline-left">
                        <div class="timeline-node">3</div>
                    </div>
                    <div class="timeline-right">
                        <div class="step-card">
                            <div class="step-card-meta">
                                <span class="step-status-badge upcoming">Upcoming</span>
                            </div>
                            <h4 class="step-card-title">Completed within 1–2 weeks</h4>
                            <p class="step-card-text">You will receive regular updates via SMS and email as the transfer progresses.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="completion-footer">
            <div class="completion-footer-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
            </div>
            <div class="completion-footer-text">Questions about your application? Call <strong>08-123 456</strong> or chat with Banksy 24/7.</div>
        </div>
    `;
    
    appendCompletionCard(finalizeWidgetHtml);
    await sleep(800);

    await appendGeminiResponse(
        `Congratulations, **Erik**! The mortgage transfer process for **${address.split(',')[0]}** has been finalized directly within your Gemini chat session.<br><br>### Summary of Transfer Accomplished:<br>• **New Bank**: Swedish Bank (Full Customer Plan)<br>• **Interest Rate**: **${finalRate.toFixed(2)}% variable** (down from ${originalRate.toFixed(2)}% at your current bank)<br>• **Estimated Annual Savings**: **${fmtNum(annualSavings)} SEK**<br>• **Time to Complete**: 1-2 weeks (entirely paperless)`,
        []
    );
}
