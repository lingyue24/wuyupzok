let db = JSON.parse(localStorage.getItem("v6_knowledge_db")) || {
    config: { dbName: "我的企業知識庫", password: "1234" },
    categories: [{ name: "💊 產品百科", children: [], items: [] }]
};

let activeNode = null;
let tempImgs = [];
let editingIdx = -1;
let isAdmin = false;

const save = () => localStorage.setItem("v6_knowledge_db", JSON.stringify(db));

// ---------------- 側邊欄控制與向左滑動收回 ----------------
let touchStartX = 0;

function setupGestures() {
    const sidebar = document.getElementById("sidebar");
    
    sidebar.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    sidebar.addEventListener('touchend', e => {
        let touchEndX = e.changedTouches[0].screenX;
        // 如果向左滑動距離超過 60px 則收回
        if (touchStartX - touchEndX > 60) {
            closeMenu();
        }
    }, { passive: true });
}

function toggleMenu() { 
    document.getElementById("sidebar").classList.toggle("open"); 
}

function closeMenu() { 
    document.getElementById("sidebar").classList.remove("open"); 
}

// ---------------- 管理員模式控制 ----------------
function toggleAdmin() {
    if (isAdmin) return exitAdmin();
    const pw = prompt("請輸入管理密碼:");
    if (pw === db.config.password) {
        isAdmin = true;
        document.getElementById("admin-panel").style.display = "block";
        document.getElementById("btn-settings").style.display = "block";
        document.getElementById("admin-toggle").innerText = "🔓 退出管理";
        if(activeNode) renderDisplay(activeNode.items);
    } else if (pw !== null) {
        alert("密碼錯誤");
    }
}

function exitAdmin() {
    isAdmin = false;
    exitEdit();
    document.getElementById("admin-panel").style.display = "none";
    document.getElementById("btn-settings").style.display = "none";
    document.getElementById("admin-toggle").innerText = "🔐 管理模式";
    if(activeNode) renderDisplay(activeNode.items);
}

// ---------------- 內容編輯邏輯 ----------------
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
    alert("✅ 儲存成功並返回");
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

// ---------------- 系統設定與分類 ----------------
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

function addRootCategory() {
    const name = prompt("輸入新的第一層分類名稱：");
    if (name) { 
        db.categories.push({ name, children: [], items: [] }); 
        save(); 
        renderTree(db.categories, document.getElementById("nav-tree")); 
    }
}

function addCategory() {
    if (!activeNode) return alert("請選取分類");
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
    if (db.categories.includes(activeNode) && db.categories.length <= 1) return alert("必須保留至少一個分類");
    if (confirm(`確定刪除「${activeNode.name}」及其內容？`)) {
        const remove = (arr) => {
            const i = arr.findIndex(n => n === activeNode);
            if (i > -1) { arr.splice(i, 1); return true; }
            for (let c of arr) if (c.children && remove(c.children)) return true;
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
    if (!activeNode) return;
    const n = prompt("輸入新名稱：", activeNode.name);
    if (n) { activeNode.name = n; save(); renderTree(db.categories, document.getElementById("nav-tree")); }
}

// ---------------- 渲染 ----------------
function renderTree(nodes, container) {
    container.innerHTML = "";
    nodes.forEach((node) => {
        let wrapper = document.createElement("div");
        let title = document.createElement("div");
        title.className = "nav-node";
        title.innerHTML = (node.children?.length > 0 ? "📂 " : "📄 ") + node.name;
        
        let childrenBox = document.createElement("div");
        childrenBox.className = "child-container";
        childrenBox.style.display = "none";

        title.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.nav-node').forEach(el => el.classList.remove('active-node'));
            title.classList.add('active-node');
            activeNode = node;
            document.getElementById('current-path').innerText = `📍 目前路徑：${node.name}`;
            
            if (node.children?.length > 0) {
                childrenBox.style.display = childrenBox.style.display === "none" ? "block" : "none";
            } else {
                renderDisplay(node.items || []);
                if (window.innerWidth <= 1024) closeMenu();
            }
        };

        wrapper.appendChild(title);
        if (node.children) {
            renderTree(node.children, childrenBox);
            wrapper.appendChild(childrenBox);
        }
        container.appendChild(wrapper);
    });
}

function renderDisplay(items) {
    const view = document.getElementById("display-view");
    view.innerHTML = items.length === 0 ? '<div style="text-align:center; padding:50px; color:#999;">此分類暫無內容。</div>' : 
    items.map((item, idx) => `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0;">${item.name}</h3>
                ${isAdmin ? `
                    <div class="btn-group-row">
                        <button class="btn btn-outline" onclick="startEdit(${idx})">✏</button>
                        <button class="btn btn-danger" onclick="deleteItem(${idx})">🗑</button>
                    </div>` : ''}
            </div>
            <div class="gallery">${(item.imgs || []).map(src => `<img class="gallery-img" src="${src}" onclick="window.open('${src}')">`).join('')}</div>
            <p style="white-space: pre-wrap; margin-top:10px;">${item.text}</p>
        </div>`).join("");
}

function deleteItem(idx) {
    if (confirm("確定刪除此條目？")) {
        activeNode.items.splice(idx, 1);
        save();
        renderDisplay(activeNode.items);
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

// ---------------- 圖片管理 ----------------
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
        <div class="img-slot"><img src="${img}"><button class="btn-remove-img" onclick="tempImgs.splice(${idx},1);renderImgManager();">×</button></div>`).join("");
}

// ---------------- 初始化 ----------------
window.onload = () => {
    document.getElementById("db-name-display").innerText = db.config.dbName;
    renderTree(db.categories, document.getElementById("nav-tree"));
    setupGestures(); // 初始化手勢監聽
};
