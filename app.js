import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDteFOa5JbipcaZAVLFPiU1vnjRGtRtyNs",
    authDomain: "zaiko-click.firebaseapp.com",
    projectId: "zaiko-click",
    storageBucket: "zaiko-click.firebasestorage.app",
    messagingSenderId: "814947556591",
    appId: "1:814947556591:web:b8e4b806223e03fff68f1a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

window.state = {
    lang: 'ja', view: 'main', opMode: 'sale',
    db: JSON.parse(localStorage.getItem('ml_db')) || [],
    logs: JSON.parse(localStorage.getItem('ml_logs')) || [],
    cart: {}, audit_counts: {},
    historyYear: new Date().getFullYear(), historyMonth: new Date().getMonth() + 1
};

let currentUser = null;

const translations = {
    ja: {
        menu_home: "ホーム", menu_reg: "商品登録", menu_audit: "棚卸", menu_history: "履歴", menu_how: "使い方",
        menu_login: "ログイン", menu_logout: "ログアウト", menu_init: "データ初期化",
        tab_sale: "販売", tab_stock_in: "納品", lbl_record_date: "記録日:",
        reg_title: "商品登録", btn_save: "保存", btn_confirm: "確定",
        no_data: "履歴なし", history_unit: "年 / 月"
    },
    en: {
        menu_home: "Home", menu_reg: "Registration", menu_audit: "Audit", menu_history: "History", menu_how: "How To",
        menu_login: "Login", menu_logout: "Logout", menu_init: "Init Local",
        tab_sale: "SALE", tab_stock_in: "STOCK IN", lbl_record_date: "Date:",
        reg_title: "Register", btn_save: "Save", btn_confirm: "CONFIRM",
        no_data: "No data", history_unit: "/ "
    }
};

// 認証関連
window.login = () => signInWithPopup(auth, provider);
window.logout = () => signOut(auth).then(() => location.reload());

onAuthStateChanged(auth, async (user) => {
    const authSection = document.getElementById('auth-section');
    const userDisplay = document.getElementById('user-display');
    if (user) {
        currentUser = user;
        authSection.innerHTML = `<div class="menu-item danger" onclick="logout()">Logout</div>`;
        userDisplay.style.display = 'flex';
        document.getElementById('user-name').innerText = user.displayName;
        document.getElementById('user-photo').src = user.photoURL;
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            state.db = data.db || [];
            state.logs = data.logs || [];
            render();
        }
    } else {
        authSection.innerHTML = `<div class="menu-item" onclick="login()">Login / Register</div>`;
    }
    updateLangUI();
});

window.save = async () => {
    localStorage.setItem('ml_db', JSON.stringify(state.db));
    localStorage.setItem('ml_logs', JSON.stringify(state.logs));
    if (currentUser) {
        await setDoc(doc(db, "users", currentUser.uid), {
            db: state.db, logs: state.logs, updatedAt: new Date()
        });
    }
};

// UI操作
window.view = (v) => {
    state.view = v;
    document.getElementById('drawer').classList.remove('open');
    document.getElementById('drawer-overlay').classList.remove('visible');
    render();
};

window.render = () => {
    const container = document.getElementById('app-content');
    const t = translations[state.lang];
    container.innerHTML = "";
    
    if (state.view === 'main' || state.view === 'audit') {
        state.db.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card' + (p.stock <= p.orderPoint ? ' alert-red' : '');
            card.innerHTML = `
                <button class="btn-delete" onclick="deleteProduct(${p.id})">×</button>
                <div class="product-info" onclick="updateCnt(${p.id}, 1)">
                    <div class="product-name">${p.name}</div>
                    <div class="product-meta"><span>Stock: ${p.stock}</span><span>¥${p.sell}</span></div>
                </div>
                <div class="counter-box">
                    <button class="btn-minus" onclick="updateCnt(${p.id}, -1)">−</button>
                    <div class="count-num">${state.view === 'audit' ? (state.audit_counts[p.id] || 0) : (state.cart[p.id] || 0)}</div>
                </div>`;
            container.appendChild(card);
        });
    }
    updateFabUI();
};

window.updateCnt = (id, delta) => {
    if (state.view === 'audit') {
        state.audit_counts[id] = Math.max(0, (state.audit_counts[id] || 0) + delta);
    } else {
        const p = state.db.find(x => x.id == id);
        let next = (state.cart[id] || 0) + delta;
        if (state.opMode === 'sale') next = Math.min(p.stock, Math.max(0, next));
        if (next === 0) delete state.cart[id]; else state.cart[id] = next;
    }
    render();
};

window.saveProduct = () => {
    const name = document.getElementById('reg-name').value;
    if(!name) return;
    state.db.push({ id: Date.now(), name, stock: 0, sell: document.getElementById('reg-sell').value, orderPoint: parseInt(document.getElementById('reg-order-point').value) || 0 });
    save(); closeModal(); render();
};

function updateFabUI() {
    const count = Object.keys(state.view === 'audit' ? state.audit_counts : state.cart).length;
    document.getElementById('confirm-fab').classList.toggle('visible', count > 0);
    document.getElementById('badge').innerText = count;
}

const updateLangUI = () => {
    const t = translations[state.lang];
    document.querySelectorAll('[data-i18n]').forEach(el => { el.innerText = t[el.dataset.i18n]; });
    render();
};

// Event Listeners
document.getElementById('lang-toggle').onclick = () => { state.lang = state.lang === 'ja' ? 'en' : 'ja'; updateLangUI(); };
document.getElementById('burger').onclick = () => { document.getElementById('drawer').classList.add('open'); document.getElementById('drawer-overlay').classList.add('visible'); };
document.getElementById('drawer-overlay').onclick = () => { document.getElementById('drawer').classList.remove('open'); document.getElementById('drawer-overlay').classList.remove('visible'); };
window.openModal = (id) => document.getElementById(id).classList.add('active');
window.closeModal = () => document.querySelectorAll('.overlay').forEach(o => o.classList.remove('active'));
