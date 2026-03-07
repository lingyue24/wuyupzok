let db = JSON.parse(localStorage.getItem("v6_knowledge_db")) || {
    config: { dbName: "我的行動知識庫", password: "1234" },
    categories: [{ name: "💊 產品百科", children: [], items: [] }]
};

let activeNode = null;
let tempImgs = [];
let editingIdx = -1;
let isAdmin = false;

function save() { localStorage.setItem("v6_knowledge_db", JSON.stringify(db)); }

function updateUIConfigs() {
    const display = document.getElementById("db-name-display");
    if (display) {
        display.innerText = db.config.dbName;
        document.title = db.config.dbName;
    }
}

// 側邊欄切換與自動關閉邏輯
function toggleMobileMenu() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.toggle("open");
}

// --- 圖片處理 ---
function addLocalImg(input) {
    if (tempImgs.length >= 5) return alert("最多5張圖片");
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => { tempImgs.push(e.target.result); renderImgManager(); };
        reader.readAsDataURL(file);
    }
    input.value = "";
}

function addUrlImg() {
    const url = document.getElementById("input-url").value.trim();
    if (url) { tempImgs.push(url); renderImgManager(); document.getElementById("input-url").value = ""; }
}

function renderImgManager() {
    document.getElementById("img-manager-zone").innerHTML = tempImgs.map((img, idx) => `
        <div class="img-slot" style="position:relative; display:inline-block; margin:5px;">
            <img src="${img}" style="width:60px; height:60px; object-fit:cover; border-radius:4px;">
            <button onclick="tempImgs.splice(${idx},1);renderImgManager();" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer;">×</button>
        </div>
    `).join("");
}

// --- 樹狀選單與內容顯示 ---
function renderTree(nodes, container) {
    container.innerHTML = "";
    nodes.forEach((node) => {
        let wrapper = document.createElement("div");
        let title = document.createElement("div");
        title.className = "nav-node";
        title.innerHTML = (node.children && node.children.length > 0 ? "📂 " : "📄 ") + node.name;
        
        let childrenBox = document.createElement("div");
        childrenBox.className = "child-container";
        childrenBox.style.display = "none";
        childrenBox.style.marginLeft = "15px";

        title.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.nav-node').forEach(el => el.classList.remove('active-node'));
            title.classList.add('active-node');
            activeNode = node;
            document.getElementById('current-path').innerHTML = `📍 <strong>${node.name}</strong>`;
            
            if (node.children && node.children.length > 0) {
                childrenBox.style.display = childrenBox.style.display === "none" ? "block" : "none";
            } else {
                renderDisplay(node.items || []);
                // 手機版自動收合
                if (window.innerWidth <= 1024) toggleMobileMenu();
            }
        };

        wrapper.appendChild(title);
        if (node.children) { renderTree(node.children, childrenBox); wrapper.appendChild(childrenBox); }
        container.appendChild(wrapper);
    });
}

function renderDisplay(items) {
    const view = document.getElementById("display-view");
    if (!items || items.length === 0) {
        view.innerHTML = '<div style="text-align:center; padding:50px; color:#999;">目前無內容。</div>';
        return;
    }
    view.innerHTML = items.map((item, idx) => `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2 style="margin:0;">${item.name}</h2>
                ${isAdmin ? `<button onclick="startEdit(${idx})" class="btn btn-outline" style="padding:5px 10px;">✏ 編輯</button>` : ''}
            </div>
            <div class="gallery">
                ${(item.imgs || []).map(src => `<img class="gallery-img" src="${src}" onclick="window.open('${src}')">`).join('')}
            </div>
            <p style="white-space: pre-wrap; line-height:1.6; font-size:16px;">${item.text}</p>
        </div>
    `).join("");
}

// --- 管理功能 ---
function toggleAdmin() {
    const pw = prompt("管理密碼:");
    if (pw === db.config.password) {
        isAdmin = true;
        document.getElementById("admin-panel").style.display = "block";
        document.getElementById("btn-settings").style.display = "block";
        document.getElementById("admin-toggle").innerText = "✅ 管理中";
        if (activeNode) renderDisplay(activeNode.items);
    }
}

function saveContent() {
    if (!activeNode) return alert("請選路徑");
    const name = document.getElementById("edit-title").value.trim();
    const text = document.getElementById("edit-desc").value.trim();
    if (!name) return alert("填寫標題");

    if (!activeNode.items) activeNode.items = [];
    const data = { name, text, imgs: [...tempImgs] };

    if (editingIdx > -1) activeNode.items[editingIdx] = data;
    else activeNode.items.push(data);

    save(); renderDisplay(activeNode.items); exitEdit();
}

function startEdit(idx) {
    editingIdx = idx;
    const item = activeNode.items[idx];
    document.getElementById("edit-title").value = item.name;
    document.getElementById("edit-desc").value = item.text;
    tempImgs = [...(item.imgs || [])];
    renderImgManager();
    document.getElementById("btn-save-main").innerText = "🆙 更新";
    document.getElementById("btn-cancel-edit").style.display = "inline-block";
}

function exitEdit() {
    editingIdx = -1; tempImgs = [];
    document.getElementById("edit-title").value = "";
    document.getElementById("edit-desc").value = "";
    renderImgManager();
    document.getElementById("btn-save-main").innerText = "💾 儲存";
    document.getElementById("btn-cancel-edit").style.display = "none";
}

// --- 分類管理與設定 ---
function addCategory() {
    if (!activeNode) return;
    const n = prompt("新分類名稱:");
    if (n) { 
        if (!activeNode.children) activeNode.children = [];
        activeNode.children.push({ name: n, children: [], items: [] });
        save(); renderTree(db.categories, document.getElementById("nav-tree"));
    }
}

function deleteCategory() {
    if (!activeNode || !confirm("確定刪除？")) return;
    const remove = (arr) => {
        const i = arr.findIndex(n => n === activeNode);
        if (i > -1) { arr.splice(i, 1); return true; }
        for (let c of arr) if (c.children && remove(c.children)) return true;
        return false;
    };
    remove(db.categories); activeNode = null; save();
    renderTree(db.categories, document.getElementById("nav-tree"));
}

function openModal() { document.getElementById("settings-modal").style.display = "flex"; }
function closeModal() { document.getElementById("settings-modal").style.display = "none"; }

function saveSettings() {
    const n = document.getElementById("set-db-name").value;
    const p = document.getElementById("set-new-pw").value;
    if (n) db.config.dbName = n;
    if (p) db.config.password = p;
    save(); updateUIConfigs(); closeModal();
}

function exportDB() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(db)], {type:"application/json"}));
    a.download = "backup.json"; a.click();
}

function importDB(input) {
    const f = input.files[0];
    if (f) {
        const r = new FileReader();
        r.onload = (e) => { db = JSON.parse(e.target.result); save(); location.reload(); };
        r.readAsText(f);
    }
}

function smartSearch() {
    const q = document.getElementById("search-bar").value.toLowerCase();
    if (!q) { if (activeNode) renderDisplay(activeNode.items); return; }
    let res = [];
    const s = (nodes) => nodes.forEach(n => {
        if (n.items) n.items.forEach(i => { if (i.name.toLowerCase().includes(q)) res.push(i); });
        if (n.children) s(n.children);
    });
    s(db.categories); renderDisplay(res);
}

// 初始化啟動
window.onload = function() {
    updateUIConfigs();
    renderTree(db.categories, document.getElementById("nav-tree"));
};