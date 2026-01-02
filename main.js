const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwsuIW7NzGZ7qCps4nQ-xM_BKcJh2ILqa9W93_XTS1LbzriVYdV8hzpSyNGyKvDqnTc2g/exec"; 

// --- بخش تبدیل تاریخ شمسی (همان کد قبلی خودت) ---
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

// --- توابع کمکی ---
function formatPrice(n) { return n ? n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0"; }
function unformatPrice(s) { return s.toString().replace(/,/g, ''); }

function calculateTotal(row) {
    const rates = { '1': 80000, '2': 140000, '3': 165000, '4': 220000 };
    const rate = rates[row.querySelector('.controller-select').value] || 0;
    const start = row.querySelector('.start-time-input').value;
    const end = row.querySelector('.end-time-input').value;
    if (!start || !end) return;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff < 0) diff += 1440;
    row.querySelector('.priceBox').value = formatPrice(Math.round((diff / 60) * rate));
}

// --- مدیریت ردیف‌ها ---
function addRow(data = {}) {
    const tableBody = document.querySelector("#gameTable tbody");
    const rowId = data.id || `row-${Date.now()}`;
    if (document.querySelector(`tr[data-row-id="${rowId}"]`)) return;

    const row = document.createElement("tr");
    row.dataset.rowId = rowId;
    const rowData = { name: '', tvNum: '', controller: '4', startTime: '', endTime: '', ...data };

    row.innerHTML = `
        <td data-label="نام"><input type="text" class="person-name" value="${rowData.name}" onchange="updateNoteHeader(this.closest('tr'))"></td> 
        <td data-label="TV">
            <select class="tv-number" onchange="updateNoteHeader(this.closest('tr'))">
                <option value="">...</option>
                ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}" ${rowData.tvNum == n ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
        </td>
        <td data-label="دسته">
            <select class="controller-select" onchange="calculateTotal(this.closest('tr'))">
                <option value="4" ${rowData.controller == '4' ? 'selected' : ''}>4 دسته</option>
                <option value="2" ${rowData.controller == '2' ? 'selected' : ''}>2 دسته</option>
            </select>
        </td>
        <td data-label="عملیات">
            <button class="action-btn" onclick="handleAction(this.closest('tr'))">
                ${rowData.startTime ? 'اتمام بازی' : 'شروع بازی'}
            </button>
        </td>
        <td data-label="شروع"><input type="time" class="start-time-input" value="${rowData.startTime}" readonly></td>
        <td data-label="پایان"><input type="time" class="end-time-input" value="${rowData.endTime}" readonly></td>
        <td data-label="قیمت"><input class="priceBox" type="text" readonly value="0"></td>
        <td data-label="حذف"><button onclick="deleteRow(this.closest('tr'))">❌</button></td>
    `;
    tableBody.appendChild(row);
    createNoteBox(rowId, rowData);
}

async function handleAction(row) {
    const btn = row.querySelector('.action-btn');
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    if (btn.textContent.includes('شروع')) {
        const name = row.querySelector('.person-name').value;
        const tv = row.querySelector('.tv-number').value;
        if(!name || !tv) return alert("نام و TV الزامی است");
        row.querySelector('.start-time-input').value = time;
        btn.textContent = 'اتمام بازی';
        fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({
            action: "start", rowId: row.dataset.rowId, name: name, tvNum: tv, startTime: time,
            controller: row.querySelector('.controller-select').value, operator: document.getElementById('operatorName').value
        })});
    } else {
        row.querySelector('.end-time-input').value = time;
        calculateTotal(row);
        btn.disabled = true; btn.textContent = 'ثبت شد';
        fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({
            action: "end", rowId: row.dataset.rowId, endTime: time, price: row.querySelector('.priceBox').value
        })});
        setTimeout(() => row.remove(), 2000); // حذف از صفحه بعد از ۲ ثانیه
    }
}

// --- همگام‌سازی و یادداشت‌ها ---
async function syncDevices() {
    try {
        const res = await fetch(SCRIPT_URL + "?t=" + new Date().getTime());
        const actives = await res.json();
        actives.forEach(item => {
            if (!document.querySelector(`tr[data-row-id="${item.rowId}"]`)) {
                addRow({ id: item.rowId, name: item.name, tvNum: item.tvNum, startTime: item.startTime, controller: item.controller });
            }
        });
        document.querySelectorAll('#gameTable tbody tr').forEach(row => {
            if (row.querySelector('.start-time-input').value && !actives.find(a => a.rowId === row.dataset.rowId)) row.remove();
        });
    } catch (e) {}
}

function createNoteBox(id, data) {
    const container = document.getElementById("notes-list");
    if (document.getElementById(`note-box-${id}`)) return;
    const div = document.createElement("div");
    div.className = "row-note-box"; div.id = `note-box-${id}`;
    div.innerHTML = `<div class="note-header">مشتری: ${data.name || 'جدید'} | TV: ${data.tvNum}</div><textarea class="note-textarea">${data.notes || ''}</textarea>`;
    container.appendChild(div);
}

function updateNoteHeader(row) {
    const box = document.getElementById(`note-box-${row.dataset.rowId}`);
    if(box) box.querySelector('.note-header').textContent = `مشتری: ${row.querySelector('.person-name').value} | TV: ${row.querySelector('.tv-number').value}`;
}

function deleteRow(row) { if(confirm("حذف شود؟")) { const nb = document.getElementById(`note-box-${row.dataset.rowId}`); if(nb) nb.remove(); row.remove(); } }

// --- اجرا ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('todayDate').value = getShamsiDate();
    syncDevices();
    setInterval(syncDevices, 10000);
    document.getElementById("addRowBtn").onclick = () => addRow();
    
    // اسپلش و منو
    setTimeout(() => { document.getElementById('splash-screen').style.display = 'none'; }, 2000);
    const mBtn = document.getElementById('menuToggleBtn');
    const mnu = document.getElementById('optionsMenu');
    if(mBtn) mBtn.onclick = (e) => { e.stopPropagation(); mnu.classList.toggle('show-menu'); };
});
