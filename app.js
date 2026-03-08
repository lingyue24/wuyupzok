// --- 1. 配置與初始化 ---
const API_URL = "https://script.google.com/macros/s/AKfycbwozdRPykXdobo-KhqnvajCBpTNDB2gH4g8MLQ_2RU62BV5-DWVHt4vtUzMe6C56vXbzQ/exec"; 
const STORAGE_KEY = "v6_knowledge_db";

let db = { config: { dbName: "系統初始化..." }, categories: [] };
let activeNode = null;
let tempImgs = [];
let editingIdx = -1;
let isAdmin = false;

// --- 2. 智慧載入邏輯 (雲端 > 本地 > 預設) ---
async function initSystem() {
    const nameDisplay = document.getElementById("db-name-display");
    if(nameDisplay) nameDisplay.innerText = "連線中...";

    // 設定超時機制，防止 API 沒回應導致網頁卡死
    const fetchPromise = fetch(API_URL).then(res => res.json());
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));

    try {
        console.log("嘗試同步雲端...");
        db = await Promise.race([fetchPromise, timeoutPromise]);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        console.log("✅ 雲端同步成功");
    } catch (e) {
        console.warn("⚠️ 雲端失敗或超時，切換至備援路徑:", e.message);
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData && savedData !== "undefined") {
            db = JSON.parse(savedData);
            console.log("✅ 已載入本地儲存");
        } else {
            db = (typeof initialData !== 'undefined') ? initialData : {
                config: { dbName: "新知識庫", password: "1234" },
                categories: []
            };
            console.log("✅ 已載入預設 data.js");
        }
    }
    renderAfterLoad();
}

function renderAfterLoad() {
    document.getElementById("db-name-display").innerText = db.config.dbName;
    renderTree(db.categories, document.getElementById("nav-tree"));
}

// 雲端儲存
async function saveToCloud() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); // 必存本地
    try {
        await fetch(API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(db)
        });
        console.log("☁️ 雲端存檔指令已發送");
    } catch (e) {
        console.error("☁️ 存檔失敗", e);
    }
}

// --- 3. 內容解析與圖片網址功能 ---
function parseContent(text) {
    // 1. 識別 [img]網址[/img] 標籤
    let html = text.replace(/\[img\](.*?)\[\/img\]/gi, '<img src="$1" style="max-width:100%; border-radius:8px; margin:10px 0; display:block;">');
    
    // 2. 識別一般連結 https://...
    const urlPattern = /(https?:\/\/[^\s<]+)/g;
    return html.replace(urlPattern, (url) => {
        // 如果已經被包在 img 標籤內就不處理
        if (url.includes('src="')) return url;
        return `<a href="${url}" target="_blank" style="color:#3498db; text-decoration:underline;">${url}</a>`;
    });
}

// --- 4. 側邊欄與導航 (含自動收回) ---
const toggleMenu = () => document.getElementById("sidebar").classList.toggle("open");
const closeMenu = () => document.getElementById("sidebar").classList.remove("open");

document.getElementById("main-container").addEventListener("click", () => {
    if (window.innerWidth <= 1024) closeMenu();
});

function renderTree(nodes, container) {
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
    view.innerHTML = items.length === 0 ? '<div style="text-align:center; padding:50px; color:#999;">此分類暫無內容。</div>' :
    items.map((item, idx) => `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2 style="margin:0; font-size:1.2em;">${item.name}</h2>
                ${isAdmin ? `<div><button class="btn btn-outline" onclick="startEdit(${idx})">✏</button>
                <button class="btn btn-danger" onclick="deleteItem(${idx})" style="padding:5px; margin-left:5px;">🗑</button></div>` : ''}
            </div>
            <div class="gallery">${(item.imgs || []).map(src => `<img src="${src}" onclick="window.open('${src}')">`).join('')}</div>
            <p style="white-space: pre-wrap; line-height:1.7; margin-top:15px;">${parseContent(item.text)}</p>
        </div>`).join("");
}

// --- 5. 管理功能 ---
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
    document.getElementById("input-file").value = "";
    renderImgManager();
    document.getElementById("btn-save-main").innerText = "💾 儲存並同步雲端";
    document.getElementById("btn-cancel-edit").style.display = "none";
}

function startEdit(idx) {
    editingIdx = idx;
    const item = activeNode.items[idx];
    document.getElementById("edit-title").value = item.name;
    document.getElementById("edit-desc").value = item.text;
    tempImgs = [...(item.imgs || [])];
    renderImgManager();
    document.getElementById("btn-save-main").innerText = "🆙 更新並同步雲端";
    document.getElementById("btn-cancel-edit").style.display = "inline-block";
    document.getElementById("admin-panel").scrollIntoView({ behavior: 'smooth' });
}

async function saveContent() {
    if (!activeNode) return alert("請選取分類");
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

async function addRootCategory() {
    const name = prompt("第一層分類名稱：");
    if (name) { db.categories.push({ name, children: [], items: [] }); renderTree(db.categories, document.getElementById("nav-tree")); await saveToCloud(); }
}
async function addCategory() {
    if (!activeNode) return;
    const name = prompt(`在「${activeNode.name}」下新增子分類：`);
    if (name) { if (!activeNode.children) activeNode.children = []; activeNode.children.push({ name, children: [], items: [] }); renderTree(db.categories, document.getElementById("nav-tree")); await saveToCloud(); }
}
async function deleteCategory() {
    if (!activeNode || !confirm("確定刪除此分類？")) return;
    const remove = (arr) => {
        const idx = arr.findIndex(n => n === activeNode);
        if (idx > -1) { arr.splice(idx, 1); return true; }
        for (let c of arr) if (c.children && remove(c.children)) return true;
        return false;
    };
    remove(db.categories); activeNode = null; await saveToCloud(); location.reload();
}
async function deleteItem(idx) {
    if (confirm("確定刪除？")) { activeNode.items.splice(idx, 1); renderDisplay(activeNode.items); await saveToCloud(); }
}

function smartSearch() {
    const q = document.getElementById("search-bar").value.toLowerCase();
    if (!q) { if (activeNode) renderDisplay(activeNode.items); return; }
    let res = [];
    const search = (nodes) => nodes.forEach(n => {
        if (n.items) n.items.forEach(i => { if (i.name.toLowerCase().includes(q) || i.text.toLowerCase().includes(q)) res.push(i); });
        if (n.children) search(n.children);
    });
    search(db.categories); renderDisplay(res);
}

// --- 6. 圖片處理 ---
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
    zone.innerHTML = tempImgs.map((img, idx) => `<div class="img-slot"><img src="${img}"><button onclick="tempImgs.splice(${idx},1);renderImgManager();" style="position:absolute; top:0; right:0; background:red; color:white; border:none;">×</button></div>`).join("");
}

const openModal = () => { document.getElementById("set-db-name").value = db.config.dbName; document.getElementById("settings-modal").style.display = "flex"; };
const closeModal = () => document.getElementById("settings-modal").style.display = "none";
async function saveSettings() {
    const n = document.getElementById("set-db-name").value.trim();
    const p = document.getElementById("set-new-pw").value.trim();
    if (n) db.config.dbName = n; if (p) db.config.password = p;
    await saveToCloud(); location.reload();
}

// 啟動系統
window.onload = initSystem;
