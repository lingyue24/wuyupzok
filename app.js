// --- 1. 配置與初始化 ---
// 已更新為您最新提供的部署網址
const API_URL = "https://script.google.com/macros/s/AKfycbx_agjqCX1ipJybebKTVgx6V_S_Xxhh733fnioxkAFo-2bJAW32abD2uTkghh-q1cbM/exec"; 
const STORAGE_KEY = "v6_knowledge_db";

// 預設結構，防止在資料載入前出現 undefined
let db = { config: { dbName: "系統初始化...", password: "1234" }, categories: [] };
let activeNode = null;
let tempImgs = [];
let editingIdx = -1;
let isAdmin = false;

// --- 2. 智慧載入邏輯 ---
async function initSystem() {
    const nameDisplay = document.getElementById("db-name-display");
    if(nameDisplay) nameDisplay.innerText = "連線中...";

    try {
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));
        const res = await Promise.race([fetch(API_URL), timeout]);
        const text = await res.text(); // 先以文字讀取，避免 JSON 解析報錯
        
        let data;
        try {
            data = JSON.parse(text); // 嘗試解析
        } catch(e) {
            console.warn("☁️ 雲端資料格式錯誤或為空");
            data = null;
        }

        if (data && data.config) {
            db = data;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        } else {
            throw new Error("Empty or Invalid Data");
        }
    } catch (e) {
        // --- 強大的備援順序 ---
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData && savedData !== "undefined" && savedData !== null) {
            db = JSON.parse(savedData);
        } else if (typeof initialData !== 'undefined') {
            db = initialData; // 讀取 data.js
        } else {
            db = { config: { dbName: "新知識庫", password: "1234" }, categories: [] };
        }
    }
    renderAfterLoad(); // 確保不論成敗都會執行渲染，關閉「載入中」狀態
}

function renderAfterLoad() {
    const nameEl = document.getElementById("db-name-display");
    if(nameEl) nameEl.innerText = db.config.dbName || "未命名資料庫";
    renderTree(db.categories, document.getElementById("nav-tree"));
}

async function saveToCloud() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    try {
        await fetch(API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(db)
        });
        console.log("☁️ 雲端同步指令已發送");
    } catch (e) {
        console.error("☁️ 同步失敗", e);
    }
}

// --- 3. 圖片處理 ---
function addImgByUrl() {
    const urlInput = document.getElementById("input-img-url");
    const url = urlInput.value ? urlInput.value.trim() : "";
    if (url) {
        if (tempImgs.length >= 5) return alert("最多上傳 5 張圖片");
        tempImgs.push(url);
        urlInput.value = ""; 
        renderImgManager();
    }
}

function addLocalImg(input) {
    const file = input.files[0];
    if (file && tempImgs.length < 5) {
        const reader = new FileReader();
        reader.onload = (e) => { tempImgs.push(e.target.result); renderImgManager(); };
        reader.readAsDataURL(file);
    }
}

function renderImgManager() {
    const zone = document.getElementById("img-manager-zone");
    if(!zone) return;
    zone.innerHTML = tempImgs.map((img, idx) => `
        <div class=\"img-slot\">
            <img src=\"${img}\">
            <button onclick=\"tempImgs.splice(${idx},1);renderImgManager();\" style=\"position:absolute; top:0; right:0; background:red; color:white; border:none; border-radius:50%; cursor:pointer; width:20px; height:20px;\">×</button>
        </div>`).join("");
}

// --- 4. 側邊欄與 UI ---
function toggleMenu() {
    document.getElementById("sidebar").classList.toggle("open");
}

function closeMenu() {
    document.getElementById("sidebar").classList.remove("open");
}

function linkify(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlPattern, '<a href=\"$1\" target=\"_blank\" style=\"color:#3498db; text-decoration:underline;\">$1</a>');
}

function renderTree(nodes, container) {
    if(!container) return;
    container.innerHTML = "";
    nodes.forEach((node) => {
        const hasChildren = node.children && node.children.length > 0;
        let nodeWrapper = document.createElement("div");
        nodeWrapper.className = "nav-node-wrapper";
        let titleLine = document.createElement("div");
        titleLine.className = "nav-node";
        titleLine.innerHTML = `<span>${hasChildren ? "📂 " : "📄 "}${node.name}</span>`;
        
        let childBox = document.createElement("div");
        childBox.className = "child-container";
        childBox.style.display = "none"; 
        
        titleLine.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.nav-node').forEach(el => el.classList.remove('active-node'));
            titleLine.classList.add('active-node');
            if (hasChildren) childBox.style.display = childBox.style.display === "block" ? "none" : "block";
            else if (window.innerWidth <= 1024) setTimeout(closeMenu, 150);
            activeNode = node;
            document.getElementById('current-path').innerText = `📍 定位：${node.name}`;
            renderDisplay(node.items || []);
        };
        nodeWrapper.appendChild(titleLine);
        if (hasChildren) { renderTree(node.children, childBox); nodeWrapper.appendChild(childBox); }
        container.appendChild(nodeWrapper);
    });
}

function renderDisplay(items) {
    const view = document.getElementById("display-view");
    if(!view) return;
    view.innerHTML = items.length === 0 ? '<div style=\"text-align:center; padding:50px; color:#999;\">此分類暫無內容。</div>' :
    items.map((item, idx) => `
        <div class=\"card\">
            <div style=\"display:flex; justify-content:space-between; align-items:center;\">
                <h2 style=\"margin:0; font-size:1.2em;\">${item.name}</h2>
                ${isAdmin ? `<div><button class=\"btn btn-outline\" onclick=\"startEdit(${idx})\">✏</button>
                <button class=\"btn btn-danger\" onclick=\"deleteItem(${idx})\" style=\"padding:5px; margin-left:5px;\">🗑</button></div>` : ''}
            </div>
            <div class=\"gallery\">${(item.imgs || []).map(src => `<img src=\"${src}\" onclick=\"window.open('${src}')\" style=\"cursor:zoom-in;\">`).join('')}</div>
            <p style=\"white-space: pre-wrap; line-height:1.7; margin-top:15px;\">${linkify(item.text)}</p>
        </div>`).join("");
}

// --- 5. 管理功能 ---
function toggleAdmin() {
    if (isAdmin) return exitAdmin();
    const pw = prompt("密碼:");
    if (pw === db.config.password) {
        isAdmin = true;
        document.getElementById("admin-panel").style.display = "block";
        document.getElementById("settings-area").style.display = "block";
        document.getElementById("admin-toggle").innerText = "🔓 退出管理";
        if(activeNode) renderDisplay(activeNode.items);
    } else if (pw !== null) alert("密碼錯誤");
}

// 補全原本截斷的函數
function exitAdmin() {
    isAdmin = false; 
    exitEdit();
    document.getElementById("admin-panel").style.display = "none";
    document.getElementById("settings-area").style.display = "none";
    document.getElementById("admin-toggle").innerText = "🔐 管理模式";
    if(activeNode) renderDisplay(activeNode.items);
}

function exitEdit() {
    editingIdx = -1; 
    tempImgs = [];
    document.getElementById("edit-title").value = "";
    document.getElementById("edit-desc").value = "";
    renderImgManager();
    document.getElementById("btn-save-main").innerText = "💾 儲存內容";
    const cancelBtn = document.getElementById("btn-cancel-edit");
    if(cancelBtn) cancelBtn.style.display = "none";
}

async function saveContent() {
    if (!activeNode) return alert("請先從左側選單選擇一個分類");
    const name = document.getElementById("edit-title").value.trim();
    const text = document.getElementById("edit-desc").value.trim();
    if (!name) return alert("標題必填");
    
    const newItem = { name, text, imgs: [...tempImgs] };
    if (!activeNode.items) activeNode.items = [];
    
    if (editingIdx > -1) activeNode.items[editingIdx] = newItem;
    else activeNode.items.push(newItem);
    
    renderDisplay(activeNode.items);
    await saveToCloud();
    exitEdit();
}

function smartSearch() {
    const q = document.getElementById("search-bar").value.toLowerCase();
    if (!q) { if (activeNode) renderDisplay(activeNode.items); return; }
    let res = [];
    const search = (nodes) => nodes.forEach(n => {
        if (n.items) n.items.forEach(i => { 
            if (i.name.toLowerCase().includes(q) || i.text.toLowerCase().includes(q)) res.push(i); 
        });
        if (n.children) search(n.children);
    });
    search(db.categories); 
    renderDisplay(res);
}

// 確保點擊容器會關閉手機選單
const mainContainer = document.getElementById("main-container");
if(mainContainer) {
    mainContainer.addEventListener("click", () => {
        if (window.innerWidth <= 1024) closeMenu();
    });
}

window.onload = initSystem;
