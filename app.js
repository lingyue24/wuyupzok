let db = JSON.parse(localStorage.getItem("v6_knowledge_db")) || {
    config: { dbName: "企業知識庫", password: "1234" },
    categories: [{ name: "💊 產品百科", children: [], items: [] }]
};

let activeNode = null;
let isAdmin = false;

// 儲存資料
function save() { localStorage.setItem("v6_knowledge_db", JSON.stringify(db)); }

// 開啟選單
function openMenu() {
    document.getElementById("sidebar").classList.add("show-sidebar");
    document.getElementById("sidebar-overlay").classList.add("show-overlay");
}

// 關閉選單
function closeMenu() {
    document.getElementById("sidebar").classList.remove("show-sidebar");
    document.getElementById("sidebar-overlay").classList.remove("show-overlay");
}

// 渲染樹狀圖
function renderTree(nodes, container) {
    container.innerHTML = "";
    nodes.forEach((node) => {
        let title = document.createElement("div");
        title.className = "nav-node";
        title.innerHTML = (node.children && node.children.length > 0 ? "📂 " : "📄 ") + node.name;
        
        let childrenBox = document.createElement("div");
        childrenBox.style.display = "none";
        childrenBox.style.paddingLeft = "15px";

        title.onclick = (e) => {
            e.stopPropagation();
            activeNode = node;
            document.querySelectorAll('.nav-node').forEach(el => el.classList.remove('active-node'));
            title.classList.add('active-node');
            
            if (node.children && node.children.length > 0) {
                childrenBox.style.display = childrenBox.style.display === "none" ? "block" : "none";
            } else {
                renderDisplay(node.items || []);
                // 點擊具體項目後，如果是手機版則強制收回選單
                if (window.innerWidth <= 1024) closeMenu();
            }
        };

        container.appendChild(title);
        if (node.children) {
            renderTree(node.children, childrenBox);
            container.appendChild(childrenBox);
        }
    });
}

function renderDisplay(items) {
    const view = document.getElementById("display-view");
    if (!items || items.length === 0) {
        view.innerHTML = '<p style="color:#999; text-align:center;">暫無內容</p>';
        return;
    }
    view.innerHTML = items.map(item => `
        <div class="card">
            <h3>${item.name}</h3>
            <p style="white-space: pre-wrap;">${item.text}</p>
        </div>
    `).join("");
}

// 管理登入
function toggleAdmin() {
    const pw = prompt("請輸入管理密碼:");
    if (pw === db.config.password) {
        isAdmin = true;
        document.getElementById("admin-panel").style.display = "block";
        document.getElementById("btn-settings").style.display = "block";
        alert("管理模式已開啟");
    }
}

// 搜尋
function smartSearch() {
    const q = document.getElementById("search-bar").value.toLowerCase();
    let res = [];
    const s = (nodes) => nodes.forEach(n => {
        if (n.items) n.items.forEach(i => { if (i.name.toLowerCase().includes(q)) res.push(i); });
        if (n.children) s(n.children);
    });
    s(db.categories);
    renderDisplay(res);
}

// 啟動系統
window.onload = function() {
    document.getElementById("db-name-display").innerText = db.config.dbName;
    renderTree(db.categories, document.getElementById("nav-tree"));
};

// 彈窗控制
function openModal() { document.getElementById("settings-modal").style.display = "flex"; }
function closeModal() { document.getElementById("settings-modal").style.display = "none"; }