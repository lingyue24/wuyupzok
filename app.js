// --- 1. 配置與初始化 ---
const API_URL = "https://script.google.com/macros/s/AKfycbx_agjqCX1ipJybebKTVgx6V_S_Xxhh733fnioxkAFo-2bJAW32abD2uTkghh-q1cbM/exec"; 
const STORAGE_KEY = "v6_knowledge_db";

let db = { config: { dbName: "載入中...", password: "1234" }, categories: [] };
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
        const data = await res.json();
        
        if (data && data.config) {
            db = data;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
            console.log("✅ 雲端同步成功");
        }
    } catch (e) {
        console.warn("⚠️ 啟動備援邏輯");
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData && savedData !== "undefined" && savedData !== null) {
            db = JSON.parse(savedData);
        } else if (typeof initialData !== 'undefined') {
            db = initialData;
        }
    }
    renderAfterLoad();
}

function renderAfterLoad() {
    const display = document.getElementById("db-name-display");
    if(display) display.innerText = db.config.dbName || "知識庫";
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

// --- 3. 圖片處理 (同時支援檔案與網址) ---
function addImgByUrl() {
    const urlInput = document.getElementById("input-img-url");
    const url = urlInput ? urlInput.value.trim() : "";
    if (url) {
        if (tempImgs.length >= 5) return alert("最多 5 張圖片");
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
        <div class="img-slot" style="position:relative; display:inline-block; margin-right:5px;">
            <img src="${img}" style="width:60px; height:60px; object-fit:cover; border-radius:4px;">
            <button onclick="tempImgs.splice(${idx},1);renderImgManager();" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer;">×</button>
        </div>`).join("");
}

// --- 4. 介面渲染與導覽 ---
const toggleMenu = () => document.getElementById("sidebar").classList.toggle("open");
const closeMenu = () => document.getElementById("sidebar").classList.remove("open");

function linkify(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlPattern, '<a href="$1" target="_blank" style="color:#3498db; text-decoration:underline;">$1</a>');
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
            const pathEl = document.getElementById('current-path');
            if(pathEl) pathEl.innerText = `📍 定位：${node.name}`;
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
    view.innerHTML = items.length === 0 ? '<div style="text-align:center; padding:50px; color:#999;">此分類暫無內容。</div>' :
    items.map((item, idx) => `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2 style="margin:0; font-size:1.2em;">${item.name}</h2>
                ${isAdmin ? `<div><button class="btn btn-outline" onclick="startEdit(${idx})">✏</button>
                <button class="btn btn-danger" onclick="deleteItem(${idx})" style="padding:5px; margin-left:5px;">🗑</button></div>` : ''}
            </div>
            <div class="gallery">${(item.imgs || []).map(src => `<img src="${src}" onclick="window.open('${src}')" style="cursor:zoom-in; max-width:100px; margin:5px;">`).join('')}</div>
            <p style="white-space: pre-wrap; line-height:1.7; margin-top:15px;">${linkify(item.text)}</p>
        </div>`).join("");
}

// --- 5. 管理功能核心 ---
function toggleAdmin() {
    if (isAdmin) return exitAdmin();
    const pw = prompt("請輸入管理密碼:");
    if (pw === db.config.password) {
        isAdmin = true;
        document.getElementById("admin-panel").style.display = "block";
        document.getElementById("settings-area").style.display = "block";
        document.getElementById("admin-toggle").innerText = "🔓 退出管理";
        if(activeNode) renderDisplay(activeNode.items);
    } else if (pw !== null) alert("密碼錯誤");
}

function exitAdmin() {
    isAdmin = false; 
    exitEdit();
    document.getElementById("admin-panel").style.display = "none";
    document.getElementById("settings-area").style.display = "none";
    document.getElementById("admin-toggle").innerText = "🔐 管理模式";
    if(activeNode) renderDisplay(activeNode.items);
}

function exitEdit() {
    editingIdx = -1; tempImgs = [];
    document.getElementById("edit-title").value = "";
    document.getElementById("edit-desc").value = "";
    renderImgManager();
    document.getElementById("btn-save-main").innerText = "💾 儲存並同步雲端";
}

function startEdit(idx) {
    editingIdx = idx;
    const item = activeNode.items[idx];
    document.getElementById("edit-title").value = item.name;
    document.getElementById("edit-desc").value = item.text;
    tempImgs = [...(item.imgs || [])];
    renderImgManager();
    document.getElementById("btn-save-main").innerText = "🆙 更新內容";
    window.scrollTo({ top: document.getElementById('admin-panel').offsetTop, behavior: 'smooth' });
}

// --- 6. 分類與內容操作 (確保這些函式存在) ---
async function addRootCategory() {
    const name = prompt("新增第一層總分類名稱：");
    if (name) {
        db.categories.push({ name: name, children: [], items: [] });
        renderAfterLoad();
        await saveToCloud();
    }
}

async function addCategory() {
    if (!activeNode) return alert("請先在左側選單點選一個父分類");
    const name = prompt(`在「${activeNode.name}」下新增子分類名稱：`);
    if (name) {
        if (!activeNode.children) activeNode.children = [];
        activeNode.children.push({ name: name, children: [], items: [] });
        renderAfterLoad();
        await saveToCloud();
    }
}

async function deleteCategory() {
    if (!activeNode || !confirm(`確定要刪除「${activeNode.name}」及其所有子分類與內容嗎？`)) return;
    const findAndRemove = (arr) => {
        const idx = arr.findIndex(n => n === activeNode);
        if (idx > -1) { arr.splice(idx, 1); return true; }
        for (let c of arr) { if (c.children && findAndRemove(c.children)) return true; }
        return false;
    };
    findAndRemove(db.categories);
    activeNode = null;
    renderAfterLoad();
    await saveToCloud();
}

async function saveContent() {
    if (!activeNode) return alert("請先選取分類路徑");
    const name = document.getElementById("edit-title").value.trim();
    const text = document.getElementById("edit-desc").value.trim();
    if (!name) return alert("標題不能為空");

    const newItem = { name, text, imgs: [...tempImgs] };
    if (!activeNode.items) activeNode.items = [];

    if (editingIdx > -1) activeNode.items[editingIdx] = newItem;
    else activeNode.items.push(newItem);

    renderDisplay(activeNode.items);
    await saveToCloud();
    exitEdit();
}

async function saveToCloud() {
    // 先儲存到本地瀏覽器，防止網路斷線遺失資料
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    
    console.log("正在同步至雲端...");
    
    try {
        // 這裡不需要 mode: "no-cors"，因為我們只需要送出資料
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(db) // 直接傳送 JSON 字串
        });
        
        console.log("☁️ 雲端同步指令已成功發送");
    } catch (e) {
        console.error("☁️ 同步失敗，請檢查網路或 API 網址", e);
        alert("雲端同步失敗，資料目前僅儲存在此瀏覽器中。");
    }
}

async function deleteItem(idx) {
    if (confirm("確定刪除此條目？")) {
        activeNode.items.splice(idx, 1);
        renderDisplay(activeNode.items);
        await saveToCloud();
    }
}

// --- 7. 搜尋與設定 ---
function smartSearch() {
    const q = document.getElementById("search-bar").value.toLowerCase();
    if (!q) { if (activeNode) renderDisplay(activeNode.items); return; }
    let res = [];
    const searchRecursive = (nodes) => nodes.forEach(n => {
        if (n.items) n.items.forEach(i => {
            if (i.name.toLowerCase().includes(q) || i.text.toLowerCase().includes(q)) res.push(i);
        });
        if (n.children) searchRecursive(n.children);
    });
    searchRecursive(db.categories);
    renderDisplay(res);
}

const openModal = () => {
    document.getElementById("set-db-name").value = db.config.dbName;
    document.getElementById("settings-modal").style.display = "flex";
};
const closeModal = () => document.getElementById("settings-modal").style.display = "none";

async function saveSettings() {
    const n = document.getElementById("set-db-name").value.trim();
    const p = document.getElementById("set-new-pw").value.trim();
    if (n) db.config.dbName = n;
    if (p) db.config.password = p;
    await saveToCloud();
    location.reload();
}

// 監聽主區域點擊收回手機選單
document.getElementById("main-container").addEventListener("click", () => {
    if (window.innerWidth <= 1024) closeMenu();
});

window.onload = initSystem;
