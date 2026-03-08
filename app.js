// --- 資料核心 ---
let db = JSON.parse(localStorage.getItem("v6_knowledge_db")) || (typeof initialData !== 'undefined' ? initialData : {
    config: { dbName: "知識管理系統", password: "1234" },
    categories: []
});

let activeNode = null;
let tempImgs = [];
let editingIdx = -1;
let isAdmin = false;

const save = () => localStorage.setItem("v6_knowledge_db", JSON.stringify(db));

// --- 側邊欄與導航控制 ---
const toggleMenu = () => {
    document.getElementById("sidebar").classList.toggle("open");
};

const closeMenu = () => {
    document.getElementById("sidebar").classList.remove("open");
};

// 監聽側邊欄外部點擊收回
document.getElementById("sidebar").addEventListener("click", (e) => {
    // 如果點擊的是分類名稱以外的地方（如背景），則收回選單
    if (window.innerWidth <= 1024 && e.target.id === "sidebar") {
        closeMenu();
    }
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

// --- 編輯與網址轉換功能 ---
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
    document.getElementById("btn-save-main").innerText = "💾 儲存內容";
    document.getElementById("btn-cancel-edit").style.display = "none";
    
    setTimeout(() => {
        const contentArea = document.getElementById("content");
        if(contentArea) contentArea.scrollTop = 0;
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, 100);
}

function startEdit(idx) {
    editingIdx = idx;
    const item = activeNode.items[idx];
    document.getElementById("edit-title").value = item.name;
    document.getElementById("edit-desc").value = item.text;
    tempImgs = [...(item.imgs || [])];
    renderImgManager();
    document.getElementById("btn-save-main").innerText = "🆙 更新內容";
    document.getElementById("btn-cancel-edit").style.display = "inline-block";
    document.getElementById("admin-panel").scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function saveContent() {
    if (!activeNode) return alert("請先選取分類");
    const name = document.getElementById("edit-title").value.trim();
    const text = document.getElementById("edit-desc").value.trim();
    if (!name) return alert("標題必填");

    const newItem = { name, text, imgs: [...tempImgs] };
    if (!activeNode.items) activeNode.items = [];
    if (editingIdx > -1) activeNode.items[editingIdx] = newItem;
    else activeNode.items.push(newItem);

    save();
    renderDisplay(activeNode.items);
    exitEdit();
}

// --- 核心修正：分類樹摺疊渲染 ---
function renderTree(nodes, container, level = 0) {
    container.innerHTML = "";
    nodes.forEach((node) => {
        const hasChildren = node.children && node.children.length > 0;
        
        // 建立分類節點外殼
        let nodeWrapper = document.createElement("div");
        nodeWrapper.className = "nav-node-wrapper";
        
        // 建立標題列
        let titleLine = document.createElement("div");
        titleLine.className = "nav-node";
        // 如果有子分類，顯示展開/收合圖示
        const icon = hasChildren ? "📂 " : "📄 ";
        titleLine.innerHTML = `<span>${icon}${node.name}</span>`;
        
        // 子分類容器
        let childBox = document.createElement("div");
        childBox.className = "child-container";
        childBox.style.display = "none"; // 預設收合
        
        // 點擊事件邏輯
        titleLine.onclick = (e) => {
            e.stopPropagation();
            
            // 1. 切換啟動樣式
            document.querySelectorAll('.nav-node').forEach(el => el.classList.remove('active-node'));
            titleLine.classList.add('active-node');
            
            // 2. 切換摺疊狀態
            if (hasChildren) {
                const isExpanded = childBox.style.display === "block";
                childBox.style.display = isExpanded ? "none" : "block";
                titleLine.querySelector('span').innerText = (isExpanded ? "📂 " : "📂 ") + node.name;
            }
            
            // 3. 載入內容
            activeNode = node;
            document.getElementById('current-path').innerText = `📍 定位：${node.name}`;
            renderDisplay(node.items || []);
            
            // 4. 如果是最終層級（無子分類），在手機端點擊後自動收回側邊欄
            if (!hasChildren && window.innerWidth <= 1024) {
                setTimeout(closeMenu, 200);
            }
        };
        
        nodeWrapper.appendChild(titleLine);
        
        if (hasChildren) {
            renderTree(node.children, childBox, level + 1);
            nodeWrapper.appendChild(childBox);
        }
        
        container.appendChild(nodeWrapper);
    });
}

function renderDisplay(items) {
    const view = document.getElementById("display-view");
    if (items.length === 0) {
        view.innerHTML = '<div style="text-align:center; padding:50px; color:#999;">此分類暫無內容。</div>';
        return;
    }
    view.innerHTML = items.map((item, idx) => `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2 style="margin:0; font-size:1.2em;">${item.name}</h2>
                ${isAdmin ? `<div><button class="btn btn-outline" onclick="startEdit(${idx})">✏</button>
                <button class="btn btn-danger" onclick="deleteItem(${idx})" style="padding:5px 10px; margin-left:5px;">🗑</button></div>` : ''}
            </div>
            <div class="gallery">${(item.imgs || []).map(src => `<img src="${src}" onclick="window.open('${src}')">`).join('')}</div>
            <p style="white-space: pre-wrap; line-height:1.7; margin-top:15px;">${linkify(item.text)}</p>
        </div>`).join("");
}

// --- 其他管理功能 ---
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

function addRootCategory() {
    const name = prompt("第一層分類名稱：");
    if (name) { db.categories.push({ name, children: [], items: [] }); save(); renderTree(db.categories, document.getElementById("nav-tree")); }
}
function addCategory() {
    if (!activeNode) return alert("請選取分類");
    const name = prompt(`在「${activeNode.name}」下新增子分類：`);
    if (name) {
        if (!activeNode.children) activeNode.children = [];
        activeNode.children.push({ name, children: [], items: [] });
        save(); renderTree(db.categories, document.getElementById("nav-tree"));
    }
}
function deleteCategory() {
    if (!activeNode || !confirm("刪除此分類？")) return;
    const remove = (arr) => {
        const idx = arr.findIndex(n => n === activeNode);
        if (idx > -1) { arr.splice(idx, 1); return true; }
        for (let c of arr) if (c.children && remove(c.children)) return true;
        return false;
    };
    remove(db.categories); activeNode = null; save(); renderTree(db.categories, document.getElementById("nav-tree"));
    document.getElementById("display-view").innerHTML = "";
}
function renameCategory() {
    if (!activeNode) return;
    const n = prompt("新名稱：", activeNode.name);
    if (n) { activeNode.name = n; save(); renderTree(db.categories, document.getElementById("nav-tree")); }
}
function deleteItem(idx) {
    if (confirm("刪除內容？")) { activeNode.items.splice(idx, 1); save(); renderDisplay(activeNode.items); }
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
        <div class="img-slot"><img src="${img}"><button onclick="tempImgs.splice(${idx},1);renderImgManager();" style="position:absolute; top:0; right:0; background:red; color:white; border:none; cursor:pointer;">×</button></div>`).join("");
}
const openModal = () => { document.getElementById("set-db-name").value = db.config.dbName; document.getElementById("settings-modal").style.display = "flex"; };
const closeModal = () => document.getElementById("settings-modal").style.display = "none";
function saveSettings() {
    const n = document.getElementById("set-db-name").value.trim();
    const p = document.getElementById("set-new-pw").value.trim();
    if (n) db.config.dbName = n; if (p) db.config.password = p;
    save(); location.reload();
}
function exportDB() {
    const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    a.download = db.config.dbName + ".json"; a.click();
}
function importDB(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => { db = JSON.parse(e.target.result); save(); location.reload(); };
        reader.readAsText(file);
    }
}

window.onload = () => {
    const nameDisplay = document.getElementById("db-name-display");
    if(nameDisplay) nameDisplay.innerText = db.config.dbName;
    renderTree(db.categories, document.getElementById("nav-tree"));
};
