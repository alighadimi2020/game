const rowTimers = {}; 
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbweegrepVjbxlyETdwJG2n9VyiOVVpKGh-fNac-YGtuLeuk76dRPNm1wT6Q0nHlarQp/exec"; 

// --- بخش تبدیل تاریخ (تقویم شمسی داخلی) ---
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

// --- مدیریت داده‌ها و ذخیره‌سازی ---
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
            startTime: row.dataset.startTime || '', 
            endTime: row.dataset.endTime || '', 
            price: row.querySelector('.priceBox').value,
            paymentType: row.querySelector('.payment-type').value,
            notes: noteElement ? noteElement.value : '',
            isRunning: row.dataset.isRunning === 'true', 
            startTimestamp: row.dataset.startTimestamp || null,
        });
    });
    return rows;
}

function saveData() {
    const data = {
        operatorName: document.getElementById('operatorName').value,
        todayDate: document.getElementById('todayDate').value,
        rows: getRowData(),
    };
    localStorage.setItem('gameRoomData', JSON.stringify(data));
    updateGrandTotal(); 
}

function loadData() {
    const storedData = localStorage.getItem('gameRoomData');
    if (!storedData) {
        document.getElementById('todayDate').value = getShamsiDate();
        return;
    }
    const data = JSON.parse(storedData);
    document.getElementById('operatorName').value = data.operatorName || '';
    document.getElementById('todayDate').value = data.todayDate || getShamsiDate();

    const tableBody = document.querySelector("#gameTable tbody");
    tableBody.innerHTML = ''; 
    document.getElementById("notes-list").innerHTML = ''; 

    data.rows.forEach(rowData => {
        addRow(rowData);
        if (rowData.isRunning) {
            const rowElement = document.querySelector(`tr[data-row-id="${rowData.id}"]`);
            if (rowElement) startStopwatch(rowElement, true);
        }
    });
    updateGrandTotal();
}

// --- محاسبات ---
function updateGrandTotal() {
    let grandTotal = 0;
    document.querySelectorAll('.priceBox').forEach(box => {
        grandTotal += parseFloat(box.value) || 0; 
    });
    document.getElementById('totalAmount').textContent = grandTotal.toLocaleString('fa-IR') + " تومان";
}

function getHourlyRate(controllers) {
    const rates = { '1': 80000, '2': 140000, '3': 165000, '4': 220000 };
    return rates[controllers] || 0;
}

function calculateTotal(rowElement) {
    const rate = getHourlyRate(rowElement.querySelector('.controller-select').value);
    const start = rowElement.dataset.startTime;
    const end = rowElement.dataset.endTime;

    if (!start || !end || rate === 0) return;

    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff < 0) diff += 1440; 

    const totalPrice = (diff / 60) * rate;
    rowElement.querySelector('.priceBox').value = Math.round(totalPrice);
    saveData();
}

// --- مدیریت ردیف‌ها و تایمر ---
function addRow(data = {}) {
    const tableBody = document.querySelector("#gameTable tbody");
    const rowId = data.id || `row-${Date.now()}`;
    const row = document.createElement("tr");
    row.dataset.rowId = rowId;
    
    const rowData = { name: '', tvNum: '1', controller: '4', price: '0', paymentType: 'cash', isRunning: false, ...data };

    row.innerHTML = `
        <td data-label="نام"><input type="text" class="person-name" value="${rowData.name}" onchange="saveData(); updateNoteHeader(this.closest('tr'));"></td> 
        <td data-label="TV">
            <select class="tv-number" onchange="saveData(); updateNoteHeader(this.closest('tr'));">
                ${[1,2,3,4,5].map(n => `<option value="${n}" ${rowData.tvNum == n ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
        </td>
        <td data-label="دسته">
            <select class="controller-select" onchange="calculateTotal(this.closest('tr')); saveData();">
                <option value="4" ${rowData.controller == '4' ? 'selected' : ''}>4 دسته</option>
                <option value="3" ${rowData.controller == '3' ? 'selected' : ''}>3 دسته</option>
                <option value="2" ${rowData.controller == '2' ? 'selected' : ''}>2 دسته</option>
                <option value="1" ${rowData.controller == '1' ? 'selected' : ''}>1 دسته</option>
            </select>
        </td>
        <td data-label="زمان">
            <button class="stop-button" onclick="handleTimer(this.closest('tr'))">${rowData.isRunning ? 'اتمام' : 'شروع'}</button>
            <div class="duration-display">${rowData.isRunning ? '...' : '00:00:00'}</div>
        </td>
        <td data-label="شروع" class="display-start-time">${rowData.startTime || '---'}</td>
        <td data-label="پایان" class="display-end-time">${rowData.endTime || '---'}</td>
        <td data-label="قیمت"><input class="priceBox" type="text" readonly value="${rowData.price}"></td>
        <td data-label="پرداخت">
            <select class="payment-type" onchange="saveData()">
                <option value="cash" ${rowData.paymentType == 'cash' ? 'selected' : ''}>نقد</option>
                <option value="card" ${rowData.paymentType == 'card' ? 'selected' : ''}>کارت</option>
            </select>
        </td>
        <td data-label="عملیات"><button class="delete-button" onclick="deleteRow(this.closest('tr'))">حذف</button></td>
    `;
    
    row.dataset.startTime = rowData.startTime || '';
    row.dataset.endTime = rowData.endTime || '';
    row.dataset.isRunning = rowData.isRunning;
    row.dataset.startTimestamp = rowData.startTimestamp || '';

    tableBody.appendChild(row);
    createNoteBox(rowId, rowData);
    updateGrandTotal();
}

function handleTimer(rowElement) {
    if (rowElement.dataset.isRunning === 'true') {
        stopStopwatch(rowElement);
    } else {
        startStopwatch(rowElement);
    }
}

function startStopwatch(rowElement, isRecovery = false) {
    const rowId = rowElement.dataset.rowId;
    const now = new Date();
    
    if (!isRecovery) {
        rowElement.dataset.startTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        rowElement.dataset.startTimestamp = now.getTime();
        rowElement.dataset.isRunning = 'true';
        rowElement.querySelector('.display-start-time').textContent = rowElement.dataset.startTime;
    }

    rowElement.querySelector('.stop-button').textContent = 'اتمام';
    
    rowTimers[rowId] = setInterval(() => {
        const elapsed = new Date().getTime() - parseInt(rowElement.dataset.startTimestamp);
        rowElement.querySelector('.duration-display').textContent = formatDuration(elapsed);
    }, 1000);
    saveData();
}

function stopStopwatch(rowElement) {
    const rowId = rowElement.dataset.rowId;
    clearInterval(rowTimers[rowId]);
    
    const now = new Date();
    rowElement.dataset.endTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    rowElement.querySelector('.display-end-time').textContent = rowElement.dataset.endTime;
    rowElement.dataset.isRunning = 'false';
    rowElement.querySelector('.stop-button').textContent = 'تمام شده';
    rowElement.querySelector('.stop-button').disabled = true;

    calculateTotal(rowElement);
    saveData();
}

function formatDuration(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor((s%3600)/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
}

async function sendToGoogleSheet() {
    const btn = document.getElementById('submitToSheetBtn');
    const operator = document.getElementById('operatorName').value;
    if(!operator) { alert("لطفاً نام متصدی را وارد کنید"); return; }

    btn.disabled = true;
    btn.textContent = "در حال ارسال...";

    const data = {
        operator: operator,
        date: document.getElementById('todayDate').value,
        rows: getRowData()
    };

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        alert("اطلاعات با موفقیت به دفتر آنلاین ارسال شد!");
    } catch (e) {
        console.error(e);
        alert("خطا در ارسال.");
    } finally {
        btn.disabled = false;
        btn.textContent = "🚀 ارسال به گوگل شیت";
    }
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

function updateNoteHeader(row) {
    const noteBox = document.getElementById(`note-box-${row.dataset.rowId}`);
    if(noteBox) noteBox.querySelector('.note-header').textContent = `مشتری: ${row.querySelector('.person-name').value} | TV: ${row.querySelector('.tv-number').value}`;
}

function deleteRow(row) {
    if(confirm("حذف شود؟")) {
        clearInterval(rowTimers[row.dataset.rowId]);
        document.getElementById(`note-box-${row.dataset.rowId}`).remove();
        row.remove();
        saveData();
    }
}

// --- بخش اجرایی و فعال‌سازی تقویم (اصلاح شده) ---
document.addEventListener('DOMContentLoaded', () => {
    // ۱. لود کردن داده‌های ذخیره شده
    loadData();

    // ۲. فعال‌سازی تقویم شمسی روی فیلد تاریخ
    if (window.jQuery && $.fn.persianDatepicker) {
        $("#todayDate").persianDatepicker({
            format: 'YYYY/MM/DD',
            autoClose: true,
            onSelect: function() {
                saveData(); // ذخیره خودکار بعد از انتخاب تاریخ
            }
        });
    }

    // ۳. تنظیم رویداد دکمه‌ها
    document.getElementById("addRowBtn").onclick = () => { 
        addRow(); 
        saveData(); 
    };

    document.getElementById("refreshBtn").onclick = () => { 
        if(confirm("کل جدول پاک شود؟")) { 
            localStorage.clear(); 
            location.reload(); 
        } 
    };

    const sheetBtn = document.getElementById("submitToSheetBtn");
    if(sheetBtn) sheetBtn.onclick = sendToGoogleSheet;
});
