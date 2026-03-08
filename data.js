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
                { name: "範例產品", text: "這是預設的資料內容，請進入管理模式修改。", imgs: [] }
            ] 
        }
    ]
};
