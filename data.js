// data.js - 獨立資料庫檔案
const initialData = {
    config: { 
        dbName: "我的企業知識庫", 
        password: "1234" 
    },
    categories: [
        { 
            name: "💊 產品百科", 
            children: [], 
            items: [
                { name: "範例條目", text: "這是從 data.js 載入的初始內容。", imgs: [] }
            ] 
        }
    ]
};