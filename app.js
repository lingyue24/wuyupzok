// 1. 資料初始化
let db = JSON.parse(localStorage.getItem("v6_knowledge_db")) || {
    config: { dbName: "我的知識庫", password: "1234" },
    categories: [{ name: "📁 第一個分類", children: [], items: [] }]
};

let activeNode = null;
let tempImgs = [];
let editingIdx = -1;
let isAdmin = false;

const save = () => localStorage.setItem("v6_knowledge_db", JSON.stringify(db));

// 2. 側邊欄與手勢監聽
let touchStartX = 0;

function setupGestures() {
    const sidebar = document.getElementById("sidebar");
    sidebar.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, {passive: true});
    sidebar.addEventListener('touchend', e => {
        if (touchStartX - e.changedTouches[0].screenX > 60) closeMenu();
    }, {passive: true});
}

function toggleMenu() { document.getElementById("sidebar").classList.toggle("open"); }
function closeMenu() { document.getElementById("sidebar").classList.remove("open"); }

// 3. 管理權限與退出
function toggleAdmin() {
    if (isAdmin) return exitAdmin();
    const pw = prompt("請輸入管理密碼:");
    if (pw === db.config.password) {
        isAdmin = true;
        document.getElementById("admin-panel").style.display = "block";
        document.getElementById("btn-settings").style.display = "block";
        document.getElementById("admin-toggle").innerText = "🔓 退出管理";
        if(activeNode) renderDisplay(activeNode.items);
    } else if (pw !== null) alert("密碼錯誤");
}

function exitAdmin() {
    isAdmin = false;
    exitEdit();
    document.getElementById("admin-panel").style.display = "none";
    document.getElementById("btn-settings").style.display = "none";
    document.getElementById("admin-toggle").innerText = "🔐 管理模式";
    if(activeNode) renderDisplay(activeNode.items);
}

// 4. 編輯與儲存邏輯
function saveContent() {
    if (!activeNode) return alert("請先選取分類路徑");
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
    alert("💾 已儲存！");
}

function exitEdit() {
    editingIdx = -1; tempImgs = [];
    document.getElementById("edit-title").value = "";
    document.getElementById("edit-desc").value = "";
    renderImgManager();
    document.getElementById("btn-save-main").innerText = "💾 儲存內容";
    document.getElementById("btn-cancel-edit").style.display = "none";
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
    
    // 自動滾動到編輯器位置
    setTimeout(() => {
        document.querySelector(".editor-form").scrollIntoView({ behavior: 'smooth' });
    }, 200);
}

// 5. 分類管理功能
function addRootCategory() {
    const name = prompt("第一層分類名稱：");
    if (name) { db.categories.push({ name, children: [], items: [] }); save(); renderTree(db.categories, document.getElementById("nav-tree")); }
}

function addCategory() {
    if (!activeNode) return alert("請選取父分類");
    const name = prompt(`在「${activeNode.name}」下新增子分類：`);
    if (name) {
        if (!activeNode.children) activeNode.children = [];
        activeNode.children.push({ name, children: [], items: [] });
        save(); renderTree(db.categories, document.getElementById("nav-tree"));
    }
}

function deleteCategory() {
    if (!activeNode) return;
    if (confirm(`確定刪除「${activeNode.name}」？`)) {
        const removeNode = (arr) => {
            const i = arr.findIndex(n => n === activeNode);
            if (i > -1) { arr.splice(i, 1); return true; }
            for (let c of arr) if (c.children && removeNode(c.children)) return true;
            return false;
        };
        removeNode(db.categories);
        activeNode = null; save(); renderTree(db.categories, document.getElementById("nav-tree"));
        document.getElementById("display-view").innerHTML = "";
    }
}

function renameCategory() {
    if (!activeNode) return;
    const n = prompt("輸入新名稱：", activeNode.name);
    if (n) { activeNode.name = n; save(); renderTree(db.categories, document.getElementById("nav-tree")); }
}

// 6. 渲染邏輯
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
            document.getElementById('current-path').innerText = `📍 目前路徑：${node.name}`;
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
    view.innerHTML = items.length === 0 ? '<div style="text-align:center; padding:50px; color:#999;">尚未加入內容。</div>' : 
    items.map((item, idx) => `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0;">${item.name}</h3>
                ${isAdmin ? `<button class="btn btn-outline" onclick="startEdit(${idx})">✏</button>` : ''}
            </div>
            <div class="gallery">${(item.imgs || []).map(src => `<img class="gallery-img" src="${src}">`).join('')}</div>
            <p style="white-space: pre-wrap; margin-top:10px;">${item.text}</p>
        </div>`).join("");
}

// 7. 圖片管理
function addLocalImg(input) {
    const file = input.files[0];
    if (file && tempImgs.length < 5) {
        const reader = new FileReader();
        reader.onload = (e) => { tempImgs.push(e.target.result); renderImgManager(); };
        reader.readAsDataURL(file);
    }
    input.value = "";
}

function renderImgManager() {
    document.getElementById("img-manager-zone").innerHTML = tempImgs.map((img, idx) => `
        <div class="img-slot"><img src="${img}"><button class="btn-remove-img" onclick="tempImgs.splice(${idx},1);renderImgManager();">×</button></div>`).join("");
}

// 8. 搜尋功能
function smartSearch() {
    const q = document.getElementById("search-bar").value.toLowerCase();
    if (!q) { if (activeNode) renderDisplay(activeNode.items); return; }
    let results = [];
    const searchDeep = (nodes) => nodes.forEach(n => {
        if (n.items) n.items.forEach(i => { if (i.name.toLowerCase().includes(q) || i.text.toLowerCase().includes(q)) results.push(i); });
        if (n.children) searchDeep(n.children);
    });
    searchDeep(db.categories);
    renderDisplay(results);
}

// 9. 進階設定
function openModal() { document.getElementById("set-db-name").value = db.config.dbName; document.getElementById("settings-modal").style.display = "flex"; }
function closeModal() { document.getElementById("settings-modal").style.display = "none"; }
function saveSettings() {
    const n = document.getElementById("set-db-name").value.trim();
    const p = document.getElementById("set-new-pw").value.trim();
    if (n) db.config.dbName = n;
    if (p) db.config.password = p;
    save(); location.reload();
}

window.onload = () => {
    document.getElementById("db-name-display").innerText = db.config.dbName;
    renderTree(db.categories, document.getElementById("nav-tree"));
    setupGestures();
};
