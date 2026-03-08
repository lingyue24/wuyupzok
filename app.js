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
        console.warn("⚠️ 嘗試本地備援");
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) db = JSON.parse(savedData);
    }
    renderAfterLoad();
    // 綁定搜尋事件
    const searchBar = document.getElementById("search-bar");
    if(searchBar) searchBar.addEventListener("input", smartSearch);
}

function renderAfterLoad() {
    const display = document.getElementById("db-name-display");
    if(display) display.innerText = db.config.dbName || "知識庫";
    renderTree(db.categories, document.getElementById("nav-tree"));
}

// --- 3. 搜尋功能 (全面修正) ---
function smartSearch() {
    const query = document.getElementById("search-bar").value.trim().toLowerCase();
    const displayView = document.getElementById("display-view");
    
    // 如果搜尋框為空，恢復顯示當前選取的分類內容
    if (!query) {
        if (activeNode) renderDisplay(activeNode.items);
        else displayView.innerHTML = '<div style="text-align:center; padding:50px; color:#999;">請從左側選擇分類或輸入關鍵字搜尋</div>';
        return;
    }

    let results = [];
    // 遞迴搜尋所有分類中的 items
    const performSearch = (cats) => {
        cats.forEach(cat => {
            if (cat.items) {
                cat.items.forEach(item => {
                    if (item.name.toLowerCase().includes(query) || item.text.toLowerCase().includes(query)) {
                        results.push(item);
                    }
                });
            }
            if (cat.children && cat.children.length > 0) {
                performSearch(cat.children);
            }
        });
    };

    performSearch(db.categories);
    
    // 渲染搜尋結果
    if (results.length === 0) {
        displayView.innerHTML = `<div style="text-align:center; padding:50px; color:#999;">找不到與「${query}」相關的內容</div>`;
    } else {
        renderDisplay(results, true); // 傳入 true 表示這是搜尋結果，隱藏編輯按鈕避免路徑混亂
    }
}

// --- 4. 介面渲染 ---
function renderDisplay(items, isSearchResult = false) {
    const view = document.getElementById("display-view");
    if(!view) return;
    
    view.innerHTML = items.map((item, idx) => `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2 style="margin:0; font-size:1.2em; color:var(--primary);">${item.name}</h2>
                ${isAdmin && !isSearchResult ? `
                    <div>
                        <button class="btn btn-outline" onclick="startEdit(${idx})">✏</button>
                        <button class="btn btn-danger" onclick="deleteItem(${idx})" style="padding:5px; margin-left:5px;">🗑</button>
                    </div>
                ` : ''}
            </div>
            <div class="gallery" style="margin-top:10px;">
                ${(item.imgs || []).map(src => `<img src="${src}" onclick="window.open('${src}')" style="max-width:120px; border-radius:5px; cursor:zoom-in; margin-right:5px;">`).join('')}
            </div>
            <p style="white-space: pre-wrap; line-height:1.7; margin-top:15px; color:#444;">${linkify(item.text)}</p>
            ${isSearchResult ? `<small style="color:var(--accent);">來自搜尋結果</small>` : ''}
        </div>`).join("");
}

function linkify(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlPattern, '<a href="$1" target="_blank" style="color:#3498db; text-decoration:underline;">$1</a>');
}

// --- 5. 選單與導覽 ---
function toggleMenu(e) {
    if(e) e.stopPropagation();
    const sb = document.getElementById("sidebar");
    sb.classList.toggle("open");
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
            // 切換分類時清空搜尋框
            document.getElementById("search-bar").value = "";
            if(document.getElementById('current-path')) document.getElementById('current-path').innerText = `📍 定位：${node.name}`;
            renderDisplay(node.items || []);
        };
        nodeWrapper.appendChild(titleLine);
        if (hasChildren) { renderTree(node.children, childBox); nodeWrapper.appendChild(childBox); }
        container.appendChild(nodeWrapper);
    });
}

// --- 6. 管理功能 ---
function toggleAdmin() {
    if (isAdmin) {
        isAdmin = false;
        document.getElementById("admin-panel").style.display = "none";
        document.getElementById("settings-area").style.display = "none";
        document.getElementById("admin-toggle").innerText = "🔐 管理模式";
    } else {
        const pw = prompt("請輸入管理密碼:");
        if (pw === db.config.password) {
            isAdmin = true;
            document.getElementById("admin-panel").style.display = "block";
            document.getElementById("settings-area").style.display = "block";
            document.getElementById("admin-toggle").innerText = "🔓 退出管理";
        } else if (pw !== null) alert("密碼錯誤");
    }
    if(activeNode) renderDisplay(activeNode.items);
}

// --- 7. 備份匯出與匯入 (確保存在) ---
function exportDB() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `Backup_${new Date().toLocaleDateString()}.json`);
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
            const imported = JSON.parse(e.target.result);
            if (confirm("確定要匯入並覆蓋現有雲端資料嗎？")) {
                db = imported;
                await saveToCloud();
                location.reload();
            }
        } catch (err) { alert("檔案格式錯誤"); }
    };
    reader.readAsText(file);
}

// --- 8. 資料操作與同步 ---
async function saveToCloud() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    try {
        await fetch(API_URL, { method: "POST", body: JSON.stringify(db) });
        console.log("☁️ 同步至雲端");
    } catch (e) { console.error("同步失敗", e); }
}

async function saveContent() {
    if (!activeNode) return alert("請先選取分類");
    const title = document.getElementById("edit-title").value.trim();
    const desc = document.getElementById("edit-desc").value.trim();
    if (!title) return alert("請輸入標題");

    const newItem = { name: title, text: desc, imgs: [...tempImgs] };
    if (!activeNode.items) activeNode.items = [];

    if (editingIdx > -1) activeNode.items[editingIdx] = newItem;
    else activeNode.items.push(newItem);

    renderDisplay(activeNode.items);
    await saveToCloud();
    exitEdit();
}

function startEdit(idx) {
    editingIdx = idx;
    const item = activeNode.items[idx];
    document.getElementById("edit-title").value = item.name;
    document.getElementById("edit-desc").value = item.text;
    tempImgs = [...(item.imgs || [])];
    renderImgManager();
    document.getElementById("btn-save-main").innerText = "🆙 更新內容";
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
    if(!zone) return;
    zone.innerHTML = tempImgs.map((img, i) => `
        <div class="img-slot">
            <img src="${img}">
            <button onclick="tempImgs.splice(${i},1);renderImgManager();">×</button>
        </div>`).join("");
}

// 分類管理
async function addRootCategory() {
    const n = prompt("總分類名稱:");
    if(n) { db.categories.push({name:n, children:[], items:[]}); renderAfterLoad(); await saveToCloud(); }
}
async function addCategory() {
    if(!activeNode) return alert("請先選取父分類");
    const n = prompt(`在 ${activeNode.name} 下新增子分類:`);
    if(n) { if(!activeNode.children) activeNode.children=[]; activeNode.children.push({name:n, children:[], items:[]}); renderAfterLoad(); await saveToCloud(); }
}
async function deleteCategory() {
    if(!activeNode || !confirm("確定刪除此分類及所有內容？")) return;
    const remove = (list) => {
        const i = list.findIndex(x => x === activeNode);
        if(i > -1) { list.splice(i,1); return true; }
        return list.some(x => x.children && remove(x.children));
    }
    remove(db.categories);
    activeNode = null;
    renderAfterLoad();
    await saveToCloud();
}

// 設定
const openModal = () => {
    document.getElementById("set-db-name").value = db.config.dbName;
    document.getElementById("settings-modal").style.display = "flex";
};
const closeModal = () => document.getElementById("settings-modal").style.display = "none";
async function saveSettings() {
    db.config.dbName = document.getElementById("set-db-name").value;
    const newPw = document.getElementById("set-new-pw").value;
    if(newPw) db.config.password = newPw;
    await saveToCloud();
    location.reload();
}

window.onload = initSystem;
