let db = JSON.parse(localStorage.getItem("v6_knowledge_db")) || {
    config: { dbName: "我的企業知識庫", password: "1234" },
    categories: [{ name: "💊 產品百科", children: [], items: [] }]
};

let activeNode = null;
let tempImgs = [];
let editingIdx = -1;
let isAdmin = false;

const save = () => localStorage.setItem("v6_knowledge_db", JSON.stringify(db));

function toggleMenu() { document.getElementById("sidebar").classList.toggle("open"); }
function closeMenu() { document.getElementById("sidebar").classList.remove("open"); }

// --- 圖片處理 ---
function addLocalImg(input) {
    if (tempImgs.length >= 5) return alert("最多 5 張圖片");
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
        <div class="img-slot"><img src="${img}">
            <button class="btn-remove-img" onclick="tempImgs.splice(${idx},1);renderImgManager();">×</button>
        </div>`).join("");
}

// --- 核心儲存邏輯 ---
function saveContent() {
    if (!activeNode) return alert("請先從左側選單選取分類路徑");
    const name = document.getElementById("edit-title").value.trim();
    const text = document.getElementById("edit-desc").value.trim();
    if (!name) return alert("標題不能為空");

    const newItem = { name, text, imgs: [...tempImgs] };
    if (!activeNode.items) activeNode.items = [];

    if (editingIdx > -1) {
        activeNode.items[editingIdx] = newItem;
    } else {
        activeNode.items.push(newItem);
    }

    save();
    alert("✅ 資料已儲存"); // 需求修正
    renderDisplay(activeNode.items);
    exitEdit(); // 返回顯示頁面，清空編輯區
    document.getElementById("content").scrollTop = 0;
}

function exitEdit() {
    editingIdx = -1;
    tempImgs = [];
    document.getElementById("edit-title").value = "";
    document.getElementById("edit-desc").value = "";
    renderImgManager();
    document.getElementById("btn-save-main").innerText = "💾 儲存內容";
    document.getElementById("btn-cancel-edit").style.display = "none";
}

// --- 分類編輯功能修正 ---
function addCategory() {
    if (!activeNode) return alert("請先選取一個分類");
    const name = prompt("請輸入新分類名稱：");
    if (name) {
        if (!activeNode.children) activeNode.children = [];
        activeNode.children.push({ name, children: [], items: [] });
        save();
        renderTree(db.categories, document.getElementById("nav-tree"));
    }
}

function renameCategory() {
    if (!activeNode) return alert("請先選取一個分類");
    const name = prompt("請輸入新的分類名稱：", activeNode.name);
    if (name) {
        activeNode.name = name;
        save();
        renderTree(db.categories, document.getElementById("nav-tree"));
        document.getElementById('current-path').innerHTML = `📍 <strong>目前定位：</strong>${name}`;
    }
}

function deleteCategory() {
    if (!activeNode) return;
    if (confirm(`確定要刪除「${activeNode.name}」及其內容嗎？`)) {
        const findAndRemove = (parentArr) => {
            const idx = parentArr.findIndex(n => n === activeNode);
            if (idx > -1) { parentArr.splice(idx, 1); return true; }
            for (let child of parentArr) { if (child.children && findAndRemove(child.children)) return true; }
            return false;
        };
        findAndRemove(db.categories);
        activeNode = null;
        save();
        renderTree(db.categories, document.getElementById("nav-tree"));
        document.getElementById("display-view").innerHTML = "";
    }
}

// --- 選單與顯示 ---
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
            document.getElementById('current-path').innerHTML = `📍 <strong>目前定位：</strong>${node.name}`;
            
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
        view.innerHTML = '<div style="text-align:center; padding:50px; color:#999;">此分類目前無內容。</div>';
        return;
    }
    view.innerHTML = items.map((item, idx) => `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <h2 style="margin:0 0 10px 0; color:var(--primary);">${item.name}</h2>
                ${isAdmin ? `<button class="btn btn-outline" onclick="startEdit(${idx})">✏</button>` : ''}
            </div>
            <div class="gallery">${(item.imgs || []).map(src => `<img class="gallery-img" src="${src}" onclick="window.open('${src}')">`).join('')}</div>
            <p style="white-space: pre-wrap; line-height:1.6;">${item.text}</p>
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

function toggleAdmin() {
    const pw = prompt("請輸入管理密碼:");
    if (pw === db.config.password) {
        isAdmin = true;
        document.getElementById("admin-panel").style.display = "block";
        document.getElementById("btn-settings").style.display = "block";
        document.getElementById("admin-toggle").innerText = "✅ 管理模式中";
        if(activeNode) renderDisplay(activeNode.items);
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
    search(db.categories);
    renderDisplay(res);
}

window.onload = () => {
    document.getElementById("db-name-display").innerText = db.config.dbName;
    renderTree(db.categories, document.getElementById("nav-tree"));
};

function openModal() { document.getElementById("settings-modal").style.display = "flex"; }
function closeModal() { document.getElementById("settings-modal").style.display = "none"; }