let db = JSON.parse(localStorage.getItem("v6_knowledge_db")) || {
    config: { dbName: "我的企業知識庫", password: "1234" },
    categories: [{ name: "💊 產品百科", children: [], items: [] }]
};

let activeNode = null;
let tempImgs = [];
let editingIdx = -1;
let isAdmin = false;

const save = () => localStorage.setItem("v6_knowledge_db", JSON.stringify(db));

// ---------------- 側邊欄手勢收合 ----------------
let touchStartX = 0;
let touchEndX = 0;
const sidebar = document.getElementById("sidebar");
sidebar.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, false);
sidebar.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    if (touchStartX - touchEndX > 50) closeMenu();
}, false);

function toggleMenu() { document.getElementById("sidebar").classList.toggle("open"); }
function closeMenu() { document.getElementById("sidebar").classList.remove("open"); }

// ---------------- 系統設定彈窗 ----------------
function openModal() { 
    // 預載目前的資料庫名稱到輸入框
    document.getElementById("set-db-name").value = db.config.dbName;
    document.getElementById("settings-modal").style.display = "flex"; 
}

function closeModal() { document.getElementById("settings-modal").style.display = "none"; }

function saveSettings() {
    const newName = document.getElementById("set-db-name").value.trim();
    const newPw = document.getElementById("set-new-pw").value.trim();
    if (newName) db.config.dbName = newName;
    if (newPw) db.config.password = newPw;
    save();
    alert("系統設定已更新");
    location.reload();
}

// ---------------- 分類管理功能 ----------------
function addRootCategory() {
    const name = prompt("請輸入新的頂層分類名稱：");
    if (name) {
        db.categories.push({ name, children: [], items: [] });
        save();
        renderTree(db.categories, document.getElementById("nav-tree"));
    }
}

function addCategory() {
    if (!activeNode) return alert("請先選取父分類");
    const name = prompt(`在「${activeNode.name}」下新增子分類：`);
    if (name) {
        if (!activeNode.children) activeNode.children = [];
        activeNode.children.push({ name, children: [], items: [] });
        save();
        renderTree(db.categories, document.getElementById("nav-tree"));
    }
}

function deleteCategory() {
    if (!activeNode) return;
    if (db.categories.includes(activeNode) && db.categories.length <= 1) 
        return alert("⚠️ 必須保留至少一個分類！");

    if (confirm(`確定刪除「${activeNode.name}」？`)) {
        const remove = (arr) => {
            const i = arr.findIndex(n => n === activeNode);
            if (i > -1) { arr.splice(i, 1); return true; }
            for (let c of arr) { if (c.children && remove(c.children)) return true; }
            return false;
        };
        remove(db.categories);
        activeNode = null;
        save();
        renderTree(db.categories, document.getElementById("nav-tree"));
        document.getElementById("display-view").innerHTML = "";
    }
}

function renameCategory() {
    if (!activeNode) return alert("請選取路徑");
    const name = prompt("輸入新名稱：", activeNode.name);
    if (name) {
        activeNode.name = name;
        save();
        renderTree(db.categories, document.getElementById("nav-tree"));
    }
}

// ---------------- 內容儲存與編輯 ----------------
function saveContent() {
    if (!activeNode) return alert("請先選取分類");
    const name = document.getElementById("edit-title").value.trim();
    const text = document.getElementById("edit-desc").value.trim();
    if (!name) return alert("請填寫標題");

    const newItem = { name, text, imgs: [...tempImgs] };
    if (!activeNode.items) activeNode.items = [];

    if (editingIdx > -1) activeNode.items[editingIdx] = newItem;
    else activeNode.items.push(newItem);

    save();
    alert("✅ 資料已儲存");
    renderDisplay(activeNode.items);
    exitEdit();
}

function exitEdit() {
    editingIdx = -1; tempImgs = [];
    document.getElementById("edit-title").value = "";
    document.getElementById("edit-desc").value = "";
    renderImgManager();
    document.getElementById("btn-save-main").innerText = "💾 儲存內容";
    document.getElementById("btn-cancel-edit").style.display = "none";
}

// ---------------- 渲染邏輯 ----------------
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

        title.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.nav-node').forEach(el => el.classList.remove('active-node'));
            title.classList.add('active-node');
            activeNode = node;
            document.getElementById('current-path').innerText = `📍 目前路徑：${node.name}`;
            
            if (node.children && node.children.length > 0) {
                childrenBox.style.display = childrenBox.style.display === "none" ? "block" : "none";
            } else {
                renderDisplay(node.items || []);
                if (window.innerWidth <= 1024) closeMenu();
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
        view.innerHTML = '<div style="text-align:center; padding:50px; color:#999;">此分類暫無內容。</div>';
        return;
    }
    view.innerHTML = items.map((item, idx) => `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0;">${item.name}</h3>
                ${isAdmin ? `
                    <div class="btn-group-row">
                        <button class="btn btn-outline" onclick="startEdit(${idx})">✏</button>
                        <button class="btn btn-danger" onclick="deleteItem(${idx})">🗑</button>
                    </div>
                ` : ''}
            </div>
            <div class="gallery">${(item.imgs || []).map(src => `<img class="gallery-img" src="${src}" onclick="window.open('${src}')">`).join('')}</div>
            <p style="white-space: pre-wrap;">${item.text}</p>
        </div>`).join("");
}

function startEdit(idx) {
    editingIdx = idx;
    const item = activeNode.items[idx];
    document.getElementById("edit-title").value = item.name;
    document.getElementById("edit-desc").value = item.text;
    tempImgs = [...(item.imgs || [])];
    renderImgManager();
    document.getElementById("btn-save-main").innerText = "🆙 更新內容";
    document.getElementById("btn-cancel-edit").style.display = "block";
    document.getElementById("admin-panel").scrollIntoView({ behavior: 'smooth' });
}

function deleteItem(idx) {
    if (confirm("確定刪除此內容？")) {
        activeNode.items.splice(idx, 1);
        save();
        renderDisplay(activeNode.items);
    }
}

// ---------------- 圖片、搜尋與管理模式 ----------------
function addLocalImg(input) {
    const file = input.files[0];
    if (file && tempImgs.length < 5) {
        const reader = new FileReader();
        reader.onload = (e) => { tempImgs.push(e.target.result); renderImgManager(); };
        reader.readAsDataURL(file);
    }
    input.value = "";
}

function addUrlImg() {
    const url = document.getElementById("input-url").value.trim();
    if (url && tempImgs.length < 5) { tempImgs.push(url); renderImgManager(); }
    document.getElementById("input-url").value = "";
}

function renderImgManager() {
    document.getElementById("img-manager-zone").innerHTML = tempImgs.map((img, idx) => `
        <div class="img-slot"><img src="${img}">
            <button class="btn-remove-img" onclick="tempImgs.splice(${idx},1);renderImgManager();">×</button>
        </div>`).join("");
}

function toggleAdmin() {
    const pw = prompt("請輸入密碼:");
    if (pw === db.config.password) {
        isAdmin = true;
        document.getElementById("admin-panel").style.display = "block";
        document.getElementById("btn-settings").style.display = "block";
        document.getElementById("admin-toggle").innerText = "✅ 已管理";
        if(activeNode) renderDisplay(activeNode.items);
    }
}

function smartSearch() {
    const q = document.getElementById("search-bar").value.toLowerCase();
    if (!q) { if (activeNode) renderDisplay(activeNode.items); return; }
    let res = [];
    const s = (nodes) => nodes.forEach(n => {
        if (n.items) n.items.forEach(i => { if (i.name.toLowerCase().includes(q) || i.text.toLowerCase().includes(q)) res.push(i); });
        if (n.children) s(n.children);
    });
    s(db.categories);
    renderDisplay(res);
}

function exportDB() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const a = document.createElement('a');
    a.href = dataStr; a.download = db.config.dbName + ".json";
    a.click();
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
