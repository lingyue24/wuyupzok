// --- 1. 配置與初始化 ---
const API_URL = "https://script.google.com/macros/s/AKfycbwozdRPykXdobo-KhqnvajCBpTNDB2gH4g8MLQ_2RU62BV5-DWVHt4vtUzMe6C56vXbzQ/exec"; 
const STORAGE_KEY = "v6_knowledge_db";

let db = { config: { dbName: "系統初始化..." }, categories: [] };
let activeNode = null;
let tempImgs = [];
let editingIdx = -1;
let isAdmin = false;

// --- 2. 智慧載入邏輯 (並行競爭機制) ---
async function initSystem() {
    const nameDisplay = document.getElementById("db-name-display");
    if(nameDisplay) nameDisplay.innerText = "連線中...";

    const fetchPromise = fetch(API_URL).then(res => res.json());
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));

    try {
        db = await Promise.race([fetchPromise, timeoutPromise]);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        console.log("✅ 雲端同步成功");
    } catch (e) {
        console.warn("⚠️ 雲端超時或失敗，嘗試本地備援");
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData && savedData !== "undefined") {
            db = JSON.parse(savedData);
        } else {
            db = (typeof initialData !== 'undefined') ? initialData : {
                config: { dbName: "新知識庫", password: "1234" },
                categories: []
            };
        }
    }
    renderAfterLoad();
}

function renderAfterLoad() {
    document.getElementById("db-name-display").innerText = db.config.dbName;
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

// --- 3. 圖片處理 (支援檔案與網址) ---
function addImgByUrl() {
    const urlInput = document.getElementById("input-img-url");
    const url = urlInput.value.trim();
    if (url) {
        if (tempImgs.length >= 5) return alert("最多上傳 5 張圖片");
        tempImgs.push(url);
        urlInput.value = ""; // 清空欄位
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

// --- 4. 側邊欄與內容渲染 ---
const toggleMenu = () => document.getElementById("sidebar").classList.toggle("open");
const closeMenu = () => document.getElementById("sidebar").classList.remove("open");

document.getElementById("main-container").addEventListener("click", () => {
    if (window.innerWidth <= 1024) closeMenu();
});

function linkify(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlPattern, '<a href="$1" target="_blank" style="color:#3498db; text-decoration:underline;">$1</a>');
}

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
            <div class="gallery">${(item.imgs || []).map(src => `<img src="${src}" onclick="window.open('${src}')" style="cursor:zoom-in;">`).join('')}</div>
            <p style="white-space: pre-wrap; line-height:1.7; margin-top:15px;">${linkify(item.text)}</p>
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
    } else if (pw !== null) alert("錯誤");
}

function exitAdmin() {
    isAdmin = false; exitEdit();
    document.getElementById("admin-panel").style.display = "none";
    document.getElementById("settings-area").style.display = "none";
    document.getElementById("admin-
