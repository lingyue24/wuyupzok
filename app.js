// --- 資料載入 ---
let db = JSON.parse(localStorage.getItem("v6_knowledge_db")) || (typeof initialData !== 'undefined' ? initialData : {
    config: { dbName: "我的企業知識庫", password: "1234" },
    categories: []
});

let activeNode = null;
let tempImgs = [];
let editingIdx = -1;
let isAdmin = false;

const save = () => localStorage.setItem("v6_knowledge_db", JSON.stringify(db));

// --- UI 控制 ---
function toggleMenu() { document.getElementById("sidebar").classList.toggle("open"); }
function closeMenu() { document.getElementById("sidebar").classList.remove("open"); }

function toggleAdmin() {
    if (isAdmin) return exitAdmin();
    const pw = prompt("請輸入管理密碼:");
    if (pw === db.config.password) {
        isAdmin = true;
        document.getElementById("admin-panel").style.display = "block";
        document.getElementById("settings-button-area").style.display = "block";
        document.getElementById("admin-toggle").innerText = "🔓 退出管理";
        if(activeNode) renderDisplay(activeNode.items);
    } else if (pw !== null) alert("密碼錯誤");
}

function exitAdmin() {
    isAdmin = false;
    exitEdit();
    document.getElementById("admin-panel").style.display = "none";
    document.getElementById("settings-button-area").style.display = "none";
    document.getElementById("admin-toggle").innerText = "🔐 管理模式";
    if(activeNode) renderDisplay(activeNode.items);
    document.getElementById("content").scrollTop = 0;
}

// --- 編輯核心 ---
function exitEdit() {
    editingIdx = -1; tempImgs = [];
    document.getElementById("edit-title").value = "";
    document.getElementById("edit-desc").value = "";
    document.getElementById("input-file").value = "";
    renderImgManager();
    document.getElementById("btn-save-main").innerText = "💾 儲存內容";
    document.getElementById("btn-cancel-edit").style.display = "none";
    document.getElementById("content").scrollTop = 0; // 修正消失問題：強制回頂部
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
    document.getElementById("admin-panel").scrollIntoView({ behavior: 'smooth' });
}

function saveContent() {
    if (!activeNode) return alert("請選取分類");
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

// --- 分類與渲染 ---
function addRootCategory() {
    const name = prompt("第一層分類名稱：");
    if (name) { db.categories.push({ name, children: [], items: [] }); save(); renderTree(db.categories, document.getElementById("nav-tree")); }
}

function addCategory() {
    if (!activeNode) return alert("請選取分類");
    const name = prompt(`在「${activeNode.name}」下新增子：`);
    if (name) {
        if (!activeNode.children) activeNode.children = [];
        activeNode.children.push({ name, children: [], items: [] });
        save(); renderTree(db.categories, document.getElementById("nav-tree"));
    }
}

function deleteCategory() {
    if (!activeNode) return;
    if (confirm("刪除此分類及其內容？")) {
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
}

function renameCategory() {
    if (!activeNode) return;
    const n = prompt("新名稱：", activeNode.name);
    if (n) { activeNode.name = n; save(); renderTree(db.categories, document.getElementById("nav-tree")); }
}

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
    if (items.length === 0) { view.innerHTML = '<div style="text-align:center; padding:50px; color:#999;">此分類暫無內容。</div>'; return; }
    view.innerHTML = items.map((item, idx) => `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <h2 style="margin:0; color:var(--primary);">${item.name}</h2>
                ${isAdmin ? `<div><button class="btn btn-outline" onclick="startEdit(${idx})">✏</button>
                <button class="btn btn-danger" onclick="deleteItem(${idx})" style="padding:5px 10px;">🗑</button></div>` : ''}
            </div>
            <div class="gallery">${(item.imgs || []).map(src => `<img class="gallery-img" src="${src}" style="height:120px; border-radius:8px; margin-top:10px;" onclick="window.open('${src}')">`).join('')}</div>
            <p style="white-space: pre-wrap; line-height:1.7;">${item.text}</p>
        </div>`).join("");
}

function deleteItem(idx) {
    if (confirm("刪除？")) { activeNode.items.splice(idx, 1); save(); renderDisplay(activeNode.items); }
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

// --- 圖片 ---
function addLocalImg(input) {
    const file = input.files[0];
    if (file && tempImgs.length < 5) {
        const reader = new FileReader();
        reader.onload = (e) => { tempImgs.push(e.target.result); renderImgManager(); };
        reader.readAsDataURL(file);
    }
}

function renderImgManager() {
    document.getElementById("img-manager-zone").innerHTML = tempImgs.map((img, idx) => `
        <div class="img-slot"><img src="${img}"><button onclick="tempImgs.splice(${idx},1);renderImgManager();" style="position:absolute; top:0; right:0; background:red; color:white; border:none; cursor:pointer;">×</button></div>`).join("");
}

// --- 設定 ---
function openModal() { document.getElementById("set-db-name").value = db.config.dbName; document.getElementById("settings-modal").style.display = "flex"; }
function closeModal() { document.getElementById("settings-modal").style.display = "none"; }
function saveSettings() {
    const n = document.getElementById("set-db-name").value.trim();
    const p = document.getElementById("set-new-pw").value.trim();
    if (n) db.config.dbName = n; if (p) db.config.password = p;
    save(); location.reload();
}
function exportDB() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const a = document.createElement('a'); a.href = dataStr; a.download = db.config.dbName + ".json"; a.click();
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
    document.getElementById("db-name-display").innerText = db.config.dbName;
    renderTree(db.categories, document.getElementById("nav-tree"));
};
