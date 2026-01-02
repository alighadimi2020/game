const rowTimers = {}; 
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwddG1JF1oGAVf75Q3ZU7yhw6bsJX2-bG-4ydidO4wa7RrAOeNb1KcHEs3oY-rxrg_MQA/exec"; 

// --- بخش تبدیل تاریخ و فرمت‌دهی (بدون تغییر) ---
function formatPrice(number) {
    if (!number) return "0";
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function unformatPrice(string) {
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

// --- مدیریت داده‌ها و LocalStorage ---
function saveData() {
    const allRows = [];
    document.querySelectorAll('#gameTable tbody tr').forEach(row => {
        const rowId = row.dataset.rowId;
        const noteElement = document.getElementById(`note-${rowId}`);
        allRows.push({
            id: rowId,
            name: row.querySelector('.person-name').value,
            tvNum: row.querySelector('.tv-number').value,
            controller: row.querySelector('.controller-select').value,
            startTime: row.dataset.startTime || '',
            endTime: row.dataset.endTime || '',
            price: unformatPrice(row.querySelector('.priceBox').value),
            paymentType: row.querySelector('.payment-type').value,
            notes: noteElement ? noteElement.value : '',
            isRunning: row.dataset.isRunning === 'true',
            isSent: row.dataset.isSent === 'true',
            startTimestamp: row.dataset.startTimestamp || null
        });
    });

    const data = {
        operatorName: document.getElementById('operatorName').value,
        todayDate: document.getElementById('todayDate').value,
        rows: allRows
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

    data.rows.forEach(rowData => {
        addRow(rowData);
        if (rowData.isRunning) {
            const rowElement = document.querySelector(`tr[data-row-id="${rowData.id}"]`);
            if (rowElement) startStopwatch(rowElement, true);
        }
    });
}

// --- منطق اصلی بازی و قیمت ---
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
    const resultPrice = Math.round((diff / 60) * rate);
    rowElement.querySelector('.priceBox').value = formatPrice(resultPrice); 
    saveData();
}

function addRow(data = {}) {
    const tableBody = document.querySelector("#gameTable tbody");
    const rowId = data.id || `row-${Date.now()}`;
    if (document.querySelector(`tr[data-row-id="${rowId}"]`)) return;

    const row = document.createElement("tr");
    row.dataset.rowId = rowId;
    row.onclick = function(e) {
        if (['INPUT', 'SELECT', 'BUTTON'].includes(e.target.tagName)) return;
        this.classList.toggle('collapsed');
    };

    const rowData = { 
        name: '', tvNum: '', controller: '4', price: '0', 
        paymentType: 'cash', isRunning: false, isSent: false, 
        startTime: '', endTime: '', ...data 
    };

    row.innerHTML = `
        <td data-label="نام"><input type="text" class="person-name" value="${rowData.name}" onchange="saveData(); updateNoteHeader(this.closest('tr'));"></td> 
        <td data-label="TV">
            <select class="tv-number" onchange="checkDuplicateTV(this); updateNoteHeader(this.closest('tr'));">
                <option value="">...</option>
                ${[1,2,3,4,5,6,7,8].map(n => `<option value="${n}" ${rowData.tvNum == n ? 'selected' : ''}>${n}</option>`).join('')}
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
            <div class="duration-display">00:00:00</div>
        </td>
        <td data-label="شروع"><input type="time" class="start-time-input" value="${rowData.startTime}" onchange="manualTimeChange(this.closest('tr'))"></td>
        <td data-label="پایان"><input type="time" class="end-time-input" value="${rowData.endTime}" onchange="manualTimeChange(this.closest('tr'))"></td>
        <td data-label="قیمت"><input class="priceBox" type="text" readonly value="${formatPrice(rowData.price)}"></td>
        <td data-label="پرداخت">
            <select class="payment-type" onchange="saveData()">
                <option value="cash" ${rowData.paymentType == 'cash' ? 'selected' : ''}>نقد</option>
                <option value="card" ${rowData.paymentType == 'card' ? 'selected' : ''}>کارت</option>
            </select>
        </td>
        <td data-label="عملیات"><button class="delete-button" onclick="deleteRow(this.closest('tr'))">حذف</button></td>
    `;
    
    row.dataset.isRunning = rowData.isRunning;
    row.dataset.startTime = rowData.startTime;
    row.dataset.startTimestamp = rowData.startTimestamp || '';
    tableBody.appendChild(row);
    createNoteBox(rowId, rowData);
    updateGrandTotal();
}

function handleTimer(rowElement) {
    if (rowElement.dataset.isRunning === 'true') {
        stopStopwatch(rowElement);
    } else {
        const tvNum = rowElement.querySelector('.tv-number').value;
        const personName = rowElement.querySelector('.person-name').value;
        if (!tvNum || !personName) { alert("نام و شماره TV را وارد کنید."); return; }
        startStopwatch(rowElement);
    }
}

function startStopwatch(rowElement, isRecovery = false) {
    const rowId = rowElement.dataset.rowId;
    const now = new Date();
    
    if (!isRecovery) {
        const startTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        rowElement.dataset.startTime = startTime;
        rowElement.querySelector('.start-time-input').value = startTime;
        rowElement.dataset.startTimestamp = now.getTime();
        rowElement.dataset.isRunning = 'true';

        // اطلاع سریع به گوگل شیت
        fetch(SCRIPT_URL, { 
            method: 'POST', 
            mode: 'no-cors',
            body: JSON.stringify({
                action: "start",
                rowId: rowId,
                name: rowElement.querySelector('.person-name').value,
                tvNum: rowElement.querySelector('.tv-number').value,
                startTime: startTime,
                operator: document.getElementById('operatorName').value
            }) 
        });
    }

    rowElement.querySelector('.stop-button').textContent = 'اتمام';
    
    // اجرای کرونومتر
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
    const endTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    
    rowElement.querySelector('.end-time-input').value = endTime;
    rowElement.dataset.endTime = endTime;
    rowElement.dataset.isRunning = 'false';
    rowElement.querySelector('.stop-button').textContent = 'تمام شده';
    rowElement.querySelector('.stop-button').disabled = true;

    calculateTotal(rowElement);
    saveData();

    // اطلاع به شیت برای اتمام و ثبت قیمت
    fetch(SCRIPT_URL, { 
        method: 'POST', 
        mode: 'no-cors',
        body: JSON.stringify({
            action: "end",
            rowId: rowId,
            endTime: endTime,
            price: rowElement.querySelector('.priceBox').value
        }) 
    });
}

// --- سیستم هماهنگی خودکار ---
async function syncWithServer() {
    try {
        const response = await fetch(SCRIPT_URL + "?t=" + new Date().getTime());
        const actives = await response.json();
        
        // ۱. اضافه کردن ردیف‌های جدیدی که در این دستگاه نیستند
        actives.forEach(item => {
            const existingRow = document.querySelector(`tr[data-row-id="${item.rowId}"]`);
            if (!existingRow) {
                const now = new Date();
                const [h, m] = item.startTime.split(':');
                // اصلاح مهم: ساخت دقیق Timestamp برای جلوگیری از NaN
                const startTS = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(h), parseInt(m), 0).getTime();

                addRow({
                    id: item.rowId,
                    name: item.name,
                    tvNum: item.tvNum,
                    startTime: item.startTime,
                    isRunning: true,
                    startTimestamp: startTS
                });
                const newRow = document.querySelector(`tr[data-row-id="${item.rowId}"]`);
                startStopwatch(newRow, true);
            }
        });

        // ۲. غیرفعال کردن ردیف‌هایی که در دستگاه‌های دیگر "اتمام" شده‌اند
        const allLocalRows = document.querySelectorAll('#gameTable tbody tr');
        allLocalRows.forEach(localRow => {
            if (localRow.dataset.isRunning === 'true') {
                const isStillActive = actives.find(a => a.rowId === localRow.dataset.rowId);
                if (!isStillActive) {
                    // اگر در شیت نبود، یعنی متصدی دیگر اتمام را زده
                    clearInterval(rowTimers[localRow.dataset.rowId]);
                    localRow.dataset.isRunning = 'false';
                    localRow.querySelector('.stop-button').textContent = 'اتمام در دستگاه دیگر';
                    localRow.querySelector('.stop-button').disabled = true;
                    localRow.style.opacity = "0.7";
                }
            }
        });
    } catch (e) { console.log("در حال هماهنگ‌سازی..."); }
}

// --- توابع کمکی رابط کاربری ---
function formatDuration(ms) {
    if (isNaN(ms) || ms < 0) return "00:00:00";
    const s = Math.floor(ms / 1000);
    const hours = Math.floor(s / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const seconds = (s % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

function updateGrandTotal() {
    let grandTotal = 0;
    document.querySelectorAll('.priceBox').forEach(box => { grandTotal += parseFloat(unformatPrice(box.value)) || 0; });
    const totalDisplay = document.getElementById('totalAmount');
    if(totalDisplay) totalDisplay.textContent = grandTotal.toLocaleString('fa-IR') + " تومان";
}

function createNoteBox(rowId, rowData) {
    const container = document.getElementById("notes-list");
    if (document.getElementById(`note-box-${rowId}`)) return;
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
        const noteBox = document.getElementById(`note-box-${row.dataset.rowId}`);
        if(noteBox) noteBox.remove();
        row.remove();
        saveData();
    }
}

function manualTimeChange(rowElement) {
    rowElement.dataset.startTime = rowElement.querySelector('.start-time-input').value;
    rowElement.dataset.endTime = rowElement.querySelector('.end-time-input').value;
    calculateTotal(rowElement);
}

function checkDuplicateTV(selectElement) {
    const selectedTV = selectElement.value;
    const currentRow = selectElement.closest('tr');
    let isDuplicate = false;
    document.querySelectorAll('#gameTable tbody tr').forEach(row => {
        if (row !== currentRow && row.querySelector('.tv-number').value === selectedTV && row.dataset.isRunning === 'true') isDuplicate = true;
    });
    if (isDuplicate) { alert("خطا: این تلویزیون در دسترس نیست!"); selectElement.value = ""; } else { saveData(); }
}

// --- مدیریت رویدادها ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    syncWithServer();
    setInterval(syncWithServer, 30000);

    // اسپلش اسکرین
    const splash = document.getElementById('splash-screen');
    if(splash) {
        setTimeout(() => {
            splash.style.opacity = '0';
            setTimeout(() => splash.style.display = 'none', 1000);
        }, 2000);
    }

    // منو
    const btn = document.getElementById('menuToggleBtn');
    const menu = document.getElementById('optionsMenu');
    if(btn && menu) {
        btn.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('show-menu'); };
        document.onclick = () => menu.classList.remove('show-menu');
    }

    document.getElementById("addRowBtn").onclick = () => { addRow(); saveData(); };
    document.getElementById("refreshBtn").onclick = () => { if(confirm("کل حافظه گوشی پاک شود؟")) { localStorage.clear(); location.reload(); } };
});
