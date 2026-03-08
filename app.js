// --- 1. 配置與初始化 ---
const API_URL = "https://script.google.com/macros/s/AKfycbwozdRPykXdobo-KhqnvajCBpTNDB2gH4g8MLQ_2RU62BV5-DWVHt4vtUzMe6C56vXbzQ/exec"; 
const STORAGE_KEY = "v6_knowledge_db";

// 初始結構，防止讀取不到 config 而報錯
let db = { config: { dbName: "載入中...", password: "1234" }, categories: [] };
let activeNode = null;
let tempImgs = [];
let editingIdx = -1;
let isAdmin = false;

// --- 2. 智慧載入邏輯 ---
async function initSystem() {
    const nameDisplay = document.getElementById("db-name-display");
    if(nameDisplay) nameDisplay.innerText = "連線中...";

    // 建立超時機制 (3秒)
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));
    
    try {
        console.log("嘗試從 API 獲取資料...");
        const response = await Promise.race([fetch(API_URL), timeoutPromise]);
        const cloudData = await response.json();
        
        // 嚴格檢查 API 回傳格式
        if (cloudData && cloudData.config && cloudData.categories) {
            db = cloudData;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
            console.log("✅ API 資料載入成功");
        } else {
            throw new Error("API 資料格式不正確");
        }
    } catch (e) {
        console.warn("⚠️ API 載入失敗，切換至備援方案:", e.message);
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData && savedData !== "undefined" && savedData !== null) {
            try {
                db = JSON.parse(savedData);
                console.log("✅ 已載入本地儲存資料");
            } catch(parseErr) {
                useDefaultData();
            }
        } else {
            useDefaultData();
        }
    }
    renderAfterLoad();
}

function useDefaultData() {
    console.log("✅ 使用 data.js 初始預設值");
    db = (typeof initialData !== 'undefined') ? initialData : {
        config: { dbName: "新知識庫", password: "1234" },
        categories: []
    };
}

function renderAfterLoad() {
    if (!db || !db.config) {
        console.error("錯誤：DB 結構損毀");
        return;
    }
    document.getElementById("db-name-display").innerText = db.config.dbName;
    renderTree(db.categories, document.getElementById("nav-tree"));
}

// 雲端同步功能
async function saveToCloud() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    try {
        // 使用 no-cors 模式發送 POST
        await fetch(API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(db)
        });
        console.log("☁️ 雲端同步指令已成功發送");
    } catch (e) {
        console.error("☁️ 同步失敗", e);
    }
}

// --- 3. 圖片處理功能 ---
function addImgByUrl() {
    const urlInput = document.getElementById("input-img-url");
    const url = urlInput.value.trim();
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
        <div class="img-slot">
            <img src="${img}">
            <button onclick="tempImgs.splice(${idx},1);renderImgManager();" style="position:absolute; top:0; right:0; background:red; color:white; border:none; border-radius:50%; cursor:pointer; width:20px; height:20px;">×</button>
        </div>`).join("");
}

// --- 4. 側邊欄與手機選單控制 ---
function toggleMenu() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.toggle("open");
}

function closeMenu() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.remove("open");
}

// 監聽點擊主區域自動收回選單
document.getElementById("main-container").addEventListener("click", () => {
    if (window.innerWidth <= 1024) closeMenu();
});

function linkify(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlPattern, '<a href="$1" target="_blank" style="color:#3498db; text-decoration:underline;">$1</a>');
}

function renderTree(nodes, container) {
    if (!container) return;
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
            if (hasChildren) {
                childBox.style.display = childBox.style.display === "block" ? "none" : "block";
            } else {
                if (window.innerWidth <= 1024) setTimeout(closeMenu, 150);
            }
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
    if (!view) return;
    view.innerHTML = items.length === 0 ? '<div style="text-align:center; padding:50px; color:#999;">此分類暫無內容。</div>' :
    items.map((item, idx) => `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2 style="margin:0; font-size:1.2em;">${item.name}</h2>
                ${isAdmin ? `<div><button class="btn btn-outline" onclick="startEdit(${idx})">✏</button>
                <button class="btn btn-danger" onclick="deleteItem(${idx})" style="padding:5px; margin-left:5px;">🗑</button></div>` : ''}
            </div>
            <div class="gallery">${(item.imgs || []).map(src => `<img src="${src}" onclick="window.open('${src}')" style="cursor:zoom-in;">`).join('')}</div>
            <p style="white-space: pre-wrap; line-height:1.7; margin-top:15px;">${linkify(item.text)}</p>
        </div>`).join("");
}

// --- 5. 管理模式與編輯功能 ---
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
    if(document.getElementById("input-img-url")) document.getElementById("input-img-url").value = "";
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
    const name = prompt("新增總分類名稱：");
    if (name) { 
        db.categories.push({ name, children: [], items: [] }); 
        renderTree(db.categories, document.getElementById("nav-tree")); 
        await saveToCloud(); 
    }
}

async function addCategory() {
    if (!activeNode) return alert("請先點選左側分類再新增子類");
    const name = prompt(`在「${activeNode.name}」下新增子分類：`);
    if (name) { 
        if (!activeNode.children) activeNode.children = []; 
        activeNode.children.push({ name, children: [], items: [] }); 
        renderTree(db.categories, document.getElementById("nav-tree")); 
        await saveToCloud(); 
    }
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
    if (confirm("確定刪除此內容？")) { 
        activeNode.items.splice(idx, 1); 
        renderDisplay(activeNode.items); 
        await saveToCloud(); 
    }
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

// --- 6. 進階設定 ---
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

// 系統啟動
window.onload = initSystem;
