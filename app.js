// 初始資料結構
let db = JSON.parse(localStorage.getItem("v6_knowledge_db")) || {
    config: { dbName: "我的企業知識庫", password: "1234" },
    categories: [{ name: "💊 產品百科", children: [], items: [] }]
};

let activeNode = null;
let tempImgs = []; // 暫存目前編輯中的圖片陣列
let editingIdx = -1; // 當前正編輯的條目索引
let isAdmin = false;

function save() { localStorage.setItem("v6_knowledge_db", JSON.stringify(db)); }

function updateUIConfigs() {
    document.getElementById("db-name-display").innerText = db.config.dbName;
    document.title = db.config.dbName;
}

// ---------------- 圖片處理 ----------------

function addLocalImg(input) {
    if (tempImgs.length >= 5) return alert("每個條目最多上傳 5 張圖片");
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
    if (tempImgs.length >= 5) return alert("每個條目最多上傳 5 張圖片");
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

// ---------------- 內容編輯邏輯 ----------------

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
    document.getElementById("btn-save-main").innerText = "💾 儲存內容";
    document.getElementById("btn-cancel-edit").style.display = "none";
    renderDisplay(activeNode.items);
}

function saveContent() {
    if (!activeNode) return alert("請先從左側選單選擇一個分類路徑！");
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
    renderDisplay(activeNode.items);
    exitEdit();
}

// ---------------- 顯示與樹狀選單 ----------------

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
                document.getElementById("display-view").innerHTML = `<div style="color:#999; text-align:center; padding-top:50px;">已選取分類「${node.name}」，請點擊子層級或查看內容。</div>`;
            } else {
                renderDisplay(node.items || []);
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
        view.innerHTML = '<div style="text-align:center; padding:50px; color:#999;">此分類目前無內容。</div>';
        return;
    }
    view.innerHTML = items.map((item, idx) => `
        <div class="card ${editingIdx === idx ? 'edit-mode-active' : ''}">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <h2 style="margin:0 0 15px 0; color:var(--primary);">${item.name}</h2>
                ${isAdmin ? `
                    <div class="btn-group-row">
                        <button class="btn btn-outline" style="padding:4px 10px" onclick="startEdit(${idx})">✏ 編輯</button>
                        <button class="btn btn-outline" style="padding:4px 10px; color:var(--danger)" onclick="deleteItem(${idx})">🗑</button>
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
            <p style="white-space: pre-wrap; line-height:1.7;">${item.text}</p>
        </div>
    `).join("");
}

// ---------------- 管理與設定功能 ----------------

function toggleAdmin() {
    const pw = prompt("請輸入管理密碼:");
    if (pw === db.config.password) {
        isAdmin = true;
        document.getElementById("admin-panel").style.display = "block";
        document.getElementById("btn-settings").style.display = "block";
        document.getElementById("admin-toggle").innerText = "✅ 管理模式中";
        alert("管理員權限已開啟");
    } else {
        alert("密碼錯誤！");
    }
}

function openModal() {
    document.getElementById("set-db-name").value = db.config.dbName;
    document.getElementById("settings-modal").style.display = "flex";
}
function closeModal() { document.getElementById("settings-modal").style.display = "none"; }

function saveSettings() {
    const newName = document.getElementById("set-db-name").value;
    const newPw = document.getElementById("set-new-pw").value;
    if (newName) db.config.dbName = newName;
    if (newPw) db.config.password = newPw;
    save();
    updateUIConfigs();
    closeModal();
    alert("系統設定已儲存！");
}

function addCategory() {
    if (!activeNode) return alert("請先選取父分類");
    const name = prompt("請輸入新分類名稱：");
    if (name) {
        if (!activeNode.children) activeNode.children = [];
        activeNode.children.push({ name, children: [], items: [] });
        save();
        renderTree(db.categories, document.getElementById("nav-tree"));
    }
}

function renameCategory() {
    if (!activeNode) return;
    const name = prompt("請輸入新的分類名稱：", activeNode.name);
    if (name) { activeNode.name = name; save(); renderTree(db.categories, document.getElementById("nav-tree")); }
}

function deleteCategory() {
    if (!activeNode) return;
    if (confirm(`確定要刪除「${activeNode.name}」及其下所有子分類與內容嗎？`)) {
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

function deleteItem(idx) {
    if (confirm("確定要刪除此項內容嗎？")) {
        activeNode.items.splice(idx, 1);
        save();
        renderDisplay(activeNode.items);
    }
}

// 備份匯出
function exportDB() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", db.config.dbName + "_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function importDB(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            db = JSON.parse(e.target.result);
            save();
            location.reload();
        };
        reader.readAsText(file);
    }
}

// ---------------- 搜尋功能 ----------------

function smartSearch() {
    const q = document.getElementById("search-bar").value.toLowerCase();
    if (!q) { if (activeNode) renderDisplay(activeNode.items); return; }
    
    let results = [];
    const searchDeep = (nodes) => {
        nodes.forEach(node => {
            if (node.items) {
                node.items.forEach(item => {
                    if (item.name.toLowerCase().includes(q) || item.text.toLowerCase().includes(q)) {
                        results.push(item);
                    }
                });
            }
            if (node.children) searchDeep(node.children);
        });
    };
    searchDeep(db.categories);
    renderDisplay(results);
}

// 初始化
updateUIConfigs();
renderTree(db.categories, document.getElementById("nav-tree"));