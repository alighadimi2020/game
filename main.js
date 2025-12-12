const rowTimers = {}; 

function toJalali(gy, gm, gd) {
    var g_days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var j_days_in_month = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
    var g_y = gy;
    var g_m = gm;
    var g_d = gd;
    var j_y, j_m, j_d;
    var i;
    var day_no = g_d;

    if ((g_y % 4 === 0 && g_y % 100 !== 0) || (g_y % 400 === 0))
        g_days_in_month[1] = 29;
    
    for (i = 0; i < g_m - 1; i++)
        day_no += g_days_in_month[i];

    var gy_days = g_y - 1600;
    var leap = Math.floor(gy_days / 4) - Math.floor((gy_days - 1) / 100) + Math.floor((gy_days - 399) / 400);

    day_no += 365 * gy_days + leap;

    day_no -= 79;

    var j_np = Math.floor(day_no / 12053);
    j_y = 979 + 33 * j_np;
    day_no %= 12053;

    var j_y_days;

    var is_j_leap = (y) => (y % 33) == 1 || (y % 33) == 5 || (y % 33) == 9 || (y % 33) == 13 || (y % 33) == 17 || (y % 33) == 22 || (y % 33) == 26 || (y % 33) == 30;

    j_y_days = is_j_leap(j_y) ? 366 : 365;

    while (day_no >= j_y_days) {
        day_no -= j_y_days;
        j_y++;
        j_y_days = is_j_leap(j_y) ? 366 : 365;
    }

    if (is_j_leap(j_y)) {
        j_days_in_month[11] = 30;
    }

    for (i = 0; i < 12 && day_no >= j_days_in_month[i]; i++) {
        day_no -= j_days_in_month[i];
    }
    j_m = i + 1;
    j_d = day_no + 1;

    var pad = (n) => String(n).padStart(2, '0');
    return `${j_y}/${pad(j_m)}/${pad(j_d)}`;
}

function getShamsiDate() {
    const now = new Date();
    const gy = now.getFullYear();
    const gm = now.getMonth() + 1;
    const gd = now.getDate();
    return toJalali(gy, gm, gd);
}

function getRowData() {
    const rows = [];
    document.querySelectorAll('#gameTable tbody tr').forEach(row => {
        const rowId = row.dataset.rowId; 
        
        const noteElement = document.getElementById(`note-${rowId}`);
        const notes = noteElement ? noteElement.value : '';

        const data = {
            id: rowId,
            name: row.querySelector('.person-name').value,
            tvNum: row.querySelector('.tv-number').value,
            controller: row.querySelector('.controller-select').value,
            startTime: row.dataset.startTime || '', 
            endTime: row.dataset.endTime || '', 
            
            price: row.querySelector('.priceBox').value,
            paymentType: row.querySelector('.payment-type').value,
            notes: notes,
            isRunning: row.dataset.isRunning === 'true', 
            startTimestamp: row.dataset.startTimestamp || null,
        };
        rows.push(data);
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
    document.getElementById('todayDate').value = data.todayDate || '';

    const tableBody = document.getElementById("gameTable").querySelector("tbody");
    tableBody.innerHTML = ''; 
    document.getElementById("notes-list").innerHTML = ''; 

    data.rows.forEach(rowData => {
        addRow(rowData);
        if (rowData.isRunning) {
            const rowElement = document.querySelector(`tr[data-row-id="${rowData.id}"]`);
            if (rowElement) {
                startStopwatch(rowElement, true);
            }
        }
    });
    updateGrandTotal();
}

function updateGrandTotal() {
    const priceBoxes = document.querySelectorAll('.priceBox');
    let grandTotal = 0;
    priceBoxes.forEach(box => {
        grandTotal += parseFloat(box.value.replace(/,/g, '')) || 0; 
    });
    document.getElementById('totalAmount').textContent = grandTotal.toLocaleString('fa-IR');
}

function getHourlyRate(controllers) {
    const numControllers = parseInt(controllers);
    if (numControllers === 1) return 80000;
    if (numControllers === 2) return 140000;
    if (numControllers === 3) return 165000;
    if (numControllers === 4) return 220000;
    return 0;
}

function calculateTotal(rowElement) {
    const controllerSelect = rowElement.querySelector('.controller-select');
    const priceBox = rowElement.querySelector('.priceBox');
    const durationDisplay = rowElement.querySelector('.duration-display');
    
    const startTimeStr = rowElement.dataset.startTime; 
    const endTimeStr = rowElement.dataset.endTime; 
    
    const rate = getHourlyRate(controllerSelect.value);

    if (!startTimeStr || !endTimeStr || rate === 0) {
        priceBox.value = 0;
        if (durationDisplay) durationDisplay.textContent = '00:00:00';
        saveData(); 
        return;
    }

    const startParts = startTimeStr.split(':').map(Number);
    const endParts = endTimeStr.split(':').map(Number);

    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[1];

    let durationMinutes = endMinutes - startMinutes;

    if (durationMinutes < 0) {
        durationMinutes += 24 * 60; 
    }

    const durationHours = durationMinutes / 60;
    const totalPrice = durationHours * rate;
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = Math.floor(durationMinutes % 60);
    const seconds = 0; 
    
    const formatNumber = (num) => String(num).padStart(2, '0');

    if (durationDisplay) {
        durationDisplay.textContent = `${formatNumber(hours)}:${formatNumber(minutes)}:${formatNumber(seconds)}`;
    }

    priceBox.value = totalPrice.toFixed(0); 
    saveData(); 
}

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formatNumber = (num) => String(num).padStart(2, '0');
    return `${formatNumber(hours)}:${formatNumber(minutes)}:${formatNumber(seconds)}`;
}

function startStopwatch(rowElement, isRecovery = false) {
    const rowId = rowElement.dataset.rowId;
    const stopBtn = rowElement.querySelector('.stop-button');
    const durationDisplay = rowElement.querySelector('.duration-display');
    
    rowElement.querySelector('.person-name').readOnly = true;
    rowElement.querySelector('.tv-number').readOnly = true;
    rowElement.querySelector('.controller-select').disabled = true;

    if (!isRecovery) {
        const now = new Date();
        const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        rowElement.dataset.startTime = timeString; 
        rowElement.dataset.startTimestamp = now.getTime(); 
        rowElement.dataset.isRunning = 'true';
        rowElement.dataset.endTime = ''; 
        rowElement.querySelector('.priceBox').value = 0; 

        rowElement.querySelector('.display-start-time').textContent = timeString;
        rowElement.querySelector('.display-end-time').textContent = '---';

    } else {
         rowElement.querySelector('.display-start-time').textContent = rowElement.dataset.startTime;
         rowElement.querySelector('.display-end-time').textContent = '---';
    }
    
    const startTimestamp = parseInt(rowElement.dataset.startTimestamp);

    const timerFunction = () => {
        const now = new Date().getTime();
        const elapsed = now - startTimestamp;
        durationDisplay.textContent = formatDuration(elapsed);
    };

    timerFunction(); 
    const intervalId = setInterval(timerFunction, 1000);
    rowTimers[rowId] = intervalId; 

    stopBtn.textContent = 'اتمام';
    stopBtn.onclick = () => stopStopwatch(rowElement);
    
    saveData();
}

function stopStopwatch(rowElement) {
    const rowId = rowElement.dataset.rowId;
    const stopBtn = rowElement.querySelector('.stop-button');
    
    clearInterval(rowTimers[rowId]);
    delete rowTimers[rowId];
    
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    rowElement.dataset.endTime = timeString;
    
    calculateTotal(rowElement);

    stopBtn.textContent = 'تمام';
    stopBtn.onclick = null;
    stopBtn.disabled = true;
    
    rowElement.querySelector('.person-name').readOnly = false;
    rowElement.querySelector('.tv-number').readOnly = false;
    rowElement.querySelector('.controller-select').disabled = false;
    
    rowElement.querySelector('.display-end-time').textContent = timeString;

    rowElement.dataset.isRunning = 'false';
    saveData();
}

function deleteRow(rowElement) {
    if (confirm("آیا مطمئن هستید که می‌خواهید این سطر را حذف کنید؟")) {
        const rowId = rowElement.dataset.rowId;
        
        if (rowTimers[rowId]) {
            clearInterval(rowTimers[rowId]);
            delete rowTimers[rowId];
        }
        
        rowElement.remove();
        
        const noteBox = document.getElementById(`note-box-${rowId}`);
        if (noteBox) {
            noteBox.remove();
        }
        
        saveData(); 
    }
}

function createNoteBox(rowId, rowData) {
    const notesList = document.getElementById("notes-list");
    const noteBox = document.createElement("div");
    noteBox.className = "row-note-box";
    noteBox.id = `note-box-${rowId}`;
    
    const noteHeader = document.createElement("div");
    noteHeader.className = "note-header";
    noteHeader.textContent = `ردیف: ${rowData.name || 'مشتری جدید'} | TV# ${rowData.tvNum || '؟'}`;
    
    const noteTextarea = document.createElement("textarea");
    noteTextarea.id = `note-${rowId}`;
    noteTextarea.className = "note-textarea";
    noteTextarea.rows = 3;
    noteTextarea.placeholder = "توضیحات و یادداشت‌های این سطر را اینجا وارد کنید...";
    noteTextarea.value = rowData.notes || '';
    noteTextarea.onchange = saveData;

    noteBox.appendChild(noteHeader);
    noteBox.appendChild(noteTextarea);
    notesList.appendChild(noteBox);
}

function addRow(data = {}) {
    const tableBody = document.getElementById("gameTable").querySelector("tbody");
    const row = document.createElement("tr");
    
    const rowId = data.id || `row-${Date.now()}`;
    row.dataset.rowId = rowId;
    row.dataset.isRunning = data.isRunning || 'false';
    row.dataset.startTimestamp = data.startTimestamp || null;
    row.dataset.startTime = data.startTime || '';
    row.dataset.endTime = data.endTime || ''; 

    const defaults = {
        name: '', tvNum: '', controller: '4', price: '0', paymentType: 'cash', notes: ''
    };
    const rowData = {...defaults, ...data};

    const isRunning = rowData.isRunning === 'true';
    const buttonText = isRunning ? '❌ توقف' : '▶️ شروع';
    const buttonAction = isRunning ? `stopStopwatch(this.closest('tr'))` : `startStopwatch(this.closest('tr'))`;
    const readOnlyState = isRunning ? 'readonly' : '';
    const disabledState = isRunning ? 'disabled' : '';
    const durationDisplayInitial = isRunning ? 'در حال محاسبه...' : '00:00:00';
    
    row.innerHTML = `
        <td><input type="text" class="person-name" ${readOnlyState} placeholder="" value="${rowData.name}" onchange="saveData(); updateNoteHeader(this.closest('tr'));"></td> 
        <td>
            <select class="tv-number" ${readOnlyState}
                onchange="saveData(); updateNoteHeader(this.closest('tr'));">
                <option value="1" ${rowData.tvNum == 1 ? 'selected' : ''}>1</option>
                <option value="2" ${rowData.tvNum == 2 ? 'selected' : ''}>2</option>
                <option value="3" ${rowData.tvNum == 3 ? 'selected' : ''}>3</option>
                <option value="4" ${rowData.tvNum == 4 ? 'selected' : ''}>4</option>
                <option value="5" ${rowData.tvNum == 5 ? 'selected' : ''}>5</option>
            </select>
        </td>
        <td>
            <select class="controller-select" ${disabledState} onchange="calculateTotal(this.closest('tr')); saveData();">
                <option value="4" ${rowData.controller == '4' ? 'selected' : ''}>4 دسته</option>
                <option value="3" ${rowData.controller == '3' ? 'selected' : ''}>3 دسته</option>
                <option value="2" ${rowData.controller == '2' ? 'selected' : ''}>2 دسته</option>
                <option value="1" ${rowData.controller == '1' ? 'selected' : ''}>1 دسته</option>
            </select>
        </td>
        
        <td>
            <button class="stop-button" onclick="${buttonAction}">${buttonText}</button>
            <div class="duration-display" style="font-size: 14px; margin-top: 5px; font-weight: bold; color: ${isRunning ? '#3498db' : '#2c3e50'};">${durationDisplayInitial}</div>
        </td>

        <td class="display-start-time">${rowData.startTime || '---'}</td> 
        <td class="display-end-time">${rowData.endTime || '---'}</td> 

        <td><input class="priceBox" type="text" readonly value="${rowData.price}"></td>
        
        <td>
            <select class="payment-type" value="${rowData.paymentType}" onchange="saveData()">
                <option value="cash" ${rowData.paymentType == 'cash' ? 'selected' : ''}>نقدی</option>
                <option value="card" ${rowData.paymentType == 'card' ? 'selected' : ''}>کارت</option>
            </select>
        </td>
        
        <td>
            <button class="delete-button" onclick="deleteRow(this.closest('tr'))">حذف 🗑️</button>
        </td>
    `;

    tableBody.appendChild(row);
    
    createNoteBox(rowId, rowData);

    if (rowData.name && !isRunning) {
         calculateTotal(row); 
    }

    updateGrandTotal();
}

function updateNoteHeader(rowElement) {
    const rowId = rowElement.dataset.rowId;
    const name = rowElement.querySelector('.person-name').value;
    const tvNum = rowElement.querySelector('.tv-number').value;
    
    const noteBox = document.getElementById(`note-box-${rowId}`);
    if (noteBox) {
        noteBox.querySelector('.note-header').textContent = `ردیف: ${name || 'مشتری جدید'} | TV# ${tvNum || '؟'}`;
    }
}

function takeScreenshot() {
    const { jsPDF } = window.jspdf;
    const elementToCapture = document.body; 
    
    const elementsToHide = elementToCapture.querySelectorAll('input, select, textarea, button, .row-note-box');
    elementsToHide.forEach(el => el.classList.add('print-hide-border'));
    document.querySelectorAll('.note-textarea').forEach(el => el.style.border = 'none'); 

    html2canvas(elementToCapture, { 
        scale: 2, 
        allowTaint: true,
        useCORS: true, 
        scrollY: -window.scrollY 
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4'); 
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        const ratio = pdfWidth / imgWidth;
        const finalHeight = imgHeight * ratio;

        let heightLeft = finalHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, finalHeight);
        heightLeft -= pdfHeight;

        while (heightLeft >= -1) { 
            position = heightLeft - finalHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, finalHeight);
            heightLeft -= pdfHeight;
        }

        elementsToHide.forEach(el => el.classList.remove('print-hide-border'));
        document.querySelectorAll('.note-textarea').forEach(el => el.style.border = '1px solid #ccc'); 
        
        const date = getShamsiDate().replace(/\//g, '-');
        pdf.save(`GameRoom_Report_${date}.pdf`);
        
        alert("دانلود شد عالیی");
    });
}

function refreshData() {
    if (confirm('همهٔ داده‌ها حذف خواهند شد. مطمئن هستید؟')) {
        localStorage.removeItem('gameRoomData');
        location.reload();
    }
}

function initPersianDatePicker() {
    if (typeof jQuery === 'undefined' || typeof $ === 'undefined' || typeof $('#todayDate').persianDatepicker === 'undefined') {
        return; 
    }

    $('#todayDate').persianDatepicker({
        format: 'YYYY/MM/DD',
        observer: true,
        altField: '#todayDate',
        onSelect: function(unix) {
            saveData();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    
    initPersianDatePicker();
    
    document.getElementById("addRowBtn").onclick = function () {
        addRow(); 
        saveData(); 
        document.getElementById('notes-container').scrollIntoView({ behavior: 'smooth' });
    };

    document.getElementById('screenshotBtn').onclick = takeScreenshot;
    document.getElementById('refreshBtn').onclick = refreshData;

    document.getElementById('operatorName').onchange = saveData;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').then(function(registration) {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, function(err) {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
