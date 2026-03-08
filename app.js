let db = JSON.parse(localStorage.getItem("v6_knowledge_db")) || {
    config: { dbName: "我的企業知識庫", password: "1234" },
    categories: [{ name: "💊 產品百科", children: [], items: [] }]
};

let activeNode = null;
let tempImgs = [];
let editingIdx = -1;
let isAdmin = false;

const save = () => localStorage.setItem("v6_knowledge_db", JSON.stringify(db));

// 側邊欄手勢偵測
let touchStartX = 0;
const sidebar = document.getElementById("sidebar");
sidebar.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, false);
sidebar.addEventListener('touchend', e => {
    if (touchStartX - e.changedTouches[0].screenX > 50) closeMenu();
}, false);

function toggleMenu() { document.getElementById("sidebar").classList.toggle("open"); }
function closeMenu() { document.getElementById("sidebar").classList.remove("open"); }

// 設定功能
function openModal() { 
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
    location.reload();
}

// 分類與內容管理
function addRootCategory() {
    const name = prompt("輸入新的第一層分類名稱：");
    if (name) { db.categories.push({ name, children: [], items: [] }); save(); renderTree(db.categories, document.getElementById("nav-tree")); }
}

function addCategory() {
    if (!activeNode) return alert("請先選取分類");
    const name = prompt(`在「${activeNode.name}」下新增子分類：`);
    if (name) {
        if (!activeNode.children) activeNode.children = [];
        activeNode.children.push({ name, children: [], items: [] });
        save();
        renderTree(db.categories, document.getElementById("nav-tree"));
    }
}

function saveContent() {
    if (!activeNode) return alert("請選取分類路徑");
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
    document.getElementById("admin-panel").scrollIntoView({ behavior: 'smooth' });
}

// 渲染與其他功能 (與原版邏輯一致)
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
            if (!node.children?.length) { renderDisplay(node.items || []); if (window.innerWidth <= 1024) closeMenu(); }
        };
        container.appendChild(title);
        if (node.children) {
            let box = document.createElement("div");
            box.className = "child-container";
            renderTree(node.children, box);
            container.appendChild(box);
        }
    });
}

function renderDisplay(items) {
    const view = document.getElementById("display-view");
    view.innerHTML = items.length === 0 ? '<div style="text-align:center; padding:50px; color:#999;">此分類暫無內容。</div>' : 
    items.map((item, idx) => `
        <div class="card">
            <div style="display:flex; justify-content:space-between;">
                <h3 style="margin:0;">${item.name}</h3>
                ${isAdmin ? `<button class="btn btn-outline" onclick="startEdit(${idx})">✏</button>` : ''}
            </div>
            <p style="white-space: pre-wrap; margin-top:10px;">${item.text}</p>
        </div>`).join("");
}

function toggleAdmin() {
    if (prompt("請輸入密碼:") === db.config.password) {
        isAdmin = true;
        document.getElementById("admin-panel").style.display = "block";
        document.getElementById("btn-settings").style.display = "block";
        document.getElementById("admin-toggle").innerText = "✅ 已管理模式";
    }
}

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

window.onload = () => {
    document.getElementById("db-name-display").innerText = db.config.dbName;
    renderTree(db.categories, document.getElementById("nav-tree"));
};
