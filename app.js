let db = JSON.parse(localStorage.getItem("v6_knowledge_db")) || {
    config: { dbName: "我的知識庫", password: "1234" },
    categories: [{ name: "💊 產品百科", children: [], items: [] }]
};

let activeNode = null;
let tempImgs = [];
let editingIdx = -1;
let isAdmin = false;

function save() { localStorage.setItem("v6_knowledge_db", JSON.stringify(db)); }

function openMenu() {
    document.getElementById("sidebar").classList.add("show-sidebar");
    document.getElementById("sidebar-overlay").classList.add("show-overlay");
}

function closeMenu() {
    document.getElementById("sidebar").classList.remove("show-sidebar");
    document.getElementById("sidebar-overlay").classList.remove("show-overlay");
}

// 圖片處理
function addLocalImg(input) {
    if (tempImgs.length >= 5) return alert("最多5張圖片");
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => { tempImgs.push(e.target.result); renderImgManager(); };
        reader.readAsDataURL(file);
    }
}

function addUrlImg() {
    const url = document.getElementById("input-url").value.trim();
    if (url) { tempImgs.push(url); renderImgManager(); document.getElementById("input-url").value = ""; }
}

function renderImgManager() {
    document.getElementById("img-manager-zone").innerHTML = tempImgs.map((img, idx) => `
        <div class="img-slot">
            <img src="${img}">
            <button class="btn-remove-img" onclick="tempImgs.splice(${idx},1);renderImgManager();">×</button>
        </div>
    `).join("");
}

// 渲染選單
function renderTree(nodes, container) {
    container.innerHTML = "";
    nodes.forEach((node) => {
        let title = document.createElement("div");
        title.className = "nav-node";
        title.style.padding = "12px";
        title.style.cursor = "pointer";
        title.innerHTML = (node.children && node.children.length > 0 ? "📂 " : "📄 ") + node.name;
        
        let childrenBox = document.createElement("div");
        childrenBox.style.display = "none";
        childrenBox.style.paddingLeft = "15px";

        title.onclick = (e) => {
            e.stopPropagation();
            activeNode = node;
            document.querySelectorAll('.nav-node').forEach(el => el.classList.remove('active-node'));
            title.classList.add('active-node');
            document.getElementById('current-path').innerText = `📍 目前路徑：${node.name}`;
            
            if (node.children && node.children.length > 0) {
                childrenBox.style.display = childrenBox.style.display === "none" ? "block" : "none";
            } else {
                renderDisplay(node.items || []);
                if (window.innerWidth <= 1024) closeMenu();
            }
        };

        container.appendChild(title);
        if (node.children) { renderTree(node.children, childrenBox); container.appendChild(childrenBox); }
    });
}

function renderDisplay(items) {
    const view = document.getElementById("display-view");
    view.innerHTML = items.map((item, idx) => `
        <div class="card">
            <div style="display:flex; justify-content:space-between;">
                <h3>${item.name}</h3>
                ${isAdmin ? `<button onclick="startEdit(${idx})" class="btn btn-outline" style="padding:4px 8px;">✏</button>` : ''}
            </div>
            <div style="display:flex; gap:5px; overflow-x:auto; margin:10px 0;">
                ${(item.imgs || []).map(img => `<img src="${img}" style="height:80px; border-radius:5px;">`).join('')}
            </div>
            <p style="white-space: pre-wrap;">${item.text}</p>
        </div>
    `).join("");
}

// 儲存邏輯
function saveContent() {
    if (!activeNode) return alert("請先從左側選單選擇一個分類");
    const title = document.getElementById("edit-title").value.trim();
    const desc = document.getElementById("edit-desc").value.trim();
    if (!title) return alert("請輸入標題");

    const data = { name: title, text: desc, imgs: [...tempImgs] };
    if (!activeNode.items) activeNode.items = [];

    if (editingIdx > -1) activeNode.items[editingIdx] = data;
    else activeNode.items.push(data);

    save();
    alert("儲存成功！");
    renderDisplay(activeNode.items);
    exitEdit();
    // 儲存後將頁面捲回頂部，方便確認結果
    document.getElementById("content").scrollTop = 0;
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
    // 滾動到編輯區
    document.getElementById("admin-panel").scrollIntoView({ behavior: 'smooth' });
}

function exitEdit() {
    editingIdx = -1; tempImgs = [];
    document.getElementById("edit-title").value = "";
    document.getElementById("edit-desc").value = "";
    renderImgManager();
    document.getElementById("btn-save-main").innerText = "💾 儲存內容";
    document.getElementById("btn-cancel-edit").style.display = "none";
}

// 其他管理功能
function toggleAdmin() {
    const pw = prompt("請輸入管理密碼:");
    if (pw === db.config.password) {
        isAdmin = true;
        document.getElementById("admin-panel").style.display = "block";
        document.getElementById("btn-settings").style.display = "block";
        alert("管理模式已開啟");
        if(activeNode) renderDisplay(activeNode.items);
    }
}

function addCategory() {
    if (!activeNode) return alert("請先選取父分類");
    const name = prompt("輸入新分類名稱:");
    if (name) {
        if (!activeNode.children) activeNode.children = [];
        activeNode.children.push({ name, children: [], items: [] });
        save(); renderTree(db.categories, document.getElementById("nav-tree"));
    }
}

function openModal() { document.getElementById("settings-modal").style.display = "flex"; }
function closeModal() { document.getElementById("settings-modal").style.display = "none"; }

window.onload = function() {
    document.getElementById("db-name-display").innerText = db.config.dbName;
    renderTree(db.categories, document.getElementById("nav-tree"));
};