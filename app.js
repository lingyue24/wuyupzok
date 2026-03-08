// --- 1. 配置與初始化 (請替換下方 URL) ---
const API_URL = "https://script.google.com/macros/s/AKfycbwozdRPykXdobo-KhqnvajCBpTNDB2gH4g8MLQ_2RU62BV5-DWVHt4vtUzMe6C56vXbzQ/exec"; 
const STORAGE_KEY = "v6_knowledge_db";

let db = { config: { dbName: "雲端載入中..." }, categories: [] };
let activeNode = null;
let tempImgs = [];
let editingIdx = -1;
let isAdmin = false;

// --- 2. 雲端同步核心功能 ---

// 從 Google Sheets 讀取資料
async function loadFromCloud() {
    try {
        const response = await fetch(API_URL);
        const cloudData = await response.json();
        if (cloudData && cloudData.categories) {
            db = cloudData;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); // 備份到本地
            renderAfterLoad();
            console.log("雲端資料同步完成");
        }
    } catch (e) {
        console.error("雲端讀取失敗，嘗試讀取本地快取", e);
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
            db = JSON.parse(local);
            renderAfterLoad();
        }
    }
}

// 寫入資料到 Google Sheets
async function saveToCloud() {
    try {
        // 先存本地，確保萬一網路斷線資料還在
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        
        await fetch(API_URL, {
            method: "POST",
            mode: "no-cors", // GAS 跨域安全性限制
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(db)
        });
        console.log("資料已指令發送至雲端");
    } catch (e) {
        console.error("雲端儲存失敗", e);
    }
}

function renderAfterLoad() {
    document.getElementById("db-name-display").innerText = db.config.dbName;
    renderTree(db.categories, document.getElementById("nav-tree"));
}

// --- 3. UI 與 編輯功能 (承襲 V6.9.6) ---

const toggleMenu = () => document.getElementById("sidebar").classList.toggle("open");
const closeMenu = () => document.getElementById("sidebar").classList.remove("open");

document.getElementById("sidebar").addEventListener("click", (e) => {
    if (window.innerWidth <= 1024 && e.target.id === "sidebar") closeMenu();
});

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

function linkify(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlPattern, '<a href="$1" target="_blank" style="color:#3498db; text-decoration:underline;">$1</a>');
}

function exitEdit() {
    editingIdx = -1; 
    tempImgs = [];
    document.getElementById("edit-title").value = "";
    document.getElementById("edit-desc").value = "";
    document.getElementById("input-file").value = "";
    renderImgManager();
    document.getElementById("btn-save-main").innerText = "💾 儲存並同步雲端";
    document.getElementById("btn-cancel-edit").style.display = "none";
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    await saveToCloud(); // 呼叫同步
    exitEdit();
}

// --- 4. 樹狀選單渲染 (支援摺疊) ---
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
            activeNode = node;
            document.getElementById('current-path').innerText = `📍 定位：${node.name}`;
            renderDisplay(node.items || []);
            if (!hasChildren && window.innerWidth <= 1024) setTimeout(closeMenu, 200);
        };
        
        nodeWrapper.appendChild(titleLine);
        if (hasChildren) {
            renderTree(node.children, childBox);
            nodeWrapper.appendChild(childBox);
        }
        container.appendChild(nodeWrapper);
    });
}

function renderDisplay(items) {
    const view = document.getElementById("display-view");
    view.innerHTML = items.length === 0 ? '<div style="text-align:center; padding:50px; color:#999;">此分類暫無內容。</div>' :
    items.map((item, idx) => `
        <div class="card">
            <div style="display:flex; justify-content:space-between;">
                <h2 style="margin:0;">${item.name}</h2>
                ${isAdmin ? `<div><button class="btn btn-outline" onclick="startEdit(${idx})">✏</button>
                <button class="btn btn-danger" onclick="deleteItem(${idx})" style="padding:5px; margin-left:5px;">🗑</button></div>` : ''}
            </div>
            <div class="gallery">${(item.imgs || []).map(src => `<img src="${src}" onclick="window.open('${src}')">`).join('')}</div>
            <p style="white-space: pre-wrap; margin-top:15px;">${linkify(item.text)}</p>
        </div>`).join("");
}

// --- 5. 管理輔助 (皆須呼叫 saveToCloud) ---
async function addRootCategory() {
    const name = prompt("名稱：");
    if (name) { db.categories.push({ name, children: [], items: [] }); renderTree(db.categories, document.getElementById("nav-tree")); await saveToCloud(); }
}
async function addCategory() {
    if (!activeNode) return;
    const name = prompt("子分類名稱：");
    if (name) { if (!activeNode.children) activeNode.children = []; activeNode.children.push({ name, children: [], items: [] }); renderTree(db.categories, document.getElementById("nav-tree")); await saveToCloud(); }
}
async function deleteCategory() {
    if (!activeNode || !confirm("確定刪除？")) return;
    const remove = (arr) => {
        const idx = arr.findIndex(n => n === activeNode);
        if (idx > -1) { arr.splice(idx, 1); return true; }
        for (let c of arr) if (c.children && remove(c.children)) return true;
        return false;
    };
    remove(db.categories); activeNode = null; await saveToCloud(); location.reload();
}
async function deleteItem(idx) {
    if (confirm("刪除？")) { activeNode.items.splice(idx, 1); renderDisplay(activeNode.items); await saveToCloud(); }
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

// --- 6. 圖片與設定 ---
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

// 初始化：啟動雲端同步
window.onload = () => {
    loadFromCloud();
};
