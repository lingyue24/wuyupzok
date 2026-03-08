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

// --- 側邊欄與導航控制 (強化收回邏輯) ---
const toggleMenu = () => {
    const sb = document.getElementById("sidebar");
    sb.classList.toggle("open");
};

const closeMenu = () => {
    document.getElementById("sidebar").classList.remove("open");
};

// 監聽側邊欄點擊事件：如果不是點擊管理按鈕，點擊內部其它地方也收回 (僅限手機版)
document.getElementById("sidebar").addEventListener("click", (e) => {
    if (window.innerWidth <= 1024 && e.target.id !== "admin-toggle") {
        // 稍微延遲收回，讓點擊效果能被看見
        setTimeout(closeMenu, 150);
    }
});

// 管理模式開關
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

// --- 編輯功能 (修正選單消失核心) ---
function exitEdit() {
    editingIdx = -1; 
    tempImgs = [];
    document.getElementById("edit-title").value = "";
    document.getElementById("edit-desc").value = "";
    document.getElementById("input-file").value = "";
    renderImgManager();

    // 恢復 UI 按鈕
    document.getElementById("btn-save-main").innerText = "💾 儲存內容";
    document.getElementById("btn-cancel-edit").style.display = "none";
    
    // 強制重置捲動座標，確保 Header 可見
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
    
    // 捲動至編輯區域
    document.getElementById("admin-panel").scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function saveContent() {
    if (!activeNode) return alert("請先從左側選單選擇分類");
    const name = document.getElementById("edit-title").value.trim();
    const text = document.getElementById("edit-desc").value.trim();
    if (!name) return alert("標題不能為空");

    const newItem = { name, text, imgs: [...tempImgs] };
    if (!activeNode.items) activeNode.items = [];
    
    if (editingIdx > -1) activeNode.items[editingIdx] = newItem;
    else activeNode.items.push(newItem);

    save();
    renderDisplay(activeNode.items);
    exitEdit();
}

// --- 分類樹與內容渲染 ---
function renderTree(nodes, container) {
    container.innerHTML = "";
    nodes.forEach((node) => {
        let title = document.createElement("div");
        title.className = "nav-node";
        title.innerHTML = (node.children?.length > 0 ? "📂 " : "📄 ") + node.name;
        title.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.nav-node').forEach(el => el.classList.remove('active-node'));
            title.classList.add('active-node');
            activeNode = node;
            document.getElementById('current-path').innerText = `📍 目前定位：${node.name}`;
            renderDisplay(node.items || []);
            
            // 點擊節點後立即執行收回
            if (window.innerWidth <= 1024) closeMenu();
        };
        container.appendChild(title);
        if (node.children && node.children.length > 0) {
            let box = document.createElement("div");
            box.className = "child-container";
            renderTree(node.children, box);
            container.appendChild(box);
        }
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
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <h2 style="margin:0; color:var(--primary); font-size:1.2em;">${item.name}</h2>
                ${isAdmin ? `<div><button class="btn btn-outline" onclick="startEdit(${idx})">✏</button>
                <button class="btn btn-danger" onclick="deleteItem(${idx})" style="padding:5px 10px; margin-left:5px;">🗑</button></div>` : ''}
            </div>
            <div class="gallery">${(item.imgs || []).map(src => `<img src="${src}" onclick="window.open('${src}')">`).join('')}</div>
            <p style="white-space: pre-wrap; line-height:1.7; margin-top:15px;">${item.text}</p>
        </div>`).join("");
}

// --- 搜尋功能 ---
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

// --- 管理輔助功能 ---
function addRootCategory() {
    const name = prompt("新增第一層分類名稱：");
    if (name) { db.categories.push({ name, children: [], items: [] }); save(); renderTree(db.categories, document.getElementById("nav-tree")); }
}
function addCategory() {
    if (!activeNode) return alert("請先選擇一個分類");
    const name = prompt(`在「${activeNode.name}」下新增子分類：`);
    if (name) {
        if (!activeNode.children) activeNode.children = [];
        activeNode.children.push({ name, children: [], items: [] });
        save(); renderTree(db.categories, document.getElementById("nav-tree"));
    }
}
function deleteCategory() {
    if (!activeNode || !confirm("確定要刪除此分類及其所有內容嗎？")) return;
    const remove = (arr) => {
        const idx = arr.findIndex(n => n === activeNode);
        if (idx > -1) { arr.splice(idx, 1); return true; }
        for (let c of arr) if (c.children && remove(c.children)) return true;
        return false;
    };
    remove(db.categories); activeNode = null; save(); 
    renderTree(db.categories, document.getElementById("nav-tree"));
    document.getElementById("display-view").innerHTML = "";
}
function renameCategory() {
    if (!activeNode) return;
    const n = prompt("輸入新名稱：", activeNode.name);
    if (n) { activeNode.name = n; save(); renderTree(db.categories, document.getElementById("nav-tree")); }
}
function deleteItem(idx) {
    if (confirm("確定刪除此內容？")) { activeNode.items.splice(idx, 1); save(); renderDisplay(activeNode.items); }
}

// --- 圖片處理 ---
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

// --- 系統設定 ---
const openModal = () => { document.getElementById("set-db-name").value = db.config.dbName; document.getElementById("settings-modal").style.display = "flex"; };
const closeModal = () => document.getElementById("settings-modal").style.display = "none";
function saveSettings() {
    const n = document.getElementById("set-db-name").value.trim();
    const p = document.getElementById("set-new-pw").value.trim();
    if (n) db.config.dbName = n; if (p) db.config.password = p;
    save(); location.reload();
}
function exportDB() {
    const blob = new Blob([JSON.stringify(db)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = db.config.dbName + ".json"; a.click();
}
function importDB(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => { db = JSON.parse(e.target.result); save(); location.reload(); };
        reader.readAsText(file);
    }
}

// 初始化
window.onload = () => {
    const nameDisplay = document.getElementById("db-name-display");
    if(nameDisplay) nameDisplay.innerText = db.config.dbName;
    renderTree(db.categories, document.getElementById("nav-tree"));
};
