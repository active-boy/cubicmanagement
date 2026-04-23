// 全局变量
let parkingData = null;
let reservations = null;

// 页面导航函数
function navigateTo(page) {
    window.location.href = page;
}

// 显示提示消息
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'error' ? '#ff4757' : type === 'success' ? '#00a8ff' : '#667eea'};
        color: white;
        border-radius: 5px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 300);
    }, 3000);
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 获取停车场数据
async function getParkingData() {
    if (window.ParkingDataAPI) {
        parkingData = await window.ParkingDataAPI.getParkingData();
        return parkingData;
    }
    
    // 模拟数据
    return {
        garages: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
        levels: [1, 2],
        spots: {}
    };
}

// 获取预约数据
async function getReservations() {
    if (window.ReservationAPI) {
        reservations = await window.ReservationAPI.getReservations();
        return reservations;
    }
    
    // 从localStorage获取数据
    const saved = localStorage.getItem('parking_reservations');
    if (saved) {
        reservations = JSON.parse(saved);
    } else {
        reservations = [];
    }
    return reservations;
}

// 保存预约数据
async function saveReservations() {
    if (window.ReservationAPI) {
        await window.ReservationAPI.saveReservations(reservations);
    } else {
        localStorage.setItem('parking_reservations', JSON.stringify(reservations));
    }
}

// 检查车位是否可用
function isSpotAvailable(garage, level, spotNumber, startTime, endTime) {
    const conflict = reservations.find(res => 
        res.garage === garage && 
        res.level === level && 
        res.spotNumber === spotNumber &&
        ((startTime >= res.startTime && startTime < res.endTime) ||
         (endTime > res.startTime && endTime <= res.endTime) ||
         (startTime <= res.startTime && endTime >= res.endTime))
    );
    return !conflict;
}

// 检查手机号是否已预约
function isPhoneNumberUsed(phoneNumber, currentReservationId = null) {
    return reservations.some(res => 
        res.phoneNumber === phoneNumber && 
        (currentReservationId === null || res.id !== currentReservationId)
    );
}

// 计算停车费用
function calculateFee(startTime, endTime, hourlyRate = 5) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const hours = Math.ceil((end - start) / (1000 * 60 * 60));
    return hours * hourlyRate;
}

// 格式化时间
function formatDateTime(dateTime) {
    const date = new Date(dateTime);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {
    await getParkingData();
    await getReservations();
    
    // 更新主页统计数据
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        updateHomeStats();
    }
});

// 更新主页统计数据
function updateHomeStats() {
    const totalSpots = 52; // 26个车库 * 2层
    const bookedSpots = reservations ? reservations.filter(r => new Date(r.endTime) > new Date()).length : 0;
    const availableSpots = totalSpots - bookedSpots;
    
    const totalSpotsEl = document.getElementById('totalSpots');
    const bookedSpotsEl = document.getElementById('bookedSpots');
    const availableSpotsEl = document.getElementById('availableSpots');
    
    if (totalSpotsEl) totalSpotsEl.textContent = totalSpots;
    if (bookedSpotsEl) bookedSpotsEl.textContent = bookedSpots;
    if (availableSpotsEl) availableSpotsEl.textContent = availableSpots;
}

// 导出函数供其他模块使用
window.navigateTo = navigateTo;
window.showMessage = showMessage;
window.getParkingData = getParkingData;
window.getReservations = getReservations;
window.saveReservations = saveReservations;
window.isSpotAvailable = isSpotAvailable;
window.isPhoneNumberUsed = isPhoneNumberUsed;
window.calculateFee = calculateFee;
window.formatDateTime = formatDateTime;