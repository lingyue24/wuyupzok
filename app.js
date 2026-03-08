const API_URL = "https://script.google.com/macros/s/AKfycbx_agjqCX1ipJybebKTVgx6V_S_Xxhh733fnioxkAFo-2bJAW32abD2uTkghh-q1cbM/exec"; 
const STORAGE_KEY = "v6_knowledge_db";

let db = { config: { dbName: "載入中...", password: "1234" }, categories: [] };
let activeNode = null;
let tempImgs = [];
let editingIdx = -1;
let isAdmin = false;

// --- 初始化 ---
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
        }
    } catch (e) {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) db = JSON.parse(savedData);
    }
    renderAfterLoad();
}

function renderAfterLoad() {
    if(document.getElementById("db-name-display")) document.getElementById("db-name-display").innerText = db.config.dbName;
    renderTree(db.categories, document.getElementById("nav-tree"));
}

// --- 搜尋功能 ---
function smartSearch() {
    const q = document.getElementById("search-bar").value.toLowerCase();
    const displayView = document.getElementById("display-view");
    
    if (!q) {
        if (activeNode) renderDisplay(activeNode.items);
        else displayView.innerHTML = '<div style="text-align:center; padding:50px; color:#999;">請選擇分類或搜尋</div>';
        return;
    }

    let results = [];
    const searchDeep = (nodes) => {
        nodes.forEach(n => {
            if (n.items) {
                n.items.forEach(item => {
                    if (item.name.toLowerCase().includes(q) || item.text.toLowerCase().includes(q)) {
                        results.push(item);
                    }
                });
            }
            if (n.children) searchDeep(n.children);
        });
    };
    searchDeep(db.categories);
    renderDisplay(results, true);
}

// --- 內容渲染 ---
function renderDisplay(items, isSearch = false) {
    const view = document.getElementById("display-view");
    if(!view) return;
    view.innerHTML = items.length === 0 ? '<div style="text-align:center; padding:50px; color:#999;">無內容</div>' :
    items.map((item, idx) => `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2 style="margin:0;">${item.name}</h2>
                ${isAdmin && !isSearch ? `<div>
                    <button class="btn btn-outline" onclick="startEdit(${idx})">✏</button>
                    <button class="btn btn-danger" onclick="deleteItem(${idx})" style="margin-left:5px;">🗑</button>
                </div>` : ''}
            </div>
            <div class="gallery">${(item.imgs || []).map(src => `<img src="${src}" onclick="window.open('${src}')">`).join('')}</div>
            <p style="white-space: pre-wrap; line-height:1.6; margin-top:15px;">${item.text}</p>
        </div>`).join("");
}

// --- 選單控制 ---
function toggleMenu(e) {
    if(e) e.stopPropagation();
    document.getElementById("sidebar").classList.toggle("open");
}

function closeMenu() {
    document.getElementById("sidebar").classList.remove("open");
}

function renderTree(nodes, container) {
    if(!container) return;
    container.innerHTML = "";
    nodes.forEach((node) => {
        const hasChildren = node.children && node.children.length > 0;
        let nodeWrapper = document.createElement("div");
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
            if (hasChildren) {
                childBox.style.display = childBox.style.display === "block" ? "none" : "block";
            } else {
                if (window.innerWidth <= 1024) closeMenu();
            }
            activeNode = node;
            document.getElementById("search-bar").value = "";
            if(document.getElementById('current-path')) document.getElementById('current-path').innerText = `📍 定位：${node.name}`;
            renderDisplay(node.items || []);
        };
        nodeWrapper.appendChild(titleLine);
        if (hasChildren) { renderTree(node.children, childBox); nodeWrapper.appendChild(childBox); }
        container.appendChild(nodeWrapper);
    });
}

// --- 管理模式 ---
function toggleAdmin() {
    if (isAdmin) {
        isAdmin = false;
        document.getElementById("admin-panel").style.display = "none";
        document.getElementById("settings-area").style.display = "none";
        document.getElementById("admin-toggle").innerText = "🔐 管理模式";
    } else {
        const pw = prompt("請輸入密碼:");
        if (pw === db.config.password) {
            isAdmin = true;
            document.getElementById("admin-panel").style.display = "block";
            document.getElementById("settings-area").style.display = "block";
            document.getElementById("admin-toggle").innerText = "🔓 退出管理";
        }
    }
    if(activeNode) renderDisplay(activeNode.items);
}

// --- 備份功能 ---
function exportDB() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `backup_${new Date().getTime()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
}

function importDB(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            db = JSON.parse(e.target.result);
            await saveToCloud();
            location.reload();
        } catch (err) { alert("匯入失敗"); }
    };
    reader.readAsText(file);
}

// --- 資料儲存 ---
async function saveToCloud() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    try {
        await fetch(API_URL, { method: "POST", body: JSON.stringify(db) });
    } catch (e) { console.error("雲端同步失敗"); }
}

async function saveContent() {
    if (!activeNode) return alert("請先選分類");
    const name = document.getElementById("edit-title").value;
    const text = document.getElementById("edit-desc").value;
    const item = { name, text, imgs: [...tempImgs] };
    if (editingIdx > -1) activeNode.items[editingIdx] = item;
    else activeNode.items.push(item);
    renderDisplay(activeNode.items);
    await saveToCloud();
    exitEdit();
}

function deleteItem(idx) {
    if (confirm("確定刪除此條目？")) {
        activeNode.items.splice(idx, 1);
        renderDisplay(activeNode.items);
        saveToCloud();
    }
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

function exitEdit() {
    editingIdx = -1; tempImgs = [];
    document.getElementById("edit-title").value = "";
    document.getElementById("edit-desc").value = "";
    renderImgManager();
    document.getElementById("btn-save-main").innerText = "💾 儲存內容";
}

function addImgByUrl() {
    const url = document.getElementById("input-img-url").value;
    if(url) { tempImgs.push(url); renderImgManager(); document.getElementById("input-img-url").value=""; }
}

function renderImgManager() {
    const zone = document.getElementById("img-manager-zone");
    zone.innerHTML = tempImgs.map((img, i) => `
        <div class="img-slot">
            <img src="${img}">
            <button onclick="tempImgs.splice(${i},1);renderImgManager();">×</button>
        </div>`).join("");
}

// --- 分類操作 ---
async function addRootCategory() {
    const name = prompt("名稱:");
    if(name) { db.categories.push({name, children:[], items:[]}); renderAfterLoad(); await saveToCloud(); }
}
async function addCategory() {
    if(!activeNode) return;
    const name = prompt("子分類名稱:");
    if(name) { if(!activeNode.children) activeNode.children=[]; activeNode.children.push({name, children:[], items:[]}); renderAfterLoad(); await saveToCloud(); }
}

const openModal = () => document.getElementById("settings-modal").style.display = "flex";
const closeModal = () => document.getElementById("settings-modal").style.display = "none";

async function saveSettings() {
    db.config.dbName = document.getElementById("set-db-name").value;
    const newPw = document.getElementById("set-new-pw").value;
    if(newPw) db.config.password = newPw;
    await saveToCloud();
    location.reload();
}

window.onload = initSystem;
