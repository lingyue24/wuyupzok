let db = JSON.parse(localStorage.getItem("v6_knowledge_db")) || {
    config: { dbName: "我的行動知識庫", password: "1234" },
    categories: [{ name: "💊 產品百科", children: [], items: [] }]
};

let activeNode = null;
let tempImgs = [];
let editingIdx = -1;
let isAdmin = false;

function save() { localStorage.setItem("v6_knowledge_db", JSON.stringify(db)); }
function updateUI() {
    document.getElementById("db-name-display").innerText = db.config.dbName;
    document.title = db.config.dbName;
}

// 側邊欄控制
function toggleMobileMenu() {
    document.getElementById("sidebar").classList.toggle("open");
}

// ---------------- 圖片處理 ----------------

function addLocalImg(input) {
    if (tempImgs.length >= 5) return alert("最多5張圖片");
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            tempImgs.push(e.target.result);
            renderImgManager();
        };
        reader.readAsDataURL(file);
    }
    input.value = "";
}

function addUrlImg() {
    if (tempImgs.length >= 5) return alert("最多5張圖片");
    const url = document.getElementById("input-url").value.trim();
    if (url) {
        tempImgs.push(url);
        renderImgManager();
        document.getElementById("input-url").value = "";
    }
}

function renderImgManager() {
    const zone = document.getElementById("img-manager-zone");
    zone.innerHTML = tempImgs.map((img, idx) => `
        <div class="img-slot">
            <img src="${img}">
            <button class="btn-remove-img" onclick="tempImgs.splice(${idx},1);renderImgManager();">×</button>
        </div>
    `).join("");
}

// ---------------- 內容顯示與樹狀 ----------------

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
            document.getElementById('current-path').innerHTML = `📍 <strong>${node.name}</strong>`;
            
            if (node.children && node.children.length > 0) {
                childrenBox.style.display = childrenBox.style.display === "none" ? "block" : "none";
            } else {
                renderDisplay(node.items || []);
                if (window.innerWidth <= 1024) toggleMobileMenu();
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
    if (!items || items.length === 0) {
        view.innerHTML = '<div style="text-align:center; padding:50px; color:#999;">目前無內容。</div>';
        return;
    }
    view.innerHTML = items.map((item, idx) => `
        <div class="card ${editingIdx === idx ? 'edit-mode-active' : ''}">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2 style="margin:0 0 10px 0;">${item.name}</h2>
                ${isAdmin ? `
                    <div class="btn-group-row">
                        <button class="btn btn-outline" style="padding:5px 10px" onclick="startEdit(${idx})">✏</button>
                        <button class="btn btn-outline" style="padding:5px 10px; color:red" onclick="deleteItem(${idx})">🗑</button>
                    </div>
                ` : ''}
            </div>
            <div class="gallery">
                ${(item.imgs || []).map(src => `
                    <div class="gallery-item">
                        <img class="gallery-img" src="${src}" onclick="window.open('${src}')" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="img-error-placeholder" style="display:none;">⚠️ 請連網後顯示</div>
                    </div>
                `).join('')}
            </div>
            <p style="white-space: pre-wrap; line-height:1.6; font-size:16px;">${item.text}</p>
        </div>
    `).join("");
}

// ---------------- 編輯與系統設定 ----------------

function toggleAdmin() {
    const pw = prompt("管理密碼:");
    if (pw === db.config.password) {
        isAdmin = true;
        document.getElementById("admin-panel").style.display = "block";
        document.getElementById("btn-settings").style.display = "block";
        document.getElementById("admin-toggle").innerText = "✅ 已進入管理模式";
        alert("管理模式已開啟");
    }
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
    renderDisplay(activeNode.items);
}

function exitEdit() {
    editingIdx = -1;
    tempImgs = [];
    document.getElementById("edit-title").value = "";
    document.getElementById("edit-desc").value = "";
    renderImgManager();
    document.getElementById("btn-save-main").innerText = "💾 儲存";
    document.getElementById("btn-cancel-edit").style.display = "none";
    renderDisplay(activeNode.items);
}

function saveContent() {
    if (!activeNode) return alert("請選路徑");
    const name = document.getElementById("edit-title").value.trim();
    const text = document.getElementById("edit-desc").value.trim();
    if (!name) return alert("請填標題");

    const data = { name, text, imgs: [...tempImgs] };
    if (!activeNode.items) activeNode.items = [];

    if (editingIdx > -1) activeNode.items[editingIdx] = data;
    else activeNode.items.push(data);

    save();
    renderDisplay(activeNode.items);
    exitEdit();
}

function openModal() {
    document.getElementById("set-db-name").value = db.config.dbName;
    document.getElementById("settings-modal").style.display = "flex";
}
function closeModal() { document.getElementById("settings-modal").style.display = "none"; }

function saveSettings() {
    const n = document.getElementById("set-db-name").value;
    const p = document.getElementById("set-new-pw").value;
    if (n) db.config.dbName = n;
    if (p) db.config.password = p;
    save();
    updateUI();
    closeModal();
    alert("設定儲存成功");
}

function addCategory() {
    if (!activeNode) return;
    const n = prompt("分類名稱:");
    if (n) {
        if (!activeNode.children) activeNode.children = [];
        activeNode.children.push({ name: n, children: [], items: [] });
        save();
        renderTree(db.categories, document.getElementById("nav-tree"));
    }
}

function renameCategory() {
    if (!activeNode) return;
    const n = prompt("新名稱:", activeNode.name);
    if (n) { activeNode.name = n; save(); renderTree(db.categories, document.getElementById("nav-tree")); }
}

function deleteCategory() {