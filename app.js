// 初始化資料
let db = JSON.parse(localStorage.getItem("v6_knowledge_db")) || (typeof initialData !== 'undefined' ? initialData : {
    config: { dbName: "企業知識庫", password: "1234" },
    categories: []
});

let activeNode = null;
let tempImgs = [];
let editingIdx = -1;
let isAdmin = false;

const save = () => localStorage.setItem("v6_knowledge_db", JSON.stringify(db));

// 側邊欄
const toggleMenu = () => document.getElementById("sidebar").classList.toggle("open");
const closeMenu = () => document.getElementById("sidebar").classList.remove("open");

// 管理模式
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

// 編輯邏輯 (強化校準)
function exitEdit() {
    editingIdx = -1; tempImgs = [];
    document.getElementById("edit-title").value = "";
    document.getElementById("edit-desc").value = "";
    document.getElementById("input-file").value = "";
    renderImgManager();
    document.getElementById("btn-save-main").innerText = "💾 儲存內容";
    document.getElementById("btn-cancel-edit").style.display = "none";
    
    // 關鍵修正：延遲強制校準捲動位置，防止 Header 消失
    setTimeout(() => {
        document.getElementById("content").scrollTop = 0;
        window.scrollTo(0, 0);
    }, 50);
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
    if (!activeNode) return alert("請先選取分類");
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

// 渲染導覽樹
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

// 渲染主顯示區
function renderDisplay(items) {
    const view = document.getElementById("display-view");
    if (items.length === 0) { view.innerHTML = '<div style="text-align:center; padding:50px; color:#999;">此分類暫無內容。</div>'; return; }
    view.innerHTML = items.map((item, idx) => `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <h2 style="margin:0; color:var(--primary); font-size:1.2em;">${item.name}</h2>
                ${isAdmin ? `<div><button class="btn btn-outline" onclick="startEdit(${idx})">✏</button>
                <button class="btn btn-danger" onclick="deleteItem(${idx})" style="padding:5px 10px;">🗑</button></div>` : ''}
            </div>
            <div class="gallery">${(item.imgs || []).map(src => `<img src="${src}" style="width:100%; max-height:200px; object-fit:contain; border-radius:8px; margin-top:10px;" onclick="window.open('${src}')">`).join('')}</div>
            <p style="white-space: pre-wrap; line-height:1.7; margin-top:10px;">${item.text}</p>
        </div>`).join("");
}

// 其他管理功能
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
    if (!activeNode || !confirm("刪除此分類與內容？")) return;
    const rem = (arr) => {
        const idx = arr.findIndex(n => n === activeNode);
        if (idx > -1) { arr.splice(idx, 1); return true; }
        for (let c of arr) if (c.children && rem(c.children)) return true;
        return false;
    };
    rem(db.categories); activeNode = null; save(); renderTree(db.categories, document.getElementById("nav-tree"));
    document.getElementById("display-view").innerHTML = "";
}
function renameCategory() {
    if (!activeNode) return;
    const n = prompt("新名稱：", activeNode.name);
    if (n) { activeNode.name = n; save(); renderTree(db.categories, document.getElementById("nav-tree")); }
}
function deleteItem(idx) {
    if (confirm("刪除此項內容？")) { activeNode.items.splice(idx, 1); save(); renderDisplay(activeNode.items); }
}

// 搜尋
function smartSearch() {
    const q = document.getElementById("search-bar").value.toLowerCase();
    if (!q) { if (activeNode) renderDisplay(activeNode.items); return; }
    let res = [];
    const s = (nodes) => nodes.forEach(n => {
        if (n.items) n.items.forEach(i => { if (i.name.toLowerCase().includes(q) || i.text.toLowerCase().includes(q)) res.push(i); });
        if (n.children) s(n.children);
    });
    s(db.categories); renderDisplay(res);
}

// 圖片處理
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
        <div class="img-slot"><img src="${img}"><button onclick="tempImgs.splice(${idx},1);renderImgManager();" style="position:absolute;top:0;right:0;background:red;color:white;border:none;">×</button></div>`).join("");
}

// 設定與導出
const openModal = () => { document.getElementById("set-db-name").value = db.config.dbName; document.getElementById("settings-modal").style.display = "flex"; };
const closeModal = () => document.getElementById("settings-modal").style.display = "none";
function saveSettings() {
    const n = document.getElementById("set-db-name").value.trim();
    const p = document.getElementById("set-new-pw").value.trim();
    if (n) db.config.dbName = n; if (p) db.config.password = p;
    save(); location.reload();
}
function exportDB() {
    const a = document.createElement('a');
    a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    a.download = db.config.dbName + ".json"; a.click();
}
function importDB(input) {
    const f = input.files[0];
    if (f) {
        const r = new FileReader();
        r.onload = (e) => { db = JSON.parse(e.target.result); save(); location.reload(); };
        r.readAsText(f);
    }
}

window.onload = () => {
    document.getElementById("db-name-display").innerText = db.config.dbName;
    renderTree(db.categories, document.getElementById("nav-tree"));
};
