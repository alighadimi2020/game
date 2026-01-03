// --- تنظیمات اولیه ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw9H-cCCUNad8eGHLiy8ZwsDIpHJ4L5Tkmrdb2uzmBahDTDivxSFyFEigJLWUoWuMyK/exec"; 

// --- توابع کمکی تبدیل قیمت و تاریخ ---
function formatPrice(number) {
    if (!number) return "0";
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function unformatPrice(string) {
    if (!string) return "0";
    return string.toString().replace(/,/g, '');
}

function toJalali(gy, gm, gd) {
    var g_days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var j_days_in_month = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
    var g_y = gy, g_m = gm, g_d = gd;
    var j_y, j_m, j_d, i, day_no = g_d;
    if ((g_y % 4 === 0 && g_y % 100 !== 0) || (g_y % 400 === 0)) g_days_in_month[1] = 29;
    for (i = 0; i < g_m - 1; i++) day_no += g_days_in_month[i];
    var gy_days = g_y - 1600;
    var leap = Math.floor(gy_days / 4) - Math.floor((gy_days - 1) / 100) + Math.floor((gy_days - 399) / 400);
    day_no += 365 * gy_days + leap - 79;
    var j_np = Math.floor(day_no / 12053);
    j_y = 979 + 33 * j_np;
    day_no %= 12053;
    var is_j_leap = (y) => (y % 33) == 1 || (y % 33) == 5 || (y % 33) == 9 || (y % 33) == 13 || (y % 33) == 17 || (y % 33) == 22 || (y % 33) == 26 || (y % 33) == 30;
    var j_y_days = is_j_leap(j_y) ? 366 : 365;
    while (day_no >= j_y_days) { day_no -= j_y_days; j_y++; j_y_days = is_j_leap(j_y) ? 366 : 365; }
    if (is_j_leap(j_y)) j_days_in_month[11] = 30;
    for (i = 0; i < 12 && day_no >= j_days_in_month[i]; i++) day_no -= j_days_in_month[i];
    j_m = i + 1; j_d = day_no + 1;
    const pad = (n) => String(n).padStart(2, '0');
    return `${j_y}/${pad(j_m)}/${pad(j_d)}`;
}

function getShamsiDate() {
    const now = new Date();
    return toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

// --- مدیریت داده‌ها و همگام‌سازی ---
function getRowData() {
    const rows = [];
    document.querySelectorAll('#gameTable tbody tr').forEach(row => {
        const rowId = row.dataset.rowId; 
        const noteElement = document.getElementById(`note-${rowId}`);
        rows.push({
            id: rowId,
            name: row.querySelector('.person-name').value,
            tvNum: row.querySelector('.tv-number').value,
            controller: row.querySelector('.controller-select').value,
            startTime: row.querySelector('.start-time-input').value || '', 
            endTime: row.querySelector('.end-time-input').value || '', 
            price: unformatPrice(row.querySelector('.priceBox').value),
            paymentType: row.querySelector('.payment-type').value,
            notes: noteElement ? noteElement.value : '',
        });
    });
    return rows;
}

function saveData() {
    const data = {
        operatorName: document.getElementById('operatorName').value,
        todayDate: document.getElementById('todayDate').value,
        rows: getRowData()
    };
    localStorage.setItem('gameRoomData', JSON.stringify(data));
    updateGrandTotal();
}

async function syncFromGoogleSheet() {
    try {
        const response = await fetch(SCRIPT_URL);
        const remoteData = await response.json();
        if (remoteData && remoteData.length > 0) {
            const tableBody = document.querySelector("#gameTable tbody");
            const notesList = document.getElementById("notes-list");
            tableBody.innerHTML = ''; 
            notesList.innerHTML = ''; 
            remoteData.forEach(row => {
                addRow({ ...row, isSent: true });
            });
            updateGrandTotal();
            return true;
        }
    } catch (e) {
        console.error("خطا در دریافت از گوگل:", e);
        return false;
    }
}

async function sendToGoogleSheet(silent = false) {
    const btn = document.getElementById('submitToSheetBtn');
    const operator = document.getElementById('operatorName').value;
    
    if(!operator) { 
        if(!silent) alert("لطفاً نام متصدی را وارد کنید"); 
        return; 
    }

    const rowsToSend = getRowData(); 
    if (rowsToSend.length === 0) return;

    if(!silent) {
        btn.disabled = true;
        btn.textContent = "در حال ارسال...";
    }

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({
                action: "sendData",
                operator: operator,
                date: document.getElementById('todayDate').value,
                rows: rowsToSend
            })
        });
        if (!silent) alert("اطلاعات همگام‌سازی شد ✅");
        saveData(); 
    } catch (e) {
        if (!silent) alert("خطا در ارتباط با سرور");
    } finally {
        if(!silent) {
            btn.disabled = false;
            btn.textContent = "🚀 ارسال به گوگل شیت";
        }
    }
}

// --- توابع رابط کاربری و محاسبات ---
function updateGrandTotal() {
    let grandTotal = 0;
    document.querySelectorAll('.priceBox').forEach(box => {
        grandTotal += parseFloat(unformatPrice(box.value)) || 0; 
    });
    const totalDisplay = document.getElementById('totalAmount');
    if(totalDisplay) {
        totalDisplay.textContent = formatPrice(grandTotal) + " تومان";
    }
}

function calculateTotal(rowElement) {
    const rates = { '1': 80000, '2': 140000, '3': 165000, '4': 220000 };
    const rate = rates[rowElement.querySelector('.controller-select').value] || 0;
    const start = rowElement.querySelector('.start-time-input').value;
    const end = rowElement.querySelector('.end-time-input').value;

    if (start && end) {
        const [h1, m1] = start.split(':').map(Number);
        const [h2, m2] = end.split(':').map(Number);
        let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diff < 0) diff += 1440; 
        const resultPrice = Math.round((diff / 60) * rate);
        rowElement.querySelector('.priceBox').value = formatPrice(resultPrice); 
    }
    saveData();
}

function addRow(data = {}) {
    const tableBody = document.querySelector("#gameTable tbody");
    const rowId = data.id || `row-${Date.now()}`;
    const row = document.createElement("tr");
    row.dataset.rowId = rowId;
    
    const rowData = { 
        name: '', tvNum: '', controller: '4', price: '0', 
        paymentType: 'cash', startTime: '', endTime: '', ...data 
    };

    row.innerHTML = `
        <td data-label="نام"><input type="text" class="person-name" value="${rowData.name}" onchange="saveData()"></td> 
        <td data-label="TV">
            <select class="tv-number" onchange="saveData()">
                <option value="">...</option>
                ${[1,2,3,4,5,6,7,8].map(n => `<option value="${n}" ${rowData.tvNum == n ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
        </td>
        <td data-label="دسته">
            <select class="controller-select" onchange="calculateTotal(this.closest('tr'))">
                <option value="4" ${rowData.controller == '4' ? 'selected' : ''}>4 دسته</option>
                <option value="2" ${rowData.controller == '2' ? 'selected' : ''}>2 دسته</option>
            </select>
        </td>
        <td data-label="شروع"><input type="time" class="start-time-input" value="${rowData.startTime}" onchange="calculateTotal(this.closest('tr'))"></td>
        <td data-label="پایان"><input type="time" class="end-time-input" value="${rowData.endTime}" onchange="calculateTotal(this.closest('tr'))"></td>
        <td data-label="قیمت"><input class="priceBox" type="text" readonly value="${formatPrice(rowData.price)}"></td>
        <td data-label="پرداخت">
            <select class="payment-type" onchange="saveData()">
                <option value="cash" ${rowData.paymentType == 'cash' ? 'selected' : ''}>نقد</option>
                <option value="card" ${rowData.paymentType == 'card' ? 'selected' : ''}>کارت</option>
            </select>
        </td>
        <td data-label="حذف"><button class="delete-button" onclick="deleteRow(this.closest('tr'))">حذف</button></td>
    `;
    
    tableBody.appendChild(row);
    createNoteBox(rowId, rowData);
    updateGrandTotal();
}

function createNoteBox(rowId, rowData) {
    const container = document.getElementById("notes-list");
    const div = document.createElement("div");
    div.className = "row-note-box";
    div.id = `note-box-${rowId}`;
    div.innerHTML = `
        <div class="note-header">مشتری: ${rowData.name || 'جدید'} | TV: ${rowData.tvNum}</div>
        <textarea id="note-${rowId}" class="note-textarea" onchange="saveData()">${rowData.notes || ''}</textarea>
    `;
    container.appendChild(div);
}

function deleteRow(row) {
    if(confirm("از لیست حذف شود؟")) {
        document.getElementById(`note-box-${row.dataset.rowId}`).remove();
        row.remove();
        saveData();
    }
}

// --- مدیریت منو و بارگذاری ---
document.addEventListener('DOMContentLoaded', async () => {
    // مرحله ۱: همگام‌سازی از گوگل
    const synced = await syncFromGoogleSheet();
    
    // مرحله ۲: اگر گوگل خالی بود یا خطا داد، از حافظه محلی لود کن
    if (!synced || document.querySelectorAll('#gameTable tbody tr').length === 0) {
        const stored = JSON.parse(localStorage.getItem('gameRoomData'));
        if (stored) {
            document.getElementById('operatorName').value = stored.operatorName || '';
            document.getElementById('todayDate').value = stored.todayDate || getShamsiDate();
            stored.rows.forEach(r => addRow(r));
        } else {
            document.getElementById('todayDate').value = getShamsiDate();
        }
    }

    // مرحله ۳: تنظیم دکمه‌ها
    document.getElementById("addRowBtn").onclick = () => { addRow(); saveData(); };
    document.getElementById("submitToSheetBtn").onclick = () => sendToGoogleSheet();
    
    document.getElementById("refreshBtn").onclick = async () => { 
        if(confirm("سیستم ابتدا داده‌ها را ذخیره کرده و حساب‌های بسته را آرشیو می‌کند. ادامه؟")) {
            await sendToGoogleSheet(true);
            await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify({ action: "clearForOperators" })
            });
            location.reload();
        }
    };

    // منوی همبرگری
    const menuBtn = document.getElementById('menuToggleBtn');
    const menu = document.getElementById('optionsMenu');
    if(menuBtn && menu) {
        menuBtn.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('show-menu'); };
        document.onclick = () => menu.classList.remove('show-menu');
    }
});

// اسپلش اسکرین
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.style.display = 'none', 1000);
        }
    }, 2000);
});
